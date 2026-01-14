/**
 * Query Logs Endpoint
 * GET /api/v1/logs
 *
 * Query request logs with filtering.
 * Authentication: Clerk Session
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClerkAuth } from '@/lib/auth/clerk';
import { queryLogs } from '@/lib/services/queries';

// Query params schema
const queryParamsSchema = z.object({
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  request_id: z.string().optional(),
  user_id: z.string().optional(),
  service: z.string().optional(),
  environment: z.string().optional(),
  type: z.enum(['rest', 'llm']).optional(),
  status_code: z.coerce.number().int().optional(),
  conversation_id: z.string().optional(),
  finish_reason: z.string().optional(),
  original_request_id: z.string().optional(),
  include_bodies: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
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

    // Query logs
    const logs = await queryLogs(auth.tenant_id, parseResult.data);

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error querying logs:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to query logs',
        },
      },
      { status: 500 }
    );
  }
}
