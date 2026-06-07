import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';

// GET /api/subscriptions/upcoming-renewals - Get subscriptions due for renewal
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        *,
        service:services(*)
      `)
      .eq('status', 'active')
      .gte('renewal_date', today.toISOString().split('T')[0])
      .lte('renewal_date', futureDate.toISOString().split('T')[0])
      .order('renewal_date');

    if (error) throw error;

    // Get occupied slot counts
    const subIds = data?.map(s => s.id) || [];
    if (subIds.length > 0) {
      const { data: slotData } = await supabaseAdmin
        .from('customer_subscriptions')
        .select('subscription_id')
        .in('subscription_id', subIds)
        .eq('status', 'active');

      const countMap = new Map<string, number>();
      slotData?.forEach(slot => {
        countMap.set(slot.subscription_id, (countMap.get(slot.subscription_id) || 0) + 1);
      });

      data?.forEach(sub => {
        sub.occupied_slots = countMap.get(sub.id) || 0;
        const renewalDate = new Date(sub.renewal_date);
        sub.days_until_renewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      });
    }

    return successResponse(data || []);
  } catch (err) {
    console.error('Error fetching upcoming renewals:', err);
    return errorResponse('Failed to fetch upcoming renewals');
  }
}