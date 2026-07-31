# One-time local environment setup. See docs/setup/local-development.md.
$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "==> Installing frontend dependencies"
Push-Location (Join-Path $rootDir "frontend")
npm install
Pop-Location

foreach ($service in @("frontend", "backend", "ai")) {
    $target = Join-Path $rootDir "$service\.env"
    $example = Join-Path $rootDir "$service\.env.example"
    if (-not (Test-Path $target) -and (Test-Path $example)) {
        Copy-Item $example $target
        Write-Host "==> Created $service\.env from .env.example"
    }
}

$rootTarget = Join-Path $rootDir ".env"
$rootExample = Join-Path $rootDir ".env.example"
if (-not (Test-Path $rootTarget)) {
    Copy-Item $rootExample $rootTarget
    Write-Host "==> Created root .env from .env.example"
}

$python = Get-Command python -ErrorAction SilentlyContinue
if ($python) {
    Write-Host "==> Python found: $(python --version)"
    Write-Host "    cd backend; python -m venv .venv; .venv\Scripts\Activate.ps1; pip install -r requirements-dev.txt"
    Write-Host "    cd ai; python -m venv .venv; .venv\Scripts\Activate.ps1; pip install -r requirements-dev.txt"
} else {
    Write-Host "==> Python not found - install Python 3.11+ before setting up backend/ai"
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
    Write-Host "==> Docker found: $(docker --version)"
    Write-Host "    docker compose up postgres redis backend"
} else {
    Write-Host "==> Docker not found - install Docker Desktop to run postgres/redis/backend/ai via compose"
}

Write-Host "==> Bootstrap complete. See docs/setup/local-development.md for next steps."
