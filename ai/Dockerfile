# syntax=docker/dockerfile:1
#
# CUDA-enabled runtime for the AI inference service. Swap the base image for
# an NVIDIA NIM / Triton container when that migration happens (see
# docs/decisions and NIM_ENDPOINT_URL in app config) — this Dockerfile covers
# self-hosted PyTorch inference only.

FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY src ./src

EXPOSE 8100
CMD ["python", "-m", "src.inference"]
