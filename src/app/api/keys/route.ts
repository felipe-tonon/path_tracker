/**
 * API Key Management Endpoints
 * POST /api/keys - Create API key
 * GET /api/keys - List API keys
 *
 * Authentication: Clerk Session
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClerkAuth } from '@/lib/auth/clerk';
import { createApiKey, listApiKeys } from '@/lib/auth/api-key';

// Create key schema
const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  expires_at: z.string().datetime().nullable().optional(),
});

/**
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const auth = await getClerkAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const parseResult = createKeySchema.safeParse(body);

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

    // Create the key
    const result = await createApiKey(
      auth.tenant_id,
      parseResult.data.name,
      parseResult.data.expires_at
    );

    return NextResponse.json(
      {
        success: true,
        api_key: result.key, // Only shown once!
        key_id: result.key_id,
        name: result.name,
        created_at: result.created_at,
        expires_at: result.expires_at,
      },
      { status: 201 }
    );
  } catch (error) {
    // Check for duplicate name error
    if (error instanceof Error && error.message.includes('unique_name_per_tenant')) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_NAME',
            message: 'An API key with this name already exists',
          },
        },
        { status: 409 }
      );
    }

    console.error('Error creating API key:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create API key',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * List all API keys
 */
export async function GET(request: NextRequest) {
  try {
    // Debug: Log cookies
    const cookies = request.cookies.getAll();
    console.log('API /keys - Cookies:', cookies.map(c => c.name));
    
    // Authenticate
    const auth = await getClerkAuth();
    console.log('API /keys - Auth result:', auth);
    
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // List keys
    const keys = await listApiKeys(auth.tenant_id);

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Error listing API keys:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list API keys',
        },
      },
      { status: 500 }
    );
  }
}
