import { NextResponse } from 'next/server';
import type { ApiResponse, PaginatedResponse } from '@/types';

export function successResponse<T>(data: T, message?: string, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ data, message }, { status });
}

export function errorResponse(error: string, status = 400) {
  return NextResponse.json<ApiResponse<null>>({ error }, { status });
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  });
}

export function getPaginationParams(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// Simple API key validation
export function validateApiKey(request: Request): boolean {
  const apiKey = request.headers.get('X-API-Key');
  const validKey = process.env.API_SECRET_KEY;

  // If no API key is set, allow all (dev mode)
  if (!validKey) return true;

  return apiKey === validKey;
}

export function unauthorizedResponse() {
  return NextResponse.json<ApiResponse<null>>(
    { error: 'Unauthorized - Invalid API key' },
    { status: 401 }
  );
}