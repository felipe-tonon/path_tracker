/**
 * Query Service
 *
 * Handles querying logs, paths, and metrics for the dashboard.
 */

import { queryOne, queryAll } from '@/lib/db';
import type {
  LogsQueryParams,
  LogsResponse,
  LogEntry,
  PathResponse,
  PathEvent,
  MetricsQueryParams,
  MetricsResponse,
} from '@/types';

// ─────────────────────────────────────
// Logs Query
// ─────────────────────────────────────

/**
 * Query logs with filtering
 */
export async function queryLogs(tenantId: string, params: LogsQueryParams): Promise<LogsResponse> {
  const { start_time, end_time, limit = 100, offset = 0, include_bodies = false } = params;

  // Build dynamic WHERE clauses
  const conditions: string[] = [
    'tenant_id = $1',
    'request_timestamp >= $2',
    'request_timestamp <= $3',
  ];
  const values: unknown[] = [tenantId, start_time, end_time];
  let paramIndex = 4;

  if (params.request_id) {
    conditions.push(`request_id = $${paramIndex++}`);
    values.push(params.request_id);
  }
  if (params.user_id) {
    conditions.push(`user_id = $${paramIndex++}`);
    values.push(params.user_id);
  }
  if (params.service) {
    conditions.push(`service = $${paramIndex++}`);
    values.push(params.service);
  }
  if (params.environment) {
    conditions.push(`environment = $${paramIndex++}`);
    values.push(params.environment);
  }
  if (params.status_code) {
    conditions.push(`status_code = $${paramIndex++}`);
    values.push(params.status_code);
  }
  if (params.original_request_id) {
    conditions.push(`original_request_id = $${paramIndex++}`);
    values.push(params.original_request_id);
  }

  const whereClause = conditions.join(' AND ');

  // Select fields based on include_bodies
  const bodyFields = include_bodies ? ', request_body, response_body' : '';

  // Query REST events
  let restLogs: LogEntry[] = [];
  if (!params.type || params.type === 'rest') {
    const restSql = `
      SELECT event_id::text, request_id, user_id, environment, request_timestamp, response_timestamp,
             'rest' as type, service, method, url, status_code, latency_ms
             ${bodyFields}
      FROM rest_events
      WHERE ${whereClause}
      ORDER BY request_timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const restResult = await queryAll<LogEntry>(restSql, [...values, limit, offset]);
    restLogs = restResult;
  }

  // Query LLM events
  let llmLogs: LogEntry[] = [];
  if (!params.type || params.type === 'llm') {
    // Add LLM-specific filters
    const llmConditions = [...conditions];
    const llmValues = [...values];
    let llmParamIndex = paramIndex;

    if (params.conversation_id) {
      llmConditions.push(`conversation_id = $${llmParamIndex++}`);
      llmValues.push(params.conversation_id);
    }
    if (params.finish_reason) {
      llmConditions.push(`finish_reason = $${llmParamIndex++}`);
      llmValues.push(params.finish_reason);
    }

    const llmWhereClause = llmConditions.join(' AND ');
    const llmSql = `
      SELECT event_id::text, request_id, user_id, environment, request_timestamp, response_timestamp,
             'llm' as type, service, url, status_code, latency_ms,
             provider, model, total_tokens, cost_usd, finish_reason
             ${bodyFields}
      FROM llm_events
      WHERE ${llmWhereClause}
      ORDER BY request_timestamp DESC
      LIMIT $${llmParamIndex} OFFSET $${llmParamIndex + 1}
    `;
    const llmResult = await queryAll<LogEntry>(llmSql, [...llmValues, limit, offset]);
    llmLogs = llmResult;
  }

  // Merge and sort
  const allLogs = [...restLogs, ...llmLogs].sort(
    (a, b) => new Date(b.request_timestamp).getTime() - new Date(a.request_timestamp).getTime()
  );

  // Get total count (simplified - in production you'd want separate counts)
  const countResult = await queryOne<{ total: string }>(
    `SELECT (
      (SELECT COUNT(*) FROM rest_events WHERE tenant_id = $1 AND request_timestamp >= $2 AND request_timestamp <= $3) +
      (SELECT COUNT(*) FROM llm_events WHERE tenant_id = $1 AND request_timestamp >= $2 AND request_timestamp <= $3)
    )::text as total`,
    [tenantId, start_time, end_time]
  );

  return {
    logs: allLogs.slice(0, limit),
    total: parseInt(countResult?.total || '0', 10),
    limit,
    offset,
  };
}

// ─────────────────────────────────────
// Path Query
// ─────────────────────────────────────

/**
 * Get the complete path of a request
 */
export async function getRequestPath(
  tenantId: string,
  requestId: string
): Promise<PathResponse | null> {
  // Query REST events for this request
  const restEvents = await queryAll<PathEvent & { method: string }>(
    `SELECT event_id::text, 'rest' as type, service, method, url, status_code, latency_ms,
            request_timestamp, response_timestamp, request_body, response_body, metadata
     FROM rest_events
     WHERE tenant_id = $1 AND request_id = $2
     ORDER BY request_timestamp ASC`,
    [tenantId, requestId]
  );

  // Query LLM events for this request
  const llmEvents = await queryAll<
    PathEvent & { provider: string; model: string; total_tokens: number; cost_usd: number }
  >(
    `SELECT event_id::text, 'llm' as type, service, url, status_code, latency_ms,
            request_timestamp, response_timestamp, request_body, response_body, metadata,
            provider, model, total_tokens, cost_usd, finish_reason
     FROM llm_events
     WHERE tenant_id = $1 AND request_id = $2
     ORDER BY request_timestamp ASC`,
    [tenantId, requestId]
  );

  // Merge and sort by timestamp
  const allEvents: PathEvent[] = [...restEvents, ...llmEvents].sort(
    (a, b) => new Date(a.request_timestamp).getTime() - new Date(b.request_timestamp).getTime()
  );

  if (allEvents.length === 0) {
    return null;
  }

  // Get user_id from first event that has one
  // Note: userEvent variable kept for potential future use

  // Calculate total duration
  const firstTimestamp = new Date(allEvents[0].request_timestamp).getTime();
  const lastTimestamp = new Date(allEvents[allEvents.length - 1].response_timestamp).getTime();
  const totalDurationMs = lastTimestamp - firstTimestamp;

  // Get user_id from database
  const userInfo = await queryOne<{ user_id: string | null }>(
    `SELECT user_id FROM rest_events WHERE tenant_id = $1 AND request_id = $2 AND user_id IS NOT NULL
     UNION
     SELECT user_id FROM llm_events WHERE tenant_id = $1 AND request_id = $2 AND user_id IS NOT NULL
     LIMIT 1`,
    [tenantId, requestId]
  );

  return {
    request_id: requestId,
    user_id: userInfo?.user_id || null,
    total_duration_ms: totalDurationMs,
    event_count: allEvents.length,
    path: allEvents,
  };
}

// ─────────────────────────────────────
// Metrics Query
// ─────────────────────────────────────

/**
 * Get aggregated metrics
 */
export async function getMetrics(
  tenantId: string,
  params: MetricsQueryParams
): Promise<MetricsResponse> {
  const { start_time, end_time } = params;

  // REST metrics
  const restMetrics = await queryOne<{
    total: string;
    p50: number | null;
    p95: number | null;
    p99: number | null;
  }>(
    `SELECT 
      COUNT(*)::text as total,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms) as p50,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99
     FROM rest_events
     WHERE tenant_id = $1 AND request_timestamp >= $2 AND request_timestamp <= $3`,
    [tenantId, start_time, end_time]
  );

  const restByService = await queryAll<{ service: string; count: string }>(
    `SELECT service, COUNT(*)::text as count
     FROM rest_events
     WHERE tenant_id = $1 AND request_timestamp >= $2 AND request_timestamp <= $3
     GROUP BY service
     ORDER BY count DESC`,
    [tenantId, start_time, end_time]
  );

  const restByStatus = await queryAll<{ status_code: number; count: string }>(
    `SELECT status_code, COUNT(*)::text as count
     FROM rest_events
     WHERE tenant_id = $1 AND request_timestamp >= $2 AND request_timestamp <= $3
     GROUP BY status_code
     ORDER BY status_code`,
    [tenantId, start_time, end_time]
  );

  // LLM metrics
  const llmMetrics = await queryOne<{
    total: string;
    total_tokens: string;
    total_cost: string;
    p50: number | null;
    p95: number | null;
    p99: number | null;
  }>(
    `SELECT 
      COUNT(*)::text as total,
      COALESCE(SUM(total_tokens), 0)::text as total_tokens,
      COALESCE(SUM(cost_usd), 0)::text as total_cost,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms) as p50,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99
     FROM llm_events
     WHERE tenant_id = $1 AND request_timestamp >= $2 AND request_timestamp <= $3`,
    [tenantId, start_time, end_time]
  );

  const llmByProvider = await queryAll<{ provider: string; count: string }>(
    `SELECT provider, COUNT(*)::text as count
     FROM llm_events
     WHERE tenant_id = $1 AND request_timestamp >= $2 AND request_timestamp <= $3
     GROUP BY provider
     ORDER BY count DESC`,
    [tenantId, start_time, end_time]
  );

  const llmByModel = await queryAll<{ model: string; count: string }>(
    `SELECT model, COUNT(*)::text as count
     FROM llm_events
     WHERE tenant_id = $1 AND request_timestamp >= $2 AND request_timestamp <= $3
     GROUP BY model
     ORDER BY count DESC`,
    [tenantId, start_time, end_time]
  );

  return {
    period: {
      start: start_time,
      end: end_time,
    },
    metrics: {
      rest_requests: {
        total: parseInt(restMetrics?.total || '0', 10),
        by_service: Object.fromEntries(
          restByService.map((r) => [r.service, parseInt(r.count, 10)])
        ),
        by_status: Object.fromEntries(
          restByStatus.map((r) => [r.status_code.toString(), parseInt(r.count, 10)])
        ),
        latency: {
          p50: Math.round(restMetrics?.p50 || 0),
          p95: Math.round(restMetrics?.p95 || 0),
          p99: Math.round(restMetrics?.p99 || 0),
        },
      },
      llm_requests: {
        total: parseInt(llmMetrics?.total || '0', 10),
        by_provider: Object.fromEntries(
          llmByProvider.map((r) => [r.provider, parseInt(r.count, 10)])
        ),
        by_model: Object.fromEntries(llmByModel.map((r) => [r.model, parseInt(r.count, 10)])),
        total_tokens: parseInt(llmMetrics?.total_tokens || '0', 10),
        total_cost_usd: parseFloat(llmMetrics?.total_cost || '0'),
        latency: {
          p50: Math.round(llmMetrics?.p50 || 0),
          p95: Math.round(llmMetrics?.p95 || 0),
          p99: Math.round(llmMetrics?.p99 || 0),
        },
      },
    },
  };
}
