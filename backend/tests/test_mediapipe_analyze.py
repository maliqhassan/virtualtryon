from httpx import AsyncClient


async def test_analyze_rejects_unsupported_content_type(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/ai/mediapipe/analyze",
        files={"file": ("note.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 422


async def test_analyze_rejects_oversized_upload(client: AsyncClient) -> None:
    oversized = b"\x00" * (10 * 1024 * 1024 + 1)
    response = await client.post(
        "/api/v1/ai/mediapipe/analyze",
        files={"file": ("photo.jpg", oversized, "image/jpeg")},
    )
    assert response.status_code == 422


async def test_analyze_rejects_undecodable_image_bytes(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/ai/mediapipe/analyze",
        files={"file": ("photo.jpg", b"\xff\xd8\xff not a real jpeg", "image/jpeg")},
    )
    assert response.status_code == 400
