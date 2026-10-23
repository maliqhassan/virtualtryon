import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

import app.db.session as db_session
from app.core.config import get_settings
from app.main import app
from app.models.user import Plan
from app.services import plans
from app.services.photo_background import NoBackgroundRemoval, get_background_remover
from app.services.plans import AllowancePeriod, PlanAllowance

REAL_FREE_ALLOWANCE = plans.PLAN_ALLOWANCES[Plan.FREE]


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _use_nullpool_engine_for_tests():
    """app/db/session.py's default engine pools connections across
    requests, which is right for the running app but causes a real,
    reproducible asyncpg error ("another operation is in progress") across
    sequential test functions here — Saved Looks is the first test suite in
    this repo to touch the database at all, so this was never hit before.
    NullPool gives every session its own fresh connection, avoiding it.
    """
    settings = get_settings()
    test_engine = create_async_engine(str(settings.DATABASE_URL), poolclass=NullPool, future=True)
    db_session.engine = test_engine
    db_session.AsyncSessionLocal = async_sessionmaker(
        bind=test_engine, expire_on_commit=False, autoflush=False
    )
    yield
    await test_engine.dispose()


@pytest.fixture
async def client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
def _test_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    """Defaults that keep feature tests independent of each other:

    - TRYON_PROVIDER="catvton": the worker's jobs fail predictably (the
      demo provider has its own test that switches it back on).
    - Full-body check off: tests upload tiny solid-colour images, not
      photos of people (test_user_photos.py covers the check itself).
    - A large free allowance: many tests create several jobs for one user
      (test_usage.py restores the real limit with `real_allowances`).
    """
    settings = get_settings()
    monkeypatch.setattr(settings, "TRYON_PROVIDER", "catvton")
    # No MediaPipe model downloads in tests; test_user_photos covers cut-outs.
    app.dependency_overrides[get_background_remover] = NoBackgroundRemoval
    monkeypatch.setattr(settings, "FULL_BODY_CHECK_ENABLED", False)
    monkeypatch.setitem(
        plans.PLAN_ALLOWANCES,
        Plan.FREE,
        PlanAllowance(limit=1000, period=AllowancePeriod.LIFETIME),
    )


@pytest.fixture
def real_allowances(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(plans.PLAN_ALLOWANCES, Plan.FREE, REAL_FREE_ALLOWANCE)
