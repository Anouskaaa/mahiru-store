import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';

type RevenueByServicePayment = {
  amount: number | string;
  status: string;
  customer_subscription?: {
    subscription?: {
      service?: {
        display_name?: string;
      };
    };
  };
};

type RecentTransaction = {
  amount: number | string;
  paid_date: string;
  customer_subscription?: {
    customer?: {
      name?: string;
    };
  };
};

// GET /api/payments/summary - Get payment summary stats
export async function GET() {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get this month's payments
    const { data: thisMonthPayments } = await supabaseAdmin
      .from('payments')
      .select('amount, status')
      .gte('due_date', firstDayOfMonth.toISOString().split('T')[0])
      .lte('due_date', lastDayOfMonth.toISOString().split('T')[0]);

    // Get last month's payments
    const { data: lastMonthPayments } = await supabaseAdmin
      .from('payments')
      .select('amount, status')
      .gte('due_date', firstDayLastMonth.toISOString().split('T')[0])
      .lte('due_date', lastDayLastMonth.toISOString().split('T')[0]);

    // Calculate totals
    let thisMonthCollected = 0;
    let thisMonthPending = 0;
    let thisMonthOverdue = 0;

    thisMonthPayments?.forEach(p => {
      if (p.status === 'paid') thisMonthCollected += Number(p.amount);
      else if (p.status === 'pending') thisMonthPending += Number(p.amount);
      else if (p.status === 'overdue') thisMonthOverdue += Number(p.amount);
    });

    let lastMonthTotal = 0;
    lastMonthPayments?.forEach(p => {
      if (p.status === 'paid') lastMonthTotal += Number(p.amount);
    });

    // Get revenue by service
    const { data: revenueByService } = await supabaseAdmin
      .from('payments')
      .select(`
        amount,
        status,
        customer_subscription:customer_subscriptions(
          subscription:subscriptions(
            service:services(display_name)
          )
        )
      `)
      .eq('status', 'paid')
      .gte('due_date', firstDayOfMonth.toISOString().split('T')[0])
      .lte('due_date', lastDayOfMonth.toISOString().split('T')[0]);

    const serviceRevenueMap = new Map<string, number>();
    (revenueByService as unknown as RevenueByServicePayment[] | null)?.forEach(p => {
      const serviceName = p.customer_subscription?.subscription?.service?.display_name || 'Unknown';
      if (p.status === 'paid') {
        serviceRevenueMap.set(serviceName, (serviceRevenueMap.get(serviceName) || 0) + Number(p.amount));
      }
    });

    // Get recent transactions
    const { data: recentTransactions } = await supabaseAdmin
      .from('payments')
      .select(`
        amount,
        paid_date,
        customer_subscription:customer_subscriptions(
          customer:customers(name)
        )
      `)
      .eq('status', 'paid')
      .not('paid_date', 'is', null)
      .order('paid_date', { ascending: false })
      .limit(10);

    const growth = lastMonthTotal > 0
      ? ((thisMonthCollected - lastMonthTotal) / lastMonthTotal) * 100
      : 0;

    return successResponse({
      this_month: {
        total_collected: thisMonthCollected,
        total_pending: thisMonthPending,
        total_overdue: thisMonthOverdue,
      },
      last_month: {
        total_collected: lastMonthTotal,
      },
      growth: Math.round(growth * 100) / 100,
      revenue_by_service: Array.from(serviceRevenueMap.entries()).map(([service, amount]) => ({
        service,
        amount,
      })),
      recent_transactions: (recentTransactions as unknown as RecentTransaction[] | null)?.map(t => ({
        customer: t.customer_subscription?.customer?.name,
        amount: t.amount,
        paid_date: t.paid_date,
      })) || [],
    });
  } catch (err) {
    console.error('Error fetching payment summary:', err);
    return errorResponse('Failed to fetch payment summary');
  }
}
