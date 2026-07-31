# 1. Record architecture decisions

Date: 2026-07-29
Status: Accepted

## Context

VirtualTryOn spans three runtimes (React Native app, FastAPI backend, Python
AI service) built by people who weren't necessarily in the room for early
decisions. Undocumented rationale gets re-litigated or silently violated.

## Decision

Use lightweight Architecture Decision Records (ADRs), one Markdown file per
decision, numbered sequentially, in `docs/decisions/`. Follow the format
popularized by Michael Nygard: Context, Decision, Consequences. Superseding a
decision means adding a new ADR that references the old one, not editing the
old one — the record should show how the architecture actually evolved.

## Consequences

- Every non-obvious structural choice gets a paper trail future contributors
  (human or AI) can read instead of re-deriving from source or asking around.
- Adds a small amount of process overhead for genuinely architectural
  decisions. Not intended for routine implementation choices.
