"""AI workflow orchestration for VirtualTryOn.

This package coordinates the try-on generation workflow — it does not run
any model itself. Every GPU-bound step (pose detection, human parsing,
try-on synthesis, identity preservation, enhancement) is dispatched to the
separate `ai/` service (project root) over HTTP; this package owns the job
lifecycle, the data contracts between stages, and the Redis-backed queue
that makes generation asynchronous.

See docs/decisions/0004-ai-orchestration-vs-execution-boundary.md for why
this boundary exists, and docs/architecture/ai-backend.md for the full
workflow design.

Nothing in this package is implemented yet — see each submodule's
docstring for what it will do. Deliberately scoped this way: this pass is
architecture, not inference (docs/roadmap Phase B, "Real AI Pipeline
Integration" milestone, is where real logic lands).
"""
