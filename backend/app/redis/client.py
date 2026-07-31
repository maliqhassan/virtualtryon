from functools import lru_cache

from redis.asyncio import Redis

from app.core.config import get_settings


@lru_cache
def get_redis() -> Redis:
    """FastAPI dependency returning a shared, lazily-connected Redis client."""
    settings = get_settings()
    return Redis.from_url(str(settings.REDIS_URL), decode_responses=True)
