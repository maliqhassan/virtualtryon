# 18. Genlook as the try-on provider

Date: 2026-11-19

Status: Accepted. Supersedes ADR 0013's choice of VTON-D as the provider
(its client stays, selectable with `TRYON_PROVIDER=vton_d`). If Genlook
works well in testing it becomes the production provider, in place of the
FASHN plan; FASHN stays the fallback.

## Context

VTON-D through RapidAPI (ADR 0013) was a stopgap for testing. Genlook's
Try-On API is built for the same job as this app: a person photo and a
product photo in, the person wearing it out.

## Decision

- New `GenlookInferenceClient` in `ai/src/models/inference_clients/`, next
  to the VTON-D one, behind the same `AIInferenceClient` interface.
  `TRYON_PROVIDER=genlook` selects it; `TRYON_API_KEY` holds the key.
- One synchronous call (`POST /tryon/v1/try-on/sync`, usually about 10 s)
  with both photos as files in the same multipart request, so our photos
  never need public URLs. If Genlook is still working when it returns, the
  generation is checked every 2 s, for up to 3 minutes in total.
- The result link is temporary, so the image is downloaded at once and
  stored by us like any other result.
- Genlook works out the garment type from words as well as the photo, so
  the try-on request now carries the garment's title and category
  (optional fields; other providers ignore them).
- Each try-on uses a new product id, so a product Genlook stored earlier
  can't stand in for a different photo.
- What the user sees on failure is shared with the VTON-D client
  (`tryon_service.py`): out of credits or rate limited is "busy", a photo
  Genlook can't find a person in gets its own message, and so on.

## Privacy

- The user's body photo is sent to Genlook with nothing else about them
  (no id, email or name).
- Genlook is asked to keep the images for 1 day, its minimum (default 7).
- No watermark and no visible "AI MODIFIED" label on results (US market);
  Genlook still embeds machine-readable AI provenance.
- HTTP request URLs are no longer logged (httpx at WARNING): the result
  link is a signed URL that opens the try-on image for days.

## Cost

1 credit per try-on (about $0.04 pay-as-you-go, from $0.015 on a plan).
Failed generations are refunded by Genlook, and photos it rejects before
generating aren't charged. `TRYON_DAILY_LIMIT` still caps all users
together. Genlook's free `mock` mode (photo returned unchanged) checks the
integration without spending credits.
