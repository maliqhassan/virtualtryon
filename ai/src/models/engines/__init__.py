"""Concrete VirtualTryOnEngine implementations, one per candidate model.

Every class here implements ..virtual_tryon_engine.VirtualTryOnEngine and
nothing else — no shared base beyond that interface, so none of them can
accidentally depend on another's internals. None are implemented yet
(every generate() raises NotImplementedError) — this phase is architecture,
not model integration.
"""
