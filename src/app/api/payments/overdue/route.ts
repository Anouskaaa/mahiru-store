import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';

// GET /api/payments/overdue - Get overdue payments
export async function GET(request: Request) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        customer_subscription:customer_subscriptions(
          customer:customers(*),
          subscription:subscriptions(
            service:services(*)
          )
        )
      `)
      .eq('status', 'overdue')
      .order('due_date');

    if (error) throw error;

    // Calculate days overdue
    data?.forEach(payment => {
      const dueDate = new Date(payment.due_date);
      const todayDate = new Date(today);
      payment.days_overdue = Math.ceil((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    });

    const total = data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    return successResponse({
      payments: data || [],
      count: data?.length || 0,
      total_overdue: total,
    });
  } catch (err) {
    console.error('Error fetching overdue payments:', err);
    return errorResponse('Failed to fetch overdue payments');
  }
}