"""The background worker layer: reads queued InferenceJob rows and
attempts to advance them. No HTTP surface — nothing in app/api/ imports
this package. See inference_client_provider.py for a real, documented
exception to this repo's normal backend<->ai/ boundary, and
PROJECT_STATUS.md for the full reasoning behind it.
"""
