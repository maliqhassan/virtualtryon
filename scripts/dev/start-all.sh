#!/usr/bin/env bash
# Brings up postgres/redis/backend via Docker Compose, then starts the Expo
# dev server in the foreground.
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "==> Starting postgres, redis, backend (detached)"
(cd "$root_dir" && docker compose up -d postgres redis backend)

echo "==> Starting Expo dev server"
(cd "$root_dir/frontend" && npm start)
