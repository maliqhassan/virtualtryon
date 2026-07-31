# Handoff: AI Stylist — Flutter Implementation

## Overview

**AI Stylist** is an AI-powered personal stylist, virtual wardrobe, shopping assistant and virtual try-on platform for iOS and Android. The product answers one question every morning — *what do I wear?* — and every other surface (closet, try-on, shopping, chat) exists to make that answer better.

This bundle is the **single source of truth** for building the UI. It documents an approved design. Nothing here is a proposal; treat every value as final.

Target platform: **Flutter** (Material 3, hand-authored ColorScheme).

## About the design files

The files in `design/` are **design references created in HTML** — prototypes showing intended look and behaviour, not production code to port. `AI Stylist.dc.html` is a streaming HTML design component; open it in a browser to inspect any screen. Your task is to **recreate these designs in Flutter** using the tokens and widget plan in this bundle. Do not transpile the HTML.

Inline styles in the HTML are authoritative for colour, size, weight and spacing. Where the HTML uses a browser-only affordance (e.g. `repeating-linear-gradient` placeholder swatches, `backdrop-filter`), this documentation states the Flutter equivalent.

## Fidelity

**High-fidelity.** Colours, typography, spacing, radii and interaction states are final. Build pixel-accurately at a 390dp base width.

Two categories of content are deliberately placeholder and must be replaced with real assets before ship:
- **Garment / body / product imagery** — rendered as diagonal-striped placeholder blocks with monospace labels (`[ your body scan · front view ]`). These map to `AppImage` slots.
- **The Apple logo** on the social-auth button — a neutral square stands in. Use the official `SignInWithAppleButton` asset.

## Document map

| File | Contents |
|---|---|
| `01-foundation.md` | Sections 1–8: overview, principles, colour, typography, spacing, radius, elevation, iconography |
| `02-components.md` | Section 9: the full component library with states, props and widget names |
| `03-screens.md` | Sections 10–13: screen inventory, navigation graph, per-screen breakdown, micro-interactions |
| `04-flutter.md` | Sections 14–22: responsive, accessibility, imagery, folder structure, design tokens (Dart), reusable widget plan, development rules, file generation plan |
| `design/` | The approved HTML design references |
| `screenshots/` | PNG reference captures of every board and prototype state (see its own README for the index and known capture artifacts) |

## Fastest path to a running app

1. Read `04-flutter.md` §18 and create every file under `lib/core/theme/` verbatim — the Dart token classes are written out in full and compile as-is.
2. Create the shared widgets in `02-components.md` (each entry names its file and its constructor signature).
3. Build screens in the order given by `03-screens.md` §10; that order matches the navigation graph and never forward-references a widget that doesn't exist yet.
4. Wire routes from `03-screens.md` §11.

## Assumptions stated explicitly

The design did not specify these; they are documented as decisions, not inventions, and are flagged again at their point of use:

1. **Fonts** are Manrope (UI), Instrument Serif (display), IBM Plex Mono (metadata/overline), Noto Nastaliq Urdu (Urdu headings). Bundle them with `google_fonts` in offline mode rather than fetching at runtime.
2. **State management** is Riverpod; **routing** is `go_router` with `StatefulShellRoute`. The design implies a persistent five-tab shell with independent per-tab stacks, which these deliver.
3. **Backend** is out of scope. All specs describe UI state only; every async surface has a documented loading / empty / error state to bind to.
4. **Dark theme** tokens are fully specified in `01-foundation.md` §3, but only Try-On and the 360° player are dark by default in v1. A global dark pass across all screens was not part of the approved design.
5. **Urdu / RTL** is specified at the rules level (§15) and is not built out screen by screen.

## Assets

No binary assets ship with this design. Everything is drawn from:
- **Material Symbols Rounded** (icon font) — see `01-foundation.md` §8 for the exact glyph list per screen.
- **Google Fonts** — the four families above.
- **Placeholder imagery** — all photographic content is user-supplied at runtime (closet photos, body scan, product shots from partner stores).

## Files

- `design/AI Stylist.dc.html` — all 26 screens: design brief (1a), design system board (1b), interactive core-loop prototype (1c), screen library (1d), handoff notes (1e), recovery/sharing flows (2a), editorial screens (2b).
- `design/ios-frame.jsx` — the iPhone bezel used to present the prototype. **Presentation only — not part of the product UI.**
- `screenshots/*.png` — 12 reference captures. Use for orientation; measure from the HTML.
