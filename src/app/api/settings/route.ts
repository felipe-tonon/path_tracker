/**
 * Tenant Settings API
 * GET /api/settings - Get tenant settings
 * PATCH /api/settings - Update tenant settings
 *
 * Authentication: Clerk Session
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClerkAuth } from '@/lib/auth/clerk';
import { query, queryOne } from '@/lib/db';

// Update settings schema
const updateSettingsSchema = z.object({
  retention_days: z.number().int().min(1).max(365).optional(),
  body_size_limit_bytes: z.number().int().min(1024).max(1048576).optional(), // 1KB to 1MB
  rate_limit_per_minute: z.number().int().min(100).max(100000).optional(),
  pii_scrubbing_enabled: z.boolean().optional(),
  cost_budget_usd: z.number().min(0).nullable().optional(),
});

interface TenantSettings {
  tenant_id: string;
  name: string;
  retention_days: number;
  body_size_limit_bytes: number;
  rate_limit_per_minute: number;
  pii_scrubbing_enabled: boolean;
  cost_budget_usd: number | null;
  created_at: string;
}

/**
 * Get tenant settings
 */
export async function GET() {
  try {
    // Authenticate
    const auth = await getClerkAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Get tenant settings
    const tenant = await queryOne<TenantSettings>(
      `SELECT tenant_id, name, retention_days, body_size_limit_bytes, 
              rate_limit_per_minute, pii_scrubbing_enabled, cost_budget_usd, created_at
       FROM tenants WHERE tenant_id = $1`,
      [auth.tenant_id]
    );

    if (!tenant) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Tenant not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ settings: tenant });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch settings',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Update tenant settings
 */
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate
    const auth = await getClerkAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const parseResult = updateSettingsSchema.safeParse(body);

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

    const updates = parseResult.data;
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.retention_days !== undefined) {
      setClauses.push(`retention_days = $${paramIndex++}`);
      values.push(updates.retention_days);
    }
    if (updates.body_size_limit_bytes !== undefined) {
      setClauses.push(`body_size_limit_bytes = $${paramIndex++}`);
      values.push(updates.body_size_limit_bytes);
    }
    if (updates.rate_limit_per_minute !== undefined) {
      setClauses.push(`rate_limit_per_minute = $${paramIndex++}`);
      values.push(updates.rate_limit_per_minute);
    }
    if (updates.pii_scrubbing_enabled !== undefined) {
      setClauses.push(`pii_scrubbing_enabled = $${paramIndex++}`);
      values.push(updates.pii_scrubbing_enabled);
    }
    if (updates.cost_budget_usd !== undefined) {
      setClauses.push(`cost_budget_usd = $${paramIndex++}`);
      values.push(updates.cost_budget_usd);
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'No fields to update',
          },
        },
        { status: 400 }
      );
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(auth.tenant_id);

    await query(
      `UPDATE tenants SET ${setClauses.join(', ')} WHERE tenant_id = $${paramIndex}`,
      values
    );

    // Get updated settings
    const tenant = await queryOne<TenantSettings>(
      `SELECT tenant_id, name, retention_days, body_size_limit_bytes, 
              rate_limit_per_minute, pii_scrubbing_enabled, cost_budget_usd, created_at
       FROM tenants WHERE tenant_id = $1`,
      [auth.tenant_id]
    );

    return NextResponse.json({
      success: true,
      settings: tenant,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update settings',
        },
      },
      { status: 500 }
    );
  }
}
