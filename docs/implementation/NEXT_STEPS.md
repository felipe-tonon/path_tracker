# Path Tracker - Next Steps

Features and improvements planned for future implementation.

---

## 🚦 Rate Limiting

**Priority**: High  
**Effort**: Medium

### Description

Implement per-API-key rate limiting to prevent abuse and ensure fair usage across tenants.

### Requirements

1. **Request counting** per API key using sliding window algorithm
2. **Configurable limits** per tenant via `rate_limit_per_minute` (already in DB schema, default: 10,000)
3. **429 response** when limit exceeded with retry-after information
4. **Rate limit headers** on all responses:
   ```
   X-RateLimit-Limit: 10000
   X-RateLimit-Remaining: 9950
   X-RateLimit-Reset: 1642248000
   ```

### Implementation Notes

- Consider Redis for distributed rate limiting across multiple instances
- Alternative: In-memory rate limiting for single-instance deployments
- Use sliding window or token bucket algorithm
- Add middleware to tracking endpoints (`/api/v1/tracker/*`)

### References

- Functional Requirements: FR-11.1 through FR-11.4
- Tenant setting: `rate_limit_per_minute`

---

## 📊 Time-Bucketed Metrics

**Priority**: Medium  
**Effort**: Medium

### Description

Add `granularity` parameter to metrics endpoint to return time-series data bucketed by minute, hour, or day.

### Requirements

1. **Query parameter**: `granularity` with values `minute`, `hour`, `day`
2. **Time-series response** with metrics per time bucket
3. **Efficient queries** using PostgreSQL `date_trunc()`

### Example Response

```json
{
  "period": {
    "start": "2025-01-14T00:00:00Z",
    "end": "2025-01-14T23:59:59Z",
    "granularity": "hour"
  },
  "time_series": [
    {
      "bucket": "2025-01-14T10:00:00Z",
      "rest_requests": 150,
      "llm_requests": 25,
      "total_cost_usd": 1.23
    },
    {
      "bucket": "2025-01-14T11:00:00Z",
      "rest_requests": 200,
      "llm_requests": 30,
      "total_cost_usd": 1.56
    }
  ]
}
```

### Implementation Notes

```sql
SELECT 
  date_trunc('hour', request_timestamp) as bucket,
  COUNT(*) as count
FROM rest_events
WHERE tenant_id = $1 AND request_timestamp >= $2 AND request_timestamp <= $3
GROUP BY bucket
ORDER BY bucket
```

---

## 🔔 Alerting & Notifications

**Priority**: Medium  
**Effort**: High

### Description

Allow tenants to configure alerts for various conditions.

### Potential Alerts

- Error rate threshold exceeded (e.g., >5% 5xx responses)
- LLM cost budget approaching/exceeded
- Latency P95 above threshold
- Unusual traffic patterns

### Implementation Notes

- Webhook-based notifications
- Email notifications (requires email service integration)
- Slack/Discord integrations

---

## 🔍 PII Scrubbing

**Priority**: Medium  
**Effort**: Medium

### Description

Implement automatic PII detection and scrubbing for request/response bodies.

### Requirements

1. **Configurable** per tenant via `pii_scrubbing_enabled` (already in DB schema)
2. **Pattern-based detection** for common PII:
   - Email addresses
   - Phone numbers
   - Credit card numbers
   - SSN/Tax IDs
3. **Redaction** with configurable replacement (e.g., `[REDACTED]`, `***`)

### Implementation Notes

- Apply at ingestion time (tracking service)
- Consider using regex patterns or ML-based detection
- Allow custom patterns per tenant

---

## 📈 Dashboard Improvements

**Priority**: Low  
**Effort**: Medium

### Features

1. **Real-time updates** - WebSocket or polling for live data
2. **Custom dashboards** - Save/load dashboard configurations
3. **Export functionality** - CSV/JSON export of logs and metrics
4. **Path visualization** - Visual graph of request flow across services

---

## 🗄️ Data Retention

**Priority**: Medium  
**Effort**: Low

### Description

Implement automatic data cleanup based on tenant's `retention_days` setting.

### Requirements

1. **Scheduled job** to delete old events
2. **Per-tenant retention** (already configurable in DB)
3. **Soft delete option** for compliance requirements

### Implementation Notes

```sql
DELETE FROM rest_events 
WHERE tenant_id = $1 
AND request_timestamp < NOW() - INTERVAL '90 days';
```

- Run as cron job or scheduled task
- Consider partitioning tables by date for efficient deletion

---

## 🔐 Enhanced Security

**Priority**: Low  
**Effort**: Medium

### Features

1. **IP allowlisting** per API key
2. **Audit logging** for all authentication events
3. **API key rotation** with grace period
4. **Two-factor authentication** for dashboard access

---

*Last Updated: January 14, 2026*
