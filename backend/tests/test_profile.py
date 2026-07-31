import asyncio

from httpx import AsyncClient


async def _create_profile(
    client: AsyncClient, height_cm: int = 175, weight_kg: float = 70.0, **extra: object
) -> tuple[dict, str]:
    """Simulates a brand-new client: sends no device id, returns the
    server-issued one from the response header alongside the created
    profile — mirrors test_garments.py's helper for the same reason (a
    client can never choose its own device id).
    """
    payload = {"height_cm": height_cm, "weight_kg": weight_kg, **extra}
    response = await client.post("/api/v1/profile", json=payload)
    assert response.status_code == 201
    device_id = response.headers["x-device-id"]
    return response.json(), device_id


async def test_get_profile_returns_null_when_none_exists(client: AsyncClient) -> None:
    response = await client.get("/api/v1/profile")  # a genuinely new guest
    assert response.status_code == 200
    assert response.json() is None


async def test_create_profile_success(client: AsyncClient) -> None:
    profile, _device_id = await _create_profile(
        client,
        height_cm=180,
        weight_kg=75.5,
        display_name="Ada",
        age=30,
        gender="female",
        body_type="athletic",
        preferred_fit="slim",
    )

    assert profile["display_name"] == "Ada"
    assert profile["age"] == 30
    assert profile["gender"] == "female"
    assert profile["height_cm"] == 180
    assert profile["weight_kg"] == 75.5
    assert profile["body_type"] == "athletic"
    assert profile["preferred_fit"] == "slim"


async def test_create_profile_allows_only_required_fields(client: AsyncClient) -> None:
    profile, _device_id = await _create_profile(client, height_cm=160, weight_kg=55.0)

    assert profile["height_cm"] == 160
    assert profile["weight_kg"] == 55.0
    assert profile["display_name"] is None
    assert profile["age"] is None


async def test_create_profile_requires_height_and_weight(client: AsyncClient) -> None:
    missing_height = await client.post("/api/v1/profile", json={"weight_kg": 70.0})
    assert missing_height.status_code == 422

    missing_weight = await client.post("/api/v1/profile", json={"height_cm": 175})
    assert missing_weight.status_code == 422


async def test_create_profile_validates_ranges(client: AsyncClient) -> None:
    too_short = await client.post("/api/v1/profile", json={"height_cm": 50, "weight_kg": 70})
    assert too_short.status_code == 422

    too_heavy = await client.post("/api/v1/profile", json={"height_cm": 175, "weight_kg": 500})
    assert too_heavy.status_code == 422

    too_old = await client.post(
        "/api/v1/profile", json={"height_cm": 175, "weight_kg": 70, "age": 200}
    )
    assert too_old.status_code == 422


async def test_get_profile_returns_existing(client: AsyncClient) -> None:
    created, device_id = await _create_profile(client, display_name="Ken")

    response = await client.get("/api/v1/profile", headers={"X-Device-Id": device_id})
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]
    assert response.json()["display_name"] == "Ken"


async def test_create_profile_conflict_when_one_already_exists(client: AsyncClient) -> None:
    _created, device_id = await _create_profile(client)

    second = await client.post(
        "/api/v1/profile",
        json={"height_cm": 190, "weight_kg": 90},
        headers={"X-Device-Id": device_id},
    )
    assert second.status_code == 409


async def test_concurrent_create_never_500s(client: AsyncClient) -> None:
    """Two near-simultaneous POSTs from the same *new* guest (no profile
    yet) race the check-then-insert existence check — exactly one must win
    (201), the other must get the same clean 409 a non-racing second
    request gets, never an unhandled 500 from the DB's unique constraint.
    """
    bootstrap = await client.get("/api/v1/profile")  # mints a device id, no profile yet
    headers = {"X-Device-Id": bootstrap.headers["x-device-id"]}

    responses = await asyncio.gather(
        client.post("/api/v1/profile", json={"height_cm": 175, "weight_kg": 70}, headers=headers),
        client.post("/api/v1/profile", json={"height_cm": 180, "weight_kg": 80}, headers=headers),
    )

    statuses = sorted(response.status_code for response in responses)
    assert statuses == [201, 409]


async def test_patch_updates_profile(client: AsyncClient) -> None:
    created, device_id = await _create_profile(client, display_name="Before")

    response = await client.patch(
        "/api/v1/profile",
        json={"display_name": "After", "age": 40},
        headers={"X-Device-Id": device_id},
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["display_name"] == "After"
    assert updated["age"] == 40
    assert updated["updated_at"] != created["updated_at"]


async def test_patch_without_existing_profile_returns_404(client: AsyncClient) -> None:
    response = await client.patch("/api/v1/profile", json={"display_name": "Nobody"})
    assert response.status_code == 404


async def test_profile_is_scoped_to_device_id(client: AsyncClient) -> None:
    created, owner_device = await _create_profile(client, display_name="Owner")

    other_device_view = await client.get(
        "/api/v1/profile", headers={"X-Device-Id": "attacker-device"}
    )
    assert other_device_view.status_code == 200
    assert other_device_view.json() is None

    attacker_patch = await client.patch(
        "/api/v1/profile",
        json={"display_name": "Hijacked"},
        headers={"X-Device-Id": "attacker-device"},
    )
    assert attacker_patch.status_code == 404

    owner_view = await client.get("/api/v1/profile", headers={"X-Device-Id": owner_device})
    assert owner_view.json()["display_name"] == "Owner"
    assert owner_view.json()["id"] == created["id"]
