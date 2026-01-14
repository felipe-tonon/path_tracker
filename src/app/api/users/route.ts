/**
 * User Analytics API
 * GET /api/users - Get user-level analytics
 *
 * Authentication: Clerk Session
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClerkAuth } from '@/lib/auth/clerk';
import { queryAll } from '@/lib/db';

// Query params schema
const queryParamsSchema = z.object({
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

interface UserStats {
  user_id: string;
  total_requests: number;
  rest_requests: number;
  llm_requests: number;
  total_tokens: number;
  total_cost: number;
  first_seen: string;
  last_seen: string;
}

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

    const { limit } = parseResult.data;

    // Default to last 30 days
    const now = new Date();
    const startTime =
      parseResult.data.start_time ||
      new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endTime = parseResult.data.end_time || now.toISOString();

    // Query user stats from both REST and LLM events
    const users = await queryAll<UserStats>(
      `WITH rest_stats AS (
        SELECT 
          user_id,
          COUNT(*) as request_count,
          MIN(request_timestamp) as first_seen,
          MAX(request_timestamp) as last_seen
        FROM rest_events
        WHERE tenant_id = $1 
          AND user_id IS NOT NULL
          AND request_timestamp >= $2 
          AND request_timestamp <= $3
        GROUP BY user_id
      ),
      llm_stats AS (
        SELECT 
          user_id,
          COUNT(*) as request_count,
          COALESCE(SUM(total_tokens), 0) as total_tokens,
          COALESCE(SUM(cost_usd), 0) as total_cost,
          MIN(request_timestamp) as first_seen,
          MAX(request_timestamp) as last_seen
        FROM llm_events
        WHERE tenant_id = $1 
          AND user_id IS NOT NULL
          AND request_timestamp >= $2 
          AND request_timestamp <= $3
        GROUP BY user_id
      )
      SELECT 
        COALESCE(r.user_id, l.user_id) as user_id,
        COALESCE(r.request_count, 0) + COALESCE(l.request_count, 0) as total_requests,
        COALESCE(r.request_count, 0)::int as rest_requests,
        COALESCE(l.request_count, 0)::int as llm_requests,
        COALESCE(l.total_tokens, 0)::int as total_tokens,
        COALESCE(l.total_cost, 0)::numeric as total_cost,
        LEAST(r.first_seen, l.first_seen) as first_seen,
        GREATEST(r.last_seen, l.last_seen) as last_seen
      FROM rest_stats r
      FULL OUTER JOIN llm_stats l ON r.user_id = l.user_id
      ORDER BY total_requests DESC
      LIMIT $4`,
      [auth.tenant_id, startTime, endTime, limit]
    );

    return NextResponse.json({
      users,
      period: {
        start: startTime,
        end: endTime,
      },
      total: users.length,
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user analytics',
        },
      },
      { status: 500 }
    );
  }
}
