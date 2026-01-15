#!/bin/bash

API_KEY="pwtrk_qx7W3HkQtmznf8lKxov790klMPfPUIvD"
BASE_URL="https://tracker.pathwave.io"
TIMESTAMP=$(date -u +'%Y-%m-%dT%H:%M:%S.000Z')

echo "=========================================="
echo "Path Tracker API - Comprehensive Test Suite"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo "Timestamp: $(date)"
echo ""

# Test 1: Health Check
echo "TEST 1: Health Check (GET /api/health)"
echo "URL: $BASE_URL/api/health"
echo "---"
curl -k -s -X GET "$BASE_URL/api/health" | python3 -m json.tool
echo ""
echo ""

# Test 2: Track REST Request
echo "TEST 2: Track REST Request (POST /api/v1/tracker/rest)"
echo "URL: $BASE_URL/api/v1/tracker/rest"
echo "---"
REST_RESPONSE=$(curl -k -s -X POST "$BASE_URL/api/v1/tracker/rest" \
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
    "status_code": 200,
    "request_body": {"message": "Hello, world!"},
    "response_body": {"success": true}
  }')
echo "$REST_RESPONSE" | python3 -m json.tool
echo ""
echo ""

# Test 3: Track LLM Request
echo "TEST 3: Track LLM Request (POST /api/v1/tracker/llm)"
echo "URL: $BASE_URL/api/v1/tracker/llm"
echo "---"
LLM_RESPONSE=$(curl -k -s -X POST "$BASE_URL/api/v1/tracker/llm" \
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
    "cost_usd": 0.0034,
    "temperature": 0.7,
    "max_tokens": 500,
    "finish_reason": "stop",
    "is_streaming": false,
    "conversation_id": "conv_test_101"
  }')
echo "$LLM_RESPONSE" | python3 -m json.tool
echo ""
echo ""

# Test 4: Track Batch Requests
echo "TEST 4: Track Batch Requests (POST /api/v1/tracker/batch)"
echo "URL: $BASE_URL/api/v1/tracker/batch"
echo "---"
BATCH_RESPONSE=$(curl -k -s -X POST "$BASE_URL/api/v1/tracker/batch" \
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
        "provider": "anthropic",
        "model": "claude-3-opus",
        "endpoint": "/v1/messages",
        "url": "https://api.anthropic.com/v1/messages",
        "prompt_tokens": 300,
        "completion_tokens": 200,
        "total_tokens": 500,
        "cost_usd": 0.015,
        "status_code": 200
      }
    ]
  }')
echo "$BATCH_RESPONSE" | python3 -m json.tool
echo ""
echo ""

echo "=========================================="
echo "All Tests Complete"
echo "=========================================="
