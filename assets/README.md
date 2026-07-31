# assets/ (root)

Shared, non-bundled media — distinct from `frontend/assets/`, which Expo
bundles into the app (icons, splash screen). Nothing here ships in the app
binary.

- `brand/` — logo and brand assets for marketing/docs use.
- `sample-garments/` — sample clothing images for local dev/testing of the
  AI pipeline.
- `sample-models/` — sample human photos for local dev/testing.

**Privacy note:** this app processes photos of people's bodies. Never commit
real user photos here, even for debugging — only synthetic, stock, or
consenting-team-member images explicitly cleared for use in the repo.
