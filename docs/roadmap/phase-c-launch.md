# Phase C — Harden & ship

Every earlier milestone already included its own testing strategy — this phase is specifically the system-level work that only makes sense once the app is feature-complete: cross-feature end-to-end coverage, load and security testing, and everything required to put real user data (including sensitive body photos) in front of real users safely.

---

## Milestone 13 — Testing

### Objective
System-level hardening: end-to-end coverage across features (not just per-feature unit/integration tests), continuous test execution via CI, load testing, security review, and an accessibility audit against the rules the design system was built with from Phase 1 onward.

### Features
Not user-facing.

### Files to create
```
.github/workflows/frontend-ci.yml     — tsc + lint + unit tests on every PR
.github/workflows/backend-ci.yml      — ruff + mypy + pytest on every PR
.github/workflows/ai-ci.yml            — ruff + mypy + pytest on every PR
frontend/e2e/                          — Maestro flows (see Dependencies)
backend/tests/load/                     — locust or k6 scenarios
docs/security-review.md                 — OWASP-Top-10-style self-review checklist and findings
```

### Dependencies
```
frontend: Maestro (E2E) — YAML-based, no native-build config wrangling the way Detox needs; a better fit for
          an Expo-managed workflow app than Detox, which expects more direct native-project access
backend:  locust (or k6, a Go binary rather than a Python dependency — either is reasonable; locust is listed
          since it stays inside the existing Python toolchain)
```

### Backend requirements
- Expand `pytest` coverage across every endpoint built in Phases A and B — not just the happy path per endpoint, but auth-bypass attempts (can an endpoint be called without the right user context and succeed when it shouldn't), and rate-limit verification across *all* rate-limited endpoints, not only the ones tested when they were first built.
- Load testing against the endpoints most likely to be hit hard: image upload (Milestone 2/3), try-on job creation (Milestone 4/12), chat (Milestone 10, given LLM latency). **Meaningful load testing needs production-shaped infra, not a laptop's `docker compose up`** — flagged honestly rather than treating a local load test as equivalent to a real capacity check.
- A written security review pass (`docs/security-review.md`) — at minimum a self-directed OWASP Top 10 checklist against this specific app's surface (file upload validation, auth token handling, SQL injection surface on any raw query, the LLM tool-call scoping from Milestone 10). Given this app handles sensitive body photos and eventually payment-adjacent subscription data, an external security review before real user data is at stake is the stronger recommendation — the self-review here is the minimum bar, not the ideal one.

### Frontend requirements
- Maestro flows covering: the full Phase A core loop (capture → upload → generate → result), the Milestone 6 auth flow including guest-claim, and at least one full Phase B feature flow end-to-end (e.g. add a garment → see it in Closet → include it in a try-on).
- **Accessibility audit against the rules `design/react-native/01-design-tokens.md`/`02-component-inventory.md` were built with** — 48dp hit targets, 4.5:1 contrast, screen-reader labels on every icon-only control (`AppIconButton`'s required `accessibilityLabel` from Milestone 1 gets verified for real here, not just type-checked), 200% text-scaling survival without clipping. Use each platform's real audit tooling (Xcode's Accessibility Inspector, Android's Accessibility Scanner) plus a manual VoiceOver/TalkBack pass through the core loop — automated linting alone won't catch everything the design system's accessibility rules require.

### Testing strategy
This milestone *is* the testing strategy for the rest of the project — its own verification is: CI actually blocks a PR with a failing test (not just "tests exist"), and the E2E suite catches a deliberately-introduced regression in a dry run before being trusted for real.

### Risks
- **E2E tests are reliably flaky if not actively maintained** — budget ongoing stabilisation time after the initial suite is written, not just the initial writing effort.
- Load testing against non-production-shaped infrastructure risks false confidence — be explicit in `docs/security-review.md`'s companion load-test writeup about what was and wasn't actually validated.
- Accessibility issues found this late are more expensive to fix than they would have been if caught per-screen — this audit is a safety net for what individual milestones' testing may have missed, not a substitute for accessibility care during each milestone.

### Definition of Done
- [ ] CI running on every PR across `frontend`, `backend`, and `ai`, and demonstrably blocks merges on failure (verified with a deliberate failing PR, not assumed)
- [ ] E2E suite covers the Phase A core loop, Milestone 6 auth + guest-claim, and at least one Phase B flow
- [ ] Load test results documented, with any found bottleneck either fixed or explicitly deferred with a written reason
- [ ] Security review checklist completed and findings triaged (fixed, or explicitly accepted with reasoning)
- [ ] Accessibility audit completed on real devices with real assistive tech, findings addressed

---

## Milestone 14 — Deployment

### Objective
Ship the app safely: production hosting for `backend` and `ai`, managed database/cache, the object-storage swap deferred since Phase A, app-store submission, and monitoring.

### Features
Not user-facing.

### Files to create
```
.github/workflows/deploy-backend.yml
.github/workflows/deploy-ai.yml
backend/app/services/storage/s3.py            — implements the storage interface from Milestone 2 against
                                                  S3-compatible storage (provider — AWS S3 / Cloudflare R2 /
                                                  Backblaze B2 — is then a config choice, not a code choice,
                                                  because the interface was built narrow from the start)
eas.json                                        — Expo Application Services build/submit config
docs/decisions/0007-hosting-and-deployment.md
docs/runbooks/incident-response.md              — new: what to do when production breaks
```

### Dependencies
None new at the package level — this milestone is infrastructure/config, not application code.

### Backend requirements
- **Hosting**: a managed container platform (Fly.io, Railway, Render, AWS ECS/Fargate, or Cloud Run) deploying the existing `backend/Dockerfile` and `ai/Dockerfile` from Phase 0 — recommended over standing up Kubernetes from a cold start, which is more operational complexity than this project's current scale justifies. Revisit if/when actual load demands it, not preemptively.
- **`ai/`'s hosting is a separate decision from `backend/`'s** — different resource profile (GPU vs. CPU), and whichever infra choice Milestone 12's `docs/decisions/0006-gpu-infrastructure.md` landed on (self-hosted GPU, cloud GPU rental, or NIM-hosted inference) determines this, not a default assumption that both services deploy the same way.
- **Database**: managed Postgres (not self-hosted alongside the app), with automated backups configured and tested (a backup that's never been restored from isn't a verified backup).
- **Redis**: managed Redis, sized for both its cache role and Milestone 11's scheduled-job needs if that's still running in-process by this point.
- **Migrations**: run as an explicit deploy-pipeline step, not manually or automatically without review — a bad migration against real user data is a much higher-stakes mistake than the same mistake in dev.
- **Storage swap**: `storage/s3.py` implements the same interface `storage/local.py` did since Milestone 2 — this is the payoff of building that interface narrow back in Phase A. Anything already stored locally in staging needs an explicit migration plan, not just "new uploads go to S3 now."
- **Monitoring**: error tracking (Sentry covers both the Python backend and the RN frontend under one tool, worth the shared setup), structured logging, and the `/health` endpoint (already built in Phase 0) wired to the hosting platform's health checks.
- **Secrets**: every placeholder value from Phase 0's `.env.example` files (`SECRET_KEY=change-me`, etc.) must be replaced with real generated secrets in a real secrets manager (platform-native, or Doppler/AWS Secrets Manager) — never committed, never left at the scaffolding default.

### Frontend requirements
- EAS Build for production iOS/Android builds; EAS Update for OTA JavaScript updates on non-native changes (avoids a full store resubmission for every JS-only fix).
- Environment-specific `EXPO_PUBLIC_API_URL` (staging vs. production), extending the `.env.example` pattern already established in Phase 0.
- App Store Connect and Google Play Console submission. **Flag explicitly**: this app captures body photos and generates AI imagery of users' bodies — that's exactly the kind of permission usage (camera, photo library) and content category that draws closer app-review scrutiny. A clear, specific privacy policy and in-app disclosure of how photos are used/stored/deleted should be ready *before* submission, not assembled reactively after a rejection.

### Testing strategy
- Staging-environment smoke test of the full Phase A + Phase B core flows before every production promotion.
- Gradual/canary rollout if the chosen hosting platform supports it; if not, a tested rollback procedure is the minimum substitute.
- **Rollback tested at least once before it's needed for real** — a rollback plan that's never been executed is a hypothesis, not a plan.

### Risks
- **App-store review risk is real, not hypothetical**, given the sensitive-photo/AI-body-imagery surface — budget schedule slack for at least one review round-trip, and have the privacy policy ready ahead of submission rather than written under rejection pressure.
- **Migration safety** — recommend migrations are reviewed (not auto-applied blind) as part of the deploy pipeline, especially early in production life before there's confidence in the migration process itself.
- **GPU hosting cost** is where Milestone 12's infrastructure decision has real financial consequences for the first time — monitor actual spend against the estimate from that ADR once production traffic exists, don't just trust the pre-launch estimate indefinitely.
- Any placeholder secret shipped to production is a real security incident waiting to happen, not a formality — this is a concrete pre-launch checklist item, not a "should probably check" note.

### Definition of Done
- [ ] `backend` and `ai` deployed on managed infrastructure, both passing health checks
- [ ] Database is managed Postgres with backups configured *and a restore actually tested*
- [ ] Object storage is S3-compatible in production; any pre-existing local-disk data has a completed migration plan
- [ ] Migrations run via a reviewed deploy-pipeline step
- [ ] Monitoring/error-tracking live for both `backend` and the frontend
- [ ] All placeholder secrets replaced with real, non-committed values
- [ ] App submitted to TestFlight/Play internal testing at minimum, with a privacy policy in place, as the checkpoint before full public release
- [ ] Rollback procedure executed at least once in staging, not just documented
