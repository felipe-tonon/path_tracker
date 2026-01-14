# Path Tracker - Functional Requirements

## 1. Overview

Path Tracker is a multi-tenant observability service that tracks REST API requests and LLM (Large Language Model) calls as they flow through distributed systems. The primary goal is to enable tracing the complete path a request takes across multiple services.

### Core Value Proposition

**Problem**: In distributed systems, it's difficult to understand the complete journey of a request across multiple services, track costs of LLM calls, and debug issues that span service boundaries.

**Solution**: Path Tracker provides a centralized tracking service where each service can log its requests, enabling visualization of the complete request path by filtering on `request_id` or `user_id`.

### Terminology

**IMPORTANT**: There are two distinct types of users in this system:

| Term | Definition | Example |
|------|------------|---------|
| **Tenant Owner** / **Account User** | The person who signs up for Path Tracker and uses the dashboard | Alice signs up for Path Tracker to monitor her application |
| **End User** (`user_id` in events) | Users of the tenant's application (never logs into Path Tracker) | Bob uses Alice's chat app and generates tracking events |

**Example Scenario:**
- **Alice** signs up for Path Tracker (she's a **Tenant Owner**)
- Alice builds a chat application with 10,000 users
- **Bob** uses Alice's chat app (he's an **End User**, tracked as `user_id: "bob_123"` in events)
- Alice logs into Path Tracker dashboard to see what her End Users (like Bob) are doing
- Bob never sees or interacts with Path Tracker

**In this document:**
- "Tenant owner" / "account user" = Person who owns the Path Tracker account
- `user_id` = The tenant's end users (in tracking events)
- "Dashboard" / "web UI" = Used by tenant owners, not end users

---

## 2. Core Functional Requirements

### 2.1 Request Path Tracking

**FR-1.1**: The system SHALL track REST API requests with the following information:
- `request_id` (required) - Unique identifier propagated through entire request chain
- `user_id` (optional) - User who initiated the request (recommended to propagate)
- `environment` (optional) - Environment name (e.g., "local", "dev", "staging", "production") - recommended to propagate
- `service` (required) - Service name (tenant-defined, no hardcoded names)
- `method` (required) - HTTP method (GET, POST, PUT, DELETE, etc.)
- `url` (required) - Full URL being called
- `status_code` (required) - HTTP response status code
- `request_timestamp` (required) - When the request started (ISO 8601 with milliseconds)
- `response_timestamp` (required) - When the request completed (ISO 8601 with milliseconds)
- `request_body` (optional) - Request payload
- `response_body` (optional) - Response payload
- `metadata` (optional) - Additional custom metadata

**FR-1.2**: The system SHALL calculate latency server-side as:
```
latency_ms = (response_timestamp - request_timestamp) * 1000
```

**FR-1.3**: Services SHALL propagate the same `request_id` through the entire request chain to enable path tracing.

**FR-1.4**: Services SHOULD propagate `user_id` through the request chain when available (not required for background jobs, health checks, etc.).

### 2.2 LLM Request Tracking

**FR-2.1**: The system SHALL track LLM API requests with the following additional information:
- All fields from REST tracking (FR-1.1) including `environment`
- `provider` (required) - LLM provider name (e.g., "openai", "anthropic")
- `model` (required) - Model name with version (e.g., "gpt-4", "claude-3-opus", "openai/gpt-4o-mini")
- `endpoint` (required) - API endpoint path
- `prompt_tokens` (required) - Number of tokens in prompt
- `completion_tokens` (required) - Number of tokens in completion
- `total_tokens` (required) - Total tokens used
- `cost_usd` (required) - Cost in USD for this request
- `temperature` (optional) - Sampling temperature used
- `max_tokens` (optional) - Maximum tokens requested
- `top_p` (optional) - Nucleus sampling parameter
- `frequency_penalty` (optional) - Frequency penalty parameter
- `presence_penalty` (optional) - Presence penalty parameter
- `finish_reason` (optional) - Why completion ended (e.g., "stop", "length", "content_filter", "function_call")
- `is_streaming` (optional) - Whether request used streaming
- `time_to_first_token_ms` (optional) - Latency to first token for streaming requests
- `function_calls` (optional) - Array of function/tool calls made during this request
- `conversation_id` (optional) - Identifier linking related requests in a conversation
- `attempt_number` (optional) - Attempt number for retry tracking (1 = first attempt)
- `original_request_id` (optional) - Original request_id if this is a retry
- `warnings` (optional) - Array of provider warnings or notices (e.g., rate limits, deprecations)

**FR-2.2**: The system SHALL support tracking LLM requests from any provider (OpenAI, Anthropic, custom, etc.).

**FR-2.3**: The system SHALL capture LLM debugging metadata to enable root cause analysis:
- Model configuration parameters (temperature, max_tokens, etc.) for filtering by configuration
- Finish reason to identify truncated or filtered responses
- Streaming metadata for performance analysis
- Function/tool calling data for debugging tool use
- Conversation context for multi-turn analysis
- Retry information for reliability analysis
- Provider warnings for proactive issue detection

### 2.3 Request Body Storage

**FR-3.1**: The system SHALL **always store** request and response bodies when provided by the client, subject to the limitations below.

**FR-3.2**: Bodies SHALL be stored as JSONB in PostgreSQL for full queryability.

**FR-3.3**: Body storage behavior:

**✅ ALWAYS STORED (default):**
- JSON bodies (objects, arrays)
- Text bodies (strings)
- Bodies under the size limit (default: 10KB)

**⚠️ TRUNCATED (with marker):**
- Bodies larger than the size limit SHALL be truncated and marked:
```json
{
  "truncated": true,
  "original_size_bytes": 50000,
  "stored_bytes": 10240,
  "partial_content": "{ ... first 10KB of content ... }"
}
```

**❌ NOT STORED (marked only):**
- Binary bodies (images, PDFs, videos, etc.) SHALL be marked but not stored:
```json
{
  "binary": true,
  "content_type": "image/png",
  "size_bytes": 2048576
}
```
- Non-JSON, non-text bodies

**FR-3.4**: The system SHALL enforce a configurable body size limit per tenant:
- Default: 10,240 bytes (10KB)
- Configurable via `body_size_limit_bytes` in tenant settings
- Recommended maximum: 102,400 bytes (100KB) - higher limits may impact performance
- No hard upper limit enforced (tenant can set higher if needed for their use case)

**FR-3.5**: The system SHALL detect binary/non-text content by:
- Content-Type header analysis (if available in metadata)
- Binary content detection (presence of non-UTF8 characters)
- File extension analysis (if URL contains .jpg, .png, .pdf, etc.)

**FR-3.6**: The system SHALL support querying on any field within request_body or response_body using PostgreSQL JSONB operators.

**FR-3.7**: For performance, the system MAY extract commonly-queried fields to an `extracted_fields` JSONB column with GIN indexing.

**FR-3.8**: Body storage is **opt-out, not opt-in**:
- Bodies are stored by default when provided
- Tenants can disable body storage in settings if desired
- Services can omit bodies from tracking requests if they don't want them stored

---

## 3. Query & Filtering Requirements

### 3.1 Path Visualization

**FR-4.1**: The system SHALL provide an endpoint to query the complete path of a request:
```
GET /api/v1/paths/{request_id}
```

**FR-4.2**: The path query SHALL return all events for the given `request_id` in chronological order.

**FR-4.3**: The path query response SHALL include:
- `request_id`
- `user_id` (if available)
- `total_duration_ms` - Time from first to last event
- `path` - Array of events with service, method, url, latency_ms, timestamp

**FR-4.4**: Example response format:
```json
{
  "request_id": "req_abc123",
  "user_id": "user_456",
  "total_duration_ms": 5250,
  "event_count": 3,
  "path": [
    {
      "event_id": "evt_001",
      "service": "api-gateway",
      "method": "POST",
      "url": "https://api.example.com/chat",
      "status_code": 200,
      "latency_ms": 1200,
      "request_timestamp": "2025-01-14T10:00:00.000Z",
      "response_timestamp": "2025-01-14T10:00:01.200Z"
    },
    {
      "event_id": "evt_002",
      "service": "ml-service",
      "method": "POST",
      "url": "https://api.openai.com/v1/chat/completions",
      "status_code": 200,
      "latency_ms": 3500,
      "request_timestamp": "2025-01-14T10:00:01.250Z",
      "response_timestamp": "2025-01-14T10:00:04.750Z",
      "provider": "openai",
      "model": "gpt-4",
      "total_tokens": 225,
      "cost_usd": 0.0034
    },
    {
      "event_id": "evt_003",
      "service": "database-service",
      "method": "POST",
      "url": "https://db.internal/query",
      "status_code": 200,
      "latency_ms": 500,
      "request_timestamp": "2025-01-14T10:00:04.800Z",
      "response_timestamp": "2025-01-14T10:00:05.300Z"
    }
  ]
}
```

### 3.2 Log Querying

**FR-5.1**: The system SHALL provide an endpoint to query logs with filtering:
```
GET /api/v1/logs
```

**FR-5.2**: The logs endpoint SHALL support the following query parameters:
- `start_time` (required) - ISO 8601 timestamp
- `end_time` (required) - ISO 8601 timestamp
- `request_id` (optional) - Filter by specific request
- `user_id` (optional) - Filter by user
- `service` (optional) - Filter by service name
- `environment` (optional) - Filter by environment
- `type` (optional) - Filter by type: `rest` or `llm`
- `status_code` (optional) - Filter by HTTP status code
- `conversation_id` (optional) - Filter by conversation (LLM only)
- `finish_reason` (optional) - Filter by finish reason (LLM only)
- `original_request_id` (optional) - Filter retries by original request
- `include_bodies` (optional, default: false) - Include request/response bodies
- `limit` (optional, default: 100, max: 1000) - Max results
- `offset` (optional) - Pagination offset

**FR-5.3**: All log queries SHALL be automatically scoped to the tenant (extracted from API key).

### 3.3 Metrics Aggregation

**FR-6.1**: The system SHALL provide an endpoint to query aggregated metrics:
```
GET /api/v1/metrics
```

**FR-6.2**: The metrics endpoint SHALL support:
- Time range filtering (`start_time`, `end_time`)
- Grouping by service, status_code, provider, model
- Aggregations: count, latency percentiles (p50, p95, p99), total_cost, total_tokens

**FR-6.3**: Metrics SHALL be calculated on-demand from raw events (no pre-aggregation in MVP).

---

## 4. Multi-Tenancy Requirements

### 4.1 Tenant Isolation

**FR-7.1**: The system SHALL enforce strict tenant isolation - tenants can only access their own data.

**FR-7.2**: The `tenant_id` SHALL be extracted from the API key during authentication (not from request body).

**FR-7.3**: All database queries SHALL be automatically scoped by `tenant_id`.

**FR-7.4**: The system SHALL use database-level partitioning by `tenant_id` for performance and isolation.

### 4.2 Tenant Configuration

**FR-8.1**: Each tenant SHALL have a configuration with:
- `tenant_id` (unique identifier)
- `name` (display name)
- `retention_days` (default: 90) - How long to keep logs
- `body_size_limit_bytes` (default: 10240) - Max size for request/response bodies before truncation (recommended max: 102400)
- `rate_limit_per_minute` (default: 10000) - Max requests per minute
- `storage_quota_gb` (optional) - Max storage allowed
- `pii_scrubbing_enabled` (default: true) - Enable PII scrubbing
- `cost_budget_usd` (optional) - Monthly budget for LLM costs

**FR-8.2**: Tenant configurations SHALL be manageable via admin API (future requirement).

---

## 5. Authentication & Security Requirements

### 5.1 API Key Authentication

**FR-9.1**: The system SHALL use API key authentication for all requests.

**FR-9.2**: API keys SHALL be formatted as: `pwtrk_<32_random_characters>`

**FR-9.3**: API keys SHALL be hashed using bcrypt (cost factor 12) or Argon2id before storage.

**FR-9.4**: API keys SHALL NEVER be stored in plaintext.

**FR-9.5**: Each API key SHALL be associated with exactly one tenant.

**FR-9.6**: The system SHALL extract `tenant_id` from the API key during authentication.

**FR-9.7**: API keys SHALL be provided in the `Authorization` header:
```
Authorization: Bearer pwtrk_abc123...
```

### 5.2 HTTPS Enforcement

**FR-10.1**: The system SHALL reject HTTP requests to external endpoints (require HTTPS).

**FR-10.2**: The system SHALL support HTTP for internal service-to-service communication (within private network).

**FR-10.3**: The system SHALL use TLS 1.2 or higher for HTTPS connections.

### 5.3 Rate Limiting

**FR-11.1**: The system SHALL enforce per-API-key rate limits (configurable per tenant).

**FR-11.2**: The default rate limit SHALL be 10,000 requests per minute.

**FR-11.3**: The system SHALL return HTTP 429 (Too Many Requests) when rate limit is exceeded.

**FR-11.4**: Rate limit headers SHALL be included in responses:
```
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9950
X-RateLimit-Reset: 1642248000
```

### 5.4 Audit Logging

**FR-12.1**: The system SHALL log all authentication events:
- Successful authentications (API key ID, tenant_id, timestamp)
- Failed authentications (reason: invalid key, expired, revoked, rate limit)
- API key creation, rotation, revocation

### 5.5 API Key Management

API keys are managed by tenant owners through the dashboard (authenticated via Clerk session).

#### 5.5.1 Creating API Keys

**FR-12.2**: The system SHALL provide an endpoint for tenant owners to create API keys:
```
POST /api/keys
Authorization: Bearer <clerk_session_token>
```

**FR-12.3**: Request body for creating an API key:
```json
{
  "name": "Production API",
  "expires_at": "2026-12-31T23:59:59Z"  // Optional
}
```

**FR-12.4**: The response SHALL include the full API key **exactly once** (never shown again):
```json
{
  "success": true,
  "api_key": "pwtrk_abc123def456ghi789jkl012mno345pq",  // Shown once only!
  "key_id": "key_a1b2c3d4",
  "name": "Production API",
  "created_at": "2025-01-14T10:00:00Z",
  "expires_at": "2026-12-31T23:59:59Z"
}
```

**FR-12.5**: The full API key SHALL be returned only in the creation response. Subsequent queries SHALL only show a masked version (e.g., `pwtrk_abc...345pq`).

**FR-12.6**: Each API key SHALL have the following properties:
- `key_id` (UUID) - Unique identifier for the key record
- `name` (string) - User-defined name (e.g., "Production API", "Staging")
- `key_hash` (string) - bcrypt/Argon2id hash of the full key (for validation)
- `tenant_id` (UUID) - The tenant this key belongs to
- `created_at` (timestamp) - When the key was created
- `expires_at` (timestamp, optional) - When the key expires (null = never)
- `revoked` (boolean) - Whether the key has been revoked
- `revoked_at` (timestamp, optional) - When the key was revoked
- `last_used_at` (timestamp, optional) - Last time this key was used
- `usage_count` (integer) - Total number of requests made with this key

**FR-12.7**: API key names SHALL be unique per tenant (cannot have two keys with the same name).

**FR-12.8**: The system SHALL validate that the tenant owner creating the key belongs to the tenant (extracted from Clerk session).

#### 5.5.2 Listing API Keys

**FR-12.9**: The system SHALL provide an endpoint to list all API keys for a tenant:
```
GET /api/keys
Authorization: Bearer <clerk_session_token>
```

**FR-12.10**: The response SHALL include all keys for the tenant (extracted from Clerk session):
```json
{
  "keys": [
    {
      "key_id": "key_a1b2c3d4",
      "name": "Production API",
      "key_preview": "pwtrk_abc...345pq",  // Masked
      "created_at": "2025-01-14T10:00:00Z",
      "expires_at": null,
      "revoked": false,
      "last_used_at": "2025-01-14T15:30:00Z",
      "usage_count": 15420
    },
    {
      "key_id": "key_b5c6d7e8",
      "name": "Staging API",
      "key_preview": "pwtrk_xyz...789ab",
      "created_at": "2025-01-10T08:00:00Z",
      "expires_at": "2025-06-30T23:59:59Z",
      "revoked": false,
      "last_used_at": "2025-01-14T14:00:00Z",
      "usage_count": 3420
    },
    {
      "key_id": "key_c9d0e1f2",
      "name": "Old Key",
      "key_preview": "pwtrk_old...456cd",
      "created_at": "2024-01-01T00:00:00Z",
      "expires_at": null,
      "revoked": true,
      "revoked_at": "2025-01-12T10:00:00Z",
      "last_used_at": "2025-01-12T09:55:00Z",
      "usage_count": 98500
    }
  ]
}
```

**FR-12.11**: Keys SHALL be returned sorted by `created_at` DESC (newest first).

**FR-12.12**: Revoked keys SHALL be included in the list (with `revoked: true`) for audit purposes.

#### 5.5.3 Revoking API Keys

**FR-12.13**: The system SHALL provide an endpoint to revoke an API key:
```
DELETE /api/keys/:key_id
Authorization: Bearer <clerk_session_token>
```

**FR-12.14**: Revoking a key SHALL:
- Set `revoked = true`
- Set `revoked_at = NOW()`
- **NOT** delete the key from the database (keep for audit trail)
- Immediately reject any future requests using this key

**FR-12.15**: The response SHALL confirm revocation:
```json
{
  "success": true,
  "message": "API key 'Production API' has been revoked",
  "key_id": "key_a1b2c3d4",
  "revoked_at": "2025-01-14T16:00:00Z"
}
```

**FR-12.16**: The system SHALL validate that the tenant owner revoking the key belongs to the same tenant as the key.

**FR-12.17**: Attempting to revoke an already-revoked key SHALL return an error:
```json
{
  "error": {
    "code": "KEY_ALREADY_REVOKED",
    "message": "This API key is already revoked"
  }
}
```

#### 5.5.4 Updating API Keys

**FR-12.18**: The system SHALL provide an endpoint to update API key metadata:
```
PATCH /api/keys/:key_id
Authorization: Bearer <clerk_session_token>
```

**FR-12.19**: Only the `name` field can be updated:
```json
{
  "name": "Production API v2"
}
```

**FR-12.20**: The response SHALL return the updated key:
```json
{
  "success": true,
  "key": {
    "key_id": "key_a1b2c3d4",
    "name": "Production API v2",
    "key_preview": "pwtrk_abc...345pq",
    "created_at": "2025-01-14T10:00:00Z",
    "expires_at": null,
    "revoked": false,
    "last_used_at": "2025-01-14T15:30:00Z",
    "usage_count": 15420
  }
}
```

#### 5.5.5 Key Usage Tracking

**FR-12.21**: The system SHALL update `last_used_at` every time an API key is used successfully.

**FR-12.22**: The system SHALL increment `usage_count` every time an API key is used successfully.

**FR-12.23**: Usage updates SHALL happen asynchronously (non-blocking) to avoid impacting request latency.

**FR-12.24**: The dashboard SHALL display key usage statistics:
- Last used timestamp
- Total usage count
- Usage trend (requests per day/hour)

#### 5.5.6 Key Expiration

**FR-12.25**: The system SHALL check `expires_at` during API key validation.

**FR-12.26**: Expired keys (where `NOW() > expires_at`) SHALL be rejected with:
```json
{
  "error": {
    "code": "API_KEY_EXPIRED",
    "message": "This API key expired on 2025-12-31"
  }
}
```

**FR-12.27**: The system SHALL send email notifications to tenant owners 7 days before key expiration (future requirement).

#### 5.5.7 Security Considerations

**FR-12.28**: API key management endpoints SHALL be authenticated via Clerk session (NOT via API key).

**FR-12.29**: The full API key SHALL only be displayed once at creation time. A warning SHALL be shown to the user:
```
⚠️ This is the only time you'll see this API key. 
Copy it now and store it securely.
```

**FR-12.30**: The dashboard SHALL provide a "copy to clipboard" button for newly created keys.

**FR-12.31**: The system SHALL prevent tenant owners from accessing or managing API keys belonging to other tenants.

**FR-12.32**: All API key operations (create, revoke, update) SHALL be logged in the audit log.

#### 5.5.8 Database Schema

**FR-12.33**: The system SHALL use the following schema for API keys:

```sql
CREATE TABLE api_keys (
  key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,  -- bcrypt/Argon2id hash
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- NULL = never expires
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  usage_count BIGINT NOT NULL DEFAULT 0,
  
  -- Constraints
  CONSTRAINT unique_name_per_tenant UNIQUE (tenant_id, name),
  CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Indexes for performance
CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked = FALSE;
CREATE INDEX idx_api_keys_tenant_active ON api_keys(tenant_id) WHERE revoked = FALSE;
```

**FR-12.34**: The `key_hash` column SHALL store the bcrypt/Argon2id hash of the full API key (never plaintext).

**FR-12.35**: The system SHALL enforce the `unique_name_per_tenant` constraint to prevent duplicate key names within a tenant.

### 5.6 Dashboard Authentication (Clerk)

Dashboard authentication is handled by Clerk and is separate from API key authentication.

#### 5.6.1 Account Registration

**FR-12.36**: New users SHALL sign up via Clerk's hosted authentication:
```
POST /sign-up (handled by Clerk)
```

**FR-12.37**: Upon successful signup, the system SHALL:
1. Receive webhook from Clerk with new user details
2. Create a new `tenant` record
3. Create an `account_user` record linking the Clerk user ID to the tenant
4. Generate a default API key named "Default API Key"

**FR-12.38**: The signup flow SHALL follow this sequence:
```
User signs up (Clerk)
  ↓
Clerk creates user account
  ↓
Clerk webhook → POST /api/webhooks/clerk
  ↓
BFF creates:
  - New tenant record
  - New account_user record (links clerk_user_id → tenant_id)
  - Default API key
  ↓
User can now log in and access dashboard
```

#### 5.6.2 Authentication Flow

**FR-12.39**: Tenant owners SHALL authenticate using Clerk (email/password, OAuth, etc.).

**FR-12.40**: Upon successful login, Clerk SHALL issue a session token (JWT).

**FR-12.41**: All dashboard API requests SHALL include the Clerk session token:
```
Authorization: Bearer <clerk_session_token>
```

**FR-12.42**: The BFF SHALL validate the Clerk session token on every request.

**FR-12.43**: The BFF SHALL extract the `clerk_user_id` from the validated token.

**FR-12.44**: The BFF SHALL look up the `tenant_id` from the `account_users` table:
```sql
SELECT tenant_id FROM account_users WHERE clerk_user_id = '<clerk_user_id>';
```

**FR-12.45**: All queries SHALL be automatically scoped to the extracted `tenant_id`.

#### 5.6.3 Authorization

**FR-12.46**: The system SHALL enforce that tenant owners can only:
- View data for their own tenant
- Create/manage API keys for their own tenant
- Update settings for their own tenant

**FR-12.47**: Attempting to access another tenant's data SHALL return:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource"
  }
}
```

#### 5.6.4 Two Authentication Systems

**IMPORTANT**: The system uses TWO separate authentication mechanisms:

| Authentication | Used By | Purpose |
|----------------|---------|---------|
| **Clerk Session** | Tenant owners | Log into dashboard, manage API keys, view analytics |
| **API Keys** | Services/Applications | Send tracking events to Path Tracker |

**Example:**
```
Tenant Owner (Alice):
  Clerk session → Dashboard → View logs, create API keys
  
Alice's Service:
  API Key → POST /api/v1/tracker/rest → Track events
```

**FR-12.48**: Dashboard endpoints (`/api/keys`, `/api/logs`, `/api/metrics`, `/api/paths`) SHALL require Clerk session authentication.

**FR-12.49**: Tracking endpoints (`/api/v1/tracker/*`) SHALL require API key authentication.

**FR-12.50**: The two authentication systems SHALL NOT be interchangeable (cannot use API key to access dashboard, cannot use Clerk session to send tracking events).

---

## 6. API Endpoints

### Authentication Summary

The system uses **two separate authentication methods** depending on the endpoint:

| Endpoint Type | Authentication | Used By | Header |
|--------------|----------------|---------|--------|
| **Tracking Endpoints** | API Key | Services/Applications | `Authorization: Bearer pwtrk_xxx` |
| **Query Endpoints** | Clerk Session | Tenant Owners (Dashboard) | `Authorization: Bearer <clerk_token>` |
| **API Key Management** | Clerk Session | Tenant Owners (Dashboard) | `Authorization: Bearer <clerk_token>` |
| **Health Check** | None | Anyone | N/A |

**Key Principle:** 
- 🔑 **API Keys** = Services sending tracking data to Path Tracker
- 👤 **Clerk Sessions** = Humans using the dashboard to view/manage data

---

### 6.1 Tracking Endpoints

**FR-13.1**: The system SHALL provide an endpoint to track REST requests:
```
POST /api/v1/tracker/rest
Authorization: Bearer <api_key>
```

**FR-13.2**: The system SHALL provide an endpoint to track LLM requests:
```
POST /api/v1/tracker/llm
Authorization: Bearer <api_key>
```

**FR-13.3**: The system SHALL provide an endpoint to track multiple events in a batch:
```
POST /api/v1/tracker/batch
Authorization: Bearer <api_key>
```

**FR-13.4**: All tracking endpoints SHALL require API key authentication:
- API key SHALL be provided in the `Authorization: Bearer <api_key>` header
- The API key format SHALL be `pwtrk_<32_random_characters>`
- The system SHALL extract `tenant_id` from the API key
- Requests with invalid, expired, or revoked API keys SHALL be rejected with HTTP 401

**FR-13.5**: All tracking endpoints SHALL return immediately with:
```json
{
  "success": true,
  "event_id": "evt_123456"
}
```

**FR-13.6**: Tracking endpoints SHALL be non-blocking (async processing).

### 6.2 Query Endpoints

**FR-14.1**: The system SHALL provide the following query endpoints:
```
GET /api/v1/paths/{request_id}
GET /api/v1/logs
GET /api/v1/metrics
Authorization: Bearer <clerk_session_token>
```

**FR-14.2**: All query endpoints SHALL require Clerk session authentication:
- Session token SHALL be provided in the `Authorization: Bearer <clerk_session_token>` header
- The system SHALL validate the session token with Clerk
- The system SHALL extract `clerk_user_id` from the validated token
- The system SHALL look up `tenant_id` from the `account_users` table
- All queries SHALL be automatically scoped to the user's `tenant_id`
- Requests with invalid or expired session tokens SHALL be rejected with HTTP 401

### 6.3 API Key Management Endpoints

**FR-14.3**: The system SHALL provide the following API key management endpoints:
```
POST /api/keys
GET /api/keys
PATCH /api/keys/:key_id
DELETE /api/keys/:key_id
Authorization: Bearer <clerk_session_token>
```

**FR-14.4**: API key management endpoints SHALL require Clerk session authentication:
- Session token SHALL be provided in the `Authorization: Bearer <clerk_session_token>` header
- The system SHALL validate the session token with Clerk
- The system SHALL extract `tenant_id` from the authenticated user
- Tenant owners can ONLY manage API keys for their own tenant
- Requests with invalid or expired session tokens SHALL be rejected with HTTP 401

### 6.4 Health & Status

**FR-15.1**: The system SHALL provide a health check endpoint:
```
GET /health
```

**FR-15.2**: The health endpoint SHALL NOT require authentication.

**FR-15.3**: The health endpoint SHALL return:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 86400
}
```

---

## 7. Data Storage Requirements

### 7.1 Database

**FR-16.1**: The system SHALL use PostgreSQL as the primary database.

**FR-16.2**: The system SHALL use time-based indexes for efficient time-series queries.

**FR-16.3**: The system SHALL use proper indexing strategies optimized for time-range queries and tenant isolation.

**FR-16.4**: The system SHALL use JSONB columns for:
- `request_body`
- `response_body`
- `extracted_fields`
- `metadata`

**FR-16.5**: The system SHALL create GIN indexes on all JSONB columns for fast querying.

### 7.2 Data Retention

**FR-17.1**: The system SHALL automatically delete logs older than the tenant's `retention_days` setting.

**FR-17.2**: The default retention period SHALL be 90 days.

**FR-17.3**: The system MAY implement data archiving strategies for old data (e.g., moving to cold storage) if needed for cost optimization.

### 7.3 Performance

**FR-18.1**: Query latency for metrics SHALL be < 200ms at p95 (for time ranges < 7 days, with proper indexing).

**FR-18.2**: Query latency for log searches SHALL be < 500ms at p95 (for time ranges < 7 days, with proper indexing).

**FR-18.3**: The system SHALL support ingestion of 10,000 events per second initially, with ability to scale horizontally for higher throughput.

### 7.4 Database Schema

**FR-18.4**: The system SHALL implement the following database schema:

#### Account Users & Tenants

```sql
-- Tenants table (organizations/accounts)
CREATE TABLE tenants (
  tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  settings JSONB DEFAULT '{}'
);

-- Account users (tenant owners who log into the dashboard)
-- Note: Authentication handled by Clerk, this is just for mapping
CREATE TABLE account_users (
  account_user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,  -- Clerk's user ID
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_tenant_per_user UNIQUE (clerk_user_id)
);

-- Index for quick lookup by Clerk user ID
CREATE INDEX idx_account_users_clerk ON account_users(clerk_user_id);
CREATE INDEX idx_account_users_tenant ON account_users(tenant_id);
```

**Note on Multi-Tenancy:** In MVP, 1 account_user = 1 tenant (one-to-one relationship). The schema supports future expansion to many-to-many if needed.

#### API Keys

```sql
CREATE TABLE api_keys (
  key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,  -- bcrypt/Argon2id hash
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- NULL = never expires
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  usage_count BIGINT NOT NULL DEFAULT 0,
  
  -- Constraints
  CONSTRAINT unique_name_per_tenant UNIQUE (tenant_id, name),
  CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Indexes for performance
CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked = FALSE;
CREATE INDEX idx_api_keys_tenant_active ON api_keys(tenant_id) WHERE revoked = FALSE;
```

#### Tracking Events

```sql
-- REST events table
CREATE TABLE rest_events (
  event_id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  user_id TEXT,  -- Optional - the tenant's end user
  environment TEXT,  -- 'local', 'dev', 'staging', 'production'
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
  
  -- Bodies stored as JSONB for queryability
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
  
  -- Computed latency
  latency_ms INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (response_timestamp - request_timestamp)) * 1000
  ) STORED
);

-- LLM events table (extends REST events with LLM-specific fields)
CREATE TABLE llm_events (
  event_id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  user_id TEXT,  -- Optional - the tenant's end user
  correlation_id TEXT,
  request_timestamp TIMESTAMPTZ NOT NULL,
  response_timestamp TIMESTAMPTZ NOT NULL,
  service TEXT NOT NULL,
  url TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  environment TEXT,  -- 'local', 'dev', 'staging', 'production'
  
  -- LLM-specific fields
  provider TEXT NOT NULL,  -- 'openai', 'anthropic', etc.
  model TEXT NOT NULL,     -- 'gpt-4', 'claude-3-opus', 'openai/gpt-4o-mini', etc.
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
  finish_reason TEXT,  -- 'stop', 'length', 'content_filter', 'function_call', etc.
  is_streaming BOOLEAN,
  time_to_first_token_ms INTEGER,
  
  -- Function calling
  function_calls JSONB,  -- Array of function/tool calls made
  
  -- Conversation tracking
  conversation_id TEXT,
  
  -- Retry tracking
  attempt_number INTEGER DEFAULT 1,
  original_request_id TEXT,
  
  -- Provider warnings/notices
  warnings JSONB,  -- Array of warnings
  
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
  ) STORED
);

-- Indexes for fast filtering
CREATE INDEX idx_rest_events_tenant_time ON rest_events (tenant_id, request_timestamp DESC);
CREATE INDEX idx_rest_events_request_id ON rest_events (tenant_id, request_id);
CREATE INDEX idx_rest_events_user ON rest_events (tenant_id, user_id);
CREATE INDEX idx_rest_events_service ON rest_events (tenant_id, service);
CREATE INDEX idx_rest_events_status ON rest_events (tenant_id, status_code);
CREATE INDEX idx_rest_events_environment ON rest_events (tenant_id, environment);
CREATE INDEX idx_rest_events_original_request ON rest_events (original_request_id) WHERE original_request_id IS NOT NULL;

CREATE INDEX idx_llm_events_tenant_time ON llm_events (tenant_id, request_timestamp DESC);
CREATE INDEX idx_llm_events_request_id ON llm_events (tenant_id, request_id);
CREATE INDEX idx_llm_events_user ON llm_events (tenant_id, user_id);
CREATE INDEX idx_llm_events_provider ON llm_events (tenant_id, provider);
CREATE INDEX idx_llm_events_model ON llm_events (tenant_id, model);
CREATE INDEX idx_llm_events_conversation ON llm_events (tenant_id, conversation_id);
CREATE INDEX idx_llm_events_finish_reason ON llm_events (tenant_id, finish_reason);
CREATE INDEX idx_llm_events_original_request ON llm_events (original_request_id) WHERE original_request_id IS NOT NULL;

-- GIN indexes for JSONB querying
CREATE INDEX idx_rest_events_extracted ON rest_events USING GIN (extracted_fields);
CREATE INDEX idx_rest_events_request_body ON rest_events USING GIN (request_body);
CREATE INDEX idx_rest_events_response_body ON rest_events USING GIN (response_body);

CREATE INDEX idx_llm_events_extracted ON llm_events USING GIN (extracted_fields);
CREATE INDEX idx_llm_events_request_body ON llm_events USING GIN (request_body);
CREATE INDEX idx_llm_events_response_body ON llm_events USING GIN (response_body);
```

**Note on Partitioning:** For high-volume deployments, consider implementing PostgreSQL native table partitioning by month or quarter. This can be added later without changing application code.

---

## 8. Privacy & Compliance

### 8.1 PII Scrubbing

**FR-19.1**: The system SHALL support configurable PII scrubbing per tenant.

**FR-19.2**: When PII scrubbing is enabled, the system SHALL detect and redact:
- Email addresses → `[EMAIL_REDACTED]`
- Phone numbers → `[PHONE_REDACTED]`
- API keys/tokens → `[API_KEY_REDACTED]`

**FR-19.3**: PII scrubbing SHALL occur at ingestion time (before storage).

### 8.2 GDPR Compliance

**FR-20.1**: The system SHALL support data deletion requests (right to be forgotten).

**FR-20.2**: Data deletion SHALL be completed within 30 days of request.

**FR-20.3**: The system SHALL support data export for a given user_id or tenant_id.

---

## 9. Error Handling

### 9.1 Error Responses

**FR-21.1**: All errors SHALL follow this format:
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required field: request_id",
    "details": {}
  }
}
```

**FR-21.2**: The system SHALL return appropriate HTTP status codes:
- `400` - Invalid request (malformed data)
- `401` - Unauthorized (invalid/missing API key)
- `403` - Forbidden (tenant mismatch, insufficient permissions)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal server error

---

## 10. Integration Requirements

### 10.1 Client SDK (Future)

**FR-22.1**: The system SHOULD provide client SDKs for:
- Python
- Node.js/TypeScript
- Go
- Java

**FR-22.2**: SDKs SHALL handle:
- Automatic `request_id` generation and propagation
- Async/batched event submission
- Retry logic for failed submissions
- Automatic timestamp capture

### 10.2 Framework Middleware (Future)

**FR-23.1**: The system SHOULD provide middleware for popular frameworks:
- FastAPI (Python)
- Express.js (Node.js)
- Flask (Python)
- Spring Boot (Java)

**FR-23.2**: Middleware SHALL automatically track incoming requests and outgoing requests.

---

## 11. Non-Functional Requirements

### 11.1 Reliability

**NFR-1**: The system SHALL have 99.9% uptime SLA.

**NFR-2**: The system SHALL buffer events during database outages (in-memory queue, max 100K events).

**NFR-3**: The system SHALL guarantee at-least-once delivery for tracking events.

### 11.2 Scalability

**NFR-4**: The system SHALL support horizontal scaling via stateless API instances.

**NFR-5**: The system SHALL support database sharding by tenant_id (for future growth).

### 11.3 Observability

**NFR-6**: The system SHALL expose Prometheus metrics for monitoring.

**NFR-7**: The system SHALL log all errors with structured logging (JSON format).

---

## 12. Out of Scope (For Now)

The following features are explicitly out of scope for the initial version:

- ❌ Real-time websocket/streaming APIs
- ❌ Advanced distributed tracing (span visualization, flame graphs)
- ❌ Machine learning / anomaly detection
- ❌ Custom dashboards / UI (API only)
- ❌ Webhook notifications
- ❌ Large file storage (> 10KB bodies)
- ❌ Binary data storage
- ❌ Full-text search on bodies

---

## 13. Success Criteria

The MVP will be considered successful when:

✅ Services can track REST and LLM requests via API  
✅ Request paths can be visualized by `request_id`  
✅ Logs can be filtered by `user_id`, `service`, `status_code`, etc.  
✅ LLM costs are tracked and queryable  
✅ Multi-tenant isolation is enforced  
✅ API keys work for authentication  
✅ Query latency meets performance targets  
✅ Documentation is complete  

---

*Last Updated: January 14, 2026*
