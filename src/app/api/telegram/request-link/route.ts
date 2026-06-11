import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { errorResponse } from '@/lib/api';

type ServiceSubscription = {
  id: string;
  invite_link: string | null;
  service?: {
    total_slots?: number;
  };
};

// POST /api/telegram/request-link - Request an invite link via Telegram
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { telegram_id, service_name } = body;

    // Find customer by telegram ID
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('telegram_id', telegram_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({
        error: 'Customer not found',
        action: 'Please register first via /start'
      }, { status: 404 });
    }

    // Find service by name
    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .select('id, display_name')
      .eq('name', service_name)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({
        error: 'Service not found',
        available_services: []
      }, { status: 404 });
    }

    // Find available subscription for this service
    // First, get all subscriptions for this service
    const { data: subscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('*, service:services(total_slots)')
      .eq('service_id', service.id)
      .eq('status', 'active');

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        error: 'No active subscriptions available for this service',
        waitlist_position: null,
      }, { status: 400 });
    }

    // Find subscription with available slots
    for (const sub of subscriptions as unknown as ServiceSubscription[]) {
      const totalSlots = sub.service?.total_slots || 6;

      // Get occupied slots count
      const { data: occupiedSlots } = await supabaseAdmin
        .from('customer_subscriptions')
        .select('slot_number')
        .eq('subscription_id', sub.id)
        .eq('status', 'active');

      if (occupiedSlots && occupiedSlots.length < totalSlots) {
        // Check if customer already has an active subscription for this service
        const subIds = subscriptions.map(s => s.id);
        const { data: existingSub } = await supabaseAdmin
          .from('customer_subscriptions')
          .select('id')
          .eq('customer_id', customer.id)
          .in('subscription_id', subIds)
          .eq('status', 'active')
          .single();

        if (existingSub) {
          return NextResponse.json({
            error: 'You already have an active subscription for this service',
            current_subscription: true,
          }, { status: 400 });
        }

        // Get primary invite link
        const { data: inviteLink } = await supabaseAdmin
          .from('invite_links')
          .select('link, expires_at')
          .eq('subscription_id', sub.id)
          .eq('is_primary', true)
          .eq('is_active', true)
          .single();

        const link = inviteLink?.link || sub.invite_link;

        if (!link) {
          return NextResponse.json({
            error: 'No invite link available for this subscription',
          }, { status: 400 });
        }

        return NextResponse.json({
          invite_link: link,
          service: service.display_name,
          message: `Here's your ${service.display_name} invite link!`,
          expires_at: inviteLink?.expires_at || null,
        });
      }
    }

    // All slots full - check waitlist position
    return NextResponse.json({
      error: 'No slots available',
      waitlist_position: 1, // Would need actual waitlist implementation
      message: 'All slots are full. You have been added to the waitlist.',
    }, { status: 400 });

  } catch (err) {
    console.error('Error requesting invite link:', err);
    return errorResponse('Failed to process request');
  }
}
