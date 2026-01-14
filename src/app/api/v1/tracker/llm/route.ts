/**
 * Track LLM Request Endpoint
 * POST /api/v1/tracker/llm
 *
 * Track an LLM API request (OpenAI, Anthropic, etc.).
 * Authentication: API Key (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateApiKey } from '@/lib/auth/api-key';
import { trackLlmEvent } from '@/lib/services/tracking';

// Validation schema
const llmEventSchema = z.object({
  request_id: z.string().min(1),
  user_id: z.string().optional(),
  environment: z.string().optional(),
  correlation_id: z.string().optional(),
  request_timestamp: z.string().datetime(),
  response_timestamp: z.string().datetime(),
  service: z.string().min(1),
  url: z.string().min(1),
  status_code: z.number().int().min(100).max(599),
  provider: z.string().min(1),
  model: z.string().min(1),
  endpoint: z.string().min(1),
  prompt_tokens: z.number().int().min(0),
  completion_tokens: z.number().int().min(0),
  total_tokens: z.number().int().min(0),
  cost_usd: z.number().min(0),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).optional(),
  top_p: z.number().min(0).max(1).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  finish_reason: z.string().optional(),
  is_streaming: z.boolean().optional(),
  time_to_first_token_ms: z.number().int().min(0).optional(),
  function_calls: z.array(z.unknown()).optional(),
  conversation_id: z.string().optional(),
  attempt_number: z.number().int().min(1).optional(),
  original_request_id: z.string().optional(),
  warnings: z.array(z.unknown()).optional(),
  request_body: z.unknown().optional(),
  response_body: z.unknown().optional(),
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
    const parseResult = llmEventSchema.safeParse(body);

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
    const result = await trackLlmEvent(auth.tenant_id, parseResult.data);

    return NextResponse.json(
      {
        success: true,
        event_id: result.event_id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error tracking LLM event:', error);
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
