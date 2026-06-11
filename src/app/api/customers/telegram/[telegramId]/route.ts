import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';
import type { Customer } from '@/types';

interface RouteParams {
  params: Promise<{ telegramId: string }>;
}

type CustomerWithSubscriptions = Customer & {
  subscriptions: unknown[];
};

// GET /api/customers/telegram/[telegramId] - Find customer by Telegram ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { telegramId } = await params;

    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          error: 'Customer not found',
          action: 'Please register first via /start'
        }, { status: 404 });
      }
      throw error;
    }

    // Get customer's active subscriptions
    const { data: subscriptions } = await supabaseAdmin
      .from('customer_subscriptions')
      .select(`
        *,
        subscription:subscriptions(
          *,
          service:services(*)
        )
      `)
      .eq('customer_id', data.id)
      .eq('status', 'active');

    return successResponse({
      ...data,
      subscriptions: subscriptions || [],
    } as CustomerWithSubscriptions);
  } catch (err) {
    console.error('Error finding customer by telegram:', err);
    return errorResponse('Failed to find customer');
  }
}
