/**
 * Core type definitions for Path Tracker
 */

// ─────────────────────────────────────
// Tenant Types
// ─────────────────────────────────────

export interface Tenant {
  tenant_id: string;
  name: string;
  created_at: string;
  retention_days: number;
  body_size_limit_bytes: number;
  rate_limit_per_minute: number;
  storage_quota_gb: number | null;
  pii_scrubbing_enabled: boolean;
  cost_budget_usd: number | null;
  settings: Record<string, unknown>;
}

export interface AccountUser {
  account_user_id: string;
  clerk_user_id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  created_at: string;
}

// ─────────────────────────────────────
// API Key Types
// ─────────────────────────────────────

export interface ApiKey {
  key_id: string;
  tenant_id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  expires_at: string | null;
  revoked: boolean;
  revoked_at: string | null;
  last_used_at: string | null;
  usage_count: number;
}

export interface ApiKeyCreateRequest {
  name: string;
  expires_at?: string | null;
}

export interface ApiKeyCreateResponse {
  success: true;
  api_key: string; // Full key - only shown once
  key_id: string;
  name: string;
  created_at: string;
  expires_at: string | null;
}

export interface ApiKeyListItem {
  key_id: string;
  name: string;
  key_preview: string; // e.g., "pwtrk_abc...xyz"
  created_at: string;
  expires_at: string | null;
  revoked: boolean;
  revoked_at: string | null;
  last_used_at: string | null;
  usage_count: number;
}

// ─────────────────────────────────────
// REST Event Types
// ─────────────────────────────────────

export interface RestEventInput {
  request_id: string;
  user_id?: string;
  environment?: string;
  correlation_id?: string;
  request_timestamp: string;
  response_timestamp: string;
  service: string;
  method: string;
  url: string;
  status_code: number;
  attempt_number?: number;
  original_request_id?: string;
  request_body?: unknown;
  response_body?: unknown;
  request_size_bytes?: number;
  response_size_bytes?: number;
  metadata?: Record<string, unknown>;
}

export interface RestEvent extends RestEventInput {
  event_id: string;
  tenant_id: string;
  latency_ms: number;
  request_body_truncated: boolean;
  response_body_truncated: boolean;
  created_at: string;
}

// ─────────────────────────────────────
// LLM Event Types
// ─────────────────────────────────────

export interface LlmEventInput {
  request_id: string;
  user_id?: string;
  environment?: string;
  correlation_id?: string;
  request_timestamp: string;
  response_timestamp: string;
  service: string;
  url: string;
  status_code: number;
  provider: string;
  model: string;
  endpoint: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  finish_reason?: string;
  is_streaming?: boolean;
  time_to_first_token_ms?: number;
  function_calls?: unknown[];
  conversation_id?: string;
  attempt_number?: number;
  original_request_id?: string;
  warnings?: unknown[];
  request_body?: unknown;
  response_body?: unknown;
  metadata?: Record<string, unknown>;
}

export interface LlmEvent extends LlmEventInput {
  event_id: string;
  tenant_id: string;
  latency_ms: number;
  request_body_truncated: boolean;
  response_body_truncated: boolean;
  created_at: string;
}

// ─────────────────────────────────────
// Batch Event Types
// ─────────────────────────────────────

export type BatchEventInput =
  | ({ type: 'rest' } & RestEventInput)
  | ({ type: 'llm' } & LlmEventInput);

export interface BatchTrackRequest {
  events: BatchEventInput[];
}

// ─────────────────────────────────────
// Query Types
// ─────────────────────────────────────

export interface LogsQueryParams {
  start_time: string;
  end_time: string;
  request_id?: string;
  user_id?: string;
  service?: string;
  environment?: string;
  type?: 'rest' | 'llm';
  status_code?: number;
  conversation_id?: string;
  finish_reason?: string;
  original_request_id?: string;
  include_bodies?: boolean;
  limit?: number;
  offset?: number;
}

export interface LogEntry {
  event_id: string;
  request_id: string;
  user_id: string | null;
  environment: string | null;
  request_timestamp: string;
  response_timestamp: string;
  type: 'rest' | 'llm';
  service: string;
  method?: string;
  url: string;
  status_code: number;
  latency_ms: number;
  // LLM-specific fields (optional)
  provider?: string;
  model?: string;
  total_tokens?: number;
  cost_usd?: number;
  finish_reason?: string;
  // Bodies (only if include_bodies=true)
  request_body?: unknown;
  response_body?: unknown;
}

export interface LogsResponse {
  logs: LogEntry[];
  total: number;
  limit: number;
  offset: number;
}

// ─────────────────────────────────────
// Path Types
// ─────────────────────────────────────

export interface PathEvent {
  event_id: string;
  type: 'rest' | 'llm';
  service: string;
  method?: string;
  url: string;
  status_code: number;
  latency_ms: number;
  request_timestamp: string;
  response_timestamp: string;
  // LLM-specific
  provider?: string;
  model?: string;
  total_tokens?: number;
  cost_usd?: number;
  finish_reason?: string;
  // Bodies
  request_body?: unknown;
  response_body?: unknown;
  metadata?: Record<string, unknown>;
}

export interface PathResponse {
  request_id: string;
  user_id: string | null;
  total_duration_ms: number;
  event_count: number;
  path: PathEvent[];
}

// ─────────────────────────────────────
// Metrics Types
// ─────────────────────────────────────

export interface MetricsQueryParams {
  start_time: string;
  end_time: string;
  service?: string;
  type?: 'rest' | 'llm';
  granularity?: 'minute' | 'hour' | 'day';
}

export interface MetricsResponse {
  period: {
    start: string;
    end: string;
  };
  metrics: {
    rest_requests: {
      total: number;
      by_service: Record<string, number>;
      by_status: Record<string, number>;
      latency: {
        p50: number;
        p95: number;
        p99: number;
      };
    };
    llm_requests: {
      total: number;
      by_provider: Record<string, number>;
      by_model: Record<string, number>;
      total_tokens: number;
      total_cost_usd: number;
      latency: {
        p50: number;
        p95: number;
        p99: number;
      };
    };
  };
}

// ─────────────────────────────────────
// API Response Types
// ─────────────────────────────────────

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface TrackingResponse {
  success: true;
  event_id: string;
}

export interface BatchTrackingResponse {
  success: true;
  events_processed: number;
  event_ids: string[];
}

// ─────────────────────────────────────
// Health Check Types
// ─────────────────────────────────────

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  dependencies: {
    database: {
      status: 'healthy' | 'unhealthy';
      latencyMs?: number;
      error?: string;
    };
  };
}
