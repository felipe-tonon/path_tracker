/**
 * Track REST Request Endpoint
 * POST /api/v1/tracker/rest
 *
 * Track a generic REST API request (non-LLM).
 * Authentication: API Key (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateApiKey } from '@/lib/auth/api-key';
import { trackRestEvent } from '@/lib/services/tracking';

// Validation schema
const restEventSchema = z.object({
  request_id: z.string().min(1),
  user_id: z.string().optional(),
  environment: z.string().optional(),
  correlation_id: z.string().optional(),
  request_timestamp: z.string().datetime(),
  response_timestamp: z.string().datetime(),
  service: z.string().min(1),
  method: z.string().min(1),
  url: z.string().min(1),
  status_code: z.number().int().min(100).max(599),
  attempt_number: z.number().int().min(1).optional(),
  original_request_id: z.string().optional(),
  request_body: z.unknown().optional(),
  response_body: z.unknown().optional(),
  request_size_bytes: z.number().int().optional(),
  response_size_bytes: z.number().int().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const authHeader = request.headers.get('authorization');
    const auth = await validateApiKey(authHeader);

    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const parseResult = restEventSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request body',
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    // Track the event
    const result = await trackRestEvent(auth.tenant_id, parseResult.data);

    return NextResponse.json(
      {
        success: true,
        event_id: result.event_id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error tracking REST event:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to track event',
        },
      },
      { status: 500 }
    );
  }
}
