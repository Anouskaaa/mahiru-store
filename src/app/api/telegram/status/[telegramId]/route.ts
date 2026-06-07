import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';

interface RouteParams {
  params: Promise<{ telegramId: string }>;
}

// GET /api/telegram/status/[telegramId] - Get customer status via Telegram
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { telegramId } = await params;

    // Find customer by telegram ID
    const { data: customer, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (error || !customer) {
      return NextResponse.json({
        error: 'Customer not found',
        action: 'Please register first via /start'
      }, { status: 404 });
    }

    // Get active subscriptions
    const { data: subscriptions } = await supabaseAdmin
      .from('customer_subscriptions')
      .select(`
        *,
        subscription:subscriptions(
          renewal_date,
          service:services(display_name)
        )
      `)
      .eq('customer_id', customer.id)
      .eq('status', 'active');

    // Get next payment for each subscription
    const subIds = subscriptions?.map(s => s.id) || [];
    if (subIds.length > 0) {
      const { data: nextPayments } = await supabaseAdmin
        .from('payments')
        .select('customer_subscription_id, amount, due_date')
        .in('customer_subscription_id', subIds)
        .eq('status', 'pending')
        .order('due_date')
        .limit(subIds.length);

      subscriptions?.forEach(sub => {
        const nextPayment = nextPayments?.find(p => p.customer_subscription_id === sub.id);
        sub.next_payment = nextPayment;
      });
    }

    return successResponse({
      customer: {
        name: customer.name,
        active_subscriptions: subscriptions?.map(s => ({
          service: (s as any).subscription?.service?.display_name,
          slot_number: s.slot_number,
          status: s.status,
          next_payment: s.next_payment ? {
            amount: s.next_payment.amount,
            due_date: s.next_payment.due_date,
          } : null,
        })) || [],
      },
    });
  } catch (err) {
    console.error('Error fetching telegram status:', err);
    return errorResponse('Failed to fetch status');
  }
}