param(
  [string]$PostgresServiceName = "",
  [string]$PostgresPassword = "123456",
  [string]$AdminApiKey = "123456",
  [string]$IssuerApiKey = "demo-issuer-key",
  [switch]$OpenPgAdmin,
  [switch]$NoAutoInstallPrerequisites
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Require-Command($Name, $Message) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name was not found. $Message"
  }
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

function Add-PostgresToPath {
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
    if (-not ($env:Path -like "*$pgBin*")) {
      $env:Path = "$pgBin;$env:Path"
    }

    Write-Host "PostgreSQL CLI found: $pgBin"
  } else {
    Write-Warning "PostgreSQL CLI was not found. Make sure psql and createdb are in PATH."
  }
}

function Start-PostgresIfPossible($ServiceName) {
  if ([string]::IsNullOrWhiteSpace($ServiceName)) {
    try {
      $services = @(
        Get-CimInstance Win32_Service -Filter "Name LIKE '%postgres%' OR DisplayName LIKE '%PostgreSQL%'" |
          Select-Object Name, DisplayName, State
      )

      if ($services.Count -gt 0) {
        $ServiceName = $services[0].Name
        Write-Host "Detected PostgreSQL service: $ServiceName"
      }
    } catch {
      Write-Warning "Could not detect PostgreSQL service."
    }
  }

  if (-not [string]::IsNullOrWhiteSpace($ServiceName)) {
    try {
      $service = Get-Service -Name $ServiceName -ErrorAction Stop

      if ($service.Status -ne "Running") {
        Start-Service -Name $ServiceName
        Start-Sleep -Seconds 3
        Write-Host "PostgreSQL service started."
      } else {
        Write-Host "PostgreSQL service is already running."
      }
    } catch {
      Write-Warning "Could not start/check PostgreSQL service: $ServiceName"
      Write-Warning $_.Exception.Message
      Write-Warning "Start PostgreSQL manually if database creation fails."
    }
  }
}

function Ensure-Database($Password) {
  $env:PGPASSWORD = $Password

  try {
    $dbExists = & psql -U postgres -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname='diploma';" 2>$null

    if ($dbExists.Trim() -eq "1") {
      Write-Host "Database 'diploma' already exists."
    } else {
      & createdb -U postgres -h localhost diploma
      Write-Host "Database 'diploma' created."
    }
  } catch {
    Write-Warning "Could not create/check database automatically."
    Write-Warning "Manual fix:"
    Write-Warning "1. Open pgAdmin or psql."
    Write-Warning "2. Create database manually: CREATE DATABASE diploma;"
    Write-Warning "3. Run this script again."
  }
}

function Open-PgAdminIfRequested {
  if (-not $OpenPgAdmin) {
    return
  }

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
    Write-Warning "pgAdmin executable not found."
  }
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if ((Split-Path -Leaf $ScriptDir) -eq "scripts") {
  $Root = Split-Path -Parent $ScriptDir
} else {
  $Root = $ScriptDir
}

Set-Location $Root

Write-Step "Project root: $Root"

if (-not (Test-Path "$Root\package.json")) {
  throw "package.json not found. Place this script in the project root or scripts folder."
}

if (-not (Test-Path "$Root\backend")) {
  throw "backend folder not found."
}

if (-not (Test-Path "$Root\frontend")) {
  throw "frontend folder not found."
}

Write-Step "Checking and installing prerequisites if needed"

$PrerequisiteScript = "$Root\install-prerequisites.ps1"

if (Test-Path $PrerequisiteScript) {
  $preArgs = @()

  if ($NoAutoInstallPrerequisites) {
    $preArgs += "-NoInstall"
  }

  . $PrerequisiteScript @preArgs
} else {
  Write-Warning "install-prerequisites.ps1 not found. Skipping automatic prerequisite check."
}

Write-Step "Checking required commands"

Require-Command "git" "Install Git for Windows, reopen PowerShell, then run this script again."
Require-Command "node" "Install Node.js LTS, reopen PowerShell, then run this script again."
Require-Command "npm" "Install Node.js LTS, reopen PowerShell, then run this script again."

$env:POSTGRES_PASSWORD = $PostgresPassword
$env:DB_PASSWORD = $PostgresPassword
$env:ADMIN_API_KEY = $AdminApiKey
$env:ISSUER_API_KEY = $IssuerApiKey

Write-Step "Checking PostgreSQL"

Add-PostgresToPath

Require-Command "psql" "Install PostgreSQL or add the PostgreSQL bin folder to PATH."
Require-Command "createdb" "Install PostgreSQL or add the PostgreSQL bin folder to PATH."

Start-PostgresIfPossible $PostgresServiceName
Ensure-Database $PostgresPassword

Write-Step "Installing project dependencies"

npm install

Push-Location backend
npm install
Pop-Location

Push-Location frontend
npm install
Pop-Location

Write-Step "Starting Hardhat node"

Start-NewTerminal "Hardhat node" "cd '$Root'; npm run node"

Write-Host "Waiting for Hardhat RPC..." -ForegroundColor Yellow

if (-not (Wait-HardhatRpc "http://127.0.0.1:8545" 40)) {
  throw "Hardhat node did not become ready on http://127.0.0.1:8545"
}

Write-Host "Hardhat node is ready." -ForegroundColor Green

Write-Step "Deploying contracts, authorizing demo issuer, and writing env files"

npm run setup:local

Write-Step "Starting backend"

Start-NewTerminal "NestJS backend" "cd '$Root\backend'; npm run start:dev"

Write-Host "Waiting for backend API docs..." -ForegroundColor Yellow

if (Wait-HttpGet "http://localhost:3000/api/docs" 40) {
  Write-Host "Backend is ready." -ForegroundColor Green
} else {
  Write-Warning "Backend did not respond on /api/docs. Check the backend terminal."
}

Write-Step "Starting frontend"

Start-NewTerminal "Vite frontend" "cd '$Root\frontend'; npm run dev"

Open-PgAdminIfRequested

Write-Host ""
Write-Host "All services are starting." -ForegroundColor Green
Write-Host ""
Write-Host "Frontend:         http://localhost:5173"
Write-Host "Backend API docs: http://localhost:3000/api/docs"
Write-Host "Hardhat RPC:      http://127.0.0.1:8545"
Write-Host ""
Write-Host "Demo keys:"
Write-Host "Admin API key:  $AdminApiKey"
Write-Host "Issuer API key: $IssuerApiKey"
Write-Host ""
Write-Host "Demo wallets:"
Write-Host "Admin / Owner:       0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
Write-Host "University / Issuer: 0x70997970c51812dc3a010c7d01b50e0d17dc79c8"
Write-Host "Student / Holder:    0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"
Write-Host ""
Write-Host "Recommended demo flow:"
Write-Host "1. Admin page      -> authorize issuer"
Write-Host "2. University page -> issue credential"
Write-Host "3. Student page    -> generate proof"
Write-Host "4. Verify page     -> verify proof"
Write-Host "5. University page -> revoke credential"
Write-Host "6. Verify page     -> verify again after revocation"
Write-Host ""
Write-Host "If automatic prerequisite installation was blocked, install missing tools manually and run this script again."
Write-Host ""
