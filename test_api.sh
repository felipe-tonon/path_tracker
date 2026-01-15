#!/bin/bash

API_KEY="pwtrk_qx7W3HkQtmznf8lKxov790klMPfPUIvD"
BASE_URL="https://tracker.pathwave.io"

echo "================================"
echo "Path Tracker API Tests"
echo "================================"
echo ""

# Test 1: Health Check
echo "TEST 1: Health Check (GET /api/health)"
echo "---"
curl -v -X GET "$BASE_URL/api/health" \
  -H "Content-Type: application/json" 2>&1 | grep -E "< HTTP|status|healthy"
echo ""
echo ""

# Test 2: Track REST Request
echo "TEST 2: Track REST Request"
echo "---"
TIMESTAMP=$(date -u +'%Y-%m-%dT%H:%M:%S.000Z')
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/tracker/rest" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_test_rest_'$(date +%s)'",
    "user_id": "user_test_123",
    "environment": "production",
    "request_timestamp": "'$TIMESTAMP'",
    "response_timestamp": "'$TIMESTAMP'",
    "service": "api-gateway",
    "method": "POST",
    "url": "https://api.example.com/chat",
    "status_code": 200
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
echo "HTTP Status: $HTTP_CODE"
echo "Response Body: $BODY"
echo ""
echo ""

# Test 3: Track LLM Request
echo "TEST 3: Track LLM Request"
echo "---"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/tracker/llm" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_test_llm_'$(date +%s)'",
    "user_id": "user_test_123",
    "environment": "production",
    "request_timestamp": "'$TIMESTAMP'",
    "response_timestamp": "'$TIMESTAMP'",
    "service": "ml-service",
    "provider": "openai",
    "model": "gpt-4",
    "endpoint": "/v1/chat/completions",
    "url": "https://api.openai.com/v1/chat/completions",
    "status_code": 200,
    "prompt_tokens": 150,
    "completion_tokens": 75,
    "total_tokens": 225,
    "cost_usd": 0.0034
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
echo "HTTP Status: $HTTP_CODE"
echo "Response Body: $BODY"
echo ""
echo ""

# Test 4: Track Batch
echo "TEST 4: Track Batch Requests"
echo "---"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/tracker/batch" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "type": "rest",
        "request_id": "req_batch_1_'$(date +%s)'",
        "environment": "staging",
        "request_timestamp": "'$TIMESTAMP'",
        "response_timestamp": "'$TIMESTAMP'",
        "service": "api-gateway",
        "method": "POST",
        "url": "https://api.example.com/data",
        "status_code": 200
      },
      {
        "type": "llm",
        "request_id": "req_batch_2_'$(date +%s)'",
        "environment": "staging",
        "request_timestamp": "'$TIMESTAMP'",
        "response_timestamp": "'$TIMESTAMP'",
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
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
echo "HTTP Status: $HTTP_CODE"
echo "Response Body: $BODY"
echo ""
echo ""

echo "================================"
echo "All Tests Complete"
echo "================================"
