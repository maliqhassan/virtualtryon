# 13. Real try-ons through VTON-D (RapidAPI) while testing

Date: 2026-11-06

Status: Accepted for testing. FASHN replaces it before launch, as another
AIInferenceClient.

## Context

Try-on has run on the demo provider (the user's photo with the garment
pinned on and a "DEMO" banner). Testers need real results to judge the app.
The plan is FASHN for launch; for testing, the owner chose a try-on API on
RapidAPI, where they already have an account. The only CatVTON-style model
in the repo (`catvton`) is an unimplemented stub, and running a model
ourselves needs a GPU this project doesn't have.

## Decision

- `TRYON_PROVIDER=vton_d` selects `VtonDInferenceClient`
  (`ai/src/models/inference_clients/`): Virtual Try-On Diffusion by
  Texel.Moda, `POST https://try-on-diffusion.p.rapidapi.com/try-on-file`
  with the person and clothing photos as JPEG files; the try-on comes back
  as a JPEG. The RapidAPI key is `TRYON_API_KEY`, set only in the server's
  environment. Its free plan is 100 calls a month.
- Photos are sent upright (EXIF applied) and at most 1280 px on the long
  side. Nothing but the two images is sent.
- Each failure becomes a plain message on the job (busy or out of quota,
  photos rejected, not set up, didn't respond); details stay in the log.
  Failed try-ons don't count against anyone's allowance, as before.
- `TRYON_DAILY_LIMIT` (default 10) caps the try-ons all users together can
  start in a UTC day on a real provider, counted the same way as a user's
  allowance. Over it, starting a try-on answers 429 `tryons_paused`.
- Per-user limits may be off (`TRYON_LIMITS_ENABLED=false`) with a real
  provider only while that cap is set; before, they could be off only on
  the demo.
- The worker runs the inference call in a thread, so a 5-10 s network call
  doesn't hold its event loop.

## Consequences

- Users' body photos go to Texel.Moda through RapidAPI. Their documentation
  says nothing about how long images are kept. The Help screen's privacy
  answer names them.
- VTON-D dresses the person in the whole look of the clothing photo, and
  works best when that photo shows someone wearing it. Flat product images
  (the sample shop's drawn pieces) may give poor results. It doesn't
  replace a single piece of an outfit; FASHN can.
- The cap is a count, not a lock across users, so two try-ons started at
  the same moment can go one over.
- Moving to FASHN is a new client class and a new `TRYON_PROVIDER` value;
  nothing in the backend's API, the app or the database changes.
