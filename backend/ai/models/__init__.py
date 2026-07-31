"""Pydantic data contracts for the AI workflow's internal stage-to-stage
data — distinct from `app/schemas/`, which describes the public HTTP API
a client sends/receives. One module per workflow stage; see
docs/architecture/ai-backend.md for how these compose into the full
pipeline.
"""
