import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse, getPaginationParams } from '@/lib/api';
import type { Subscription } from '@/types';

// GET /api/subscriptions - List all subscriptions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const serviceId = searchParams.get('service_id');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('subscriptions')
      .select(`
        *,
        service:services(*)
      `, { count: 'exact' })
      .order('renewal_date');

    if (serviceId) {
      query = query.eq('service_id', serviceId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    // Get slot stats for each subscription
    const subIds = data?.map(s => s.id) || [];
    if (subIds.length > 0) {
      const { data: slotData } = await supabaseAdmin
        .from('customer_subscriptions')
        .select('subscription_id, status')
        .in('subscription_id', subIds)
        .eq('status', 'active');

      const statsMap = new Map<string, { used: number }>();
      slotData?.forEach(slot => {
        const current = statsMap.get(slot.subscription_id) || { used: 0 };
        current.used++;
        statsMap.set(slot.subscription_id, current);
      });

      data?.forEach(sub => {
        const totalSlots = sub.service?.total_slots || 6;
        const used = statsMap.get(sub.id)?.used || 0;
        sub.stats = {
          total: totalSlots,
          used,
          available: totalSlots - used,
        };
      });
    }

    return NextResponse.json({
      data: data as Subscription[],
      count: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('Error fetching subscriptions:', err);
    return errorResponse('Failed to fetch subscriptions');
  }
}

// POST /api/subscriptions - Create a new subscription
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verify service exists
    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .select('id, total_slots')
      .eq('id', body.service_id)
      .single();

    if (serviceError || !service) {
      return errorResponse('Service not found', 404);
    }

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        service_id: body.service_id,
        provider_account: body.provider_account,
        invite_link: body.invite_link,
        renewal_date: body.renewal_date,
        status: body.status || 'active',
        notes: body.notes,
      })
      .select()
      .single();

    if (error) throw error;

    // Add invite link to invite_links table if provided
    if (body.invite_link) {
      await supabaseAdmin.from('invite_links').insert({
        subscription_id: data.id,
        link: body.invite_link,
        is_primary: true,
      });
    }

    // Get full data with service
    const { data: fullData } = await supabaseAdmin
      .from('subscriptions')
      .select('*, service:services(*)')
      .eq('id', data.id)
      .single();

    return successResponse(fullData as Subscription, 'Subscription created successfully', 201);
  } catch (err) {
    console.error('Error creating subscription:', err);
    return errorResponse('Failed to create subscription');
  }
}