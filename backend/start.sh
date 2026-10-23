#!/bin/sh
# Production entrypoint for hosts that run one container per service (Render).
# docker-compose doesn't use this: it runs the API and the worker as two
# services with their own commands.
#
# 1. bring the database schema up to date
# 2. seed the sample store catalog (idempotent: skips what's already there)
# 3. run the try-on worker in the background, restarting it if it exits
#    (it has to live in this container: a Render disk attaches to one
#    service only, and the worker reads and writes the same upload files)
# 4. run the API in the foreground on the port the host gives us
set -e

uploads_dir="${STORAGE_UPLOADS_DIR:-./storage/uploads}"
mkdir -p "$uploads_dir"
if ! touch "$uploads_dir/.write-check" 2>/dev/null; then
  echo "Upload folder $uploads_dir is not writable by $(id -un); check the disk mount." >&2
  exit 1
fi
rm -f "$uploads_dir/.write-check"

alembic upgrade head
python -m app.seed_catalog

(
  while true; do
    python -m app.worker || echo "Worker exited with status $?; restarting in 5s" >&2
    sleep 5
  done
) &

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips="*"
