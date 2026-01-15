/**
 * Admin Tenants API
 *
 * GET /api/admin/tenants - List all tenants with usage statistics
 *
 * Only accessible to admin users (defined in ADMIN_ACCOUNTS env var)
 */

import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/admin';
import { queryAll, queryOne } from '@/lib/db';
import type { Tenant } from '@/types';

// ─────────────────────────────────────
// Types
// ─────────────────────────────────────

interface TenantWithStats extends Tenant {
  total_api_keys: number;
  active_api_keys: number;
  account_users_count: number;
  rest_requests_24h: number;
  llm_requests_24h: number;
  total_cost_24h: number;
  rest_requests_total: number;
  llm_requests_total: number;
  total_cost_all_time: number;
}

// ─────────────────────────────────────
// GET /api/admin/tenants
// ─────────────────────────────────────

export async function GET(request: NextRequest) {
  // Check admin authentication
  const adminAuth = await requireAdminAuth();
  if (!adminAuth.success) {
    return adminAuth.response;
  }

  try {
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Calculate time ranges
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Build the query with aggregated stats
    let whereClause = '';
    const values: unknown[] = [yesterday.toISOString(), limit, offset];
    let paramIndex = 4;

    if (search) {
      whereClause = `WHERE t.name ILIKE $${paramIndex} OR t.tenant_id::text ILIKE $${paramIndex}`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    const tenants = await queryAll<TenantWithStats>(
      `
      SELECT 
        t.*,
        COALESCE(ak.total_keys, 0)::int as total_api_keys,
        COALESCE(ak.active_keys, 0)::int as active_api_keys,
        COALESCE(au.user_count, 0)::int as account_users_count,
        COALESCE(rest_24h.count, 0)::int as rest_requests_24h,
        COALESCE(llm_24h.count, 0)::int as llm_requests_24h,
        COALESCE(llm_24h.cost, 0)::float as total_cost_24h,
        COALESCE(rest_all.count, 0)::int as rest_requests_total,
        COALESCE(llm_all.count, 0)::int as llm_requests_total,
        COALESCE(llm_all.cost, 0)::float as total_cost_all_time
      FROM tenants t
      LEFT JOIN (
        SELECT tenant_id, 
               COUNT(*) as total_keys,
               COUNT(*) FILTER (WHERE revoked = false AND (expires_at IS NULL OR expires_at > NOW())) as active_keys
        FROM api_keys
        GROUP BY tenant_id
      ) ak ON t.tenant_id = ak.tenant_id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*) as user_count
        FROM account_users
        GROUP BY tenant_id
      ) au ON t.tenant_id = au.tenant_id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*) as count
        FROM rest_events
        WHERE request_timestamp >= $1
        GROUP BY tenant_id
      ) rest_24h ON t.tenant_id = rest_24h.tenant_id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*) as count, SUM(cost_usd) as cost
        FROM llm_events
        WHERE request_timestamp >= $1
        GROUP BY tenant_id
      ) llm_24h ON t.tenant_id = llm_24h.tenant_id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*) as count
        FROM rest_events
        GROUP BY tenant_id
      ) rest_all ON t.tenant_id = rest_all.tenant_id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*) as count, SUM(cost_usd) as cost
        FROM llm_events
        GROUP BY tenant_id
      ) llm_all ON t.tenant_id = llm_all.tenant_id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      values
    );

    // Get total count for pagination
    const countResult = await queryOne<{ total: string }>(
      `SELECT COUNT(*)::text as total FROM tenants ${whereClause ? whereClause.replace('$4', '$1') : ''}`,
      search ? [`%${search}%`] : []
    );

    return Response.json({
      success: true,
      tenants,
      pagination: {
        total: parseInt(countResult?.total || '0', 10),
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Admin tenants API error:', error);
    return Response.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch tenants',
        },
      },
      { status: 500 }
    );
  }
}
