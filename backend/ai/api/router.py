"""Placeholder for backend/ai/'s own FastAPI router, if one proves
necessary (e.g. GET /jobs/{id} for status polling) beyond the public API
surface in app/api/v1/. NOT implemented in this phase — see
docs/architecture/ai-backend.md "Open questions" for whether job-status
endpoints belong here or in app/api/v1/ alongside the rest of the public
API.

Mirrors app/api/v1/router.py's style so it can be wired in the same way
once real routes exist:
    from ai.api.router import ai_router
    app.include_router(ai_router, prefix="/ai")
"""

from fastapi import APIRouter

ai_router = APIRouter()
