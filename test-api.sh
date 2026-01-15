#!/bin/bash

# Path Tracker API - Test Script
# Usage: ./test-api.sh
# This script tests all implemented endpoints on the deployed server

API_KEY="${TRACKER_API_KEY:-pwtrk_qx7W3HkQtmznf8lKxov790klMPfPUIvD}"
BASE_URL="${TRACKER_URL:-https://tracker.pathwave.io}"
TIMESTAMP=$(date -u +'%Y-%m-%dT%H:%M:%S.000Z')
TIMESTAMP_END=$(date -u +'%Y-%m-%dT%H:%M:%S.250Z')

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Statistics
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_header() {
  echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║ $1${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"
}

print_test() {
  echo -e "${YELLOW}TEST: $1${NC}"
  ((TESTS_RUN++))
}

print_pass() {
  echo -e "${GREEN}✅ PASSED${NC}\n"
  ((TESTS_PASSED++))
}

print_fail() {
  echo -e "${RED}❌ FAILED: $1${NC}\n"
  ((TESTS_FAILED++))
}

# Main testing
print_header "Path Tracker API Test Suite"
echo "Base URL: $BASE_URL"
echo "Timestamp: $(date)"
echo ""

# Test 1: Health Check
print_test "Health Check (GET /api/health)"
RESPONSE=$(curl -k -s -X GET "$BASE_URL/api/health")
if echo "$RESPONSE" | grep -q '"status":"healthy"'; then
  echo "Response: $RESPONSE" | head -c 100
  echo "..."
  print_pass
else
  print_fail "Expected healthy status"
fi

# Test 2: Track REST Request - Minimal
print_test "Track REST Request - Minimal Fields (POST /api/v1/tracker/rest)"
RESPONSE=$(curl -k -s -X POST "$BASE_URL/api/v1/tracker/rest" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_test_'$(date +%s)'",
    "request_timestamp": "'$TIMESTAMP'",
    "response_timestamp": "'$TIMESTAMP_END'",
    "service": "test-service",
    "method": "POST",
    "url": "https://api.example.com/test",
    "status_code": 200
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "Response: $RESPONSE" | head -c 100
  echo "..."
  print_pass
else
  print_fail "Response: $RESPONSE"
fi

# Test 3: Track REST Request - With Bodies
print_test "Track REST Request - With Bodies"
RESPONSE=$(curl -k -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/tracker/rest" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_bodies_'$(date +%s)'",
    "request_timestamp": "'$TIMESTAMP'",
    "response_timestamp": "'$TIMESTAMP_END'",
    "service": "test-service",
    "method": "POST",
    "url": "https://api.example.com/test",
    "status_code": 200,
    "request_body": {"message": "test", "user": "user123"},
    "response_body": {"success": true, "id": "res_123"}
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "201" ]; then
  print_pass
else
  print_fail "HTTP $HTTP_CODE"
fi

# Test 4: Track LLM Request
print_test "Track LLM Request (POST /api/v1/tracker/llm)"
RESPONSE=$(curl -k -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/tracker/llm" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_llm_'$(date +%s)'",
    "request_timestamp": "'$TIMESTAMP'",
    "response_timestamp": "'$TIMESTAMP_END'",
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
    "finish_reason": "stop"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "201" ]; then
  print_pass
else
  print_fail "HTTP $HTTP_CODE"
fi

# Test 5: Track Batch Requests
print_test "Track Batch Requests (POST /api/v1/tracker/batch)"
RESPONSE=$(curl -k -s -X POST "$BASE_URL/api/v1/tracker/batch" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "type": "rest",
        "request_id": "req_batch_rest_'$(date +%s)'",
        "request_timestamp": "'$TIMESTAMP'",
        "response_timestamp": "'$TIMESTAMP_END'",
        "service": "api-gateway",
        "method": "GET",
        "url": "https://api.example.com/users",
        "status_code": 200
      },
      {
        "type": "llm",
        "request_id": "req_batch_llm_'$(date +%s)'",
        "request_timestamp": "'$TIMESTAMP'",
        "response_timestamp": "'$TIMESTAMP_END'",
        "service": "ml-service",
        "provider": "anthropic",
        "model": "claude-3-opus",
        "endpoint": "/v1/messages",
        "url": "https://api.anthropic.com/v1/messages",
        "prompt_tokens": 200,
        "completion_tokens": 100,
        "total_tokens": 300,
        "cost_usd": 0.01,
        "status_code": 200
      }
    ]
  }')

if echo "$RESPONSE" | grep -q '"events_processed":2'; then
  echo "Response: $RESPONSE" | head -c 100
  echo "..."
  print_pass
else
  print_fail "Response: $RESPONSE"
fi

# Test 6: Invalid API Key (should fail)
print_test "Invalid API Key - Should Fail (POST /api/v1/tracker/rest)"
RESPONSE=$(curl -k -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/tracker/rest" \
  -H "Authorization: Bearer invalid_key" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_invalid_'$(date +%s)'",
    "request_timestamp": "'$TIMESTAMP'",
    "response_timestamp": "'$TIMESTAMP_END'",
    "service": "test",
    "method": "POST",
    "url": "https://api.example.com/test",
    "status_code": 200
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
  print_pass
else
  print_fail "Expected 401, got $HTTP_CODE"
fi

# Test 7: Missing Required Fields (should fail)
print_test "Missing Required Fields - Should Fail (POST /api/v1/tracker/rest)"
RESPONSE=$(curl -k -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/tracker/rest" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_incomplete_'$(date +%s)'"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
  print_pass
else
  print_fail "Expected 400, got $HTTP_CODE"
fi

# Test Summary
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ TEST SUMMARY                                                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"
echo "Total Tests: $TESTS_RUN"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
else
  echo -e "Failed: ${GREEN}0${NC}"
fi

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✅ All tests passed!${NC}\n"
  exit 0
else
  echo -e "\n${RED}❌ Some tests failed!${NC}\n"
  exit 1
fi
