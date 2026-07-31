# AI Service Architecture

Python service, separate from the backend, for everything PyTorch/Diffusers/
OpenCV/MediaPipe-related.

## Folder structure

```
ai/src/
├── preprocessing/   # pose estimation, segmentation, image normalization
├── models/           # model loading/wrapping (Diffusers pipelines, checkpoints)
├── pipelines/          # preprocessing → model → postprocessing, composed
├── postprocessing/       # blending, color correction, upscaling
├── inference/              # service entrypoint (HTTP/gRPC/queue worker — TBD)
└── core/                    # config
```

`pipelines/` composes the other layers rather than each pipeline
reimplementing its own preprocessing — a segmentation routine used by the
try-on pipeline should also be reusable by, say, a future virtual-fit-check
feature without copy-paste.

`models/` now holds the pluggable `VirtualTryOnEngine` interface (IDM-VTON
and CatVTON as stub candidates behind it) — see
`docs/architecture/ai-tryon-engine.md` and
`docs/decisions/0006-pluggable-virtual-tryon-engine.md`. No model is
loaded or run yet; only the swap mechanism is designed.

## Model weights

Not committed to git (`ai/models/` is gitignored past the `.gitkeep`).
Fetched at build/runtime from Hugging Face Hub (`HF_TOKEN` in `.env`) or
mounted from the `ai_models` Docker volume. `MODEL_CACHE_DIR` in
`src/core/config.py` controls where they land.

## GPU / CUDA

`ai/Dockerfile` bases on `pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime`.
Running it requires the NVIDIA Container Toolkit on the Docker host; the
`ai` service in `docker-compose.yml` is behind the `ai` profile so it's opt-in
(`docker compose --profile ai up`) rather than blocking `docker compose up`
on machines without a GPU.

## NVIDIA NIMs (future)

`NIM_ENDPOINT_URL` exists as a config placeholder in `src/core/config.py`.
The intent is that once NVIDIA NIM-hosted inference is adopted, `pipelines/`
can call out to a NIM endpoint instead of (or alongside) a locally-loaded
model, without changing the `ai/` service's external interface. Not wired to
anything yet — see `docs/decisions/0002-tech-stack-rationale.md`.

## Talking to the backend

Resolved: plain HTTP, called from `backend/ai/services/ai_client.py` — one
method per pipeline stage (pose, parsing, try-on generation, identity
preservation, enhancement). `ai/` doesn't call the backend; the backend's
AI worker process calls `ai/`, dispatched from a Redis-backed job queue
(`arq`) rather than from a request-handling thread, so a slow pipeline
never blocks API traffic. See `docs/decisions/0004-ai-orchestration-vs-execution-boundary.md`,
`docs/decisions/0005-async-job-processing-via-redis.md`, and
`docs/architecture/ai-backend.md` for the full reasoning and design —
this file's own HTTP surface (`ai/src/inference/`) is still a
placeholder; only the calling convention is decided.
