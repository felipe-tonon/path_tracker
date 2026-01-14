/**
 * Get Request Path Endpoint
 * GET /api/v1/paths/:requestId
 *
 * Get the complete path of a request across all services.
 * Authentication: Clerk Session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClerkAuth } from '@/lib/auth/clerk';
import { getRequestPath } from '@/lib/services/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    // Authenticate
    const auth = await getClerkAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { requestId } = await params;

    if (!requestId) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing request_id parameter',
          },
        },
        { status: 400 }
      );
    }

    // Query the path
    const path = await getRequestPath(auth.tenant_id, requestId);

    if (!path) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `No events found for request_id: ${requestId}`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(path);
  } catch (error) {
    console.error('Error fetching request path:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch request path',
        },
      },
      { status: 500 }
    );
  }
}
