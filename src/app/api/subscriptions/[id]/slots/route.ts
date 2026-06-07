import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/subscriptions/[id]/slots - Get all slots with invite links
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get subscription with service
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*, service:services(*)')
      .eq('id', id)
      .single();

    if (error || !subscription) {
      return errorResponse('Subscription not found', 404);
    }

    const totalSlots = subscription.service?.total_slots || 6;

    // Get all invite links for this subscription
    const { data: inviteLinks } = await supabaseAdmin
      .from('invite_links')
      .select('*')
      .eq('subscription_id', id)
      .eq('is_active', true);

    // Get occupied slots with customer info
    const { data: occupiedSlots } = await supabaseAdmin
      .from('customer_subscriptions')
      .select(`
        slot_number,
        customer:customers(id, name, telegram_username, whatsapp)
      `)
      .eq('subscription_id', id)
      .eq('status', 'active');

    // Build slot data with links
    const slotData = Array.from({ length: totalSlots }, (_, i) => {
      const slotNum = i + 1;
      const isOccupied = occupiedSlots?.some(s => s.slot_number === slotNum);
      const customerData = occupiedSlots?.find(s => s.slot_number === slotNum);
      const slotLink = inviteLinks?.find(l => l.slot_number === slotNum);

      return {
        slot_number: slotNum,
        is_occupied: isOccupied,
        customer: isOccupied ? customerData?.customer : null,
        invite_link: slotLink?.link || null,
        is_link_active: slotLink?.is_active || false,
      };
    });

    return successResponse({
      subscription_id: id,
      service: subscription.service?.display_name,
      total_slots: totalSlots,
      slots: slotData,
      used_count: occupiedSlots?.length || 0,
      available_count: totalSlots - (occupiedSlots?.length || 0),
    });
  } catch (err) {
    console.error('Error getting slots:', err);
    return errorResponse('Failed to get slots');
  }
}

// POST /api/subscriptions/[id]/slots - Assign customer to slot OR add invite link
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if this is an invite link operation
    if (body.invite_link && !body.customer_id) {
      // Adding/Updating invite link for a slot
      const { slot_number, invite_link } = body;

      // Validate slot number
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('*, service:services(*)')
        .eq('id', id)
        .single();

      if (!subscription) {
        return errorResponse('Subscription not found', 404);
      }

      const totalSlots = subscription.service?.total_slots || 6;
      if (slot_number < 1 || slot_number > totalSlots) {
        return errorResponse(`Invalid slot number. Must be between 1 and ${totalSlots}`, 400);
      }

      // Check if link already exists for this slot
      const { data: existingLink } = await supabaseAdmin
        .from('invite_links')
        .select('id')
        .eq('subscription_id', id)
        .eq('slot_number', slot_number)
        .single();

      if (existingLink) {
        // Update existing link
        const { data, error } = await supabaseAdmin
          .from('invite_links')
          .update({ link: invite_link, is_active: true })
          .eq('id', existingLink.id)
          .select()
          .single();

        if (error) throw error;
        return successResponse(data, 'Link invite updated successfully');
      } else {
        // Create new link
        const { data, error } = await supabaseAdmin
          .from('invite_links')
          .insert({
            subscription_id: id,
            slot_number,
            link: invite_link,
            is_primary: false,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        return successResponse(data, 'Link invite added successfully', 201);
      }
    }

    // Assign customer to slot
    const { customer_id, slot_number, start_date } = body;

    // Check if subscription exists and get total slots
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*, service:services(*)')
      .eq('id', id)
      .single();

    if (subError || !subscription) {
      return errorResponse('Subscription not found', 404);
    }

    const totalSlots = subscription.service?.total_slots || 6;

    // Check if slot number is valid
    if (slot_number < 1 || slot_number > totalSlots) {
      return errorResponse(`Invalid slot number. Must be between 1 and ${totalSlots}`, 400);
    }

    // Check if slot is already occupied
    const { data: existing } = await supabaseAdmin
      .from('customer_subscriptions')
      .select('id')
      .eq('subscription_id', id)
      .eq('slot_number', slot_number)
      .eq('status', 'active')
      .single();

    if (existing) {
      return errorResponse('This slot is already occupied', 409);
    }

    // Create customer subscription
    const { data, error } = await supabaseAdmin
      .from('customer_subscriptions')
      .insert({
        customer_id,
        subscription_id: id,
        slot_number,
        start_date: start_date || new Date().toISOString().split('T')[0],
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    // Get the invite link for this specific slot
    const { data: slotLink } = await supabaseAdmin
      .from('invite_links')
      .select('link')
      .eq('subscription_id', id)
      .eq('slot_number', slot_number)
      .eq('is_active', true)
      .single();

    return successResponse({
      ...data,
      invite_link: slotLink?.link || subscription.invite_link,
    }, 'Customer assigned to slot successfully', 201);
  } catch (err) {
    console.error('Error with slot operation:', err);
    return errorResponse('Failed to process slot operation');
  }
}