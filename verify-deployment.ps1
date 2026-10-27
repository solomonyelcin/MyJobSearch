# Job Search Intelligence - Deployment Verification Script (PowerShell)
# Usage: .\verify-deployment.ps1 -AppUrl "https://job-search-intelligence.onrender.com"

param(
    [string]$AppUrl = "https://job-search-intelligence.onrender.com"
)

Write-Host "🚀 Job Search Intelligence - Deployment Verification" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "Testing deployment at: $AppUrl" -ForegroundColor Cyan
Write-Host ""

$testsPassed = 0
$testsFailed = 0

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [int]$ExpectedStatus,
        [string]$Body = $null
    )

    Write-Host -NoNewline "Testing $Method $Endpoint ... "

    try {
        $params = @{
            Uri             = "$AppUrl$Endpoint"
            Method          = $Method
            UseBasicParsing = $true
            TimeoutSec      = 10
        }

        if ($Body) {
            $params['Body'] = $Body
            $params['ContentType'] = 'application/json'
        }

        $response = Invoke-WebRequest @params -ErrorAction Stop
        $statusCode = $response.StatusCode

        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "✓ OK (HTTP $statusCode)" -ForegroundColor Green
            $script:testsPassed++
            return $true
        } else {
            Write-Host "✗ FAILED (HTTP $statusCode, expected $ExpectedStatus)" -ForegroundColor Red
            $script:testsFailed++
            return $false
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.Value
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "✓ OK (HTTP $statusCode)" -ForegroundColor Green
            $script:testsPassed++
            return $true
        } else {
            Write-Host "✗ FAILED" -ForegroundColor Red
            Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
            $script:testsFailed++
            return $false
        }
    }
}

# 1. Health Check
Write-Host "1. Health Check:" -ForegroundColor Cyan
Test-Endpoint "GET" "/health" 200
Write-Host ""

# 2. API Endpoints
Write-Host "2. API Endpoints:" -ForegroundColor Cyan
Test-Endpoint "POST" "/api/analytics/summary" 400  # Should fail - missing body
Test-Endpoint "GET" "/api/jobs/search" 400  # Should fail - missing params
Write-Host ""

# 3. Frontend
Write-Host "3. Frontend:" -ForegroundColor Cyan
Write-Host -NoNewline "Testing homepage ... "
try {
    $homepage = Invoke-WebRequest -Uri $AppUrl -UseBasicParsing -TimeoutSec 10
    if ($homepage.Content -like "*Job Search Intelligence*") {
        Write-Host "✓ OK" -ForegroundColor Green
        $script:testsPassed++
    } else {
        Write-Host "⚠ Check manually" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "✗ FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $script:testsFailed++
}
Write-Host ""

# Summary
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "Deployment Verification Complete!" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor $(if ($testsFailed -eq 0) { "Green" } else { "Red" })
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Visit: $AppUrl" -ForegroundColor White
Write-Host "2. Upload a resume (PDF, DOCX, or TXT)" -ForegroundColor White
Write-Host "3. Search for jobs" -ForegroundColor White
Write-Host "4. Verify match scores display" -ForegroundColor White
Write-Host "5. Test bookmarking jobs" -ForegroundColor White
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "✅ Your deployment is successful! 🎉" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests failed. Check the deployment logs." -ForegroundColor Yellow
}
