import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';

// Xoftware API Configuration
const XOFTWARE_API_URL = 'https://backend-s2.xoftware.id/v1';
const XOFTWARE_API_KEY = process.env.XOFTWARE_API_KEY || '';

// POST /api/telegram/create-order - Create order and generate QRIS
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { telegram_id, service_id, amount, whatsapp, name } = body;

    if (!telegram_id || !service_id || !amount) {
      return errorResponse('telegram_id, service_id, and amount are required', 400);
    }

    // Get or create customer
    let { data: customer } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('telegram_id', telegram_id)
      .single();

    if (!customer) {
      // Create new customer
      const { data: newCustomer, error: createError } = await supabaseAdmin
        .from('customers')
        .insert({
          name: name || `Customer_${telegram_id}`,
          telegram_id: telegram_id,
          whatsapp: whatsapp || null,
        })
        .select()
        .single();

      if (createError || !newCustomer) {
        return errorResponse('Failed to create customer', 500);
      }
      customer = newCustomer;
    }

    // Get service details
    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('id', service_id)
      .single();

    if (serviceError || !service) {
      return errorResponse('Service not found', 404);
    }

    // Round amount to nearest 1000
    const roundedAmount = Math.ceil(amount / 1000) * 1000;

    // Create QRIS via Xoftware API
    if (!XOFTWARE_API_KEY) {
      return errorResponse('Xoftware API key not configured', 500);
    }

    // Determine sender - use telegram_id as sender
    const sender = `telegram:${telegram_id}`;

    console.log('Creating QRIS with sender:', sender);

    // Step 1: Register user first (if not exists)
    console.log('Registering user to Xoftware...');
    const registerResponse = await fetch(`${XOFTWARE_API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': XOFTWARE_API_KEY,
      },
      body: JSON.stringify({
        sender: sender,
        name: customer.name || `User_${telegram_id}`,
      }),
    });

    // const registerData = await registerResponse.json();
    // console.log('Register response:', registerData);
    const registerData = await registerResponse.json();
    console.log('Register response:', registerData);
    console.log('Register status:', registerResponse.status);
    console.log('Sender used:', sender);
    // Even if registration fails (user already exists), continue to create QRIS

    // Step 2: Create QRIS
    const xoftwareResponse = await fetch(`${XOFTWARE_API_URL}/qris`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': XOFTWARE_API_KEY,
      },
      body: JSON.stringify({
        sender: sender,
        code: 'QRIS',
        quantity: 1,
        amount: roundedAmount,
      }),
    });

    const xoftwareData = await xoftwareResponse.json();

    // Handle specific Xoftware errors
    if (!xoftwareData.success) {
      console.error('Xoftware API error:', xoftwareData);

      // Check for "User not found" error
      if (xoftwareData.error === 'User not found') {
        return NextResponse.json(
          {
            success: false,
            error: 'Sender tidak ditemukan di sistem Xoftware. Pastikan Anda sudah terdaftar di Xoftware atau gunakan nomor WhatsApp yang valid.',
            xoftware_error: xoftwareData.error
          },
          { status: 400 }
        );
      }

      return errorResponse(xoftwareData.error || 'Failed to create QRIS payment', 500);
    }

    if (!xoftwareResponse.ok || !xoftwareData.data) {
      console.error('Xoftware API error:', xoftwareData);
      return errorResponse(xoftwareData.error || 'Failed to create QRIS payment', 500);
    }

    const qris = xoftwareData.data;

    // Find or create pending subscription
    let { data: pendingSub } = await supabaseAdmin
      .from('customer_subscriptions')
      .select('*')
      .eq('customer_id', customer.id)
      .eq('status', 'pending')
      .eq('subscription_id', service_id)
      .single();

    // Create pending subscription if not exists
    if (!pendingSub) {
      // Find available slot in subscription
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('*, service:services(*)')
        .eq('service_id', service_id)
        .eq('status', 'active')
        .single();

      if (!subscription) {
        return errorResponse('No active subscription found for this service', 404);
      }

      // Find available slot
      const { data: occupiedSlots } = await supabaseAdmin
        .from('customer_subscriptions')
        .select('slot_number')
        .eq('subscription_id', subscription.id)
        .eq('status', 'active');

      const totalSlots = subscription.service?.total_slots || 6;
      const occupiedNumbers = occupiedSlots?.map((s: any) => s.slot_number) || [];
      const availableSlot = Array.from({ length: totalSlots }, (_, i) => i + 1)
        .find(slot => !occupiedNumbers.includes(slot));

      if (!availableSlot) {
        return errorResponse('No available slots', 400);
      }

      // Create pending subscription
      const { data: newPendingSub, error: createSubError } = await supabaseAdmin
        .from('customer_subscriptions')
        .insert({
          customer_id: customer.id,
          subscription_id: subscription.id,
          slot_number: availableSlot,
          status: 'pending',
          start_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (createSubError || !newPendingSub) {
        return errorResponse('Failed to create pending subscription', 500);
      }
      pendingSub = newPendingSub;
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        customer_subscription_id: pendingSub.id,
        amount: roundedAmount,
        currency: 'IDR',
        status: 'pending',
        due_date: qris.expired_at.split('T')[0],
        payment_method: 'qris',
        transaction_ref: qris.transaction_id,
        notes: `QRIS for ${service.display_name} - Telegram: ${telegram_id}`,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to create payment:', paymentError);
      // Don't fail, we still have the QRIS data
    }

    // Store QRIS data in metadata (using notes as temporary storage)
    if (payment) {
      await supabaseAdmin
        .from('payments')
        .update({
          notes: JSON.stringify({
            customer_id: customer.id,
            service_id: service_id,
            service_name: service.display_name,
            qris_data: {
              reff_id: qris.reff_id,
              qr_string: qris.qr_string,
              link: qris.link,
              amount: qris.amount,
              total_to_pay: qris.total_to_pay,
              expired_at: qris.expired_at,
            }
          })
        })
        .eq('id', payment.id);
    }

    return successResponse({
      payment_id: payment?.id,
      customer_id: customer.id,
      service: service.display_name,
      transaction_id: qris.transaction_id,
      reff_id: qris.reff_id,
      qr_string: qris.qr_string,
      link: qris.link,
      amount: qris.amount,
      total_to_pay: qris.total_to_pay,
      expired_at: qris.expired_at,
      status: 'pending',
    }, 'Order created, QRIS generated');

  } catch (err) {
    console.error('Error creating order:', err);
    return errorResponse('Failed to create order');
  }
}