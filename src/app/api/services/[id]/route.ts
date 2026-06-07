import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api';
import type { Service } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/services/[id] - Get a single service
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('Service not found', 404);
      }
      throw error;
    }

    return successResponse(data as Service);
  } catch (err) {
    console.error('Error fetching service:', err);
    return errorResponse('Failed to fetch service');
  }
}

// PUT /api/services/[id] - Update a service
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Partial<Service> = {};

    if (body.display_name !== undefined) updateData.display_name = body.display_name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.total_slots !== undefined) updateData.total_slots = body.total_slots;
    if (body.owner_cost !== undefined) updateData.owner_cost = body.owner_cost;
    if (body.resale_price !== undefined) updateData.resale_price = body.resale_price;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data, error } = await supabaseAdmin
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return successResponse(data as Service, 'Service updated successfully');
  } catch (err) {
    console.error('Error updating service:', err);
    return errorResponse('Failed to update service');
  }
}

// DELETE /api/services/[id] - Delete a service
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return successResponse(null, 'Service deleted successfully');
  } catch (err) {
    console.error('Error deleting service:', err);
    return errorResponse('Failed to delete service');
  }
}