import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';

// Xoftware API Configuration
const XOFTWARE_API_URL = 'https://backend-s2.xoftware.id/v1/order';
const XOFTWARE_API_KEY = process.env.XOFTWARE_API_KEY || '';

interface CheckStatusBody {
  transaction_id?: string;
  reff_id?: string;
}

type XoftwareStatusResponse = {
  transaction_id?: string;
  ref_id?: string;
  reff_id?: string;
  status?: string;
  amount?: number;
  total?: number;
  accounts?: unknown;
  product?: unknown;
  error?: string;
};

// GET/POST /api/payments/qris/check - Check QRIS payment status
export async function GET(request: Request) {
  return handleCheckStatus(request);
}

export async function POST(request: Request) {
  return handleCheckStatus(request);
}

async function handleCheckStatus(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const transaction_id = searchParams.get('transaction_id');
    const reff_id = searchParams.get('reff_id');

    // Or get from body
    let body: CheckStatusBody = {};
    try {
      body = await request.json();
    } catch {}

    const txId = transaction_id || body.transaction_id;
    const refId = reff_id || body.reff_id;

    if (!txId && !refId) {
      return errorResponse('transaction_id or reff_id is required', 400);
    }

    if (!XOFTWARE_API_KEY) {
      return errorResponse('Xoftware API key not configured', 500);
    }

    // Check payment status via Xoftware API
    const queryParams = txId
      ? `transaction_id=${txId}`
      : `reff_id=${refId}`;

    const xoftwareResponse = await fetch(
      `${XOFTWARE_API_URL}/status?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'X-API-Key': XOFTWARE_API_KEY,
        },
      }
    );

    const xoftwareData = await xoftwareResponse.json() as XoftwareStatusResponse;

    if (!xoftwareResponse.ok) {
      console.error('Xoftware status check error:', xoftwareData);
      return errorResponse(xoftwareData.error || 'Failed to check payment status', 500);
    }

    // Update local payment if status changed
    if (xoftwareData.transaction_id || xoftwareData.ref_id || xoftwareData.reff_id || txId || refId) {
      const refToSearch = xoftwareData.transaction_id || txId || xoftwareData.ref_id || xoftwareData.reff_id || refId;

      // Find payment by transaction_ref
      const { data: payment } = await supabaseAdmin
        .from('payments')
        .select('id, status, customer_subscription_id')
        .eq('transaction_ref', refToSearch)
        .single();

      if (payment && xoftwareData.status) {
        // Map Xoftware status to our status
        const newStatus = xoftwareData.status === 'success' ? 'paid' :
                          xoftwareData.status === 'fail' ? 'cancelled' : payment.status;

        if (payment.status !== newStatus) {
          await supabaseAdmin
            .from('payments')
            .update({
              status: newStatus,
              paid_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
            })
            .eq('id', payment.id);

          if (newStatus === 'paid') {
            await supabaseAdmin
              .from('customer_subscriptions')
              .update({ status: 'active' })
              .eq('id', payment.customer_subscription_id)
              .eq('status', 'pending');
          }
        }
      }
    }

    return successResponse({
      transaction_id: xoftwareData.transaction_id || refId,
      reff_id: xoftwareData.ref_id || xoftwareData.reff_id || txId,
      status: xoftwareData.status,
      amount: xoftwareData.amount,
      total: xoftwareData.total,
      accounts: xoftwareData.accounts,
      product: xoftwareData.product,
    }, 'Payment status retrieved');

  } catch (err) {
    console.error('Error checking QRIS payment status:', err);
    return errorResponse('Failed to check payment status');
  }
}
