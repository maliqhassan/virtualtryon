"""Cheap CPU-only work after ai/'s GPU stages finish: assembling the
final ..models.job.TryOnResult from the last stage's output, before
storage/ persists it. Never does GPU work.
"""
