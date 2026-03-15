# Create 50 temp users via Supabase REST API (no Node.js required).
# 1. Edit $SupabaseUrl and $ServiceRoleKey below, then run: .\scripts\create-temp-users.ps1
# 2. Or run: .\scripts\create-temp-users.ps1 -SupabaseUrl "https://xxx.supabase.co" -ServiceRoleKey "eyJ..."
# 3. If temp users already exist (email_exists): run with -CleanFirst to remove them then create 50 again.

param(
    [string]$SupabaseUrl = "https://crexgvuniedkqqlgqvbk.supabase.co",
    [string]$ServiceRoleKey = "",
    [switch]$CleanFirst
)

if (-not $ServiceRoleKey) {
    Write-Host "Usage: set your key in the script or run: .\scripts\create-temp-users.ps1 -ServiceRoleKey 'YOUR_KEY'" -ForegroundColor Yellow
    exit 1
}

$ErrorActionPreference = "Stop"
# Prefer TLS 1.2 for Supabase
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$TempDomain = "temp.autospotters.local"
$HoursValid = 72
$ExpiresAt = (Get-Date).AddHours($HoursValid).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

function New-RandomPassword {
    $chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
    $bytes = New-Object byte[] 14
    (New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
    -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

$headers = @{
    "Authorization" = "Bearer $ServiceRoleKey"
    "apikey"       = $ServiceRoleKey
    "Content-Type" = "application/json"
    "Prefer"       = "return=representation"
}

if ($CleanFirst) {
    Write-Host "CleanFirst: removing existing temp users (@$TempDomain)..."
    $page = 1
    $perPage = 1000
    $toRemove = @()
    do {
        $listResp = Invoke-RestMethod -Uri "$SupabaseUrl/auth/v1/admin/users?per_page=$perPage&page=$page" -Method Get -Headers $headers
        $users = if ($listResp.users) { $listResp.users } else { @() }
        foreach ($u in $users) {
            $em = if ($u.email) { $u.email } else { "" }
            if ($em -like "*@$TempDomain") { $toRemove += @{ id = $u.id; email = $em } }
        }
        $page++
    } while ($users.Count -eq $perPage)
    foreach ($r in $toRemove) {
        try {
            Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/friendships?or=(requester_id.eq.$($r.id),addressee_id.eq.$($r.id))" -Method Delete -Headers $headers | Out-Null
        } catch { }
        try {
            Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/profiles?user_id=eq.$($r.id)" -Method Delete -Headers $headers | Out-Null
        } catch { }
        try {
            $emailEnc = [uri]::EscapeDataString("`"$($r.email)`"")
            Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/temp_access?email=eq.$emailEnc" -Method Delete -Headers $headers | Out-Null
        } catch { }
        try {
            Invoke-RestMethod -Uri "$SupabaseUrl/auth/v1/admin/users/$($r.id)" -Method Delete -Headers $headers | Out-Null
            Write-Host "  Removed $($r.email)"
        } catch {
            Write-Host "  Failed to remove auth user $($r.email): $_" -ForegroundColor Yellow
        }
    }
    if ($toRemove.Count -eq 0) { Write-Host "  No existing temp users found." } else { Write-Host "  Removed $($toRemove.Count) temp user(s)." }
}

$tempUsers = @()
Write-Host "Creating 50 auth users..."
for ($i = 1; $i -le 50; $i++) {
    $email = "tempuser$i@$TempDomain"
    $password = New-RandomPassword
    # Build JSON by hand so email_confirm is lowercase true (GoTrue rejects "True"); escape " and \ for JSON
    $emailEsc = $email -replace '\\','\\\\' -replace '"','\"'
    $pwEsc = $password -replace '\\','\\\\' -replace '"','\"'
    $body = "{`"email`":`"$emailEsc`",`"password`":`"$pwEsc`",`"email_confirm`":true}"
    try {
        $resp = Invoke-RestMethod -Uri "$SupabaseUrl/auth/v1/admin/users" -Method Post -Headers $headers -Body $body -ContentType "application/json"
        $uid = if ($resp.user.id) { $resp.user.id } else { $resp.id }
        $tempUsers += @{ id = $uid; email = $email; username = "tempuser$i"; password = $password }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errBody = ""
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            if ($stream) { $reader = New-Object System.IO.StreamReader($stream); $reader.BaseStream.Position = 0; $errBody = $reader.ReadToEnd() }
        } catch { }
        Write-Host "Failed tempuser$i (HTTP $statusCode): $errBody" -ForegroundColor Red
        throw
    }
    if ($i % 10 -eq 0) { Write-Host "  $i/50" }
}

Write-Host "Updating profiles (is_temp, temp_expires_at, is_map_marker, username_locked)..."
for ($i = 0; $i -lt $tempUsers.Count; $i++) {
    $u = $tempUsers[$i]
    $isMapMarker = ($i -lt 25)
    # Build JSON by hand so booleans are lowercase (PostgREST expects valid JSON)
    $patchBody = "{`"is_temp`":true,`"temp_expires_at`":`"$ExpiresAt`",`"is_map_marker`":$(if ($isMapMarker) { 'true' } else { 'false' }),`"username_locked`":true}"
    try {
        Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/profiles?user_id=eq.$($u.id)" -Method Patch -Headers $headers -Body $patchBody -ContentType "application/json" | Out-Null
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $responseBody = $reader.ReadToEnd()
        Write-Host "Profile PATCH failed for $($u.username) (HTTP $statusCode): $responseBody" -ForegroundColor Red
        throw
    }
}

Write-Host "Inserting temp_access..."
$accessRows = $tempUsers | ForEach-Object { @{ email = $_.email; access_code = $_.password; expires_at = $ExpiresAt } }
$body = $accessRows | ConvertTo-Json
Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/temp_access" -Method Post -Headers $headers -Body $body | Out-Null

Write-Host "Getting founder user_id..."
$founderResp = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/profiles?role=eq.founder&select=user_id&limit=1" -Method Get -Headers $headers
$founderId = if ($founderResp -is [array]) { $founderResp[0].user_id } else { $founderResp.user_id }
if ($founderId) {
    Write-Host "Creating founder <-> temp friendships..."
    foreach ($u in $tempUsers) {
        $body = @{ requester_id = $founderId; addressee_id = $u.id; status = "accepted" } | ConvertTo-Json
        try { Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/friendships" -Method Post -Headers $headers -Body $body | Out-Null } catch { if ($_.Exception.Response.StatusCode -ne 409) { throw } }
    }
}

Write-Host "Creating temp <-> temp friendships..."
$count = 0
for ($i = 0; $i -lt $tempUsers.Count; $i++) {
    for ($j = $i + 1; $j -lt $tempUsers.Count; $j++) {
        $body = @{ requester_id = $tempUsers[$i].id; addressee_id = $tempUsers[$j].id; status = "accepted" } | ConvertTo-Json
        try {
            Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/friendships" -Method Post -Headers $headers -Body $body | Out-Null
            $count++
        } catch { if ($_.Exception.Response.StatusCode -ne 409) { throw } }
    }
}
Write-Host "  $count friendships created."

$projectRoot = Split-Path $PSScriptRoot -Parent
$csvPath = Join-Path $projectRoot "temp-users-list.csv"
$lines = @("username,password") + ($tempUsers | ForEach-Object { "$($_.username),$($_.password)" })
$lines | Set-Content -Path $csvPath -Encoding UTF8
Write-Host "`nWrote $csvPath" -ForegroundColor Green
Write-Host "`n--- Temp users (username / password) ---"
$tempUsers | ForEach-Object { Write-Host "$($_.username)`t$($_.password)" }
Write-Host "`nExpires at: $ExpiresAt"
