import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';
import type { Customer, CustomerSubscription } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/customers/[id] - Get a single customer with subscriptions
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get customer
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (customerError) {
      if (customerError.code === 'PGRST116') {
        return errorResponse('Customer not found', 404);
      }
      throw customerError;
    }

    // Get customer's subscriptions with related data
    const { data: subscriptions } = await supabaseAdmin
      .from('customer_subscriptions')
      .select(`
        *,
        subscription:subscriptions(
          *,
          service:services(*)
        ),
        next_payment:payments(*)
      `)
      .eq('customer_id', id)
      .eq('status', 'active');

    // Get payment history
    const { data: paymentHistory } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        customer_subscription:customer_subscriptions(
          subscription:subscriptions(
            service:services(*)
          )
        )
      `)
      .in('customer_subscription_id', subscriptions?.map(s => s.id) || [])
      .order('created_at', { ascending: false })
      .limit(10);

    return successResponse({
      ...customer,
      subscriptions: subscriptions || [],
      paymentHistory: paymentHistory || [],
    });
  } catch (err) {
    console.error('Error fetching customer:', err);
    return errorResponse('Failed to fetch customer');
  }
}

// PUT /api/customers/[id] - Update a customer
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from('customers')
      .update({
        name: body.name,
        telegram_id: body.telegram_id,
        telegram_username: body.telegram_username,
        whatsapp: body.whatsapp,
        email: body.email,
        notes: body.notes,
        is_active: body.is_active,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return successResponse(data as Customer, 'Customer updated successfully');
  } catch (err) {
    console.error('Error updating customer:', err);
    return errorResponse('Failed to update customer');
  }
}

// DELETE /api/customers/[id] - Delete a customer
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return successResponse(null, 'Customer deleted successfully');
  } catch (err) {
    console.error('Error deleting customer:', err);
    return errorResponse('Failed to delete customer');
  }
}