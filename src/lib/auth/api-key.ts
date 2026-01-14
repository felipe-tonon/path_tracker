/**
 * API Key Authentication
 *
 * Used for tracking endpoints (POST /api/v1/tracker/*)
 * API keys are in the format: pwtrk_<32_random_characters>
 */

import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { query, queryOne } from '@/lib/db';

const API_KEY_PREFIX = 'pwtrk_';
const API_KEY_LENGTH = 32;
const BCRYPT_ROUNDS = 12;

// ─────────────────────────────────────
// Types
// ─────────────────────────────────────

export interface ApiKeyValidationResult {
  valid: true;
  tenant_id: string;
  key_id: string;
}

export interface ApiKeyValidationError {
  valid: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiKeyValidation = ApiKeyValidationResult | ApiKeyValidationError;

interface ApiKeyRecord {
  key_id: string;
  tenant_id: string;
  key_hash: string;
  expires_at: string | null;
  revoked: boolean;
}

// ─────────────────────────────────────
// Key Generation
// ─────────────────────────────────────

/**
 * Generate a new API key
 * Returns the full key (only shown once) and the hash for storage
 */
export async function generateApiKey(): Promise<{
  key: string;
  hash: string;
  prefix: string;
}> {
  const randomPart = nanoid(API_KEY_LENGTH);
  const key = `${API_KEY_PREFIX}${randomPart}`;
  const hash = await bcrypt.hash(key, BCRYPT_ROUNDS);
  const prefix = key.slice(0, 12); // pwtrk_abc... for display

  return { key, hash, prefix };
}

// ─────────────────────────────────────
// Key Validation
// ─────────────────────────────────────

/**
 * Validate an API key from the Authorization header
 */
export async function validateApiKey(authHeader: string | null): Promise<ApiKeyValidation> {
  // Check header format
  if (!authHeader) {
    return {
      valid: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing Authorization header',
      },
    };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      valid: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid Authorization header format. Expected: Bearer <api_key>',
      },
    };
  }

  const apiKey = parts[1];

  // Check key format
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    return {
      valid: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid API key format',
      },
    };
  }

  // Look up key in database (check all non-revoked keys)
  // We need to check all keys because bcrypt hash verification requires the hash
  const keys = await query<ApiKeyRecord>(
    `SELECT key_id, tenant_id, key_hash, expires_at, revoked 
     FROM api_keys 
     WHERE revoked = FALSE 
     AND key_prefix = $1`,
    [apiKey.slice(0, 12)]
  );

  // Check each potential match
  for (const keyRecord of keys.rows) {
    const isMatch = await bcrypt.compare(apiKey, keyRecord.key_hash);
    if (!isMatch) continue;

    // Check if revoked
    if (keyRecord.revoked) {
      return {
        valid: false,
        error: {
          code: 'API_KEY_REVOKED',
          message: 'This API key has been revoked',
        },
      };
    }

    // Check if expired
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return {
        valid: false,
        error: {
          code: 'API_KEY_EXPIRED',
          message: `This API key expired on ${new Date(keyRecord.expires_at).toISOString()}`,
        },
      };
    }

    // Update last_used_at and usage_count (async, non-blocking)
    updateKeyUsage(keyRecord.key_id).catch((err) => {
      console.error('Failed to update key usage:', err);
    });

    return {
      valid: true,
      tenant_id: keyRecord.tenant_id,
      key_id: keyRecord.key_id,
    };
  }

  // No matching key found
  return {
    valid: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Invalid API key',
    },
  };
}

/**
 * Update API key usage statistics (non-blocking)
 */
async function updateKeyUsage(keyId: string): Promise<void> {
  await query(
    `UPDATE api_keys 
     SET last_used_at = NOW(), usage_count = usage_count + 1 
     WHERE key_id = $1`,
    [keyId]
  );
}

// ─────────────────────────────────────
// Key Management
// ─────────────────────────────────────

/**
 * Create a new API key for a tenant
 */
export async function createApiKey(
  tenantId: string,
  name: string,
  expiresAt?: string | null
): Promise<{
  key: string;
  key_id: string;
  name: string;
  created_at: string;
  expires_at: string | null;
}> {
  const { key, hash, prefix } = await generateApiKey();

  const result = await queryOne<{
    key_id: string;
    created_at: string;
    expires_at: string | null;
  }>(
    `INSERT INTO api_keys (tenant_id, name, key_hash, key_prefix, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING key_id, created_at, expires_at`,
    [tenantId, name, hash, prefix, expiresAt || null]
  );

  if (!result) {
    throw new Error('Failed to create API key');
  }

  return {
    key,
    key_id: result.key_id,
    name,
    created_at: result.created_at,
    expires_at: result.expires_at,
  };
}

/**
 * List all API keys for a tenant
 */
export async function listApiKeys(tenantId: string): Promise<
  Array<{
    key_id: string;
    name: string;
    key_preview: string;
    created_at: string;
    expires_at: string | null;
    revoked: boolean;
    revoked_at: string | null;
    last_used_at: string | null;
    usage_count: number;
  }>
> {
  const keys = await query<{
    key_id: string;
    name: string;
    key_prefix: string;
    created_at: string;
    expires_at: string | null;
    revoked: boolean;
    revoked_at: string | null;
    last_used_at: string | null;
    usage_count: string;
  }>(
    `SELECT key_id, name, key_prefix, created_at, expires_at, 
            revoked, revoked_at, last_used_at, usage_count
     FROM api_keys
     WHERE tenant_id = $1
     ORDER BY created_at DESC`,
    [tenantId]
  );

  return keys.rows.map((k) => ({
    key_id: k.key_id,
    name: k.name,
    key_preview: `${k.key_prefix}...`,
    created_at: k.created_at,
    expires_at: k.expires_at,
    revoked: k.revoked,
    revoked_at: k.revoked_at,
    last_used_at: k.last_used_at,
    usage_count: parseInt(k.usage_count, 10),
  }));
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  tenantId: string,
  keyId: string
): Promise<{ success: boolean; revoked_at: string | null; name: string | null }> {
  const result = await queryOne<{ name: string; revoked: boolean; revoked_at: string }>(
    `UPDATE api_keys 
     SET revoked = TRUE, revoked_at = NOW()
     WHERE key_id = $1 AND tenant_id = $2
     RETURNING name, revoked, revoked_at`,
    [keyId, tenantId]
  );

  if (!result) {
    return { success: false, revoked_at: null, name: null };
  }

  return {
    success: true,
    revoked_at: result.revoked_at,
    name: result.name,
  };
}

/**
 * Update API key name
 */
export async function updateApiKeyName(
  tenantId: string,
  keyId: string,
  name: string
): Promise<boolean> {
  const result = await query(`UPDATE api_keys SET name = $1 WHERE key_id = $2 AND tenant_id = $3`, [
    name,
    keyId,
    tenantId,
  ]);
  return result.rowCount !== null && result.rowCount > 0;
}
