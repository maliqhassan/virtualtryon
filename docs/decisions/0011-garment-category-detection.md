# 11. Garment category detection through api4.ai

Date: 2026-11-05

Status: Accepted, for the testing phase.

## Context

Adding a wardrobe piece asks the user to pick its category by hand.
api4.ai's fashion model (sold through RapidAPI) finds clothing items in a
photo and labels them (top, pants, bag…) with a confidence each. It does
not do virtual try-on; try-on stays with the engine from ADR 0006.

## Decision

- `POST /api/v1/garments/detect-category` takes a garment photo and
  returns `{category, confidence}`, both null when there's no usable guess.
  The add-piece screen calls it when a photo is picked and fills the
  category in, unless the user has already chosen one.
- The backend calls api4.ai; the app never does, so the key
  (`FASHION_API_KEY`) stays on the server. An empty key turns detection off.
- `services/garment_detection.py` depends on a `GarmentDetector` interface;
  api4.ai is one implementation, so another provider (or our own model in
  `ai/`) can replace it without changing the endpoint or the app.
- Their labels are mapped to the app's fixed categories. Clothing wins over
  bags and accessories seen in the same photo; the generic "clothing" box
  and anything under 60% confidence are ignored.
- Every call costs a paid credit, so: the same image is answered from
  memory, each user gets 5 calls a day, and all users together get
  `FASHION_API_DAILY_LIMIT` (10 by default) a day. Limits and memory are
  in-process, like the other attempt limits.
- A failed or skipped detection is not an error: the user chooses the
  category as before.

## Consequences

- Garment photos (never body photos) leave our servers for api4.ai. The
  Help screen says so.
- The free RapidAPI plan has 20 credits. Once they run out, every call
  fails and detection quietly stops guessing; nothing else breaks.
- Limits reset on a deploy or restart, so the daily cap is per server run,
  not per calendar day.
