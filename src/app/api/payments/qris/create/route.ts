import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';

// Xoftware API Configuration
const XOFTWARE_API_URL = 'https://backend-s2.xoftware.id/v1/order';
const XOFTWARE_API_KEY = process.env.XOFTWARE_API_KEY || '';

interface QRISRequestBody {
  payment_id: string;
  amount: number;
}

interface XoftwareQRISResponse {
  success: boolean;
  data?: {
    transaction_id: string;
    reff_id: string;
    amount: number;
    total_to_pay: number;
    qr_string: string;
    link: string;
    expired_at: string;
    status: string;
  };
  error?: string;
}

// POST /api/payments/qris/create - Create QRIS payment via Xoftware
export async function POST(request: Request) {
  try {
    const body: QRISRequestBody = await request.json();
    const { payment_id, amount } = body;

    if (!payment_id || !amount) {
      return errorResponse('payment_id and amount are required', 400);
    }

    if (!XOFTWARE_API_KEY) {
      return errorResponse('Xoftware API key not configured', 500);
    }

    // Validate amount (minimum 10.000 IDR for QRIS)
    if (amount < 10000) {
      return errorResponse('Minimum amount for QRIS is Rp 10.000', 400);
    }

    // Get payment details
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        customer_subscription:customer_subscriptions(
          customer:customers(id, name, telegram_username, whatsapp),
          subscription:subscriptions(
            service:services(display_name)
          )
        )
      `)
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      return errorResponse('Payment not found', 404);
    }

    // Prepare sender identifier (use telegram or whatsapp)
    const customer = payment.customer_subscription?.customer;
    const serviceName = payment.customer_subscription?.subscription?.service?.display_name;
    const sender = customer?.telegram_username ||
                   customer?.whatsapp ||
                   customer?.name ||
                   `payment:${payment_id}`;

    // Create QRIS order via Xoftware API
    const xoftwareResponse = await fetch(`${XOFTWARE_API_URL}/qris`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': XOFTWARE_API_KEY,
      },
      body: JSON.stringify({
        sender: sender,
        code: 'QRIS', // Product code for QRIS
        quantity: 1,
        amount: amount,
      }),
    });

    const xoftwareData: XoftwareQRISResponse = await xoftwareResponse.json();

    if (!xoftwareResponse.ok || !xoftwareData.success || !xoftwareData.data) {
      console.error('Xoftware API error:', xoftwareData);
      return errorResponse(xoftwareData.error || 'Failed to create QRIS payment', 500);
    }

    // Update payment with QRIS transaction details
    const notes = JSON.stringify({
      customer_id: customer?.id,
      service_name: serviceName,
      qris_data: {
        reff_id: xoftwareData.data.reff_id,
        qr_string: xoftwareData.data.qr_string,
        link: xoftwareData.data.link,
        amount: xoftwareData.data.amount,
        total_to_pay: xoftwareData.data.total_to_pay,
        expired_at: xoftwareData.data.expired_at,
      },
    });

    const updateData = {
      transaction_ref: xoftwareData.data.transaction_id,
      payment_method: 'qris',
      notes,
    };

    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update(updateData)
      .eq('id', payment_id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update payment with QRIS data:', updateError);
      // Don't fail the whole request, return what we got from Xoftware
    }

    return successResponse({
      payment_id: payment_id,
      transaction_id: xoftwareData.data.transaction_id,
      reff_id: xoftwareData.data.reff_id,
      qr_string: xoftwareData.data.qr_string,
      link: xoftwareData.data.link,
      amount: xoftwareData.data.amount,
      total_to_pay: xoftwareData.data.total_to_pay,
      expired_at: xoftwareData.data.expired_at,
      status: 'pending',
    }, 'QRIS payment created successfully', 201);

  } catch (err) {
    console.error('Error creating QRIS payment:', err);
    return errorResponse('Failed to create QRIS payment');
  }
}
