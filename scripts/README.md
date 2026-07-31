# scripts/

Cross-service dev/ops scripts. Provided as both `.sh` (macOS/Linux/Git Bash)
and `.ps1` (Windows PowerShell) so no one platform is second-class.

- `setup/bootstrap` — one-time environment setup: installs frontend deps,
  creates `.env` files from the `.env.example` templates, checks for
  Python/Docker and prints next steps.
- `dev/start-all` — brings up Postgres/Redis/backend via Docker Compose and
  starts the Expo dev server.
- `db/` — reserved for future migration/seed helper scripts.

Run the one matching your shell, e.g. `./scripts/setup/bootstrap.sh` or
`.\scripts\setup\bootstrap.ps1`.
