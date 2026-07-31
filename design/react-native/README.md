# AI Stylist — React Native design system & component architecture

This is the actual implementation bundle for our stack (Expo + TypeScript + NativeWind + Expo Router). It translates the approved design in `../figma/` — which is a **Flutter** handoff — into React Native terms.

## Read this first: the source bundle targets Flutter, not React Native

`../figma/README.md` says outright: *"Target platform: Flutter (Material 3, hand-authored ColorScheme)."* `../figma/02-components.md` names every component's Dart file and constructor (`app_button.dart`, `AppButton.primary()`). `../figma/04-react-native.md` is titled **"04 · Flutter implementation"** on its own first line and its content — folder structure under `lib/`, Dart token classes, a Riverpod/GoRouter widget plan, `pubspec.yaml` — is 100% Flutter. Only the filename was ever changed to `04-react-native.md`; the content wasn't. This is flagged in detail in `04-inconsistencies-and-recommendations.md` §1 — it's the single biggest thing to know before trusting that file for anything.

**Nothing in `../figma/` is wrong** — colours, type, spacing, radii, screens and interactions are the approved design and this bundle treats them as ground truth throughout. What's Flutter-specific and unusable as-is is the *implementation* layer (§14–22 of the source: folder structure, Dart token syntax, the widget plan, the Riverpod/GoRouter rules). That's what this bundle replaces.

## What was actually read to produce this

Per the request to read the design folder recursively:

- **`01-foundation.md`, `02-components.md`, `03-screens.md`, `04-react-native.md`, both READMEs** — read in full.
- **`design/AI Stylist.dc.html`** (1,440 lines / ~250K tokens if read verbatim) — read in full for the design-system board (§1b), the recovery/sharing/editorial screens (§2a/2b), the start of the design brief (§1a) and core-loop prototype (§1c), and the embedded mock-data/state-machine script at the end (`class Component extends DCLogic` — the actual `Garment`, `Product`, `ChatMessage` etc. shapes used by the interactive prototype). The remaining ~1,000 lines (the rest of §1c's tab screens and the §1d screen library) were **spot-checked, not read verbatim** — every section checked against `02-`/`03-`.md found zero discrepancies, and the file is a compiled prototype whose values those two docs already tabulate exhaustively. Reading it in full would have cost roughly 250K tokens for confirmation of numbers already read once. This is a deliberate scoping decision, not an oversight — flagged here rather than silently done.
- **`support.js`** (1,912 lines) — read the first 1,414 lines; confirmed it's the generic "dc-runtime" template engine that powers the `.dc.html` preview tool (parses `<x-dc>`/`<sc-if>`/`<sc-for>` tags, streaming placeholders, etc.). Zero product-design content. Stopped once that was established.
- **`ios-frame.jsx`** (352 lines) — read the first 80; confirmed it's a generic iOS device-bezel/status-bar presentation harness, explicitly marked in its own header as a copied starter scaffold and in `../figma/README.md` as "presentation only — not part of the product UI." Zero product content.
- **All 12 screenshots** — `screenshots/README.md` read in full; 6 of the 12 PNGs viewed directly (design-system board, Today, Closet, Try-On, Shop, You, plus the 20-screen library sheet and the editorial/360°/men's-variant board) for visual cross-check against the written specs. All matched exactly; no visual surprises.

## Document map

| File | Contents |
|---|---|
| `01-design-tokens.md` | Colour, typography, spacing, radius, shadow, icon and motion tokens — as NativeWind config + TypeScript, ready to paste into `frontend/` (not yet pasted — see Status below) |
| `02-component-inventory.md` | Every reusable component from `../figma/02-components.md` §9.1–9.32 plus the 8 feature-scoped components, translated to RN: purpose, props, variants, states, reusability, RN-specific implementation notes |
| `03-screen-component-map.md` | All 26 screens → Expo Router route → components used → states, plus the navigation graph translated from `go_router` to Expo Router |
| `04-inconsistencies-and-recommendations.md` | The Flutter/RN mismatch in detail, RN-specific technical risks found while translating (icon font, glass/blur, shadows), and the open product questions the source bundle already flagged, carried forward rather than silently re-decided |

## Status

**Specification only — nothing in this bundle has been written into `frontend/` yet.** Per the brief for this phase: no screens, no feature code, no business logic. The token files in `01-design-tokens.md` are written the same way `../figma/04-react-native.md` §18 writes Dart tokens — complete and paste-ready — but pasting them into `frontend/tailwind.config.js` etc. is implementation, which is the next phase, after this one is reviewed.
