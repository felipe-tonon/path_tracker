/**
 * Tracking Service
 *
 * Handles storing REST and LLM events to the database.
 * Includes body truncation and size limit enforcement.
 */

import { query, queryOne } from '@/lib/db';
import { getTenantById } from '@/lib/auth/tenant';
import type { RestEventInput, LlmEventInput, RestEvent, LlmEvent } from '@/types';

// ─────────────────────────────────────
// Body Processing
// ─────────────────────────────────────

interface ProcessedBody {
  body: unknown;
  truncated: boolean;
  sizeBytes: number;
}

/**
 * Process a request/response body for storage
 * Handles truncation if body exceeds size limit
 */
function processBody(body: unknown, maxSizeBytes: number): ProcessedBody {
  if (body === undefined || body === null) {
    return { body: null, truncated: false, sizeBytes: 0 };
  }

  const jsonStr = typeof body === 'string' ? body : JSON.stringify(body);
  const sizeBytes = Buffer.byteLength(jsonStr, 'utf8');

  if (sizeBytes <= maxSizeBytes) {
    return {
      body: typeof body === 'string' ? JSON.parse(body) : body,
      truncated: false,
      sizeBytes,
    };
  }

  // Truncate the body
  const truncatedStr = jsonStr.slice(0, maxSizeBytes);
  return {
    body: {
      truncated: true,
      original_size_bytes: sizeBytes,
      stored_bytes: maxSizeBytes,
      partial_content: truncatedStr,
    },
    truncated: true,
    sizeBytes,
  };
}

/**
 * Check if content appears to be binary
 */
function isBinaryContent(body: unknown): boolean {
  if (typeof body !== 'string') return false;

  // Check for binary indicators
  // eslint-disable-next-line no-control-regex
  const hasBinaryChars = /[\x00-\x08\x0E-\x1F]/.test(body.slice(0, 1000));
  return hasBinaryChars;
}

// ─────────────────────────────────────
// REST Event Tracking
// ─────────────────────────────────────

/**
 * Track a REST API request
 */
export async function trackRestEvent(
  tenantId: string,
  input: RestEventInput
): Promise<{ event_id: string }> {
  // Get tenant config for body size limit
  const tenant = await getTenantById(tenantId);
  const maxBodySize = tenant?.body_size_limit_bytes || 10240;

  // Process bodies
  const requestBody = isBinaryContent(input.request_body)
    ? { body: { binary: true, content_type: 'unknown' }, truncated: false, sizeBytes: 0 }
    : processBody(input.request_body, maxBodySize);

  const responseBody = isBinaryContent(input.response_body)
    ? { body: { binary: true, content_type: 'unknown' }, truncated: false, sizeBytes: 0 }
    : processBody(input.response_body, maxBodySize);

  const result = await queryOne<{ event_id: string }>(
    `INSERT INTO rest_events (
      tenant_id, request_id, user_id, environment, correlation_id,
      request_timestamp, response_timestamp, service, method, url, status_code,
      attempt_number, original_request_id,
      request_body, response_body, request_body_truncated, response_body_truncated,
      request_body_size_bytes, response_body_size_bytes,
      request_size_bytes, response_size_bytes, metadata
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
    ) RETURNING event_id`,
    [
      tenantId,
      input.request_id,
      input.user_id || null,
      input.environment || null,
      input.correlation_id || null,
      input.request_timestamp,
      input.response_timestamp,
      input.service,
      input.method,
      input.url,
      input.status_code,
      input.attempt_number || 1,
      input.original_request_id || null,
      requestBody.body ? JSON.stringify(requestBody.body) : null,
      responseBody.body ? JSON.stringify(responseBody.body) : null,
      requestBody.truncated,
      responseBody.truncated,
      requestBody.sizeBytes,
      responseBody.sizeBytes,
      input.request_size_bytes || null,
      input.response_size_bytes || null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ]
  );

  if (!result) {
    throw new Error('Failed to insert REST event');
  }

  return { event_id: result.event_id.toString() };
}

// ─────────────────────────────────────
// LLM Event Tracking
// ─────────────────────────────────────

/**
 * Track an LLM API request
 */
export async function trackLlmEvent(
  tenantId: string,
  input: LlmEventInput
): Promise<{ event_id: string }> {
  // Get tenant config for body size limit
  const tenant = await getTenantById(tenantId);
  const maxBodySize = tenant?.body_size_limit_bytes || 10240;

  // Process bodies
  const requestBody = processBody(input.request_body, maxBodySize);
  const responseBody = processBody(input.response_body, maxBodySize);

  const result = await queryOne<{ event_id: string }>(
    `INSERT INTO llm_events (
      tenant_id, request_id, user_id, environment, correlation_id,
      request_timestamp, response_timestamp, service, url, status_code,
      provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, cost_usd,
      temperature, max_tokens, top_p, frequency_penalty, presence_penalty,
      finish_reason, is_streaming, time_to_first_token_ms,
      function_calls, conversation_id, attempt_number, original_request_id, warnings,
      request_body, response_body, request_body_truncated, response_body_truncated,
      metadata
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
      $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35
    ) RETURNING event_id`,
    [
      tenantId,
      input.request_id,
      input.user_id || null,
      input.environment || null,
      input.correlation_id || null,
      input.request_timestamp,
      input.response_timestamp,
      input.service,
      input.url,
      input.status_code,
      input.provider,
      input.model,
      input.endpoint,
      input.prompt_tokens,
      input.completion_tokens,
      input.total_tokens,
      input.cost_usd,
      input.temperature || null,
      input.max_tokens || null,
      input.top_p || null,
      input.frequency_penalty || null,
      input.presence_penalty || null,
      input.finish_reason || null,
      input.is_streaming || null,
      input.time_to_first_token_ms || null,
      input.function_calls ? JSON.stringify(input.function_calls) : null,
      input.conversation_id || null,
      input.attempt_number || 1,
      input.original_request_id || null,
      input.warnings ? JSON.stringify(input.warnings) : null,
      requestBody.body ? JSON.stringify(requestBody.body) : null,
      responseBody.body ? JSON.stringify(responseBody.body) : null,
      requestBody.truncated,
      responseBody.truncated,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ]
  );

  if (!result) {
    throw new Error('Failed to insert LLM event');
  }

  return { event_id: result.event_id.toString() };
}

// ─────────────────────────────────────
// Batch Event Tracking
// ─────────────────────────────────────

/**
 * Track multiple events in a batch
 */
export async function trackBatchEvents(
  tenantId: string,
  events: Array<({ type: 'rest' } & RestEventInput) | ({ type: 'llm' } & LlmEventInput)>
): Promise<{ event_ids: string[] }> {
  const eventIds: string[] = [];

  for (const event of events) {
    if (event.type === 'rest') {
      const { type: _, ...restEvent } = event;
      const result = await trackRestEvent(tenantId, restEvent);
      eventIds.push(result.event_id);
    } else if (event.type === 'llm') {
      const { type: _, ...llmEvent } = event;
      const result = await trackLlmEvent(tenantId, llmEvent);
      eventIds.push(result.event_id);
    }
  }

  return { event_ids: eventIds };
}
