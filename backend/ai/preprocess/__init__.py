"""Cheap CPU-only work that happens before a job is handed to ai/ over
HTTP: validating uploaded images are AI-ready (requirement 3) and
normalizing them (format/size) so ai/ receives consistent input. Never
does GPU work and never imports PyTorch — anything that needs a model
belongs in root ai/, not here (see
docs/decisions/0004-ai-orchestration-vs-execution-boundary.md).
"""
