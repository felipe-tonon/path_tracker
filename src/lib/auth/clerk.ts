/**
 * Clerk Authentication Utilities
 *
 * Used for dashboard endpoints (query, management).
 * Extracts tenant_id from Clerk session.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { getTenantIdByClerkUser, createTenantFromClerk, clerkUserExists } from './tenant';

// ─────────────────────────────────────
// Types
// ─────────────────────────────────────

export interface ClerkAuthResult {
  authenticated: true;
  tenant_id: string;
  clerk_user_id: string;
}

export interface ClerkAuthError {
  authenticated: false;
  error: {
    code: string;
    message: string;
  };
}

export type ClerkAuth = ClerkAuthResult | ClerkAuthError;

// ─────────────────────────────────────
// Authentication
// ─────────────────────────────────────

/**
 * Get authenticated user and tenant from Clerk session
 * Creates tenant if user doesn't have one (first login)
 */
export async function getClerkAuth(): Promise<ClerkAuth> {
  try {
    // In Clerk v5, auth() is synchronous but returns a promise-like object
    const authResult = auth();
    const userId = authResult.userId;

    if (!userId) {
      console.log('Clerk auth: No userId found in session');
      return {
        authenticated: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      };
    }
    
    console.log('Clerk auth: Found userId:', userId);

    // Check if user has a tenant
    let tenantId = await getTenantIdByClerkUser(userId);

    // If no tenant, create one (first-time user)
    if (!tenantId) {
      const user = await currentUser();
      if (!user) {
        return {
          authenticated: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Could not fetch user details',
          },
        };
      }

      const email = user.emailAddresses[0]?.emailAddress;
      if (!email) {
        return {
          authenticated: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User has no email address',
          },
        };
      }

      // Create tenant and account
      const result = await createTenantFromClerk({
        clerkUserId: userId,
        email,
        name: user.firstName || undefined,
      });

      tenantId = result.tenant.tenant_id;
    }

    return {
      authenticated: true,
      tenant_id: tenantId,
      clerk_user_id: userId,
    };
  } catch (error) {
    console.error('Clerk auth error:', error);
    return {
      authenticated: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed',
      },
    };
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<ClerkAuthResult> {
  const auth = await getClerkAuth();
  if (!auth.authenticated) {
    throw new Error(auth.error.message);
  }
  return auth;
}
