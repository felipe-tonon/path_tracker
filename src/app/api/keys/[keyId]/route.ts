/**
 * Individual API Key Management Endpoints
 * PATCH /api/keys/:keyId - Update API key
 * DELETE /api/keys/:keyId - Revoke API key
 *
 * Authentication: Clerk Session
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClerkAuth } from '@/lib/auth/clerk';
import { revokeApiKey, updateApiKeyName, listApiKeys } from '@/lib/auth/api-key';

// Update key schema
const updateKeySchema = z.object({
  name: z.string().min(1).max(100),
});

/**
 * Update API key name
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    // Authenticate
    const auth = await getClerkAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { keyId } = await params;

    // Parse body
    const body = await request.json();
    const parseResult = updateKeySchema.safeParse(body);

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

    // Update the key
    const success = await updateApiKeyName(auth.tenant_id, keyId, parseResult.data.name);

    if (!success) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'API key not found',
          },
        },
        { status: 404 }
      );
    }

    // Get updated key info
    const keys = await listApiKeys(auth.tenant_id);
    const updatedKey = keys.find((k) => k.key_id === keyId);

    return NextResponse.json({
      success: true,
      key: updatedKey,
    });
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

    console.error('Error updating API key:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update API key',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Revoke API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    // Authenticate
    const auth = await getClerkAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { keyId } = await params;

    // Revoke the key
    const result = await revokeApiKey(auth.tenant_id, keyId);

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'API key not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `API key '${result.name}' has been revoked`,
      key_id: keyId,
      revoked_at: result.revoked_at,
    });
  } catch (error) {
    console.error('Error revoking API key:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to revoke API key',
        },
      },
      { status: 500 }
    );
  }
}
