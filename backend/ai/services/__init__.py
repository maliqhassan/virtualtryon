"""Job lifecycle and orchestration: the layer that turns a queued job
into a sequence of calls to ai/ (via ai_client.py) and tracks its
progress (via job_queue.py), driven by workflow.py. This is where
backend/ai/ does its actual coordinating work — everything in
models/, preprocess/, pipelines/, postprocess/, and storage/ exists to
be used by this layer.
"""
