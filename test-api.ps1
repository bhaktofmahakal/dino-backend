# Wallet Service API Test Script (Standard ASCII Version)
# Run this after 'docker-compose up -d' finishes

Write-Host " "
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Wallet Service API Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " "

$u1 = "c0000001-0000-0000-0000-000000000001"
$u2 = "c0000002-0000-0000-0000-000000000002"

# Test 1: Health
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:8080/v1/health" -Method Get -ErrorAction Stop
    $statusText = $resp.status
    Write-Host "[OK] Status: $statusText" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Health Check FAILED" -ForegroundColor Red
}

Write-Host " "

# Test 2: Balances
Write-Host "Test 2: Get User 1 Balances" -ForegroundColor Yellow
try {
    $url = "http://localhost:8080/v1/accounts/$u1/balances"
    $resp = Invoke-RestMethod -Uri $url -Method Get -ErrorAction Stop
    $uIdText = $resp.userId
    Write-Host "[OK] User ID: $uIdText" -ForegroundColor Green
    foreach ($b in $resp.balances) {
        $asset = $b.assetTypeCode
        $bal = $b.balance
        Write-Host "  - $asset : $bal" -ForegroundColor Cyan
    }
} catch {
    Write-Host "[ERROR] Balance Check FAILED" -ForegroundColor Red
}

Write-Host " "

# Test 3: Top-Up
Write-Host "Test 3: Top-Up Transaction" -ForegroundColor Yellow
try {
    $body = @{ userId = $u1; assetTypeCode = "GOLD_COIN"; amount = "100.00" } | ConvertTo-Json
    $headers = @{ "Content-Type" = "application/json"; "Idempotency-Key" = [guid]::NewGuid().ToString() }
    $resp = Invoke-RestMethod -Uri "http://localhost:8080/v1/transactions/top-up" -Method Post -Body $body -Headers $headers -ErrorAction Stop
    $tId = $resp.transactionId
    $nBal = $resp.newBalance
    Write-Host "[OK] Transaction ID: $tId" -ForegroundColor Green
    Write-Host "[OK] New Balance: $nBal" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Top-Up FAILED" -ForegroundColor Red
}

Write-Host " "

# Test 4: Idempotency
Write-Host "Test 4: Idempotency Check" -ForegroundColor Yellow
try {
    $key = [guid]::NewGuid().ToString()
    $body = @{ userId = $u2; assetTypeCode = "GOLD_COIN"; amount = "10.00" } | ConvertTo-Json
    $headers = @{ "Content-Type" = "application/json"; "Idempotency-Key" = $key }
    $r1 = Invoke-RestMethod -Uri "http://localhost:8080/v1/transactions/top-up" -Method Post -Body $body -Headers $headers -ErrorAction Stop
    $r2 = Invoke-RestMethod -Uri "http://localhost:8080/v1/transactions/top-up" -Method Post -Body $body -Headers $headers -ErrorAction Stop
    if ($r1.transactionId -eq $r2.transactionId) {
        Write-Host "[OK] Idempotency working: Same TX ID returned" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Idempotency FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Idempotency Test FAILED" -ForegroundColor Red
}

Write-Host " "
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " "
