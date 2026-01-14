-- ═══════════════════════════════════════════════════════════════
-- Path Tracker - Database Initialization Script
-- ═══════════════════════════════════════════════════════════════
-- This script runs automatically when PostgreSQL container starts
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────
-- Tenants Table
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Configuration
  retention_days INTEGER NOT NULL DEFAULT 90,
  body_size_limit_bytes INTEGER NOT NULL DEFAULT 10240,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 10000,
  storage_quota_gb INTEGER,
  pii_scrubbing_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  cost_budget_usd NUMERIC(10,2),
  
  -- Settings
  settings JSONB DEFAULT '{}'::jsonb
);

-- ─────────────────────────────────────
-- Account Users Table (Tenant Owners)
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS account_users (
  account_user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_users_clerk ON account_users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_account_users_tenant ON account_users(tenant_id);

-- ─────────────────────────────────────
-- API Keys Table
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  key_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL, -- First 12 chars for display (pwtrk_abc...)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  usage_count BIGINT NOT NULL DEFAULT 0,
  
  CONSTRAINT unique_name_per_tenant UNIQUE (tenant_id, name),
  CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash) WHERE revoked = FALSE;
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_active ON api_keys(tenant_id) WHERE revoked = FALSE;

-- ─────────────────────────────────────
-- REST Events Table
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS rest_events (
  event_id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  user_id TEXT,
  environment TEXT,
  correlation_id TEXT,
  request_timestamp TIMESTAMPTZ NOT NULL,
  response_timestamp TIMESTAMPTZ NOT NULL,
  service TEXT NOT NULL,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  
  -- Retry tracking
  attempt_number INTEGER DEFAULT 1,
  original_request_id TEXT,
  
  -- Bodies stored as JSONB
  request_body JSONB,
  response_body JSONB,
  request_body_truncated BOOLEAN DEFAULT FALSE,
  response_body_truncated BOOLEAN DEFAULT FALSE,
  request_body_size_bytes INTEGER,
  response_body_size_bytes INTEGER,
  
  -- Extracted fields for fast filtering
  extracted_fields JSONB,
  
  -- Other fields
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  metadata JSONB,
  
  -- Computed latency (stored for indexing)
  latency_ms INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (response_timestamp - request_timestamp)) * 1000
  ) STORED,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for REST events
CREATE INDEX IF NOT EXISTS idx_rest_events_tenant_time ON rest_events (tenant_id, request_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rest_events_request_id ON rest_events (tenant_id, request_id);
CREATE INDEX IF NOT EXISTS idx_rest_events_user ON rest_events (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_rest_events_service ON rest_events (tenant_id, service);
CREATE INDEX IF NOT EXISTS idx_rest_events_status ON rest_events (tenant_id, status_code);
CREATE INDEX IF NOT EXISTS idx_rest_events_environment ON rest_events (tenant_id, environment);
CREATE INDEX IF NOT EXISTS idx_rest_events_original_request ON rest_events (original_request_id) WHERE original_request_id IS NOT NULL;

-- GIN indexes for JSONB
CREATE INDEX IF NOT EXISTS idx_rest_events_extracted ON rest_events USING GIN (extracted_fields);
CREATE INDEX IF NOT EXISTS idx_rest_events_request_body ON rest_events USING GIN (request_body);
CREATE INDEX IF NOT EXISTS idx_rest_events_response_body ON rest_events USING GIN (response_body);

-- ─────────────────────────────────────
-- LLM Events Table
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS llm_events (
  event_id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  user_id TEXT,
  environment TEXT,
  correlation_id TEXT,
  request_timestamp TIMESTAMPTZ NOT NULL,
  response_timestamp TIMESTAMPTZ NOT NULL,
  service TEXT NOT NULL,
  url TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  
  -- LLM-specific fields
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cost_usd NUMERIC(10,4) NOT NULL,
  
  -- LLM configuration parameters
  temperature NUMERIC(3,2),
  max_tokens INTEGER,
  top_p NUMERIC(3,2),
  frequency_penalty NUMERIC(3,2),
  presence_penalty NUMERIC(3,2),
  
  -- Completion metadata
  finish_reason TEXT,
  is_streaming BOOLEAN,
  time_to_first_token_ms INTEGER,
  
  -- Function calling
  function_calls JSONB,
  
  -- Conversation tracking
  conversation_id TEXT,
  
  -- Retry tracking
  attempt_number INTEGER DEFAULT 1,
  original_request_id TEXT,
  
  -- Provider warnings/notices
  warnings JSONB,
  
  -- Bodies
  request_body JSONB,
  response_body JSONB,
  request_body_truncated BOOLEAN DEFAULT FALSE,
  response_body_truncated BOOLEAN DEFAULT FALSE,
  
  -- Extracted fields
  extracted_fields JSONB,
  metadata JSONB,
  
  -- Computed latency
  latency_ms INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (response_timestamp - request_timestamp)) * 1000
  ) STORED,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for LLM events
CREATE INDEX IF NOT EXISTS idx_llm_events_tenant_time ON llm_events (tenant_id, request_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_llm_events_request_id ON llm_events (tenant_id, request_id);
CREATE INDEX IF NOT EXISTS idx_llm_events_user ON llm_events (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_llm_events_provider ON llm_events (tenant_id, provider);
CREATE INDEX IF NOT EXISTS idx_llm_events_model ON llm_events (tenant_id, model);
CREATE INDEX IF NOT EXISTS idx_llm_events_conversation ON llm_events (tenant_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_llm_events_finish_reason ON llm_events (tenant_id, finish_reason);
CREATE INDEX IF NOT EXISTS idx_llm_events_original_request ON llm_events (original_request_id) WHERE original_request_id IS NOT NULL;

-- GIN indexes for JSONB
CREATE INDEX IF NOT EXISTS idx_llm_events_extracted ON llm_events USING GIN (extracted_fields);
CREATE INDEX IF NOT EXISTS idx_llm_events_request_body ON llm_events USING GIN (request_body);
CREATE INDEX IF NOT EXISTS idx_llm_events_response_body ON llm_events USING GIN (response_body);

-- ─────────────────────────────────────
-- Audit Log Table (for API key operations)
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  actor_type TEXT NOT NULL, -- 'clerk_user', 'api_key', 'system'
  actor_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- Initialization Complete
-- ═══════════════════════════════════════════════════════════════
