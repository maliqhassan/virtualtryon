#!/usr/bin/env bash
# One-time local environment setup. See docs/setup/local-development.md.
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "==> Installing frontend dependencies"
(cd "$root_dir/frontend" && npm install)

for service in frontend backend ai; do
  target="$root_dir/$service/.env"
  example="$root_dir/$service/.env.example"
  if [ ! -f "$target" ] && [ -f "$example" ]; then
    cp "$example" "$target"
    echo "==> Created $service/.env from .env.example"
  fi
done

if [ ! -f "$root_dir/.env" ]; then
  cp "$root_dir/.env.example" "$root_dir/.env"
  echo "==> Created root .env from .env.example"
fi

if command -v python3 >/dev/null 2>&1; then
  echo "==> Python found: $(python3 --version)"
  echo "    cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements-dev.txt"
  echo "    cd ai && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements-dev.txt"
else
  echo "==> Python not found - install Python 3.11+ before setting up backend/ai"
fi

if command -v docker >/dev/null 2>&1; then
  echo "==> Docker found: $(docker --version)"
  echo "    docker compose up postgres redis backend"
else
  echo "==> Docker not found - install Docker Desktop to run postgres/redis/backend/ai via compose"
fi

echo "==> Bootstrap complete. See docs/setup/local-development.md for next steps."
