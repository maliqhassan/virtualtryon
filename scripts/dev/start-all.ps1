# Brings up postgres/redis/backend via Docker Compose, then starts the Expo
# dev server in the foreground.
$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "==> Starting postgres, redis, backend (detached)"
Push-Location $rootDir
docker compose up -d postgres redis backend
Pop-Location

Write-Host "==> Starting Expo dev server"
Push-Location (Join-Path $rootDir "frontend")
npm start
Pop-Location
