"""Maps a config-driven engine name to a concrete VirtualTryOnEngine.

This is the ONE place that changes to add a new engine or switch which
one is active — every caller depends on VirtualTryOnEngineRegistry.create()
returning a VirtualTryOnEngine, never on a concrete class name. That's the
whole mechanism behind "future models can be swapped without changing the
application": adding a third candidate means writing engines/<name>.py and
adding one line to _ENGINES below — nothing that already calls
VirtualTryOnEngine.generate() needs to change, because it was never
written against IDMVTONEngine or CatVTONEngine specifically.

The active engine is selected by name (e.g. from
ai.src.core.config.Settings.TRYON_ENGINE, a plain config string) rather
than by any code branching on which model is "the" model — swapping which
one runs in production is a config change, not a deploy of different code.

Each engine now also takes an injected `AIInferenceClient` (see
inference_client.py) — `create()` defaults to `LocalStubInferenceClient`
so every registered engine is real and callable today, backed by a
deterministic placeholder, rather than raising `NotImplementedError`
until a real client exists.
"""

from collections.abc import Callable

from .engines.catvton_engine import CatVTONEngine
from .engines.idm_vton_engine import IDMVTONEngine
from .inference_client import AIInferenceClient
from .inference_clients.local_stub import LocalStubInferenceClient
from .virtual_tryon_engine import VirtualTryOnEngine

# Typed as a constructor callable, not `type[VirtualTryOnEngine]`: the base
# class deliberately doesn't declare an `__init__` shape (a future engine
# might not need an AIInferenceClient at all — see virtual_tryon_engine.py's
# docstring), so this annotation says "every engine registered *here*
# happens to take one today," not "every VirtualTryOnEngine must."
_ENGINES: dict[str, Callable[[AIInferenceClient], VirtualTryOnEngine]] = {
    "idm-vton": IDMVTONEngine,
    "catvton": CatVTONEngine,
}


class UnknownEngineError(ValueError):
    """Raised when a configured engine name has no registered implementation."""


class VirtualTryOnEngineRegistry:
    @staticmethod
    def create(
        engine_name: str, inference_client: AIInferenceClient | None = None
    ) -> VirtualTryOnEngine:
        """`inference_client` defaults to `LocalStubInferenceClient` when
        omitted — swap in a real one (e.g. a future `CatVTONInferenceClient`)
        once one exists, without changing any caller's code shape.
        """
        engine_cls = _ENGINES.get(engine_name)
        if engine_cls is None:
            raise UnknownEngineError(
                f"No registered VirtualTryOnEngine named {engine_name!r}. "
                f"Known engines: {sorted(_ENGINES)}"
            )
        return engine_cls(inference_client or LocalStubInferenceClient())

    @staticmethod
    def known_engines() -> list[str]:
        return sorted(_ENGINES)
