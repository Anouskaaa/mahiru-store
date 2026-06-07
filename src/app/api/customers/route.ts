import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse, getPaginationParams } from '@/lib/api';
import type { Customer } from '@/types';

// GET /api/customers - List all customers
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('active') !== 'false';

    let query = supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,telegram_username.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    // Get active subscription counts for each customer
    const customerIds = data?.map(c => c.id) || [];
    if (customerIds.length > 0) {
      const { data: subCounts } = await supabaseAdmin
        .from('customer_subscriptions')
        .select('customer_id')
        .in('customer_id', customerIds)
        .eq('status', 'active');

      const countMap = new Map<string, number>();
      subCounts?.forEach(sub => {
        countMap.set(sub.customer_id, (countMap.get(sub.customer_id) || 0) + 1);
      });

      data?.forEach(customer => {
        customer.active_subscriptions_count = countMap.get(customer.id) || 0;
      });
    }

    return NextResponse.json({
      data: data as Customer[],
      count: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('Error fetching customers:', err);
    return errorResponse('Failed to fetch customers');
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from('customers')
      .insert({
        name: body.name,
        telegram_id: body.telegram_id,
        telegram_username: body.telegram_username,
        whatsapp: body.whatsapp,
        email: body.email,
        notes: body.notes,
      })
      .select()
      .single();

    if (error) throw error;

    return successResponse(data as Customer, 'Customer created successfully', 201);
  } catch (err) {
    console.error('Error creating customer:', err);
    return errorResponse('Failed to create customer');
  }
}