#!/bin/bash

API_KEY="pwtrk_qx7W3HkQtmznf8lKxov790klMPfPUIvD"
BASE_URL="https://tracker.pathwave.io"
TIMESTAMP=$(date -u +'%Y-%m-%dT%H:%M:%S.000Z')

echo "=========================================="
echo "Path Tracker API - Edge Cases & Validation Tests"
echo "=========================================="
echo ""

# Test 1: Invalid API Key
echo "TEST 1: Invalid API Key (Should return 401)"
echo "---"
curl -k -s -X POST "$BASE_URL/api/v1/tracker/rest" \
  -H "Authorization: Bearer invalid_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_invalid",
    "request_timestamp": "'$TIMESTAMP'",
    "response_timestamp": "'$TIMESTAMP'",
    "service": "test",
    "method": "POST",
    "url": "https://api.example.com/test",
    "status_code": 200
  }' | python3 -m json.tool
echo ""
echo ""

# Test 2: Missing Required Fields
echo "TEST 2: Missing Required Fields (Should return 400)"
echo "---"
curl -k -s -X POST "$BASE_URL/api/v1/tracker/rest" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_incomplete"
  }' | python3 -m json.tool
echo ""
echo ""

# Test 3: Large batch (multiple events)
echo "TEST 3: Large Batch with 5 Events"
echo "---"
curl -k -s -X POST "$BASE_URL/api/v1/tracker/batch" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "type": "rest",
        "request_id": "req_large_1_'$(date +%s)'",
        "environment": "staging",
        "request_timestamp": "'$TIMESTAMP'",
        "response_timestamp": "'$TIMESTAMP'",
        "service": "service-a",
        "method": "GET",
        "url": "https://api.example.com/users",
        "status_code": 200
      },
      {
        "type": "rest",
        "request_id": "req_large_2_'$(date +%s)'",
        "environment": "staging",
        "request_timestamp": "'$TIMESTAMP'",
        "response_timestamp": "'$TIMESTAMP'",
        "service": "service-b",
        "method": "POST",
        "url": "https://api.example.com/posts",
        "status_code": 201
      },
      {
        "type": "llm",
        "request_id": "req_large_3_'$(date +%s)'",
        "environment": "staging",
        "request_timestamp": "'$TIMESTAMP'",
        "response_timestamp": "'$TIMESTAMP'",
        "service": "ml-service",
        "provider": "openai",
        "model": "gpt-4",
        "endpoint": "/v1/chat/completions",
        "url": "https://api.openai.com/v1/chat/completions",
        "prompt_tokens": 100,
        "completion_tokens": 50,
        "total_tokens": 150,
        "cost_usd": 0.002,
        "status_code": 200
      },
      {
        "type": "llm",
        "request_id": "req_large_4_'$(date +%s)'",
        "environment": "production",
        "request_timestamp": "'$TIMESTAMP'",
        "response_timestamp": "'$TIMESTAMP'",
        "service": "ml-service",
        "provider": "anthropic",
        "model": "claude-3-sonnet",
        "endpoint": "/v1/messages",
        "url": "https://api.anthropic.com/v1/messages",
        "prompt_tokens": 200,
        "completion_tokens": 100,
        "total_tokens": 300,
        "cost_usd": 0.003,
        "status_code": 200
      },
      {
        "type": "rest",
        "request_id": "req_large_5_'$(date +%s)'",
        "environment": "development",
        "request_timestamp": "'$TIMESTAMP'",
        "response_timestamp": "'$TIMESTAMP'",
        "service": "database",
        "method": "DELETE",
        "url": "https://db.internal/records/123",
        "status_code": 204
      }
    ]
  }' | python3 -m json.tool
echo ""
echo ""

# Test 4: REST with various status codes
echo "TEST 4: REST with Error Status Code (500)"
echo "---"
curl -k -s -X POST "$BASE_URL/api/v1/tracker/rest" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_error_'$(date +%s)'",
    "environment": "production",
    "request_timestamp": "'$TIMESTAMP'",
    "response_timestamp": "'$TIMESTAMP'",
    "service": "api-gateway",
    "method": "POST",
    "url": "https://api.example.com/process",
    "status_code": 500,
    "request_body": {"data": "something"},
    "response_body": {"error": "Internal Server Error", "code": "ERR_500"}
  }' | python3 -m json.tool
echo ""
echo ""

# Test 5: LLM with various providers and models
echo "TEST 5: LLM with Different Providers (Batch)"
echo "---"
curl -k -s -X POST "$BASE_URL/api/v1/tracker/batch" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "type": "llm",
        "request_id": "req_provider_openai_'$(date +%s)'",
        "environment": "production",
        "request_timestamp": "'$TIMESTAMP'",
        "response_timestamp": "'$TIMESTAMP'",
        "service": "ml-service",
        "provider": "openai",
        "model": "gpt-3.5-turbo",
        "endpoint": "/v1/chat/completions",
        "url": "https://api.openai.com/v1/chat/completions",
        "prompt_tokens": 100,
        "completion_tokens": 50,
        "total_tokens": 150,
        "cost_usd": 0.0005,
        "status_code": 200,
        "finish_reason": "stop"
      },
      {
        "type": "llm",
        "request_id": "req_provider_claude_'$(date +%s)'",
        "environment": "production",
        "request_timestamp": "'$TIMESTAMP'",
        "response_timestamp": "'$TIMESTAMP'",
        "service": "ml-service",
        "provider": "anthropic",
        "model": "claude-3-opus",
        "endpoint": "/v1/messages",
        "url": "https://api.anthropic.com/v1/messages",
        "prompt_tokens": 150,
        "completion_tokens": 75,
        "total_tokens": 225,
        "cost_usd": 0.01,
        "status_code": 200,
        "finish_reason": "end_turn"
      },
      {
        "type": "llm",
        "request_id": "req_provider_google_'$(date +%s)'",
        "environment": "production",
        "request_timestamp": "'$TIMESTAMP'",
        "response_timestamp": "'$TIMESTAMP'",
        "service": "ml-service",
        "provider": "google",
        "model": "gemini-pro",
        "endpoint": "/v1beta/generateContent",
        "url": "https://generativelanguage.googleapis.com/v1beta/generateContent",
        "prompt_tokens": 120,
        "completion_tokens": 60,
        "total_tokens": 180,
        "cost_usd": 0.0008,
        "status_code": 200,
        "finish_reason": "STOP"
      }
    ]
  }' | python3 -m json.tool
echo ""
echo ""

echo "=========================================="
echo "Edge Case Tests Complete"
echo "=========================================="
