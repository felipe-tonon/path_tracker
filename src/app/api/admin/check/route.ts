/**
 * Admin Check API
 *
 * GET /api/admin/check - Check if current user is an admin
 *
 * Used by client components to conditionally show admin UI
 */

import { getAdminAuth } from '@/lib/auth/admin';

export async function GET() {
  const auth = await getAdminAuth();

  return Response.json({
    isAdmin: auth.isAdmin,
  });
}
