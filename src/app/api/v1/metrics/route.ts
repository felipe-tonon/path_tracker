/**
 * Get Metrics Endpoint
 * GET /api/v1/metrics
 *
 * Get aggregated metrics for a time range.
 * Authentication: Clerk Session
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClerkAuth } from '@/lib/auth/clerk';
import { getMetrics } from '@/lib/services/queries';

// Query params schema
const queryParamsSchema = z.object({
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  service: z.string().optional(),
  type: z.enum(['rest', 'llm']).optional(),
  granularity: z.enum(['minute', 'hour', 'day']).optional().default('hour'),
});

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const auth = await getClerkAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = queryParamsSchema.safeParse(searchParams);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid query parameters',
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    // Get metrics
    const metrics = await getMetrics(auth.tenant_id, parseResult.data);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch metrics',
        },
      },
      { status: 500 }
    );
  }
}
