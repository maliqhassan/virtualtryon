import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

import app.db.session as db_session
from app.core.config import get_settings
from app.main import app


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
