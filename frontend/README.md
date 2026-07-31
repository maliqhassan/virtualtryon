# VirtualTryOn — frontend

Expo (SDK 54) + React Native + TypeScript client. See
[docs/architecture/frontend.md](../docs/architecture/frontend.md) for the
folder structure and state-management conventions, and
[docs/setup/local-development.md](../docs/setup/local-development.md) for
full setup instructions across all services.

## Quick start

```sh
cp .env.example .env
npm install
npm start
```

Then press `i` (iOS simulator), `a` (Android emulator), `w` (web), or scan
the QR code with Expo Go / a development build.

## Scripts

| Command                           | Does                                                   |
| --------------------------------- | ------------------------------------------------------ |
| `npm start`                       | Start the Metro/Expo dev server                        |
| `npm run android` / `ios` / `web` | Start and open on a specific platform                  |
| `npm run lint`                    | ESLint (`eslint-config-expo` + Prettier compatibility) |
| `npm run typecheck`               | `tsc --noEmit`                                         |
| `npm run format`                  | Prettier, writes changes                               |
| `npm run format:check`            | Prettier, check only (CI)                              |

## Notes for AI coding agents

See [AGENTS.md](./AGENTS.md) — Expo's API surface has changed significantly
across recent SDKs; check versioned docs rather than relying on training data.
