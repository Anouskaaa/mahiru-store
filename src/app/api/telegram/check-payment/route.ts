import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';

// Xoftware API Configuration
const XOFTWARE_API_URL = 'https://backend-s2.xoftware.id/v1/order';
const XOFTWARE_API_KEY = process.env.XOFTWARE_API_KEY || '';

type TelegramPaymentData = {
  id: string;
  amount: number | string;
  status: string;
  transaction_ref: string | null;
  customer_subscription?: {
    id: string;
    subscription_id: string;
    slot_number: number;
    subscription?: {
      service?: {
        display_name?: string;
      };
    };
  };
};

type XoftwareStatusResponse = {
  status?: string;
};

// GET /api/telegram/check-payment - Check QRIS payment status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const transaction_id = searchParams.get('transaction_id');
    const telegram_id = searchParams.get('telegram_id');

    if (!transaction_id && !telegram_id) {
      return errorResponse('transaction_id or telegram_id is required', 400);
    }

    let paymentData: TelegramPaymentData | null = null;

    // Find payment by transaction_id or telegram_id
    if (transaction_id) {
      const { data: payment } = await supabaseAdmin
        .from('payments')
        .select('*, customer_subscription:customer_subscriptions(*, customer:customers(*), subscription:subscriptions(service:services(*)))')
        .eq('transaction_ref', transaction_id)
        .single();

      if (payment) {
        paymentData = payment as unknown as TelegramPaymentData;
      }
    }

    if (!paymentData && telegram_id) {
      // Find latest pending payment for this customer
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('telegram_id', telegram_id)
        .single();

      if (customer) {
        const { data: payments } = await supabaseAdmin
          .from('payments')
          .select('*, customer_subscription:customer_subscriptions(*, customer:customers(*), subscription:subscriptions(service:services(*)))')
          .eq('customer_subscription.customer_id', customer.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (payments && payments.length > 0) {
          paymentData = payments[0] as unknown as TelegramPaymentData;
        }
      }
    }

    if (!paymentData) {
      return errorResponse('Payment not found', 404);
    }

    // Check with Xoftware API
    if (XOFTWARE_API_KEY && paymentData.transaction_ref) {
      const xoftwareResponse = await fetch(
        `${XOFTWARE_API_URL}/status?transaction_id=${paymentData.transaction_ref}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': XOFTWARE_API_KEY,
          },
        }
      );

      const xoftwareData = await xoftwareResponse.json() as XoftwareStatusResponse;

      if (xoftwareResponse.ok && xoftwareData.status) {
        // Update local payment status
        if (xoftwareData.status === 'success') {
          // Mark payment as paid
          await supabaseAdmin
            .from('payments')
            .update({
              status: 'paid',
              paid_date: new Date().toISOString().split('T')[0],
            })
            .eq('id', paymentData.id);

          // Activate the subscription
          if (paymentData.customer_subscription) {
            await supabaseAdmin
              .from('customer_subscriptions')
              .update({ status: 'active' })
              .eq('id', paymentData.customer_subscription.id);

            // Get invite link
            const { data: inviteLink } = await supabaseAdmin
              .from('invite_links')
              .select('link')
              .eq('subscription_id', paymentData.customer_subscription.subscription_id)
              .eq('slot_number', paymentData.customer_subscription.slot_number)
              .single();

            return successResponse({
              status: 'success',
              payment_id: paymentData.id,
              service: paymentData.customer_subscription.subscription?.service?.display_name,
              invite_link: inviteLink?.link || null,
              slot_number: paymentData.customer_subscription.slot_number,
              message: 'Pembayaran berhasil! Langganan kamu sekarang aktif.',
            });
          }
        }
      }
    }

    // Return current status from database
    return successResponse({
      status: paymentData.status,
      payment_id: paymentData.id,
      amount: paymentData.amount,
      transaction_ref: paymentData.transaction_ref,
      service: paymentData.customer_subscription?.subscription?.service?.display_name,
    });

  } catch (err) {
    console.error('Error checking payment:', err);
    return errorResponse('Failed to check payment status');
  }
}
