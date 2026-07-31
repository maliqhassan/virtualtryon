"""Model loading/wrapping code (Diffusers pipelines, PyTorch checkpoints,
future NVIDIA NIM clients).

virtual_tryon_engine.py defines the pluggable VirtualTryOnEngine
interface; engines/ holds one stub implementation per candidate model
(IDM-VTON, CatVTON); engine_registry.py maps a config-driven name to a
concrete engine. See docs/decisions/0006-pluggable-virtual-tryon-engine.md
and docs/architecture/ai-tryon-engine.md for the full design. No model is
loaded and no inference runs anywhere in this package yet.
"""
