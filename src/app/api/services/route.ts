import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse, getPaginationParams } from '@/lib/api';
import type { Service } from '@/types';

// GET /api/services - List all services
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const activeOnly = searchParams.get('active') !== 'false';

    let query = supabaseAdmin
      .from('services')
      .select('*', { count: 'exact' })
      .order('display_name');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      data: data as Service[],
      count: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('Error fetching services:', err);
    return errorResponse('Failed to fetch services');
  }
}

// POST /api/services - Create a new service
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from('services')
      .insert({
        name: body.name.toLowerCase().replace(/\s+/g, '_'),
        display_name: body.display_name,
        description: body.description,
        icon: body.icon,
        total_slots: body.total_slots || 6,
        owner_cost: body.owner_cost,
        resale_price: body.resale_price,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return errorResponse('A service with this name already exists', 409);
      }
      throw error;
    }

    return successResponse(data as Service, 'Service created successfully', 201);
  } catch (err) {
    console.error('Error creating service:', err);
    return errorResponse('Failed to create service');
  }
}