# Path Tracker

> **Multi-tenant request tracking and observability platform for distributed systems**

Path Tracker is a specialized observability service that tracks REST API requests and LLM (Large Language Model) calls as they flow through your distributed system. It enables you to visualize and analyze the complete path a request takes across multiple services.

## What Does It Do?

Path Tracker helps you answer questions like:

- **"Where did this request go?"** - Trace the full path of a request across all your services
- **"What services did user X interact with?"** - See all requests made by a specific user
- **"How long did each hop take?"** - Measure latency at each service in the chain
- **"How much did this cost?"** - Track LLM token usage and costs per request
- **"What failed and where?"** - Debug errors by seeing the complete request flow

## Core Capabilities

### 🔍 Request Path Tracking
Track REST API calls as they flow through your microservices:
```
User Request → API Gateway → Auth Service → ML Service → Database → Response
```
Filter by `request_id` to see the complete journey.

### 🤖 LLM Request Tracking
Track calls to language models (OpenAI, Anthropic, etc.) with:
- Token usage (prompt, completion, total)
- Cost tracking in USD
- Model and provider information
- Request/response bodies (configurable)
- **Advanced debugging fields:**
  - Model configuration (temperature, max_tokens, top_p, etc.)
  - Finish reason (stop, length, content_filter, function_call)
  - Function/tool calling metadata
  - Conversation tracking across multiple turns
  - Retry attempt tracking
  - Provider warnings and notices
  - Streaming metrics (time to first token)

### 👥 Multi-Tenant Architecture
- Complete tenant isolation
- Per-tenant rate limiting and quotas
- Configurable retention policies
- API key authentication

### 📊 Query & Analytics
- Filter by `request_id`, `user_id`, `service`, `status_code`, `time_range`
- Aggregate metrics (request counts, latency percentiles, costs)
- Full request/response body storage (JSONB, queryable)
- Path visualization for distributed tracing

## Use Cases

### Distributed Request Tracing
Track a request as it flows through multiple services in your architecture:
```json
{
  "request_id": "req_abc123",
  "user_id": "user_456",
  "service": "api-gateway"
}
→
{
  "request_id": "req_abc123",
  "user_id": "user_456",
  "service": "ml-service"
}
→
{
  "request_id": "req_abc123",
  "user_id": "user_456",
  "service": "database-service"
}
```

Query by `request_id` to see the complete path.

### Cost Management
Track LLM costs across your entire platform:
- Monitor token usage per user, service, or model
- Set budget alerts and quotas
- Analyze cost trends over time

### Performance Optimization
Identify bottlenecks in your request flow:
- See which service is slowest
- Track latency trends
- Correlate errors with specific services

### Debugging & Auditing
- Full request/response body storage for debugging
- Audit trails for compliance
- Error tracking and analysis

## Quick Example

**Track a REST request:**
```bash
POST /api/v1/tracker/rest
Authorization: Bearer <api_key>

{
  "request_id": "req_abc123",
  "user_id": "user_456",
  "request_timestamp": "2025-01-14T10:00:00.000Z",
  "response_timestamp": "2025-01-14T10:00:00.250Z",
  "service": "api-gateway",
  "method": "POST",
  "url": "https://api.example.com/chat",
  "status_code": 200
}
```

**Track an LLM request:**
```bash
POST /api/v1/tracker/llm
Authorization: Bearer <api_key>

{
  "request_id": "req_abc123",
  "user_id": "user_456",
  "request_timestamp": "2025-01-14T10:00:00.000Z",
  "response_timestamp": "2025-01-14T10:00:05.250Z",
  "service": "ml-service",
  "provider": "openai",
  "model": "gpt-4",
  "url": "https://api.openai.com/v1/chat/completions",
  "prompt_tokens": 150,
  "completion_tokens": 75,
  "total_tokens": 225,
  "cost_usd": 0.0034,
  "status_code": 200
}
```

**Query the request path:**
```bash
GET /api/v1/paths/req_abc123
Authorization: Bearer <api_key>
```

## Architecture

- **Frontend**: Next.js 14 (App Router) with TypeScript
- **Backend**: Next.js API Routes (BFF pattern)
- **Database**: PostgreSQL 16
- **Storage**: JSONB for queryable request/response bodies
- **Authentication**: 
  - Clerk for dashboard users
  - API key based (bcrypt hashed) for tracking endpoints
- **Deployment**: Docker + Docker Compose

## Key Features

✅ **Path Tracking** - Trace requests across multiple services  
✅ **Multi-Tenant** - Complete tenant isolation with quotas  
✅ **LLM Cost Tracking** - Token usage and cost monitoring  
✅ **Body Storage** - Store and query request/response bodies  
✅ **Fast Queries** - Optimized for time-series data  
✅ **Flexible** - Works with any tech stack or language  
✅ **Privacy-First** - Configurable PII scrubbing  

## Documentation

- [Functional Requirements](./docs/FUNCTIONAL_REQUIREMENTS.md) - Detailed feature specifications
- API Documentation (coming soon)
- Integration Guide (coming soon)

## Status

🚧 **In Development** - Actively building core features

## License

TBD
