import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';

// GET /api/dashboard/stats - Get dashboard overview stats
export async function GET() {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const oneMonthLater = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString().split('T')[0];
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Total customers
    const { count: totalCustomers } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Active subscriptions (unique subscription_id with active status)
    const { data: activeSlots } = await supabaseAdmin
      .from('customer_subscriptions')
      .select('subscription_id')
      .eq('status', 'active');

    const uniqueSubscriptions = new Set(activeSlots?.map(s => s.subscription_id) || []);

    // Upcoming renewals
    const { data: upcomingRenewals } = await supabaseAdmin
      .from('subscriptions')
      .select('id, renewal_date')
      .eq('status', 'active')
      .gte('renewal_date', today)
      .lte('renewal_date', oneMonthLater);

    const renewalsThisWeek = upcomingRenewals?.filter(r => {
      const renewalDate = new Date(r.renewal_date);
      return renewalDate <= new Date(oneWeekLater);
    }).length || 0;

    // Overdue payments
    const { data: overduePayments } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('status', 'overdue');

    const overdueCount = overduePayments?.length || 0;
    const overdueTotal = overduePayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // Revenue this month
    const { data: thisMonthPayments } = await supabaseAdmin
      .from('payments')
      .select('amount, status')
      .gte('due_date', firstDayOfMonth)
      .lte('due_date', lastDayOfMonth);

    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;

    thisMonthPayments?.forEach(p => {
      if (p.status === 'paid') thisMonthRevenue += Number(p.amount);
    });

    // Get last month revenue
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const { data: lastMonthPayments } = await supabaseAdmin
      .from('payments')
      .select('amount, status')
      .gte('due_date', firstDayLastMonth)
      .lte('due_date', lastDayLastMonth);

    lastMonthPayments?.forEach(p => {
      if (p.status === 'paid') lastMonthRevenue += Number(p.amount);
    });

    const growth = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

    // Service breakdown
    const { data: serviceData } = await supabaseAdmin
      .from('customer_subscriptions')
      .select(`
        subscription:subscriptions(
          service:services(display_name)
        )
      `)
      .eq('status', 'active');

    const serviceMap = new Map<string, { active_slots: number; revenue: number }>();
    serviceData?.forEach(s => {
      const serviceName = (s as any).subscription?.service?.display_name || 'Unknown';
      const current = serviceMap.get(serviceName) || { active_slots: 0, revenue: 0 };
      current.active_slots++;
      serviceMap.set(serviceName, current);
    });

    // Add revenue per service
    thisMonthPayments?.forEach(p => {
      if (p.status === 'paid') {
        const serviceName = (p as any).customer_subscription?.subscription?.service?.display_name || 'Unknown';
        const current = serviceMap.get(serviceName) || { active_slots: 0, revenue: 0 };
        current.revenue += Number(p.amount);
        serviceMap.set(serviceName, current);
      }
    });

    return successResponse({
      total_customers: totalCustomers || 0,
      active_subscriptions: uniqueSubscriptions.size,
      revenue: {
        this_month: thisMonthRevenue,
        last_month: lastMonthRevenue,
        growth: Math.round(growth * 100) / 100,
      },
      upcoming_renewals: {
        this_week: renewalsThisWeek,
        this_month: upcomingRenewals?.length || 0,
      },
      overdue_payments: {
        count: overdueCount,
        total: overdueTotal,
      },
      service_breakdown: Array.from(serviceMap.entries()).map(([service, data]) => ({
        service,
        active_slots: data.active_slots,
        revenue: data.revenue,
      })),
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    return errorResponse('Failed to fetch dashboard stats');
  }
}