param(
  [string]$PostgresServiceName = "",
  [string]$PostgresPassword = "123456",
  [string]$AdminApiKey = "123456",
  [string]$IssuerApiKey = "demo-issuer-key",
  [switch]$OpenPgAdmin
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Start-NewTerminal($Title, $Command) {
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command",
    "Write-Host '$Title' -ForegroundColor Green; $Command"
  )
}

function Wait-HardhatRpc($Url, $Seconds = 40) {
  $deadline = (Get-Date).AddSeconds($Seconds)

  while ((Get-Date) -lt $deadline) {
    try {
      $body = @{
        jsonrpc = "2.0"
        method  = "eth_chainId"
        params  = @()
        id      = 1
      } | ConvertTo-Json -Compress

      Invoke-RestMethod `
        -Uri $Url `
        -Method Post `
        -Body $body `
        -ContentType "application/json" `
        -TimeoutSec 3 | Out-Null

      return $true
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  return $false
}

function Wait-HttpGet($Url, $Seconds = 40) {
  $deadline = (Get-Date).AddSeconds($Seconds)

  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 | Out-Null
      return $true
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  return $false
}

function Add-OrUpdateEnvLine($FilePath, $Key, $Value) {
  if (-not (Test-Path $FilePath)) {
    New-Item -ItemType File -Path $FilePath -Force | Out-Null
  }

  $content = Get-Content $FilePath -Raw -ErrorAction SilentlyContinue

  if ($null -eq $content) {
    $content = ""
  }

  $escapedKey = [regex]::Escape($Key)

  if ($content -match "(?m)^$escapedKey=") {
    $content = $content -replace "(?m)^$escapedKey=.*$", "$Key=$Value"
  } else {
    if ($content.Length -gt 0 -and -not $content.EndsWith("`n")) {
      $content += "`r`n"
    }
    $content += "$Key=$Value`r`n"
  }

  Set-Content -Path $FilePath -Value $content -Encoding UTF8
}

# ------------------------------------------------------------
# Resolve project root
# ------------------------------------------------------------

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# If this script is inside /scripts, project root is parent folder.
# If this script is already in project root, use current script folder.
if ((Split-Path -Leaf $ScriptDir) -eq "scripts") {
  $Root = Split-Path -Parent $ScriptDir
} else {
  $Root = $ScriptDir
}

Set-Location $Root

Write-Step "Project root: $Root"

if (-not (Test-Path "$Root\package.json")) {
  throw "package.json not found in project root: $Root. Please place this script in the project root or scripts folder."
}

if (-not (Test-Path "$Root\backend")) {
  throw "backend folder not found."
}

if (-not (Test-Path "$Root\frontend")) {
  throw "frontend folder not found."
}

# ------------------------------------------------------------
# PostgreSQL CLI tools
# ------------------------------------------------------------

Write-Step "Checking PostgreSQL CLI tools"

$possiblePgBins = @(
  "$env:ProgramFiles\PostgreSQL\18\bin",
  "$env:ProgramFiles\PostgreSQL\17\bin",
  "$env:ProgramFiles\PostgreSQL\16\bin",
  "$env:ProgramFiles\PostgreSQL\15\bin",
  "$env:ProgramFiles\PostgreSQL\14\bin"
)

$pgBin = $possiblePgBins |
  Where-Object { Test-Path "$_\psql.exe" } |
  Select-Object -First 1

if ($pgBin) {
  $env:Path = "$pgBin;$env:Path"
  Write-Host "Detected PostgreSQL bin: $pgBin"
} else {
  Write-Warning "PostgreSQL bin folder not found. psql/createdb may fail if they are not in PATH."
}

# ------------------------------------------------------------
# PostgreSQL service
# ------------------------------------------------------------

Write-Step "Checking PostgreSQL service"

if ([string]::IsNullOrWhiteSpace($PostgresServiceName)) {
  try {
    $pgServices = @(
      Get-CimInstance Win32_Service -Filter "Name LIKE '%postgres%' OR DisplayName LIKE '%PostgreSQL%'" |
        Select-Object Name, DisplayName, State
    )

    if ($pgServices.Count -gt 0) {
      $PostgresServiceName = $pgServices[0].Name
      Write-Host "Detected PostgreSQL service: $PostgresServiceName"
    } else {
      Write-Warning "No PostgreSQL Windows service detected."
      Write-Warning "If PostgreSQL is installed manually, start it yourself."
    }
  } catch {
    Write-Warning "Could not auto-detect PostgreSQL service."
    Write-Warning $_.Exception.Message
  }
}

if (-not [string]::IsNullOrWhiteSpace($PostgresServiceName)) {
  try {
    $service = Get-Service -Name $PostgresServiceName -ErrorAction Stop

    if ($service.Status -ne "Running") {
      Write-Step "Starting PostgreSQL service: $PostgresServiceName"
      Start-Service -Name $PostgresServiceName
      Start-Sleep -Seconds 3
    } else {
      Write-Host "PostgreSQL service is already running."
    }
  } catch {
    Write-Warning "Could not start/check PostgreSQL service: $PostgresServiceName"
    Write-Warning $_.Exception.Message
    Write-Warning "You can start PostgreSQL manually, then run this script again."
  }
}

# ------------------------------------------------------------
# Create database
# ------------------------------------------------------------

Write-Step "Creating database 'diploma' if possible"

$env:PGPASSWORD = $PostgresPassword

try {
  $dbExists = & psql -U postgres -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname='diploma';" 2>$null

  if ($dbExists.Trim() -eq "1") {
    Write-Host "Database 'diploma' already exists."
  } else {
    & createdb -U postgres -h localhost diploma
    Write-Host "Database 'diploma' created."
  }
} catch {
  Write-Warning "Could not auto-create database using psql/createdb."
  Write-Warning "Open pgAdmin or psql and create database manually:"
  Write-Warning "CREATE DATABASE diploma;"
}

# ------------------------------------------------------------
# Write demo env values
# ------------------------------------------------------------

Write-Step "Writing demo API keys to env files"

$BackendEnvPath = "$Root\backend\.env"
$FrontendEnvPath = "$Root\frontend\.env.local"

Add-OrUpdateEnvLine $BackendEnvPath "ADMIN_API_KEY" $AdminApiKey
Add-OrUpdateEnvLine $BackendEnvPath "ISSUER_API_KEY" $IssuerApiKey
Add-OrUpdateEnvLine $BackendEnvPath "DB_HOST" "localhost"
Add-OrUpdateEnvLine $BackendEnvPath "DB_PORT" "5432"
Add-OrUpdateEnvLine $BackendEnvPath "DB_USERNAME" "postgres"
Add-OrUpdateEnvLine $BackendEnvPath "DB_PASSWORD" $PostgresPassword
Add-OrUpdateEnvLine $BackendEnvPath "DB_NAME" "diploma"

Add-OrUpdateEnvLine $FrontendEnvPath "VITE_API_BASE" "http://localhost:3000/api"
Add-OrUpdateEnvLine $FrontendEnvPath "VITE_ADMIN_API_KEY" $AdminApiKey
Add-OrUpdateEnvLine $FrontendEnvPath "VITE_ISSUER_API_KEY" $IssuerApiKey

Write-Host "Updated backend env: $BackendEnvPath"
Write-Host "Updated frontend env: $FrontendEnvPath"

# Also expose values to current process and child processes.
$env:ADMIN_API_KEY = $AdminApiKey
$env:ISSUER_API_KEY = $IssuerApiKey
$env:POSTGRES_PASSWORD = $PostgresPassword

# ------------------------------------------------------------
# Install dependencies
# ------------------------------------------------------------

Write-Step "Installing root dependencies"
npm install

Write-Step "Installing backend dependencies"
Push-Location backend
npm install
Pop-Location

Write-Step "Installing frontend dependencies"
Push-Location frontend
npm install
Pop-Location

# ------------------------------------------------------------
# Start Hardhat node
# ------------------------------------------------------------

Write-Step "Starting Hardhat node in a new terminal"
Start-NewTerminal "Hardhat node" "cd '$Root'; npm run node"

Write-Host ""
Write-Host "Waiting for Hardhat node on http://127.0.0.1:8545 ..." -ForegroundColor Yellow

if (-not (Wait-HardhatRpc "http://127.0.0.1:8545" 40)) {
  throw "Hardhat node did not become ready on http://127.0.0.1:8545"
}

Write-Host "Hardhat node is ready." -ForegroundColor Green

# ------------------------------------------------------------
# Deploy contracts + setup local env
# ------------------------------------------------------------

Write-Step "Deploying contracts, authorizing demo issuer, updating env files"

npm run setup:local

# After setup:local, re-apply API keys in case setup script rewrote env files.
Add-OrUpdateEnvLine $BackendEnvPath "ADMIN_API_KEY" $AdminApiKey
Add-OrUpdateEnvLine $BackendEnvPath "ISSUER_API_KEY" $IssuerApiKey
Add-OrUpdateEnvLine $FrontendEnvPath "VITE_ADMIN_API_KEY" $AdminApiKey
Add-OrUpdateEnvLine $FrontendEnvPath "VITE_ISSUER_API_KEY" $IssuerApiKey

# ------------------------------------------------------------
# Start backend
# ------------------------------------------------------------

Write-Step "Starting backend in a new terminal"
Start-NewTerminal "NestJS backend" "cd '$Root\backend'; npm run start:dev"

Write-Host ""
Write-Host "Waiting for backend API docs on http://localhost:3000/api/docs ..." -ForegroundColor Yellow

if (Wait-HttpGet "http://localhost:3000/api/docs" 40) {
  Write-Host "Backend appears to be ready." -ForegroundColor Green
} else {
  Write-Warning "Backend did not respond on /api/docs within the wait time."
  Write-Warning "Check the NestJS backend terminal for errors."
}

# ------------------------------------------------------------
# Start frontend
# ------------------------------------------------------------

Write-Step "Starting frontend in a new terminal"
Start-NewTerminal "Vite frontend" "cd '$Root\frontend'; npm run dev"

# ------------------------------------------------------------
# Optional pgAdmin
# ------------------------------------------------------------

if ($OpenPgAdmin) {
  Write-Step "Opening pgAdmin if installed"

  $possiblePgAdminPaths = @(
    "$env:ProgramFiles\PostgreSQL\18\pgAdmin 4\bin\pgAdmin4.exe",
    "$env:ProgramFiles\PostgreSQL\17\pgAdmin 4\bin\pgAdmin4.exe",
    "$env:ProgramFiles\PostgreSQL\16\pgAdmin 4\bin\pgAdmin4.exe",
    "$env:ProgramFiles\PostgreSQL\15\pgAdmin 4\bin\pgAdmin4.exe",
    "$env:ProgramFiles\PostgreSQL\14\pgAdmin 4\bin\pgAdmin4.exe"
  )

  $pgAdminPath = $possiblePgAdminPaths |
    Where-Object { Test-Path $_ } |
    Select-Object -First 1

  if ($pgAdminPath) {
    Start-Process $pgAdminPath
  } else {
    Write-Warning "pgAdmin executable not found in common paths."
  }
}

# ------------------------------------------------------------
# Final info
# ------------------------------------------------------------

Write-Host ""
Write-Host "All services are starting." -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend API docs: http://localhost:3000/api/docs"
Write-Host "Hardhat RPC: http://127.0.0.1:8545"
Write-Host ""
Write-Host "Demo data:"
Write-Host "Admin API key: $AdminApiKey"
Write-Host "Issuer API key: $IssuerApiKey"
Write-Host "Issuer wallet: 0x70997970c51812dc3a010c7d01b50e0d17dc79c8"
Write-Host "Holder wallet: 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"
Write-Host ""
Write-Host "Recommended demo flow:"
Write-Host "1. Admin page -> add issuer using Admin API key"
Write-Host "2. University page -> enter Issuer API key -> issue credential"
Write-Host "3. Student page -> view credential / generate proof"
Write-Host "4. Verify page -> verify credential or proof"
Write-Host "5. University page -> revoke credential using Issuer API key"
Write-Host ""