import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';

interface RouteParams {
  params: Promise<{ telegramId: string }>;
}

type RenewalSubscription = {
  subscription?: {
    renewal_date?: string;
    service?: {
      display_name?: string;
    };
  };
};

// GET /api/telegram/renewal/[telegramId] - Check renewal dates via Telegram
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { telegramId } = await params;

    // Find customer by telegram ID
    const { data: customer, error } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('telegram_id', telegramId)
      .single();

    if (error || !customer) {
      return NextResponse.json({
        error: 'Customer not found',
        action: 'Please register first via /start'
      }, { status: 404 });
    }

    // Get customer's active subscriptions with renewal dates
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

    if (!subscriptions || subscriptions.length === 0) {
      return successResponse({
        subscriptions: [],
        message: 'You have no active subscriptions',
      });
    }

    const today = new Date();

    const subscriptionsWithDays = (subscriptions as unknown as RenewalSubscription[] | null)?.map(sub => {
      const renewalDate = new Date(sub.subscription?.renewal_date || '');
      const daysUntil = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      return {
        service: sub.subscription?.service?.display_name,
        renewal_date: sub.subscription?.renewal_date,
        days_until_renewal: daysUntil,
        status: daysUntil <= 7 ? 'urgent' : daysUntil <= 30 ? 'soon' : 'ok',
      };
    });

    return successResponse({
      subscriptions: subscriptionsWithDays || [],
    });
  } catch (err) {
    console.error('Error checking renewal:', err);
    return errorResponse('Failed to check renewal dates');
  }
}
