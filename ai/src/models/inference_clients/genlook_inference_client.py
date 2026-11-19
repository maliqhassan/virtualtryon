"""Real try-ons through Genlook's Try-On API (ADR 0018).

One synchronous call per try-on (`POST /try-on/sync`): the person photo and
the clothing photo go up as files in the same multipart request, so our
photos never need public URLs. Genlook usually answers in about 10 s with a
link to the result, which is downloaded at once (the link is temporary). If
it's still working when the call returns (202), the generation is checked
until it finishes or _TOTAL_WAIT_SECONDS runs out.

Genlook infers what the clothing is from its photo and its title, so the
garment's title and category are sent along. Each try-on uses a new
product id, so a stored product can never stand in for a different photo.

Privacy: the user's body photo leaves our server here, with nothing else
about the user (no id, email or name). Genlook is asked to keep the images
for 1 day, its minimum. The result carries no watermark and no visible "AI
MODIFIED" label (the app is for the US market); Genlook still embeds
machine-readable AI provenance in the file.

Credits: 1 per try-on; failed ones are refunded by Genlook, and photos it
rejects before generating aren't charged. `mock=True` is Genlook's free test
mode (the person photo comes back unchanged), for checking the integration.
"""

import io
import json
import logging
import re
import time
import uuid

import httpx
from PIL import Image, UnidentifiedImageError

from ..inference_client import (
    AIInferenceClient,
    AIInferenceRequest,
    AIInferenceResponse,
)
from .tryon_service import (
    BUSY,
    NO_PERSON,
    NOT_SET_UP,
    REJECTED,
    UNAVAILABLE,
    UNREADABLE,
    TryOnServiceError,
    to_jpeg,
)

logger = logging.getLogger(__name__)

_BASE_URL = "https://api.genlook.app/tryon/v1"
# Genlook crops the person photo to 4:5 and needs at least 400x500 after it;
# results are 1200 px on the long side, so more than this only slows uploads.
_UPLOAD_MAX_SIDE = 1600
# The whole try-on (upload, waiting, checking back, downloading the result)
# gets one deadline. It stays well under the worker's PROCESSING_TIMEOUT
# (5 minutes, app/worker/job_processor.py), so a slow try-on is never failed
# as "stuck" while it's still running and then thrown away after being paid
# for. Each request waits at most what's left, and at most 100 s (the sync
# call waits up to 90 s on Genlook's side; their docs ask for 100).
_DEADLINE_SECONDS = 200.0
_REQUEST_TIMEOUT_SECONDS = 100.0
_CONNECT_TIMEOUT_SECONDS = 10.0
_POLL_INTERVAL_SECONDS = 2.0
_MAX_RETRY_AFTER_SECONDS = 10.0
_MAX_RESULT_BYTES = 20 * 1024 * 1024
# Genlook's generation ids are short tokens; anything else isn't put in a URL.
_GENERATION_ID = re.compile(r"^[A-Za-z0-9_-]{1,100}$")
# Raised by httpx outside its HTTPError family (a malformed result link).
_HTTPX_ERRORS = (httpx.HTTPError, httpx.InvalidURL, httpx.StreamError)

# Genlook error codes, by what the user should hear.
_NO_PERSON_CODES = {
    "NO_PERSON_DETECTED",
    "PERSON_TOO_FAR",
    "PERSON_IMAGE_TOO_SMALL",
    "PERSON_IMAGE_BLANK",
}
_REJECTED_CODES = {
    "CONTENT_POLICY_VIOLATION",
    "MISSING_REQUIRED_CLASSIFICATION",
    "PRODUCT_IMAGE_FETCH_FAILED",
    "FILE_TOO_LARGE",
    "VALIDATION_FAILED",
    "MULTI_PRODUCT_NOT_SUPPORTED",
}
_NOT_SET_UP_CODES = {"MISSING_API_KEY", "INVALID_API_KEY"}
_BUSY_CODES = {
    "INSUFFICIENT_CREDITS",
    "API_KEY_LIMIT_REACHED",
    "QUOTA_EXCEEDED",
    "RATE_LIMITED",
}


class GenlookInferenceClient(AIInferenceClient):
    def __init__(
        self,
        api_key: str,
        *,
        mock: bool = False,
        transport: httpx.BaseTransport | None = None,
        sleep=time.sleep,
    ) -> None:
        """`mock` is Genlook's free test mode. `transport` and `sleep` are for
        tests (httpx.MockTransport), so they never spend a real try-on."""
        self._api_key = api_key
        self._mock = mock
        self._transport = transport
        self._sleep = sleep

    def infer(self, request: AIInferenceRequest) -> AIInferenceResponse:
        if not self._api_key:
            raise TryOnServiceError(NOT_SET_UP)
        try:
            person = to_jpeg(request.user_image, _UPLOAD_MAX_SIDE)
            clothing = to_jpeg(request.clothing_image, _UPLOAD_MAX_SIDE)
        except (OSError, ValueError, Image.DecompressionBombError):
            logger.warning("Could not prepare the photos for Genlook", exc_info=True)
            raise TryOnServiceError(UNREADABLE) from None

        headers = {"x-api-key": self._api_key}
        started = time.monotonic()
        deadline = started + _DEADLINE_SECONDS
        try:
            with httpx.Client(transport=self._transport) as client:
                response = client.post(
                    f"{_BASE_URL}/try-on/sync",
                    headers=headers,
                    data={"data": json.dumps(self._payload(request))},
                    files={
                        "person": ("person.jpg", person, "image/jpeg"),
                        "product": ("product.jpg", clothing, "image/jpeg"),
                    },
                    timeout=_timeout(deadline),
                )
                body = _json(response)
                response, body = self._wait_until_done(client, headers, response, body, deadline)
                image = self._result_image(client, response, body, deadline)
        except _HTTPX_ERRORS as exc:
            # The type only: a message could hold the signed result link.
            logger.warning("Genlook request failed: %s", type(exc).__name__)
            raise TryOnServiceError(UNAVAILABLE) from None
        elapsed = time.monotonic() - started

        logger.info("Genlook try-on %s done in %.1fs", body.get("generationId"), elapsed)
        return AIInferenceResponse(
            generated_image=image,
            model_name="genlook-mock" if self._mock else "genlook",
            inference_time_seconds=elapsed,
        )

    def _payload(self, request: AIInferenceRequest) -> dict:
        product: dict = {
            # New every time: Genlook keeps products by id, and a reused id
            # could bring back the photo of a different garment.
            "externalId": f"tryon-{uuid.uuid4().hex}",
            "images": [{"source": {"fileKey": "product"}}],
            "validForDays": 1,
        }
        if request.clothing_title:
            product["title"] = request.clothing_title[:200]
        if request.clothing_category:
            product["description"] = request.clothing_category[:200]
        payload: dict = {
            "products": [product],
            "person": {"image": {"source": {"fileKey": "person"}}},
            "output": {"keepForDays": 1, "watermark": False, "aiLabel": False},
        }
        if self._mock:
            payload["mock"] = True
        return payload

    def _wait_until_done(
        self,
        client: httpx.Client,
        headers: dict[str, str],
        response: httpx.Response,
        body: dict,
        deadline: float,
    ) -> tuple[httpx.Response, dict]:
        """While Genlook is still working (a 202 from the sync call, then a 200
        with PENDING/PROCESSING from each check), checks the generation again
        until it finishes or the deadline passes. A 429 while checking waits
        as Genlook asks and checks again: the try-on itself is still running."""
        generation_id = body.get("generationId")
        while (response.status_code in (200, 202) and _still_running(body)) or (
            response.status_code == 429 and generation_id is not None
        ):
            if not isinstance(generation_id, str) or not _GENERATION_ID.match(generation_id):
                logger.warning("Genlook is still working but sent no usable generation id")
                raise TryOnServiceError(UNAVAILABLE)
            wait = _POLL_INTERVAL_SECONDS
            if response.status_code == 429:
                wait = _retry_after(response)
            if time.monotonic() + wait >= deadline:
                logger.warning("Genlook generation %s took too long", generation_id)
                raise TryOnServiceError(UNAVAILABLE)
            self._sleep(wait)
            response = client.get(
                f"{_BASE_URL}/generations/{generation_id}",
                headers=headers,
                timeout=_timeout(deadline),
            )
            body = _json(response)
        return response, body

    def _result_image(
        self, client: httpx.Client, response: httpx.Response, body: dict, deadline: float
    ) -> Image.Image:
        status = response.status_code
        if status != 200 or body.get("status") != "COMPLETED":
            raise _error(status, body)
        url = body.get("resultImageUrl")
        if not isinstance(url, str) or not url.startswith("https://"):
            logger.warning("Genlook completed without a usable result link")
            raise TryOnServiceError(UNAVAILABLE)
        # Streamed, so an oversized body stops at the limit instead of being
        # read into memory first. Redirects are followed: the signed link may
        # point on to the storage host.
        content = bytearray()
        with client.stream("GET", url, timeout=_timeout(deadline), follow_redirects=True) as result:
            if result.status_code != 200:
                logger.warning("Genlook result download failed: %s", result.status_code)
                raise TryOnServiceError(UNAVAILABLE)
            for chunk in result.iter_bytes():
                content.extend(chunk)
                if len(content) > _MAX_RESULT_BYTES:
                    logger.warning("Genlook result is larger than %d bytes", _MAX_RESULT_BYTES)
                    raise TryOnServiceError(UNAVAILABLE)
        try:
            image = Image.open(io.BytesIO(bytes(content)))
            image.load()
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
            logger.warning("Genlook returned an unreadable image")
            raise TryOnServiceError(UNAVAILABLE) from None
        return image.convert("RGB")


def _still_running(body: dict) -> bool:
    return body.get("status") in ("PENDING", "PROCESSING")


def _timeout(deadline: float) -> httpx.Timeout:
    """What's left of the deadline, and at most _REQUEST_TIMEOUT_SECONDS."""
    left = max(1.0, min(_REQUEST_TIMEOUT_SECONDS, deadline - time.monotonic()))
    return httpx.Timeout(left, connect=min(_CONNECT_TIMEOUT_SECONDS, left))


def _retry_after(response: httpx.Response) -> float:
    try:
        seconds = float(response.headers.get("retry-after", _POLL_INTERVAL_SECONDS))
    except ValueError:
        seconds = _POLL_INTERVAL_SECONDS
    return min(max(seconds, _POLL_INTERVAL_SECONDS), _MAX_RETRY_AFTER_SECONDS)


def _json(response: httpx.Response) -> dict:
    try:
        body = response.json()
    except ValueError:
        return {}
    return body if isinstance(body, dict) else {}


def _error(status: int, body: dict) -> TryOnServiceError:
    """The plain sentence for a Genlook refusal or failure; the code and the
    request id go to the log for support."""
    code = str(body.get("code") or body.get("errorCode") or "")
    logger.warning(
        "Genlook refused or failed: %s %s %s",
        status,
        code,
        body.get("message") or body.get("errorMessage"),
    )
    if code in _NOT_SET_UP_CODES or status == 401:
        logger.error("Genlook refused the API key: check TRYON_API_KEY")
        return TryOnServiceError(NOT_SET_UP)
    if code in _BUSY_CODES or status in (402, 429):
        return TryOnServiceError(BUSY)
    if code in _NO_PERSON_CODES:
        return TryOnServiceError(NO_PERSON)
    if code in _REJECTED_CODES or status in (400, 413, 422):
        return TryOnServiceError(REJECTED)
    return TryOnServiceError(UNAVAILABLE)
