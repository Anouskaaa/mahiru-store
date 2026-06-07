import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';

interface RouteParams {
  params: Promise<{ telegram_id: string }>;
}

// GET /api/telegram/get-link/[telegram_id] - Get invite link for customer
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { telegram_id } = await params;

    if (!telegram_id) {
      return errorResponse('telegram_id is required', 400);
    }

    // Get customer
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('telegram_id', telegram_id)
      .single();

    if (customerError || !customer) {
      return errorResponse('Customer not found', 404);
    }

    // Get active subscription
    const { data: activeSub } = await supabaseAdmin
      .from('customer_subscriptions')
      .select(`
        *,
        subscription:subscriptions(
          id,
          service:services(display_name)
        )
      `)
      .eq('customer_id', customer.id)
      .eq('status', 'active')
      .single();

    if (!activeSub) {
      return errorResponse('No active subscription found', 404);
    }

    // Get invite link for this slot
    const { data: inviteLink } = await supabaseAdmin
      .from('invite_links')
      .select('link')
      .eq('subscription_id', activeSub.subscription_id)
      .eq('slot_number', activeSub.slot_number)
      .single();

    return successResponse({
      customer_id: customer.id,
      service: activeSub.subscription?.service?.display_name,
      slot_number: activeSub.slot_number,
      invite_link: inviteLink?.link || null,
      status: activeSub.status,
      start_date: activeSub.start_date,
    });

  } catch (err) {
    console.error('Error getting link:', err);
    return errorResponse('Failed to get invite link');
  }
}