"""The pluggable model-swapping boundary for virtual try-on generation.

`VirtualTryOnEngine` is the ONE interface every concrete generation model
(IDM-VTON, CatVTON, and whatever comes after them) implements. Every other
part of the system — engine_registry.py, and eventually whatever calls
into this module — depends on this abstraction only, never on a concrete
engine class directly (Dependency Inversion). That's what makes swapping
models a matter of adding a new class and one registry entry, not touching
any caller.

Deliberately minimal (Interface Segregation, KISS): one method. Real
engines will almost certainly need pose/human-parsing data internally —
that's each concrete engine's own constructor-injected concern, not part
of this public contract. Keeping those out of the interface means an
engine that computes them differently, or not at all (a future end-to-end
model), is still a valid implementer. Lifecycle methods (warmup/unload for
GPU memory management) are a plausible future addition but not added here
speculatively — nothing in this pass needs them yet.

Synchronous by design, not async: GPU inference is a blocking call
regardless of what invokes it (see docs/decisions/0005-async-job-processing-via-redis.md's
"GPU-bound work inside a worker task is not itself async" point) — the
async orchestration in backend/ai/ is a different, higher layer than this
one.

No inference happens here — this is an abstract base class. See
engines/ for the (also not-yet-implemented) concrete stubs, and
docs/decisions/0006-pluggable-virtual-tryon-engine.md for the full
reasoning.
"""

from abc import ABC, abstractmethod

from PIL import Image

from .dto import VirtualTryOnResult


class VirtualTryOnEngine(ABC):
    """Generates a realistic image of the person in `user_image` wearing
    the garment in `clothing_image`. Not a 3D avatar, not a digital human
    — a single 2D image in, a single 2D image out.
    """

    @abstractmethod
    def generate(self, user_image: Image.Image, clothing_image: Image.Image) -> VirtualTryOnResult:
        """Run generation. Concrete implementations do the actual model
        inference; this method has no body here by design."""
        raise NotImplementedError
