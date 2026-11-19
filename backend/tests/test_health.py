from httpx import AsyncClient

from app.main import api_docs_urls


async def test_health_check(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_api_docs_exist_only_while_developing() -> None:
    off = {"openapi_url": None, "docs_url": None, "redoc_url": None}
    assert api_docs_urls(False, "development", "/api/v1") == off
    # DEBUG left on by mistake in production still hides them.
    assert api_docs_urls(True, "production", "/api/v1") == off
    assert api_docs_urls(True, "development", "/api/v1")["docs_url"] == "/api/v1/docs"


def test_request_urls_are_not_logged() -> None:
    """Provider result links are signed URLs to body-photo images."""
    import logging

    from app.core.logging import configure_logging

    configure_logging(debug=False)
    assert logging.getLogger("httpx").getEffectiveLevel() >= logging.WARNING
