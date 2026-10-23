"""CLI: create the sample store catalogue. `python -m app.seed_catalog`
(in Docker: `docker compose exec backend python -m app.seed_catalog`)."""

import asyncio
import logging

from app.db.session import AsyncSessionLocal
from app.services.catalog_seed import seed_sample_catalog
from app.services.storage import get_storage_service


async def _main() -> None:
    async with AsyncSessionLocal() as db:
        created = await seed_sample_catalog(db, get_storage_service())
    print(
        f"Sample catalogue: {created} products created" if created else "Catalogue already exists"
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_main())
