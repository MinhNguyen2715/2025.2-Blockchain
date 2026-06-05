param(
  [switch]$NoInstall
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok($Message) {
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Missing($Message) {
  Write-Host "[MISSING] $Message" -ForegroundColor Red
}

function Write-Manual($Message) {
  Write-Host "[MANUAL] $Message" -ForegroundColor Yellow
}

function Test-Command($Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Refresh-Path {
  try {
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath;$env:Path"
  } catch {
    Write-Warning "Could not refresh PATH automatically."
  }
}

function Add-PostgresToPathIfFound {
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

    Write-Ok "PostgreSQL CLI found: $pgBin"
    return $true
  }

  return $false
}

function Install-WithWinget($PackageId, $DisplayName) {
  if ($NoInstall) {
    Write-Manual "Auto-install is disabled. Please install $DisplayName manually."
    return $false
  }

  if (-not (Test-Command "winget")) {
    Write-Manual "winget was not found. Please install $DisplayName manually."
    return $false
  }

  Write-Host "Trying to install $DisplayName using winget..." -ForegroundColor Yellow

  try {
    winget install `
      --id $PackageId `
      --exact `
      --accept-package-agreements `
      --accept-source-agreements

    Refresh-Path
    Add-PostgresToPathIfFound | Out-Null

    return $true
  } catch {
    Write-Warning "Could not install $DisplayName automatically."
    Write-Warning $_.Exception.Message
    return $false
  }
}

function Ensure-Command($Command, $PackageId, $DisplayName, $ManualHint) {
  if (Test-Command $Command) {
    try {
      $version = & $Command --version 2>$null
      Write-Ok "$Command found: $version"
    } catch {
      Write-Ok "$Command found."
    }

    return $true
  }

  Write-Missing "$Command not found."

  Install-WithWinget $PackageId $DisplayName | Out-Null

  Refresh-Path
  Add-PostgresToPathIfFound | Out-Null

  if (Test-Command $Command) {
    Write-Ok "$Command is now available."
    return $true
  }

  Write-Manual $ManualHint
  return $false
}

Write-Step "Checking prerequisites"

$allOk = $true

$allOk = (Ensure-Command `
  "git" `
  "Git.Git" `
  "Git" `
  "Install Git for Windows from https://git-scm.com/download/win, then reopen PowerShell.") -and $allOk

$allOk = (Ensure-Command `
  "node" `
  "OpenJS.NodeJS.LTS" `
  "Node.js LTS" `
  "Install Node.js LTS from https://nodejs.org, then reopen PowerShell.") -and $allOk

$allOk = (Ensure-Command `
  "npm" `
  "OpenJS.NodeJS.LTS" `
  "npm" `
  "npm is installed together with Node.js. Reinstall Node.js LTS if npm is missing.") -and $allOk

Write-Step "Checking PostgreSQL CLI"

Add-PostgresToPathIfFound | Out-Null

$postgresOk = $true

$postgresOk = (Ensure-Command `
  "psql" `
  "PostgreSQL.PostgreSQL" `
  "PostgreSQL" `
  "Install PostgreSQL from https://www.postgresql.org/download/windows/. Make sure the PostgreSQL bin folder is added to PATH.") -and $postgresOk

$postgresOk = (Ensure-Command `
  "createdb" `
  "PostgreSQL.PostgreSQL" `
  "PostgreSQL" `
  "Install PostgreSQL from https://www.postgresql.org/download/windows/. Make sure the PostgreSQL bin folder is added to PATH.") -and $postgresOk

$allOk = $postgresOk -and $allOk

Write-Step "Checking PostgreSQL service"

try {
  $services = @(
    Get-CimInstance Win32_Service -Filter "Name LIKE '%postgres%' OR DisplayName LIKE '%PostgreSQL%'" |
      Select-Object Name, DisplayName, State
  )

  if ($services.Count -gt 0) {
    Write-Ok "PostgreSQL service detected."
    $services | Format-Table -AutoSize
  } else {
    Write-Manual "No PostgreSQL Windows service detected. If PostgreSQL was just installed, open pgAdmin or start PostgreSQL manually."
  }
} catch {
  Write-Warning "Could not check PostgreSQL service."
}

Write-Step "Prerequisite result"

if ($allOk) {
  Write-Ok "All required commands are available."
} else {
  Write-Host ""
  Write-Host "Some prerequisites are still missing." -ForegroundColor Red
  Write-Host "Automatic installation may be blocked by permissions, Windows policy, or missing winget." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Please install missing tools manually:" -ForegroundColor Yellow
  Write-Host "- Git for Windows: https://git-scm.com/download/win"
  Write-Host "- Node.js LTS: https://nodejs.org"
  Write-Host "- PostgreSQL: https://www.postgresql.org/download/windows/"
  Write-Host ""
  Write-Host "After installation, reopen PowerShell and run:" -ForegroundColor Yellow
  Write-Host ".\run-local.ps1"
  throw "Missing prerequisites."
}

