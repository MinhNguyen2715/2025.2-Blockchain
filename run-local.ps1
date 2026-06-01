param(
  [string]$PostgresServiceName = "",
  [string]$PostgresPassword = "postgres",
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

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Step "Project root: $Root"

Write-Step "Checking PostgreSQL service"

if ([string]::IsNullOrWhiteSpace($PostgresServiceName)) {
  try {
    $pgServices = Get-CimInstance Win32_Service -Filter "Name LIKE '%postgres%' OR DisplayName LIKE '%PostgreSQL%'" |
      Select-Object Name, DisplayName, State

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
    } else {
      Write-Host "PostgreSQL service is already running."
    }
  } catch {
    Write-Warning "Could not start/check PostgreSQL service: $PostgresServiceName"
    Write-Warning $_.Exception.Message
    Write-Warning "You can start PostgreSQL manually, then run this script again."
  }
}

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

Write-Step "Starting Hardhat node in a new terminal"
Start-NewTerminal "Hardhat node" "cd '$Root'; npm run node"

Write-Host ""
Write-Host "Waiting 6 seconds for Hardhat node..." -ForegroundColor Yellow
Start-Sleep -Seconds 6

Write-Step "Deploying contracts, authorizing demo issuer, updating env files"
$env:POSTGRES_PASSWORD = $PostgresPassword
npm run setup:local

Write-Step "Starting backend in a new terminal"
Start-NewTerminal "NestJS backend" "cd '$Root\backend'; npm run start:dev"

Write-Host ""
Write-Host "Waiting 6 seconds for backend..." -ForegroundColor Yellow
Start-Sleep -Seconds 6

Write-Step "Starting frontend in a new terminal"
Start-NewTerminal "Vite frontend" "cd '$Root\frontend'; npm run dev"

if ($OpenPgAdmin) {
  Write-Step "Opening pgAdmin if installed"

  $possiblePgAdminPaths = @(
    "$env:ProgramFiles\PostgreSQL\17\pgAdmin 4\bin\pgAdmin4.exe",
    "$env:ProgramFiles\PostgreSQL\16\pgAdmin 4\bin\pgAdmin4.exe",
    "$env:ProgramFiles\PostgreSQL\15\pgAdmin 4\bin\pgAdmin4.exe",
    "$env:ProgramFiles\PostgreSQL\14\pgAdmin 4\bin\pgAdmin4.exe"
  )

  $pgAdminPath = $possiblePgAdminPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

  if ($pgAdminPath) {
    Start-Process $pgAdminPath
  } else {
    Write-Warning "pgAdmin executable not found in common paths."
  }
}

Write-Host ""
Write-Host "All services are starting." -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend API docs: http://localhost:3000/api/docs"
Write-Host "Hardhat RPC: http://127.0.0.1:8545"
Write-Host ""
Write-Host "Demo data:"
Write-Host "Admin API key: 123456"
Write-Host "Issuer wallet: 0x70997970c51812dc3a010c7d01b50e0d17dc79c8"
Write-Host "Holder wallet: 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"
Write-Host ""
Write-Host "Because the script already authorized the issuer, you can go directly to:"
Write-Host "University -> Issue credential"
Write-Host ""