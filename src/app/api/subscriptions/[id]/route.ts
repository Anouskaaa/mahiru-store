import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';
import type { Subscription } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/subscriptions/[id] - Get a single subscription with slots
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get subscription with service
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*, service:services(*)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('Subscription not found', 404);
      }
      throw error;
    }

    // Get assigned customers (occupied slots)
    const { data: occupiedSlots } = await supabaseAdmin
      .from('customer_subscriptions')
      .select(`
        slot_number,
        status,
        start_date,
        customer:customers(*)
      `)
      .eq('subscription_id', id)
      .eq('status', 'active');

    // Get invite links
    const { data: links } = await supabaseAdmin
      .from('invite_links')
      .select('*')
      .eq('subscription_id', id)
      .eq('is_active', true);

    const totalSlots = data.service?.total_slots || 6;
    const usedSlots = occupiedSlots?.map(s => s.slot_number) || [];
    const availableSlots = Array.from({ length: totalSlots }, (_, i) => i + 1)
      .filter(n => !usedSlots.includes(n));

    return successResponse({
      ...data,
      stats: {
        total: totalSlots,
        used: usedSlots.length,
        available: availableSlots.length,
      },
      slots: {
        occupied: occupiedSlots || [],
        available: availableSlots,
      },
      invite_links: links || [],
    });
  } catch (err) {
    console.error('Error fetching subscription:', err);
    return errorResponse('Failed to fetch subscription');
  }
}

// PUT /api/subscriptions/[id] - Update a subscription
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        service_id: body.service_id,
        provider_account: body.provider_account,
        invite_link: body.invite_link,
        renewal_date: body.renewal_date,
        status: body.status,
        notes: body.notes,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return successResponse(data as Subscription, 'Subscription updated successfully');
  } catch (err) {
    console.error('Error updating subscription:', err);
    return errorResponse('Failed to update subscription');
  }
}

// DELETE /api/subscriptions/[id] - Delete a subscription
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return successResponse(null, 'Subscription deleted successfully');
  } catch (err) {
    console.error('Error deleting subscription:', err);
    return errorResponse('Failed to delete subscription');
  }
}