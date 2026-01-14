# Path Tracker Integration Guide

This guide explains how to integrate Path Tracker into your services to enable full request tracing and LLM call monitoring across your distributed system.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Integration Options](#integration-options)
4. [REST Request Tracking](#rest-request-tracking)
5. [LLM Request Tracking](#llm-request-tracking)
6. [Best Practices](#best-practices)
7. [LLM Implementation Prompt](#llm-implementation-prompt)

---

## Overview

Path Tracker is an observability service that captures the complete path of requests across your microservices. It helps you:

- **Trace requests end-to-end**: See how a single user request flows through all your services
- **Debug issues quickly**: Find exactly where failures occur in your request chain
- **Monitor LLM costs**: Track token usage and costs across all your AI/ML calls
- **Analyze performance**: Identify slow services and optimize bottlenecks

### How It Works

1. Each service sends tracking events to Path Tracker after handling requests
2. Events are linked by a shared `request_id` (propagated via headers)
3. The dashboard visualizes the complete request path and aggregates metrics

---

## Getting Started

### 1. Get Your API Key

1. Log in to the Path Tracker dashboard
2. Navigate to **API Keys**
3. Click **Create API Key**
4. Copy the key (it's only shown once!)

Your API key looks like: `pwtrk_abc123...`

### 2. Set Up Environment Variable

Add your API key to your service's environment:

```bash
PATH_TRACKER_API_KEY=pwtrk_your_api_key_here
PATH_TRACKER_URL=https://tracker.pathwave.io
```

### 3. Implement Tracking

Choose your integration approach based on your tech stack (see [Integration Options](#integration-options)).

---

## Integration Options

### Option A: Middleware/Interceptor (Recommended)

Add tracking as middleware that automatically captures all requests:

```typescript
// Example: Express.js middleware
app.use(pathTrackerMiddleware);
```

### Option B: Manual Tracking

Call the tracking API directly in your code:

```typescript
await trackRequest({
  request_id: req.headers['x-request-id'],
  service: 'my-service',
  method: 'POST',
  url: '/api/users',
  status_code: 200,
  // ...
});
```

### Option C: SDK (Coming Soon)

Use our official SDKs for automatic instrumentation.

---

## REST Request Tracking

Send a POST request to `/api/v1/tracker/rest` after each HTTP request your service handles.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `request_id` | string | Unique ID for tracing (propagate from incoming `X-Request-ID` header) |
| `service` | string | Your service name (e.g., `user-service`, `api-gateway`) |
| `method` | string | HTTP method (`GET`, `POST`, `PUT`, `DELETE`, etc.) |
| `url` | string | The request URL or path |
| `status_code` | integer | HTTP response status code |
| `request_timestamp` | string | ISO 8601 timestamp when request was received |
| `response_timestamp` | string | ISO 8601 timestamp when response was sent |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | string | End-user identifier (for per-user analytics) |
| `environment` | string | Environment name (`production`, `staging`, `development`) |
| `correlation_id` | string | Additional correlation ID |
| `request_body` | object | Request body (truncated to configured limit) |
| `response_body` | object | Response body (truncated to configured limit) |
| `metadata` | object | Custom key-value pairs |

### Example

```bash
curl -X POST https://tracker.pathwave.io/api/v1/tracker/rest \
  -H "Authorization: Bearer pwtrk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_abc123",
    "user_id": "user_456",
    "service": "user-service",
    "method": "POST",
    "url": "/api/users",
    "status_code": 201,
    "request_timestamp": "2025-01-14T10:00:00.000Z",
    "response_timestamp": "2025-01-14T10:00:00.150Z",
    "environment": "production",
    "metadata": {
      "version": "1.2.3"
    }
  }'
```

---

## LLM Request Tracking

Send a POST request to `/api/v1/tracker/llm` after each LLM API call.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `request_id` | string | Same request ID used for REST tracking |
| `service` | string | Service making the LLM call |
| `url` | string | LLM API URL |
| `endpoint` | string | API endpoint (e.g., `/v1/chat/completions`) |
| `status_code` | integer | HTTP response status code |
| `request_timestamp` | string | ISO 8601 timestamp when call started |
| `response_timestamp` | string | ISO 8601 timestamp when response received |
| `provider` | string | LLM provider (`openai`, `anthropic`, `google`, etc.) |
| `model` | string | Model name (e.g., `gpt-4o`, `claude-3-opus`) |
| `prompt_tokens` | integer | Number of input tokens |
| `completion_tokens` | integer | Number of output tokens |
| `total_tokens` | integer | Total tokens used |
| `cost_usd` | number | Cost in USD |

### Optional Fields (for debugging)

| Field | Type | Description |
|-------|------|-------------|
| `temperature` | number | Temperature setting (0-2) |
| `max_tokens` | integer | Max tokens setting |
| `top_p` | number | Top-p sampling value |
| `frequency_penalty` | number | Frequency penalty (-2 to 2) |
| `presence_penalty` | number | Presence penalty (-2 to 2) |
| `finish_reason` | string | Why generation stopped (`stop`, `length`, `tool_calls`) |
| `is_streaming` | boolean | Whether streaming was used |
| `time_to_first_token_ms` | integer | Time to first token (streaming) |
| `function_calls` | array | Function/tool calls made |
| `conversation_id` | string | Conversation thread ID |
| `attempt_number` | integer | Retry attempt number |
| `original_request_id` | string | Original request ID if this is a retry |

### Example

```bash
curl -X POST https://tracker.pathwave.io/api/v1/tracker/llm \
  -H "Authorization: Bearer pwtrk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_abc123",
    "user_id": "user_456",
    "service": "ai-service",
    "url": "https://api.openai.com/v1/chat/completions",
    "endpoint": "/v1/chat/completions",
    "status_code": 200,
    "request_timestamp": "2025-01-14T10:00:00.200Z",
    "response_timestamp": "2025-01-14T10:00:02.500Z",
    "provider": "openai",
    "model": "gpt-4o",
    "prompt_tokens": 150,
    "completion_tokens": 300,
    "total_tokens": 450,
    "cost_usd": 0.0135,
    "temperature": 0.7,
    "finish_reason": "stop",
    "environment": "production"
  }'
```

---

## Best Practices

### 1. Request ID Propagation

Always propagate the `request_id` through your service chain:

```typescript
// When receiving a request
const requestId = req.headers['x-request-id'] || generateUUID();

// When calling another service
await fetch(url, {
  headers: {
    'X-Request-ID': requestId,
    // ... other headers
  }
});
```

### 2. Track Asynchronously

Don't block your response on tracking calls:

```typescript
// Good: Fire and forget
trackRequest(eventData).catch(err => console.error('Tracking failed:', err));
return response;

// Bad: Waiting for tracking
await trackRequest(eventData);
return response;
```

### 3. Include User IDs

Always include `user_id` when available for per-user analytics:

```typescript
{
  request_id: 'req_123',
  user_id: currentUser.id, // ← Important for user-level insights
  // ...
}
```

### 4. Use Consistent Service Names

Use consistent, descriptive service names across your system:

```
✓ Good: user-service, payment-api, ai-assistant
✗ Bad: svc1, backend, server
```

### 5. Calculate LLM Costs Accurately

Use the provider's pricing to calculate costs:

```typescript
const cost = (promptTokens * promptPrice + completionTokens * completionPrice) / 1000;
```

---

## LLM Implementation Prompt

Use the following prompt to have an AI assistant implement Path Tracker integration in any of your services:

---

### 📋 Copy This Prompt

```
I need you to integrate Path Tracker observability into this codebase. Path Tracker is a service that traces requests across microservices.

## Configuration

The service uses these environment variables:
- PATH_TRACKER_API_KEY: API key for authentication (format: pwtrk_xxx)
- PATH_TRACKER_URL: Base URL of Path Tracker (default: https://tracker.pathwave.io)

## Requirements

1. **Create a tracking utility module** that:
   - Sends tracking events to Path Tracker asynchronously (fire-and-forget)
   - Handles errors gracefully without affecting the main request flow
   - Logs tracking failures for debugging

2. **For REST requests**, track every incoming HTTP request with:
   - request_id: From X-Request-ID header, or generate a UUID if not present
   - user_id: From authenticated user context (if available)
   - service: The name of this service (use a constant)
   - method: HTTP method (GET, POST, etc.)
   - url: Request path
   - status_code: Response status code
   - request_timestamp: When request was received (ISO 8601)
   - response_timestamp: When response was sent (ISO 8601)
   - environment: From NODE_ENV or similar

3. **For LLM API calls**, wrap every call to OpenAI/Anthropic/etc. and track:
   - All REST fields above (using the same request_id)
   - provider: "openai", "anthropic", etc.
   - model: The model name used
   - endpoint: The API endpoint called
   - prompt_tokens, completion_tokens, total_tokens: From API response
   - cost_usd: Calculate based on provider pricing
   - temperature, max_tokens, etc.: If used in the request
   - finish_reason: From API response
   - is_streaming: true/false

4. **Propagate request IDs** by:
   - Reading X-Request-ID from incoming requests
   - Passing X-Request-ID to all outgoing HTTP calls
   - Using the same request_id for all tracking events in a request chain

5. **Implementation approach**:
   - For Express/Fastify/Koa: Add middleware that runs after each request
   - For Next.js API routes: Add a wrapper or use middleware
   - For LLM calls: Create a wrapper function around the LLM client

## Tracking API Endpoints

POST {PATH_TRACKER_URL}/api/v1/tracker/rest
Headers: Authorization: Bearer {PATH_TRACKER_API_KEY}
Body: { request_id, service, method, url, status_code, request_timestamp, response_timestamp, ... }

POST {PATH_TRACKER_URL}/api/v1/tracker/llm  
Headers: Authorization: Bearer {PATH_TRACKER_API_KEY}
Body: { request_id, service, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, cost_usd, ... }

## Example REST Tracking Event

{
  "request_id": "req_abc123",
  "user_id": "user_456",
  "service": "my-service",
  "method": "POST",
  "url": "/api/process",
  "status_code": 200,
  "request_timestamp": "2025-01-14T10:00:00.000Z",
  "response_timestamp": "2025-01-14T10:00:00.250Z",
  "environment": "production"
}

## Example LLM Tracking Event

{
  "request_id": "req_abc123",
  "user_id": "user_456", 
  "service": "my-service",
  "url": "https://api.openai.com/v1/chat/completions",
  "endpoint": "/v1/chat/completions",
  "status_code": 200,
  "request_timestamp": "2025-01-14T10:00:00.050Z",
  "response_timestamp": "2025-01-14T10:00:01.200Z",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "prompt_tokens": 100,
  "completion_tokens": 200,
  "total_tokens": 300,
  "cost_usd": 0.00045,
  "temperature": 0.7,
  "finish_reason": "stop",
  "environment": "production"
}

Please analyze the codebase and implement Path Tracker integration following these requirements. Create clean, maintainable code that doesn't impact the performance of the main application.
```

---

## Troubleshooting

### Events not appearing in dashboard

1. Check your API key is correct
2. Verify the `PATH_TRACKER_URL` is reachable
3. Check server logs for tracking errors
4. Ensure timestamps are valid ISO 8601 format

### Missing request chains

1. Verify `request_id` is being propagated in headers
2. Check all services use the same `request_id` format
3. Ensure the ID is passed through async operations

### High latency impact

1. Make tracking calls asynchronous (fire-and-forget)
2. Use connection pooling for HTTP clients
3. Consider batching events (use `/api/v1/tracker/batch`)

---

## Support

- **Documentation**: [API Documentation](./implementation/API_DOCUMENTATION.md)
- **Dashboard**: https://tracker.pathwave.io
- **Issues**: Contact your Path Tracker administrator

---

*Last updated: January 2026*
