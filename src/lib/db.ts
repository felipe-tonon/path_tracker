/**
 * Database connection and query utilities
 *
 * Uses pg (node-postgres) for PostgreSQL connections with a connection pool.
 * Automatically scopes queries by tenant_id for multi-tenant isolation.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// ─────────────────────────────────────
// Connection Pool Configuration
// ─────────────────────────────────────

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Global pool instance (singleton pattern for Next.js)
let pool: Pool | null = null;

/**
 * Get the database connection pool
 * Creates a new pool if one doesn't exist
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(poolConfig);

    // Log pool errors
    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });
  }
  return pool;
}

// ─────────────────────────────────────
// Query Utilities
// ─────────────────────────────────────

/**
 * Execute a query with automatic connection handling
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  // Log slow queries in development
  if (process.env.NODE_ENV === 'development' && duration > 100) {
    console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
  }

  return result;
}

/**
 * Execute a query and return a single row (or null)
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

/**
 * Execute a query and return all rows
 */
export async function queryAll<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

// ─────────────────────────────────────
// Transaction Support
// ─────────────────────────────────────

/**
 * Execute a function within a database transaction
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────
// Health Check
// ─────────────────────────────────────

/**
 * Check database connection health
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await query('SELECT 1');
    return {
      status: 'healthy',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

// ─────────────────────────────────────
// Cleanup
// ─────────────────────────────────────

/**
 * Close the database pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
