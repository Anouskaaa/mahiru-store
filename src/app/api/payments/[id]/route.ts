import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';
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

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/payments/[id] - Get a single payment
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

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
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('Payment not found', 404);
      }
      throw error;
    }

    return successResponse(attachQRISData(data) as PaymentWithQRIS);
  } catch (err) {
    console.error('Error fetching payment:', err);
    return errorResponse('Failed to fetch payment');
  }
}

// PUT /api/payments/[id] - Update a payment
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Partial<Payment> = {};

    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.due_date !== undefined) updateData.due_date = body.due_date;
    if (body.paid_date !== undefined) updateData.paid_date = body.paid_date;
    if (body.payment_method !== undefined) updateData.payment_method = body.payment_method;
    if (body.transaction_ref !== undefined) updateData.transaction_ref = body.transaction_ref;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const { data, error } = await supabaseAdmin
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return successResponse(data as Payment, 'Payment updated successfully');
  } catch (err) {
    console.error('Error updating payment:', err);
    return errorResponse('Failed to update payment');
  }
}

// DELETE /api/payments/[id] - Delete a payment
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return successResponse(null, 'Payment deleted successfully');
  } catch (err) {
    console.error('Error deleting payment:', err);
    return errorResponse('Failed to delete payment');
  }
}
