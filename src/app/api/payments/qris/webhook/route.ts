import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';

// Webhook secret for verifying Xoftware requests
const WEBHOOK_SECRET = process.env.XOFTWARE_WEBHOOK_SECRET || '';

interface XoftwareWebhookPayload {
  event: string;
  transaction_id: string;
  reff_id?: string;
  sender: string;
  product_code: string;
  quantity: number;
  total_price: number;
  platform: string;
  accounts?: Array<{
    account: string;
    password?: string;
    [key: string]: unknown;
  }>;
  status?: string;
  timestamp?: string;
}

// POST /api/payments/qris/webhook - Handle Xoftware webhook callbacks
export async function POST(request: Request) {
  try {
    // Verify webhook secret if configured
    if (WEBHOOK_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
        return errorResponse('Unauthorized', 401);
      }
    }

    const payload: XoftwareWebhookPayload = await request.json();

    console.log('Xoftware webhook received:', JSON.stringify(payload, null, 2));

    // Find payment by transaction_ref. We store transaction_id, but some callbacks
    // include reff_id as the first useful reference, so try both.
    const searchRefs = [payload.transaction_id, payload.reff_id].filter(Boolean);

    const { data: payment, error: findError } = await supabaseAdmin
      .from('payments')
      .select('id, status, customer_subscription_id')
      .in('transaction_ref', searchRefs)
      .single();

    if (findError || !payment) {
      console.log('Payment not found for webhook:', searchRefs.join(', '));
      // Still return success to acknowledge receipt
      return successResponse({ received: true, message: 'Payment not found' });
    }

    // Update payment based on event type
    if (payload.event === 'buy_account' || payload.event === 'buy_balance') {
      // Handle successful payment
      if (payload.status === 'success' || payload.accounts?.length) {
        await supabaseAdmin
          .from('payments')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString().split('T')[0],
            notes: payload.accounts
              ? `Account: ${JSON.stringify(payload.accounts)}`
              : undefined,
          })
          .eq('id', payment.id);

        await supabaseAdmin
          .from('customer_subscriptions')
          .update({ status: 'active' })
          .eq('id', payment.customer_subscription_id)
          .eq('status', 'pending');

        console.log(`Payment ${payment.id} marked as paid via webhook`);
      }
    }

    return successResponse({
      received: true,
      payment_id: payment.id,
      status: 'processed',
    });

  } catch (err) {
    console.error('Error processing Xoftware webhook:', err);
    // Return 200 to prevent retries for non-critical errors
    return successResponse({ received: true, error: 'Processing failed' });
  }
}

// GET /api/payments/qris/webhook - Health check
export async function GET() {
  return successResponse({
    status: 'ok',
    service: 'xoftware-qris-webhook',
    timestamp: new Date().toISOString(),
  });
}
