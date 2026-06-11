import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse, getPaginationParams } from '@/lib/api';
import type { Payment } from '@/types';

type PaymentWithQRIS = Payment & {
  qris_data?: {
    reff_id?: string;
    qr_string?: string;
    link?: string;
    amount?: number;
    total_to_pay?: number;
    expired_at?: string;
  };
};

function attachQRISData<T extends { notes?: string | null }>(payment: T): T {
  if (!payment.notes) return payment;

  try {
    const parsed = JSON.parse(payment.notes) as { qris_data?: PaymentWithQRIS['qris_data'] };
    if (parsed.qris_data) {
      return {
        ...payment,
        qris_data: parsed.qris_data,
      };
    }
  } catch {
    // Notes can be plain text for non-QRIS payments.
  }

  return payment;
}

// GET /api/payments - List all payments
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customer_id');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    let query = supabaseAdmin
      .from('payments')
      .select(`
        *,
        customer_subscription:customer_subscriptions(
          customer:customers(*),
          subscription:subscriptions(
            service:services(*)
          )
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (customerId) {
      query = query.eq('customer_subscription.customer_id', customerId);
    }

    if (fromDate) {
      query = query.gte('due_date', fromDate);
    }

    if (toDate) {
      query = query.lte('due_date', toDate);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      data: (data || []).map(attachQRISData) as PaymentWithQRIS[],
      count: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('Error fetching payments:', err);
    return errorResponse('Failed to fetch payments');
  }
}

// POST /api/payments - Record a new payment
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert({
        customer_subscription_id: body.customer_subscription_id,
        amount: body.amount,
        currency: body.currency || 'IDR',
        status: body.paid_date ? 'paid' : 'pending',
        due_date: body.due_date,
        paid_date: body.paid_date,
        payment_method: body.payment_method,
        transaction_ref: body.transaction_ref,
        notes: body.notes,
      })
      .select()
      .single();

    if (error) throw error;

    return successResponse(data as Payment, 'Payment recorded successfully', 201);
  } catch (err) {
    console.error('Error recording payment:', err);
    return errorResponse('Failed to record payment');
  }
}
