"""Persists a completed try-on's final image (requirement 10). Built on
the generic storage interface planned in docs/roadmap Milestone 2 (not
yet built — see
docs/decisions/0004-ai-orchestration-vs-execution-boundary.md), so this
module doesn't hardcode local-disk-vs-S3-vs-whatever; it depends on that
interface existing, it doesn't implement it.
"""
