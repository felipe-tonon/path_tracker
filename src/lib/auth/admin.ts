/**
 * Admin Authentication Utilities
 *
 * Handles admin-level access control based on ADMIN_ACCOUNTS environment variable.
 * Admin users can view all tenants and their usage statistics.
 */

import { currentUser } from '@clerk/nextjs/server';

// ─────────────────────────────────────
// Types
// ─────────────────────────────────────

export interface AdminAuthResult {
  isAdmin: true;
  email: string;
  clerkUserId: string;
}

export interface AdminAuthError {
  isAdmin: false;
  error: {
    code: string;
    message: string;
  };
}

export type AdminAuth = AdminAuthResult | AdminAuthError;

// ─────────────────────────────────────
// Admin Email Helpers
// ─────────────────────────────────────

/**
 * Get the list of admin emails from environment variable
 */
export function getAdminEmails(): string[] {
  const adminAccounts = process.env.ADMIN_ACCOUNTS || '';
  return adminAccounts
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

/**
 * Check if an email is in the admin list
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.toLowerCase());
}

// ─────────────────────────────────────
// Admin Authentication
// ─────────────────────────────────────

/**
 * Check if the current user is an admin
 * Returns admin status and user details
 */
export async function getAdminAuth(): Promise<AdminAuth> {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        isAdmin: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      };
    }

    const email = user.emailAddresses[0]?.emailAddress;

    if (!email) {
      return {
        isAdmin: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User has no email address',
        },
      };
    }

    if (!isAdminEmail(email)) {
      return {
        isAdmin: false,
        error: {
          code: 'FORBIDDEN',
          message: 'User is not an admin',
        },
      };
    }

    return {
      isAdmin: true,
      email,
      clerkUserId: user.id,
    };
  } catch (error) {
    console.error('Admin auth error:', error);
    return {
      isAdmin: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Admin authentication failed',
      },
    };
  }
}

/**
 * Require admin authentication - returns error response if not admin
 */
export async function requireAdminAuth(): Promise<
  | { success: true; auth: AdminAuthResult }
  | { success: false; response: Response }
> {
  const auth = await getAdminAuth();

  if (!auth.isAdmin) {
    const status = auth.error.code === 'FORBIDDEN' ? 403 : 401;
    return {
      success: false,
      response: Response.json(
        {
          error: {
            code: auth.error.code,
            message: auth.error.message,
          },
        },
        { status }
      ),
    };
  }

  return { success: true, auth };
}

/**
 * Check admin status for client-side use
 * This is a lightweight check that only returns boolean
 */
export async function checkIsAdmin(): Promise<boolean> {
  const auth = await getAdminAuth();
  return auth.isAdmin;
}
