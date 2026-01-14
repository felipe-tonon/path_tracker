# Path Tracker - API Documentation

**Version**: 1.0.0  
**Base URL (Production)**: `https://tracker.pathwave.io`  
**Base URL (Internal)**: `http://path_tracker:8005`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Common Headers](#common-headers)
3. [Error Responses](#error-responses)
4. [Tracking Endpoints](#tracking-endpoints)
   - [Track REST Request](#track-rest-request)
   - [Track LLM Request](#track-llm-request)
   - [Track Batch Requests](#track-batch-requests)
5. [Query Endpoints](#query-endpoints)
   - [Get Request Path](#get-request-path)
   - [Query Logs](#query-logs)
   - [Get Metrics](#get-metrics)
6. [API Key Management](#api-key-management)
   - [Create API Key](#create-api-key)
   - [List API Keys](#list-api-keys)
   - [Update API Key](#update-api-key)
   - [Revoke API Key](#revoke-api-key)
7. [Health Check](#health-check)

---

## Authentication

Path Tracker uses **two separate authentication methods** depending on the endpoint:

### 1. API Key Authentication (For Tracking Endpoints)

Used by **services/applications** to send tracking data to Path Tracker.

**Header:**
```
Authorization: Bearer pwtrk_abc123def456ghi789jkl012mno345pq
```

**Format:** `pwtrk_<32_random_characters>`

**Where to Use:**
- `POST /api/v1/tracker/rest`
- `POST /api/v1/tracker/llm`
- `POST /api/v1/tracker/batch`

### 2. Clerk Session Authentication (For Dashboard/Management)

Used by **tenant owners** (humans) to access the dashboard and manage their account.

**Header:**
```
Authorization: Bearer <clerk_session_token>
```

**Where to Use:**
- `GET /api/v1/paths/:request_id`
- `GET /api/v1/logs`
- `GET /api/v1/metrics`
- `POST /api/keys`
- `GET /api/keys`
- `PATCH /api/keys/:key_id`
- `DELETE /api/keys/:key_id`

---

## Common Headers

### For All Requests

```http
Content-Type: application/json
```

### For Tracking Endpoints (API Key)

```http
Authorization: Bearer pwtrk_abc123def456ghi789jkl012mno345pq
Content-Type: application/json
```

### For Dashboard/Management Endpoints (Clerk Session)

```http
Authorization: Bearer <clerk_session_token>
Content-Type: application/json
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_REQUEST` | Malformed request body or missing required fields |
| 401 | `UNAUTHORIZED` | Invalid, missing, or expired authentication token |
| 401 | `API_KEY_EXPIRED` | API key has expired |
| 403 | `FORBIDDEN` | Insufficient permissions or tenant mismatch |
| 404 | `NOT_FOUND` | Resource not found |
| 500 | `INTERNAL_ERROR` | Server error |

### Example Error Response

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required field: request_id",
    "details": {
      "field": "request_id",
      "expected": "string"
    }
  }
}
```

---

## Request/Response Body Storage

### Default Behavior

**Bodies are ALWAYS stored when provided**, subject to the limitations below:

### ✅ What Gets Stored

- **JSON objects/arrays** - Stored in full (up to tenant's configured limit, default: 10KB)
- **Text strings** - Stored in full (up to tenant's configured limit, default: 10KB)
- **Small bodies** (within tenant's limit) - Stored completely

**Example:**
```json
{
  "request_body": {
    "message": "Hello",
    "user_id": "user_456"
  }
}
```
→ **Stored as-is in database, fully queryable**

### ⚠️ What Gets Truncated

- **Large bodies** (exceeding tenant's limit) - Content up to limit stored with truncation marker

**Example (with default 10KB limit):**
```json
{
  "request_body": {
    "truncated": true,
    "original_size_bytes": 50000,
    "stored_bytes": 10240,
    "partial_content": "{ ... first 10KB ... }"
  }
}
```
→ **Partial content stored, marked as truncated**

### ❌ What Doesn't Get Stored

- **Binary files** (images, PDFs, videos) - Marked but not stored
- **Non-UTF8 content** - Marked but not stored

**Example:**
```json
{
  "request_body": {
    "binary": true,
    "content_type": "image/png",
    "size_bytes": 2048576
  }
}
```
→ **Metadata stored, content not stored**

### Size Limits

| Content Type | Default Limit | Configurable? | Recommended Max | Behavior if Exceeded |
|--------------|---------------|---------------|-----------------|---------------------|
| JSON/Text | 10KB (10,240 bytes) | Yes, per tenant via `body_size_limit_bytes` | 100KB | Truncated with marker |
| Binary | N/A | N/A | N/A | Never stored (marked only) |

**Note:** The `body_size_limit_bytes` setting can be adjusted in your tenant configuration. Contact support or use the Settings page to modify this limit based on your use case.

### How to Control Storage

**As a service developer:**
- **Include bodies** - Send `request_body` and `response_body` in tracking requests
- **Omit bodies** - Don't send these fields if you don't want them stored

**As a tenant owner:**
- Bodies are stored by default (recommended for debugging)
- Can disable in Settings if desired (not recommended)
- Can adjust `body_size_limit_bytes` in Settings to increase/decrease the storage limit
  - Default: 10,240 bytes (10KB)
  - Recommended maximum: 102,400 bytes (100KB)
  - Higher limits may impact database performance and costs

### Querying Bodies

All stored bodies are fully queryable using PostgreSQL JSONB operators:

```bash
# Find requests with specific field value
GET /api/v1/logs?start_time=...&end_time=...
# Then query: WHERE request_body->>'model' = 'gpt-4'

# Find responses with errors
# Query: WHERE response_body ? 'error'
```

---

---

## Tracking Endpoints

### Track REST Request

Track a generic REST API request (non-LLM).

**Endpoint:** `POST /api/v1/tracker/rest`

**Authentication:** API Key (Bearer token)

#### Request

**Headers:**
```http
Authorization: Bearer pwtrk_abc123def456ghi789jkl012mno345pq
Content-Type: application/json
```

**Body:**
```json
{
  "request_id": "req_abc123",
  "user_id": "user_456",
  "environment": "production",
  "correlation_id": "corr_xyz789",
  "request_timestamp": "2025-01-14T10:30:00.000Z",
  "response_timestamp": "2025-01-14T10:30:00.250Z",
  "service": "api-gateway",
  "method": "POST",
  "url": "https://api.example.com/chat",
  "status_code": 200,
  "request_body": {
    "message": "Hello, world!",
    "user_id": "user_456"
  },
  "response_body": {
    "success": true,
    "message_id": "msg_789"
  },
  "request_size_bytes": 256,
  "response_size_bytes": 512,
  "metadata": {
    "agent_id": "agent_123",
    "integration": "slack"
  }
}
```

**Required Fields:**
- `request_id` (string) - Unique identifier for this request
- `request_timestamp` (string, ISO 8601) - When request started
- `response_timestamp` (string, ISO 8601) - When request completed
- `service` (string) - Service name (tenant-defined)
- `method` (string) - HTTP method (GET, POST, PUT, DELETE, etc.)
- `url` (string) - Full URL being called
- `status_code` (number) - HTTP response status code

**Optional Fields:**
- `environment` (string) - Environment name (e.g., "local", "dev", "staging", "production") - **Recommended**
- `user_id` (string) - User who initiated the request (recommended)
- `correlation_id` (string) - For distributed tracing
- `attempt_number` (number) - Attempt number for retry tracking (default: 1)
- `original_request_id` (string) - Original request_id if this is a retry
- `request_body` (object | string) - Request payload (default limit: 10KB, configurable per tenant)
- `response_body` (object | string) - Response payload (default limit: 10KB, configurable per tenant)
- `request_size_bytes` (number) - Size of request in bytes
- `response_size_bytes` (number) - Size of response in bytes
- `metadata` (object) - Additional custom metadata

**Notes:**
- `tenant_id` is extracted from API key (NOT in request body)
- Timestamps must be ISO 8601 format with milliseconds
- **Bodies are always stored when provided** (unless too large or binary)
- Bodies larger than the tenant's `body_size_limit_bytes` (default: 10KB, configurable per tenant) are truncated with a marker
- Binary/image bodies are marked but not stored
- Tenant body size limit can be adjusted based on your needs (contact support or configure via settings)
- Latency calculated server-side from timestamps

#### Response

**HTTP Status:** `201 Created`

```json
{
  "success": true,
  "event_id": "evt_123456"
}
```

#### Example cURL

```bash
curl -X POST https://tracker.pathwave.io/api/v1/tracker/rest \
  -H "Authorization: Bearer pwtrk_abc123def456ghi789jkl012mno345pq" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_abc123",
    "user_id": "user_456",
    "request_timestamp": "2025-01-14T10:30:00.000Z",
    "response_timestamp": "2025-01-14T10:30:00.250Z",
    "service": "api-gateway",
    "method": "POST",
    "url": "https://api.example.com/chat",
    "status_code": 200
  }'
```

---

### Track LLM Request

Track a Large Language Model API request (OpenAI, Anthropic, etc.).

**Endpoint:** `POST /api/v1/tracker/llm`

**Authentication:** API Key (Bearer token)

#### Request

**Headers:**
```http
Authorization: Bearer pwtrk_abc123def456ghi789jkl012mno345pq
Content-Type: application/json
```

**Body:**
```json
{
  "request_id": "req_abc123",
  "user_id": "user_456",
  "environment": "production",
  "correlation_id": "corr_xyz789",
  "request_timestamp": "2025-01-14T10:30:00.000Z",
  "response_timestamp": "2025-01-14T10:30:05.250Z",
  "service": "ml-service",
  "provider": "openai",
  "model": "gpt-4",
  "endpoint": "/v1/chat/completions",
  "url": "https://api.openai.com/v1/chat/completions",
  "status_code": 200,
  "prompt_tokens": 150,
  "completion_tokens": 75,
  "total_tokens": 225,
  "cost_usd": 0.0034,
  "temperature": 0.7,
  "max_tokens": 500,
  "top_p": 1.0,
  "frequency_penalty": 0.0,
  "presence_penalty": 0.0,
  "finish_reason": "stop",
  "is_streaming": false,
  "conversation_id": "conv_101",
  "attempt_number": 1,
  "request_body": {
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ],
    "temperature": 0.7,
    "max_tokens": 500
  },
  "response_body": {
    "id": "chatcmpl-123",
    "object": "chat.completion",
    "choices": [
      {
        "message": {
          "role": "assistant",
          "content": "I'm doing well, thank you!"
        },
        "finish_reason": "stop"
      }
    ],
    "usage": {
      "prompt_tokens": 150,
      "completion_tokens": 75,
      "total_tokens": 225
    }
  },
  "metadata": {
    "agent_id": "agent_789"
  }
}
```

**Required Fields:**
- `request_id` (string) - Unique identifier
- `request_timestamp` (string, ISO 8601) - When LLM call started
- `response_timestamp` (string, ISO 8601) - When LLM call completed
- `service` (string) - Service making the LLM call
- `provider` (string) - LLM provider (e.g., "openai", "anthropic")
- `model` (string) - Model name with version (e.g., "gpt-4", "claude-3-opus", "openai/gpt-4o-mini")
- `endpoint` (string) - API endpoint path
- `url` (string) - Full URL
- `status_code` (number) - HTTP response status code
- `prompt_tokens` (number) - Tokens in prompt
- `completion_tokens` (number) - Tokens in completion
- `total_tokens` (number) - Total tokens used
- `cost_usd` (number) - Cost in USD

**Optional Fields:**
- `environment` (string) - Environment name (e.g., "local", "dev", "staging", "production") - **Recommended**
- `user_id` (string) - User who initiated the request
- `correlation_id` (string) - For distributed tracing
- `temperature` (number) - Sampling temperature (0.0-2.0)
- `max_tokens` (number) - Maximum tokens requested
- `top_p` (number) - Nucleus sampling parameter (0.0-1.0)
- `frequency_penalty` (number) - Frequency penalty (-2.0 to 2.0)
- `presence_penalty` (number) - Presence penalty (-2.0 to 2.0)
- `finish_reason` (string) - Why completion ended (e.g., "stop", "length", "content_filter", "function_call")
- `is_streaming` (boolean) - Whether request used streaming
- `time_to_first_token_ms` (number) - Latency to first token for streaming requests
- `function_calls` (array) - Function/tool calls made during request
- `conversation_id` (string) - Identifier linking related requests in a conversation
- `attempt_number` (number) - Attempt number for retry tracking (default: 1)
- `original_request_id` (string) - Original request_id if this is a retry
- `warnings` (array) - Provider warnings or notices (e.g., rate limits, deprecations)
- `request_body` (object | string) - LLM request payload (default limit: 10KB, configurable per tenant)
- `response_body` (object | string) - LLM response payload (default limit: 10KB, configurable per tenant)
- `metadata` (object) - Additional metadata

#### Response

**HTTP Status:** `201 Created`

```json
{
  "success": true,
  "event_id": "evt_123457"
}
```

#### Example cURL

```bash
curl -X POST https://tracker.pathwave.io/api/v1/tracker/llm \
  -H "Authorization: Bearer pwtrk_abc123def456ghi789jkl012mno345pq" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_abc123",
    "user_id": "user_456",
    "environment": "production",
    "request_timestamp": "2025-01-14T10:30:00.000Z",
    "response_timestamp": "2025-01-14T10:30:05.250Z",
    "service": "ml-service",
    "provider": "openai",
    "model": "gpt-4",
    "endpoint": "/v1/chat/completions",
    "url": "https://api.openai.com/v1/chat/completions",
    "status_code": 200,
    "prompt_tokens": 150,
    "completion_tokens": 75,
    "total_tokens": 225,
    "cost_usd": 0.0034,
    "temperature": 0.7,
    "max_tokens": 500,
    "finish_reason": "stop",
    "conversation_id": "conv_101"
  }'
```

---

### Track Batch Requests

Submit multiple tracking events in a single request (supports both REST and LLM).

**Endpoint:** `POST /api/v1/tracker/batch`

**Authentication:** API Key (Bearer token)

#### Request

**Headers:**
```http
Authorization: Bearer pwtrk_abc123def456ghi789jkl012mno345pq
Content-Type: application/json
```

**Body:**
```json
{
  "events": [
    {
      "type": "rest",
      "request_id": "req_batch_1",
      "user_id": "user_456",
      "environment": "staging",
      "request_timestamp": "2025-01-14T10:30:00.000Z",
      "response_timestamp": "2025-01-14T10:30:00.250Z",
      "service": "api-gateway",
      "method": "POST",
      "url": "https://api.example.com/data",
      "status_code": 200
    },
    {
      "type": "llm",
      "request_id": "req_batch_2",
      "user_id": "user_456",
      "environment": "staging",
      "request_timestamp": "2025-01-14T10:31:00.000Z",
      "response_timestamp": "2025-01-14T10:31:02.500Z",
      "service": "ml-service",
      "provider": "openai",
      "model": "gpt-4",
      "endpoint": "/v1/chat/completions",
      "url": "https://api.openai.com/v1/chat/completions",
      "prompt_tokens": 300,
      "completion_tokens": 200,
      "total_tokens": 500,
      "cost_usd": 0.015,
      "status_code": 200
    }
  ]
}
```

**Notes:**
- Each event MUST include a `type` field: `"rest"` or `"llm"`
- REST events use REST fields, LLM events use LLM fields
- Maximum 100 events per batch

#### Response

**HTTP Status:** `201 Created`

```json
{
  "success": true,
  "events_processed": 2,
  "event_ids": ["evt_123458", "evt_123459"]
}
```

---

## Query Endpoints

### Get Request Path

Get the complete path of a request across all services.

**Endpoint:** `GET /api/v1/paths/:request_id`

**Authentication:** Clerk Session (Bearer token)

#### Request

**Headers:**
```http
Authorization: Bearer <clerk_session_token>
```

**Path Parameters:**
- `request_id` (string, required) - The request ID to query

**Example:**
```
GET /api/v1/paths/req_abc123
```

#### Response

**HTTP Status:** `200 OK`

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
      "response_timestamp": "2025-01-14T10:00:01.200Z",
      "request_body": {
        "message": "Hello"
      },
      "response_body": {
        "success": true
      },
      "metadata": {}
    },
    {
      "event_id": "evt_002",
      "service": "ml-service",
      "type": "llm",
      "provider": "openai",
      "model": "gpt-4",
      "url": "https://api.openai.com/v1/chat/completions",
      "status_code": 200,
      "latency_ms": 3500,
      "request_timestamp": "2025-01-14T10:00:01.250Z",
      "response_timestamp": "2025-01-14T10:00:04.750Z",
      "prompt_tokens": 150,
      "completion_tokens": 75,
      "total_tokens": 225,
      "cost_usd": 0.0034,
      "temperature": 0.7,
      "max_tokens": 500,
      "finish_reason": "stop",
      "is_streaming": false,
      "conversation_id": "conv_abc",
      "attempt_number": 1,
      "request_body": {
        "model": "gpt-4",
        "messages": [
          {
            "role": "user",
            "content": "Hello"
          }
        ]
      },
      "response_body": {
        "id": "chatcmpl-123",
        "choices": [
          {
            "message": {
              "role": "assistant",
              "content": "Hi there!"
            },
            "finish_reason": "stop"
          }
        ]
      },
      "metadata": {}
    },
    {
      "event_id": "evt_003",
      "service": "database-service",
      "method": "POST",
      "url": "https://db.internal/query",
      "status_code": 200,
      "latency_ms": 500,
      "request_timestamp": "2025-01-14T10:00:04.800Z",
      "response_timestamp": "2025-01-14T10:00:05.300Z",
      "metadata": {}
    }
  ]
}
```

#### Example cURL

```bash
curl -X GET https://tracker.pathwave.io/api/v1/paths/req_abc123 \
  -H "Authorization: Bearer <clerk_session_token>"
```

---

### Query Logs

Query request logs with filtering.

**Endpoint:** `GET /api/v1/logs`

**Authentication:** Clerk Session (Bearer token)

#### Request

**Headers:**
```http
Authorization: Bearer <clerk_session_token>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_time` | string (ISO 8601) | Yes | Start of time range |
| `end_time` | string (ISO 8601) | Yes | End of time range |
| `request_id` | string | No | Filter by specific request ID |
| `user_id` | string | No | Filter by user ID |
| `service` | string | No | Filter by service name |
| `environment` | string | No | Filter by environment (e.g., "production", "staging") |
| `type` | string | No | Filter by type: `rest` or `llm` |
| `status_code` | number | No | Filter by HTTP status code |
| `conversation_id` | string | No | Filter by conversation ID (LLM only) |
| `finish_reason` | string | No | Filter by finish reason (LLM only, e.g., "length", "stop") |
| `original_request_id` | string | No | Filter retries by original request ID |
| `include_bodies` | boolean | No | Include request/response bodies (default: false) |
| `limit` | number | No | Max results (default: 100, max: 1000) |
| `offset` | number | No | Pagination offset (default: 0) |

**Examples:**

Basic query:
```
GET /api/v1/logs?start_time=2025-01-14T00:00:00Z&end_time=2025-01-14T23:59:59Z&service=api-gateway&limit=50
```

Find truncated LLM responses:
```
GET /api/v1/logs?start_time=2025-01-14T00:00:00Z&end_time=2025-01-14T23:59:59Z&type=llm&finish_reason=length
```

Find all requests in a conversation:
```
GET /api/v1/logs?start_time=2025-01-13T00:00:00Z&end_time=2025-01-15T23:59:59Z&conversation_id=conv_abc123
```

Find all retry attempts for a failed request:
```
GET /api/v1/logs?start_time=2025-01-14T00:00:00Z&end_time=2025-01-14T23:59:59Z&original_request_id=req_abc123
```

#### Response

**HTTP Status:** `200 OK`

```json
{
  "logs": [
    {
      "event_id": "evt_123456",
      "request_id": "req_abc123",
      "user_id": "user_456",
      "environment": "production",
      "request_timestamp": "2025-01-14T10:30:00.000Z",
      "response_timestamp": "2025-01-14T10:30:00.250Z",
      "type": "rest",
      "service": "api-gateway",
      "method": "POST",
      "url": "https://api.example.com/chat",
      "status_code": 200,
      "latency_ms": 250
    },
    {
      "event_id": "evt_123457",
      "request_id": "req_def456",
      "user_id": "user_789",
      "environment": "staging",
      "request_timestamp": "2025-01-14T10:29:55.000Z",
      "response_timestamp": "2025-01-14T10:29:58.500Z",
      "type": "llm",
      "service": "ml-service",
      "provider": "openai",
      "model": "gpt-4",
      "url": "https://api.openai.com/v1/chat/completions",
      "status_code": 200,
      "latency_ms": 3500,
      "total_tokens": 225,
      "cost_usd": 0.0034
    }
  ],
  "total": 15420,
  "limit": 100,
  "offset": 0
}
```

**Note:** Bodies are only included if `include_bodies=true` is specified.

#### Example cURL

```bash
curl -X GET "https://tracker.pathwave.io/api/v1/logs?start_time=2025-01-14T00:00:00Z&end_time=2025-01-14T23:59:59Z&service=api-gateway&limit=50" \
  -H "Authorization: Bearer <clerk_session_token>"
```

---

### Get Metrics

Get aggregated metrics for a time range. Returns totals and breakdowns for the entire period.

**Endpoint:** `GET /api/v1/metrics`

**Authentication:** Clerk Session (Bearer token)

#### Request

**Headers:**
```http
Authorization: Bearer <clerk_session_token>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_time` | string (ISO 8601) | Yes | Start of time range |
| `end_time` | string (ISO 8601) | Yes | End of time range |
| `service` | string | No | Filter by service name |
| `type` | string | No | Filter by type: `rest` or `llm` |

**Example:**
```
GET /api/v1/metrics?start_time=2025-01-14T00:00:00Z&end_time=2025-01-14T23:59:59Z
```

#### Response

**HTTP Status:** `200 OK`

```json
{
  "period": {
    "start": "2025-01-14T00:00:00Z",
    "end": "2025-01-14T23:59:59Z"
  },
  "metrics": {
    "rest_requests": {
      "total": 15420,
      "by_service": {
        "api-gateway": 8200,
        "db-service": 7220
      },
      "by_status": {
        "200": 15000,
        "400": 300,
        "500": 120
      },
      "latency": {
        "p50": 120,
        "p95": 450,
        "p99": 890
      }
    },
    "llm_requests": {
      "total": 3420,
      "by_provider": {
        "openai": 3000,
        "anthropic": 420
      },
      "by_model": {
        "gpt-4": 2500,
        "gpt-3.5-turbo": 500,
        "claude-3-opus": 420
      },
      "total_tokens": 1250000,
      "total_cost_usd": 45.67,
      "latency": {
        "p50": 1250,
        "p95": 3200,
        "p99": 5800
      }
    }
  }
}
```

#### Example cURL

```bash
curl -X GET "https://tracker.pathwave.io/api/v1/metrics?start_time=2025-01-14T00:00:00Z&end_time=2025-01-14T23:59:59Z" \
  -H "Authorization: Bearer <clerk_session_token>"
```

---

## API Key Management

### Create API Key

Create a new API key for tracking.

**Endpoint:** `POST /api/keys`

**Authentication:** Clerk Session (Bearer token)

#### Request

**Headers:**
```http
Authorization: Bearer <clerk_session_token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Production API Key",
  "expires_at": "2026-12-31T23:59:59Z"
}
```

**Fields:**
- `name` (string, required) - Name for this API key
- `expires_at` (string, optional) - ISO 8601 expiration date (null = never expires)

#### Response

**HTTP Status:** `201 Created`

```json
{
  "success": true,
  "api_key": "pwtrk_abc123def456ghi789jkl012mno345pq",
  "key_id": "key_a1b2c3d4",
  "name": "Production API Key",
  "created_at": "2025-01-14T10:00:00Z",
  "expires_at": "2026-12-31T23:59:59Z"
}
```

**IMPORTANT:** The `api_key` is only returned once. Store it securely immediately.

#### Example cURL

```bash
curl -X POST https://tracker.pathwave.io/api/keys \
  -H "Authorization: Bearer <clerk_session_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key",
    "expires_at": null
  }'
```

---

### List API Keys

List all API keys for the authenticated tenant.

**Endpoint:** `GET /api/keys`

**Authentication:** Clerk Session (Bearer token)

#### Request

**Headers:**
```http
Authorization: Bearer <clerk_session_token>
```

#### Response

**HTTP Status:** `200 OK`

```json
{
  "keys": [
    {
      "key_id": "key_a1b2c3d4",
      "name": "Production API Key",
      "key_preview": "pwtrk_abc...345pq",
      "created_at": "2025-01-14T10:00:00Z",
      "expires_at": null,
      "revoked": false,
      "last_used_at": "2025-01-14T15:30:00Z",
      "usage_count": 15420
    },
    {
      "key_id": "key_b5c6d7e8",
      "name": "Staging API Key",
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

**Note:** Full API key is never returned after creation (only masked preview).

#### Example cURL

```bash
curl -X GET https://tracker.pathwave.io/api/keys \
  -H "Authorization: Bearer <clerk_session_token>"
```

---

### Update API Key

Update an API key's name.

**Endpoint:** `PATCH /api/keys/:key_id`

**Authentication:** Clerk Session (Bearer token)

#### Request

**Headers:**
```http
Authorization: Bearer <clerk_session_token>
Content-Type: application/json
```

**Path Parameters:**
- `key_id` (string, required) - The key ID to update

**Body:**
```json
{
  "name": "Production API Key v2"
}
```

#### Response

**HTTP Status:** `200 OK`

```json
{
  "success": true,
  "key": {
    "key_id": "key_a1b2c3d4",
    "name": "Production API Key v2",
    "key_preview": "pwtrk_abc...345pq",
    "created_at": "2025-01-14T10:00:00Z",
    "expires_at": null,
    "revoked": false,
    "last_used_at": "2025-01-14T15:30:00Z",
    "usage_count": 15420
  }
}
```

#### Example cURL

```bash
curl -X PATCH https://tracker.pathwave.io/api/keys/key_a1b2c3d4 \
  -H "Authorization: Bearer <clerk_session_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key v2"
  }'
```

---

### Revoke API Key

Revoke an API key (soft delete - keeps for audit trail).

**Endpoint:** `DELETE /api/keys/:key_id`

**Authentication:** Clerk Session (Bearer token)

#### Request

**Headers:**
```http
Authorization: Bearer <clerk_session_token>
```

**Path Parameters:**
- `key_id` (string, required) - The key ID to revoke

#### Response

**HTTP Status:** `200 OK`

```json
{
  "success": true,
  "message": "API key 'Production API Key' has been revoked",
  "key_id": "key_a1b2c3d4",
  "revoked_at": "2025-01-14T16:00:00Z"
}
```

**Note:** Revoked keys are immediately rejected for all future tracking requests.

#### Example cURL

```bash
curl -X DELETE https://tracker.pathwave.io/api/keys/key_a1b2c3d4 \
  -H "Authorization: Bearer <clerk_session_token>"
```

---

## Health Check

Check service health status.

**Endpoint:** `GET /api/health`

**Authentication:** None (public endpoint)

#### Request

No authentication required.

#### Response

**HTTP Status:** `200 OK` (or `503 Service Unavailable` if unhealthy)

```json
{
  "status": "healthy",
  "timestamp": "2025-01-14T10:30:00.000Z",
  "service": "path-tracker",
  "version": "1.0.0",
  "environment": "production",
  "dependencies": {
    "database": {
      "status": "healthy",
      "latency_ms": 5
    }
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Overall health: `"healthy"` or `"unhealthy"` |
| `timestamp` | string (ISO 8601) | Time of health check |
| `service` | string | Service name (`"path-tracker"`) |
| `version` | string | Service version |
| `environment` | string | Current environment (`development`, `staging`, `production`) |
| `dependencies.database.status` | string | Database health: `"healthy"` or `"unhealthy"` |
| `dependencies.database.latency_ms` | number | Database ping latency in milliseconds |

#### Example cURL

```bash
curl -X GET https://tracker.pathwave.io/api/health
```

---

## Complete Integration Example

### Service Integration (Node.js/TypeScript)

```typescript
import axios from 'axios';

const TRACKER_API_KEY = process.env.PATHWAVE_TRACKER_API_KEY;
const TRACKER_BASE_URL = 'https://tracker.pathwave.io';

// Track a REST request
async function trackRestRequest(data: {
  request_id: string;
  user_id?: string;
  environment?: string;
  request_timestamp: Date;
  response_timestamp: Date;
  service: string;
  method: string;
  url: string;
  status_code: number;
  request_body?: any;
  response_body?: any;
  metadata?: Record<string, any>;
}) {
  try {
    const response = await axios.post(
      `${TRACKER_BASE_URL}/api/v1/tracker/rest`,
      {
        request_id: data.request_id,
        user_id: data.user_id,
        environment: data.environment,
        request_timestamp: data.request_timestamp.toISOString(),
        response_timestamp: data.response_timestamp.toISOString(),
        service: data.service,
        method: data.method,
        url: data.url,
        status_code: data.status_code,
        request_body: data.request_body,
        response_body: data.response_body,
        metadata: data.metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${TRACKER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('Tracked:', response.data.event_id);
    return response.data;
  } catch (error) {
    console.error('Failed to track request:', error);
  }
}

// Track an LLM request
async function trackLLMRequest(data: {
  request_id: string;
  user_id?: string;
  environment?: string;
  request_timestamp: Date;
  response_timestamp: Date;
  service: string;
  provider: string;
  model: string;
  endpoint: string;
  url: string;
  status_code: number;
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
  function_calls?: any[];
  conversation_id?: string;
  attempt_number?: number;
  original_request_id?: string;
  warnings?: any[];
  request_body?: any;
  response_body?: any;
  metadata?: Record<string, any>;
}) {
  try {
    const response = await axios.post(
      `${TRACKER_BASE_URL}/api/v1/tracker/llm`,
      {
        request_id: data.request_id,
        user_id: data.user_id,
        environment: data.environment,
        request_timestamp: data.request_timestamp.toISOString(),
        response_timestamp: data.response_timestamp.toISOString(),
        service: data.service,
        provider: data.provider,
        model: data.model,
        endpoint: data.endpoint,
        url: data.url,
        status_code: data.status_code,
        prompt_tokens: data.prompt_tokens,
        completion_tokens: data.completion_tokens,
        total_tokens: data.total_tokens,
        cost_usd: data.cost_usd,
        temperature: data.temperature,
        max_tokens: data.max_tokens,
        top_p: data.top_p,
        frequency_penalty: data.frequency_penalty,
        presence_penalty: data.presence_penalty,
        finish_reason: data.finish_reason,
        is_streaming: data.is_streaming,
        time_to_first_token_ms: data.time_to_first_token_ms,
        function_calls: data.function_calls,
        conversation_id: data.conversation_id,
        attempt_number: data.attempt_number,
        original_request_id: data.original_request_id,
        warnings: data.warnings,
        request_body: data.request_body,
        response_body: data.response_body,
        metadata: data.metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${TRACKER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('Tracked LLM:', response.data.event_id);
    return response.data;
  } catch (error) {
    console.error('Failed to track LLM request:', error);
  }
}

// Example usage
async function example() {
  const requestId = 'req_' + Date.now();
  const requestStart = new Date();
  
  // Make your API call
  const result = await fetch('https://api.example.com/chat', {
    method: 'POST',
    body: JSON.stringify({ message: 'Hello' }),
  });
  
  const requestEnd = new Date();
  
  // Track it
  await trackRestRequest({
    request_id: requestId,
    user_id: 'user_456',
    environment: process.env.NODE_ENV || 'development',  // 'local', 'staging', 'production'
    request_timestamp: requestStart,
    response_timestamp: requestEnd,
    service: 'my-service',
    method: 'POST',
    url: 'https://api.example.com/chat',
    status_code: result.status,
  });
}
```

### Python Integration Example

```python
import os
import requests
from datetime import datetime

TRACKER_API_KEY = os.getenv('PATHWAVE_TRACKER_API_KEY')
TRACKER_BASE_URL = 'https://tracker.pathwave.io'

def track_rest_request(data: dict):
    """Track a REST API request"""
    headers = {
        'Authorization': f'Bearer {TRACKER_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    response = requests.post(
        f'{TRACKER_BASE_URL}/api/v1/tracker/rest',
        json=data,
        headers=headers
    )
    
    if response.status_code == 201:
        print(f"Tracked: {response.json()['event_id']}")
    else:
        print(f"Error: {response.json()}")
    
    return response.json()

def track_llm_request(data: dict):
    """Track an LLM API request"""
    headers = {
        'Authorization': f'Bearer {TRACKER_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    response = requests.post(
        f'{TRACKER_BASE_URL}/api/v1/tracker/llm',
        json=data,
        headers=headers
    )
    
    if response.status_code == 201:
        print(f"Tracked LLM: {response.json()['event_id']}")
    else:
        print(f"Error: {response.json()}")
    
    return response.json()

# Example usage
request_id = f"req_{int(datetime.now().timestamp())}"
request_start = datetime.utcnow()

# Make your API call
result = requests.post(
    'https://api.example.com/chat',
    json={'message': 'Hello'}
)

request_end = datetime.utcnow()

# Track it
track_rest_request({
    'request_id': request_id,
    'user_id': 'user_456',
    'environment': os.getenv('ENVIRONMENT', 'development'),  # 'local', 'staging', 'production'
    'request_timestamp': request_start.isoformat() + 'Z',
    'response_timestamp': request_end.isoformat() + 'Z',
    'service': 'my-service',
    'method': 'POST',
    'url': 'https://api.example.com/chat',
    'status_code': result.status_code,
})
```

---

## LLM Debugging Fields

Path Tracker includes extensive fields specifically designed for debugging LLM issues in production. Here's how to use them effectively:

### Configuration Parameters

Always track the model configuration parameters used in your LLM calls:

```json
{
  "temperature": 0.7,
  "max_tokens": 500,
  "top_p": 1.0,
  "frequency_penalty": 0.0,
  "presence_penalty": 0.0
}
```

**Why?** These parameters dramatically affect output. When investigating "unexpected results," you can filter by configuration to identify if certain parameter combinations cause issues.

### Finish Reason

The `finish_reason` field explains why the completion ended:

- `"stop"` - Natural completion (model decided to stop)
- `"length"` - Hit max_tokens limit (response was truncated)
- `"content_filter"` - Blocked by content filtering
- `"function_call"` - Stopped to execute a function

**Example:** Filter all requests where `finish_reason = "length"` to find truncated responses.

### Streaming Metadata

For streaming requests:

```json
{
  "is_streaming": true,
  "time_to_first_token_ms": 342
}
```

Track time to first token to identify delays in streaming responses.

### Function Calling

Track function/tool calls made during the request:

```json
{
  "function_calls": [
    {
      "name": "get_weather",
      "arguments": {
        "location": "San Francisco"
      },
      "result": {
        "temperature": 65,
        "conditions": "sunny"
      }
    }
  ]
}
```

**Why?** Debug issues where the LLM calls the wrong function or provides malformed arguments.

### Conversation Tracking

Link related requests in a conversation:

```json
{
  "conversation_id": "conv_abc123",
  "request_id": "req_001"
}
```

Then query all requests for that conversation to see the full context.

### Retry Tracking

Track retries to identify reliability issues:

```json
{
  "attempt_number": 2,
  "original_request_id": "req_abc123"
}
```

**Example:** Query by `original_request_id` to see all retry attempts for a failed request.

### Provider Warnings

Capture warnings from the LLM provider:

```json
{
  "warnings": [
    {
      "type": "rate_limit_approaching",
      "message": "You are approaching your rate limit",
      "limit": 10000,
      "remaining": 500
    },
    {
      "type": "model_deprecation",
      "message": "This model version will be deprecated on 2026-03-01"
    }
  ]
}
```

**Why?** Proactively identify issues before they become critical.

### Debugging Example

Here's a complete example tracking an LLM call with full debugging context:

```typescript
const startTime = new Date();
const conversationId = "conv_" + userId;
let attemptNumber = 1;
let originalRequestId = null;

async function callLLMWithTracking(prompt: string, isRetry: boolean = false) {
  const requestId = isRetry ? generateRequestId() : originalRequestId || generateRequestId();
  if (!originalRequestId) originalRequestId = requestId;
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    });
    
    const endTime = new Date();
    const finishReason = response.choices[0].finish_reason;
    
    // Track the request
    await trackLLMRequest({
      request_id: requestId,
      user_id: userId,
      environment: "production",
      request_timestamp: startTime,
      response_timestamp: endTime,
      service: "chat-service",
      provider: "openai",
      model: "gpt-4",
      endpoint: "/v1/chat/completions",
      url: "https://api.openai.com/v1/chat/completions",
      status_code: 200,
      prompt_tokens: response.usage.prompt_tokens,
      completion_tokens: response.usage.completion_tokens,
      total_tokens: response.usage.total_tokens,
      cost_usd: calculateCost(response.usage),
      temperature: 0.7,
      max_tokens: 500,
      finish_reason: finishReason,
      conversation_id: conversationId,
      attempt_number: attemptNumber,
      original_request_id: isRetry ? originalRequestId : undefined,
      warnings: detectWarnings(response),  // Custom function to extract warnings
    });
    
    // Check if response was truncated
    if (finishReason === "length") {
      console.warn("Response was truncated - consider increasing max_tokens");
    }
    
    return response;
    
  } catch (error) {
    attemptNumber++;
    
    // Track the failed attempt
    await trackLLMRequest({
      request_id: generateRequestId(),
      user_id: userId,
      environment: "production",
      request_timestamp: startTime,
      response_timestamp: new Date(),
      service: "chat-service",
      provider: "openai",
      model: "gpt-4",
      endpoint: "/v1/chat/completions",
      url: "https://api.openai.com/v1/chat/completions",
      status_code: error.status || 500,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cost_usd: 0,
      conversation_id: conversationId,
      attempt_number: attemptNumber,
      original_request_id: originalRequestId,
      warnings: [{ type: "error", message: error.message }],
    });
    
    // Retry logic
    if (attemptNumber <= 3) {
      console.log(`Retry attempt ${attemptNumber}`);
      return callLLMWithTracking(prompt, true);
    }
    
    throw error;
  }
}
```

---

## Best Practices

### 1. Request ID Propagation

**Propagate the same `request_id` through the entire request chain:**

```typescript
// Service A receives request
const requestId = req.headers['x-request-id'] || generateRequestId();

// Service A calls Service B
await fetch('https://service-b.com/api', {
  headers: {
    'X-Request-Id': requestId,  // Propagate it!
  },
});

// Service A tracks its request
await trackRestRequest({
  request_id: requestId,  // Same ID
  service: 'service-a',
  // ...
});

// Service B also tracks with the same ID
await trackRestRequest({
  request_id: requestId,  // Same ID
  service: 'service-b',
  // ...
});
```

### 2. User ID Propagation

**Propagate `user_id` when available:**

```typescript
const userId = req.user?.id;  // From your auth middleware

await trackRestRequest({
  request_id: requestId,
  user_id: userId,  // Include if available
  // ...
});
```

### 3. Async Tracking

**Track requests asynchronously (don't block response):**

```typescript
// ❌ BAD: Blocks response
await trackRestRequest(data);
return res.json(result);

// ✅ GOOD: Fire and forget
trackRestRequest(data).catch(console.error);
return res.json(result);
```

### 4. Batch Tracking

**For high-volume services, batch requests:**

```typescript
const trackingQueue: any[] = [];

function queueTracking(data: any) {
  trackingQueue.push(data);
  
  if (trackingQueue.length >= 100) {
    flushTrackingQueue();
  }
}

async function flushTrackingQueue() {
  if (trackingQueue.length === 0) return;
  
  const events = trackingQueue.splice(0, 100);
  
  await axios.post(
    `${TRACKER_BASE_URL}/api/v1/tracker/batch`,
    { events },
    { headers: { Authorization: `Bearer ${TRACKER_API_KEY}` } }
  );
}

// Flush every 5 seconds
setInterval(flushTrackingQueue, 5000);
```

### 5. Error Handling

**Handle tracking failures gracefully:**

```typescript
async function trackRequest(data: any) {
  try {
    await axios.post(/* ... */);
  } catch (error) {
    // Log but don't crash
    console.error('Tracking failed:', error);
    
    // Optionally: retry or queue for later
  }
}
```

---

## Support

For questions or issues:
- **Documentation**: https://docs.pathwave.io/path-tracker
- **Support**: support@pathwave.io
- **Status Page**: https://status.pathwave.io

---

*Last Updated: January 14, 2026*
