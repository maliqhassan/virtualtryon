"""Counts attempts per key over a sliding time window, in this process's
memory. Used where every attempt costs us work (fetching a store page),
whether or not it succeeds, so a database count of successful results isn't
enough. Recording happens in the same step as the check, before any await,
so parallel requests can't all slip under the limit.

In-memory on purpose (KISS): the backend runs as one process (render.yaml),
and Redis isn't in use yet. Counts reset on a restart or deploy, which is
acceptable for an abuse limit. Move to Redis if the API ever runs as several
processes.
"""

import time
from collections import deque
from collections.abc import Callable

_PRUNE_ABOVE_KEYS = 10_000


class SlidingWindowLimiter:
    def __init__(
        self, limit: int, window_seconds: float, clock: Callable[[], float] = time.monotonic
    ) -> None:
        self.limit = limit
        self._window = window_seconds
        self._clock = clock
        self._hits: dict[str, deque[float]] = {}

    def _drop_expired(self, hits: deque[float], now: float) -> None:
        while hits and hits[0] <= now - self._window:
            hits.popleft()

    def try_acquire(self, key: str) -> bool:
        """Records an attempt and returns True, or returns False when `key`
        already used up its limit in the current window."""
        now = self._clock()
        if len(self._hits) > _PRUNE_ABOVE_KEYS:
            for stale_key, stale_hits in list(self._hits.items()):
                self._drop_expired(stale_hits, now)
                if not stale_hits:
                    del self._hits[stale_key]
        hits = self._hits.setdefault(key, deque())
        self._drop_expired(hits, now)
        if len(hits) >= self.limit:
            return False
        hits.append(now)
        return True

    def reset(self) -> None:
        self._hits.clear()
