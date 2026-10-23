import io
from uuid import UUID

import pytest
from httpx import AsyncClient
from PIL import Image

import app.db.session as db_session
from app.services.inference_jobs import mark_completed
from app.services.storage import get_storage_service


def _png_bytes(color: tuple[int, int, int]) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=color).save(buf, format="PNG")
    return buf.getvalue()


@pytest.mark.usefixtures("real_allowances")
async def test_delete_my_data_removes_everything_but_keeps_usage(
    client: AsyncClient,
) -> None:
    garment = await client.post(
        "/api/v1/garments",
        files={"image": ("g.png", _png_bytes((9, 9, 9)), "image/png")},
        data={"title": "Coat", "category": "Jackets"},
    )
    device_id = garment.headers["x-device-id"]
    headers = {"X-Device-Id": device_id}
    photo = await client.post(
        "/api/v1/user-photos",
        files={"image": ("me.png", _png_bytes((8, 8, 8)), "image/png")},
        headers=headers,
    )
    await client.post("/api/v1/profile", json={"height_cm": 170, "weight_kg": 60}, headers=headers)
    job = await client.post(
        "/api/v1/inference-jobs",
        json={"garment_id": garment.json()["id"]},
        headers=headers,
    )
    result_url = get_storage_service().save(_png_bytes((7, 7, 7)), "png")
    async with db_session.AsyncSessionLocal() as db:
        await mark_completed(db, UUID(job.json()["id"]), generated_image_url=result_url)
    await client.post(
        "/api/v1/saved-looks/from-job",
        json={"job_id": job.json()["id"]},
        headers=headers,
    )

    response = await client.delete("/api/v1/account/data", headers=headers)

    assert response.status_code == 204
    assert (await client.get("/api/v1/garments", headers=headers)).json() == []
    assert (await client.get("/api/v1/saved-looks", headers=headers)).json() == []
    assert (await client.get("/api/v1/user-photos/current", headers=headers)).json() is None
    assert (await client.get("/api/v1/profile", headers=headers)).json() is None
    storage = get_storage_service()
    for path in (garment.json()["image_url"], photo.json()["storage_key"], result_url):
        with pytest.raises(FileNotFoundError):
            storage.read(path)
    # The used free try-on still counts, so deleting data can't reset it.
    usage = (await client.get("/api/v1/usage", headers=headers)).json()
    assert usage["remaining"] == 0
