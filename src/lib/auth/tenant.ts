/**
 * Tenant Management
 *
 * Handles tenant creation, lookup, and Clerk user mapping.
 * Used for dashboard authentication via Clerk sessions.
 */

import { query, queryOne, withTransaction } from '@/lib/db';
import { generateApiKey } from './api-key';
import type { Tenant, AccountUser } from '@/types';

// ─────────────────────────────────────
// Tenant Lookup
// ─────────────────────────────────────

/**
 * Get tenant by ID
 */
export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  return queryOne<Tenant>(`SELECT * FROM tenants WHERE tenant_id = $1`, [tenantId]);
}

/**
 * Get tenant ID from Clerk user ID
 */
export async function getTenantIdByClerkUser(clerkUserId: string): Promise<string | null> {
  const result = await queryOne<{ tenant_id: string }>(
    `SELECT tenant_id FROM account_users WHERE clerk_user_id = $1`,
    [clerkUserId]
  );
  return result?.tenant_id || null;
}

/**
 * Get account user by Clerk user ID
 */
export async function getAccountUserByClerkId(
  clerkUserId: string
): Promise<AccountUser | null> {
  return queryOne<AccountUser>(
    `SELECT * FROM account_users WHERE clerk_user_id = $1`,
    [clerkUserId]
  );
}

// ─────────────────────────────────────
// Tenant Creation (via Clerk webhook)
// ─────────────────────────────────────

/**
 * Create a new tenant and account user from Clerk signup
 * Also creates a default API key
 */
export async function createTenantFromClerk(params: {
  clerkUserId: string;
  email: string;
  name?: string;
}): Promise<{
  tenant: Tenant;
  accountUser: AccountUser;
  defaultApiKey: {
    key: string;
    key_id: string;
    name: string;
  };
}> {
  return withTransaction(async (client) => {
    // Create tenant
    const tenantResult = await client.query<Tenant>(
      `INSERT INTO tenants (name)
       VALUES ($1)
       RETURNING *`,
      [params.name || `${params.email}'s Organization`]
    );
    const tenant = tenantResult.rows[0];

    // Create account user
    const userResult = await client.query<AccountUser>(
      `INSERT INTO account_users (clerk_user_id, tenant_id, email, name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [params.clerkUserId, tenant.tenant_id, params.email, params.name || null]
    );
    const accountUser = userResult.rows[0];

    // Create default API key (using the same transaction client)
    const { key, hash, prefix } = await generateApiKey();
    const apiKeyResult = await client.query<{ key_id: string; created_at: string }>(
      `INSERT INTO api_keys (tenant_id, name, key_hash, key_prefix)
       VALUES ($1, $2, $3, $4)
       RETURNING key_id, created_at`,
      [tenant.tenant_id, 'Default API Key', hash, prefix]
    );
    const apiKeyRecord = apiKeyResult.rows[0];

    return {
      tenant,
      accountUser,
      defaultApiKey: {
        key,
        key_id: apiKeyRecord.key_id,
        name: 'Default API Key',
      },
    };
  });
}

/**
 * Check if a Clerk user already has an account
 */
export async function clerkUserExists(clerkUserId: string): Promise<boolean> {
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM account_users WHERE clerk_user_id = $1`,
    [clerkUserId]
  );
  return result ? parseInt(result.count, 10) > 0 : false;
}

// ─────────────────────────────────────
// Tenant Configuration
// ─────────────────────────────────────

/**
 * Update tenant settings
 */
export async function updateTenantSettings(
  tenantId: string,
  settings: Partial<{
    name: string;
    retention_days: number;
    body_size_limit_bytes: number;
    rate_limit_per_minute: number;
    pii_scrubbing_enabled: boolean;
    cost_budget_usd: number | null;
  }>
): Promise<Tenant | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (settings.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(settings.name);
  }
  if (settings.retention_days !== undefined) {
    updates.push(`retention_days = $${paramIndex++}`);
    values.push(settings.retention_days);
  }
  if (settings.body_size_limit_bytes !== undefined) {
    updates.push(`body_size_limit_bytes = $${paramIndex++}`);
    values.push(settings.body_size_limit_bytes);
  }
  if (settings.rate_limit_per_minute !== undefined) {
    updates.push(`rate_limit_per_minute = $${paramIndex++}`);
    values.push(settings.rate_limit_per_minute);
  }
  if (settings.pii_scrubbing_enabled !== undefined) {
    updates.push(`pii_scrubbing_enabled = $${paramIndex++}`);
    values.push(settings.pii_scrubbing_enabled);
  }
  if (settings.cost_budget_usd !== undefined) {
    updates.push(`cost_budget_usd = $${paramIndex++}`);
    values.push(settings.cost_budget_usd);
  }

  if (updates.length === 0) return getTenantById(tenantId);

  values.push(tenantId);

  return queryOne<Tenant>(
    `UPDATE tenants SET ${updates.join(', ')} WHERE tenant_id = $${paramIndex} RETURNING *`,
    values
  );
}
