#!/bin/bash
# Job Search Intelligence - Deployment Verification Script

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_URL="${1:-https://job-search-intelligence.onrender.com}"

echo -e "${YELLOW}🚀 Job Search Intelligence - Deployment Verification${NC}"
echo "=================================================="
echo -e "Testing deployment at: ${APP_URL}"
echo ""

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local data=$4

    echo -n "Testing $method $endpoint ... "

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$APP_URL$endpoint" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$APP_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [[ "$http_code" == "$expected_status"* ]]; then
        echo -e "${GREEN}✓ OK (HTTP $http_code)${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED (HTTP $http_code)${NC}"
        echo "  Response: $body"
        return 1
    fi
}

# Test health endpoint
echo "1. Health Check:"
test_endpoint "GET" "/health" "200"
echo ""

# Test API endpoints
echo "2. API Endpoints:"
test_endpoint "GET" "/api/analytics/summary" "400"  # Should be 400 - missing body
test_endpoint "GET" "/api/jobs/search" "400"  # Should be 400 - missing params
echo ""

# Frontend test
echo "3. Frontend:"
echo -n "Testing homepage ... "
homepage=$(curl -s "$APP_URL" 2>&1)
if echo "$homepage" | grep -q "Job Search Intelligence"; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${YELLOW}⚠ Check manually${NC}"
fi
echo ""

# Summary
echo -e "${YELLOW}=================================================="
echo "Deployment Verification Complete!"
echo -e "=================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Visit: $APP_URL"
echo "2. Upload a resume (PDF, DOCX, or TXT)"
echo "3. Search for jobs"
echo "4. Verify match scores display"
echo "5. Test bookmarking"
echo ""
echo -e "${GREEN}If all tests passed, your deployment is successful! 🎉${NC}"
