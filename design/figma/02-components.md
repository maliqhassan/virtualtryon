# 02 · Component library

Section 9 of the handoff. Every reusable component in the approved design, with its states, properties, variants and Flutter widget name.

Conventions used below:
- **File** — path under `lib/core/widgets/` unless stated.
- All colours reference `AppColors`, all sizes `AppSpacing` / `AppRadius` / `AppTypography` from `04-flutter.md` §18.
- "Hit target" is the minimum tappable box, which may exceed the visual box.

---

## 9.1 AppButton — primary

**File** `app_button.dart` · **Widget** `AppButton.primary()`

Purpose: the single committed action on a screen. Exactly one per view.

| Property | Value |
|---|---|
| Background | `neutral900` `#16130F` |
| Label | `AppTypography.button` (Manrope 15/700, .01em), `textOnPrimary` `#F6F4F0` |
| Padding | 14–16 vertical, 22 horizontal; full-width variants use 15 vertical |
| Radius | `AppRadius.xl` (15) full-width · `lg` (14) inline |
| Height | 48 minimum |
| Leading icon | optional, 17–18, same colour as label, 6–7 gap |

States: **default** · **hover** `#2C2721` · **pressed** scale .98, 120ms · **disabled** `neutral300` bg, `neutral500` label · **loading** label replaced by a 16px breathing dot, button stays full width, taps ignored.

Variants: `full` (stretches, radius 15), `inline` (hugs, radius 14), `onDark` (bg `#F6F4F0`, label `#16130F`).

---

## 9.2 AppButton — secondary

**Widget** `AppButton.secondary()`

| Property | Value |
|---|---|
| Background | transparent |
| Border | 1.5px `rgba(22,19,15,.18)` → `#16130F` on hover |
| Label | `AppTypography.button`, `textPrimary` |
| Padding | 13 vertical (1px less than primary to compensate for the border) |
| Radius | matches the primary it sits beside |

Variant `onDark`: border `rgba(246,244,240,.25)` → `#F6F4F0` on hover, label `#F6F4F0`.

---

## 9.3 AppButton — accent / generate

**Widget** `AppButton.accent()`

Background `primary` `#B4713F` (hover `oklch(0.55 0.11 55)`), label `#FFFFFF`, always paired with the `auto_awesome` glyph at 18 with a 7 gap. Reserved for AI generation actions: "Generate 5 outfits", "Generate try-on", "Analyse me", "Start 7 days free" (gold variant `accent` `#C9A227` with `#12110F` label on dark screens).

---

## 9.4 AppIconButton

**File** `app_icon_button.dart` · **Widget** `AppIconButton`

44 × 44 (40 × 40 in app-bar rows), radius `full` or `lg`. Two fills: `surface` + 1px `borderStrong`, or `neutral900` + `textOnPrimary` icon. Icon 18–20. Used for: closet search, closet add, share, laundry alarm, product overflow, try-on share.

---

## 9.5 AppTextField

**File** `app_text_field.dart` · **Widget** `AppTextField`

| Element | Spec |
|---|---|
| Container | `surface`, 1px `border`, radius `lg` (14), padding 12 × 14 |
| Label | `AppTypography.overlineSmall`, `textPlaceholder` — always visible, sits above the value (this design has **no floating label**) |
| Value | Manrope 13.5/400, `textPrimary`, 4 below the label |
| Caret | 1.5 × 17–19, `primary` |
| Leading icon | optional 19, `textPlaceholder`, 10 gap |
| Trailing | optional 17 (`visibility_off`), `textPlaceholder` |

States: **rest** 1px `border` · **focus** 1.5px `#16130F` · **error** 1px `error`, with an `AppTypography.errorText` row below carrying an `error` glyph at 14 and 6 gap · **disabled** `surfaceMuted`, `textDisabled`.

Password strength: three 3px bars, 4 gap, radius `full`, filled `error` → `warning` → `success` left to right against `neutral200`.

---

## 9.6 AppOtpField

**File** `app_otp_field.dart` · **Widget** `AppOtpField`

Six cells in a `Row` with 7 gap, each `flex: 1`, aspect ratio 0.78, radius `md` (12), `surface`. Filled cell: 1px `border`, digit Manrope 18/600 `textPrimary`. Active cell: 1.5px `#16130F` with a 1.5 × 18 `primary` caret. Empty: 1px `border`.

---

## 9.7 AppSearchField

**File** `app_search_field.dart` · **Widget** `AppSearchField`

Pill: `surface`, 1px `border`, radius `full`, padding 11 × 15, `search` glyph 17 `textPlaceholder`, 9 gap, hint Manrope 12.5 `textPlaceholder`.

---

## 9.8 AppCard

**File** `app_card.dart` · **Widget** `AppCard`

The base surface. Two variants only:

| Variant | Background | Border | Radius | Used for |
|---|---|---|---|---|
| `AppCard.light()` | `surface` `#FFFFFF` | 1px `border` | 14 / 18 / 20 | User data, lists, stats, settings groups |
| `AppCard.dark()` | `surfaceInverse` `#16130F` | none | 16 / 20 / 22 | AI output: today's outfit, style profile, score panel, price suggestion, laundry reminder |

Padding 12 / 14 / 16 / 18 by density. Optional `onTap` adds a hover border darkening to `rgba(22,19,15,.2)` and a 120ms 0.99 press scale.

---

## 9.9 AppGlassPanel

**File** `app_glass_panel.dart` · **Widget** `AppGlassPanel`

`BackdropFilter(sigma: 12–18)` + `glass` fill + 1px `rgba(255,255,255,.12)` (dark) or `rgba(255,255,255,.7)` (light) + radius 14–16 + `AppShadows.soft`.

**Only three permitted uses:** the bottom navigation bar, the try-on result caption, the 360°-player scrubber. Glass is expensive — never use it on a scrolling list.

---

## 9.10 OutfitHeroCard

**File** `lib/features/today/widgets/outfit_hero_card.dart`

The single most important component. `AppCard.dark()` at radius 26 with `AppShadows.hero`.

Structure top to bottom:
1. Header row — overline "TODAY'S OUTFIT" `oklch(0.75 0.09 55)`; right side `verified` 15 gold + score `IBM Plex Mono 11.5/600` `#F2EFEA`.
2. Garment mosaic — `Row`, 14 gap 8: left tile `flex: 1.5` aspect 3/4; right column `flex: 1` with two stacked tiles, gap 8. Each tile radius 14, placeholder fill, garment label bottom-left `IBM Plex Mono 9` `#8A8278`.
3. Outfit name — `AppTypography.outfitName`, `#F6F4F0`.
4. Reasoning row — `auto_awesome` 15 `oklch(0.75 0.09 55)` + Manrope 12.5/1.5 `#B9B1A6`, gap 8.
5. Action row — `AppButton.primary(onDark)` "Try on" with `visibility` 17, plus two 48-square secondary icon buttons (`refresh`, bookmark/`check_circle`).
6. Generation note — `AppTypography.mono` `#8A8278`.

Props: `outfit`, `score`, `reasoning`, `generationNote`, `isSaved`, `onTryOn`, `onShuffle`, `onSave`.

---

## 9.11 ClosetItemCard

**File** `lib/features/closet/widgets/closet_item_card.dart`

`AppCard.light()` radius 18, padding 10. Image: aspect 1/1, radius 12, placeholder fill. Favourite button: 28 circle, top-right inset 7, `rgba(255,255,255,.82)` + blur 6, glyph 16 — `favorite` `error` when on, `favorite_border` `neutral400` when off. Slot label bottom-left, `IBM Plex Mono 8.5` `rgba(22,19,15,.45)`. Below the image: name Manrope 13/600 at 9; then a row with wear count `AppTypography.monoSmall` `neutral400` and a tag badge.

Entry animation: `riseIn` — 10dp translate + fade, 320ms `easeOutCubic`, staggered 40ms by index.

---

## 9.12 ProductMatchCard

**File** `lib/features/shop/widgets/product_match_card.dart`

`AppCard.light()` radius 20, padding 12, horizontal `Row` gap 13. Left: 96-wide image, radius 14. Right column: brand `AppTypography.overlineSmall` `neutral400`; name Manrope 14.5/600; badge row (match, colour grade, fit grade) gap 5; reasoning Manrope 11.5/1.45 `textSecondary`; footer row — price Manrope 15/700 and a "Try on →" text action in `oklch(0.55 0.11 55)`. Bookmark toggle top-right, 19.

---

## 9.13 MatchScoreBadge

**File** `match_score_badge.dart` · **Widget** `MatchScoreBadge`

Pill, radius `full`, padding 5 × 8 (badge) or 7 × 11 (chip-size), `AppTypography.monoBadge`. Content is **always** `"{score} · {label}"` — never colour alone.

| Level | Range | Colours |
|---|---|---|
| perfect | 85–100 | fg `#2E7050` / bg `#DCF0E4` |
| good | 65–84 | fg `#7E5A18` / bg `#F5EBD3` |
| poor | 0–64 | fg `#8E3324` / bg `#F7E5E1` |

Copy rule: below 70, the surrounding copy downgrades from "wear this" to "worth trying".

---

## 9.14 AppChip

**File** `app_chip.dart` · **Widget** `AppChip`

Radius `full`, `AppTypography.label`, padding 9 × 14 (filter) or 8 × 12 (compact), `white-space: nowrap` equivalent — **never wrap a chip's label**; a chip row scrolls horizontally instead.

| State | Background | Text | Border |
|---|---|---|---|
| unselected | `surface` | `textPrimary` | 1px `border` |
| selected | `neutral900` | `textOnPrimary` | none |
| muted (read-only tag) | `surfaceMuted` | `textSecondary` | none |
| onDark unselected | transparent | `#F2EFEA` | 1px `rgba(255,255,255,.18)` |
| onDark selected | `accent` | `#12110F` | none |

---

## 9.15 AppBadge

**File** `app_badge.dart`

Small non-interactive pill: `AppTypography.monoBadge`, padding 4–5 × 7–8, radius `full`. Semantic variants: neutral (`surfaceMuted` / `textSecondary`), eastern (`oklch(0.95 0.03 55)` / `oklch(0.45 0.11 55)`), unworn (`oklch(0.95 0.05 85)` / `oklch(0.48 0.13 70)`), auto-tagged (same as eastern).

---

## 9.16 AppBottomNav

**File** `app_bottom_nav.dart` · **Widget** `AppBottomNav`

Five destinations: **Today** `wb_twilight` · **Closet** `checkroom` · **Try-On** `auto_awesome` (raised) · **Shop** `shopping_bag` · **You** `person`.

| Property | Value |
|---|---|
| Container | `AppGlassPanel`, `rgba(246,244,240,.82)` + blur 18, 1px top border `rgba(22,19,15,.07)` |
| Padding | 8 top · 14 sides · 26 bottom (plus `viewPadding.bottom`) |
| Item | Column: pill + label, gap 3, 6 vertical padding |
| Standard pill | 44 × 30, radius `full`; `rgba(22,19,15,.07)` when active, transparent when not |
| Raised pill (Try-On) | 44 × 44, radius `full`, `neutral900` always, lifted 4dp |
| Icon | 22 (23 raised) |
| Active colour | `#16130F` (raised: `oklch(0.78 0.1 90)` gold) |
| Inactive colour | `#A39B90` (raised: `#F6F4F0`) |
| Label | `AppTypography.navLabel` |

Today stays visually active while Chat and Rate-my-fit are pushed on its stack.

---

## 9.17 AppAppBar

**File** `app_app_bar.dart`

No Material `AppBar` — a plain header `Row` inside the scroll view. Left: title (`AppTypography.headline`) or a back `AppIconButton`. Right: 0–2 `AppIconButton`s at 40. Below the title, an optional `AppTypography.mono` subtitle at 6 gap (e.g. "128 items · 4 unworn this season"). Never elevated, never pinned unless the screen is a modal flow.

---

## 9.18 AppBottomSheet

**File** `app_bottom_sheet.dart` · **Widget** `AppBottomSheet.show()`

Radius 28 top corners, `background` fill, padding 12 / 20 / 34. Grabber 40 × 4 radius `full` `#D6D0C6`, centred, 16 below. Scrim `rgba(22,19,15,.42)`. Enter: 320ms `easeOutCubic` slide + scrim fade. Content pattern: title `AppTypography.title` → supporting copy `bodySmall` `textSecondary` → content → full-width `AppButton.primary`.

---

## 9.19 AppDialog

**File** `app_dialog.dart`

Same visual language as the sheet but centred, radius 20, max width 320, padding 20. Two actions maximum, stacked full-width on ≤ 360dp. Destructive confirm uses `error` as the primary fill.

---

## 9.20 AppOptionCard

**File** `app_option_card.dart`

The 2 × 2 grid tile used in the add-to-closet sheet and the outfit generator. `AppCard.light()` radius 18 (13 in dense grids), padding 16 (11 dense). Icon 24 semantic → title Manrope 13.5/700 at 9 → caption Manrope 11 `textSecondary` at 2. Selected state: `neutral900` background, `textOnPrimary` title, gold icon.

---

## 9.21 AppListRow

**File** `app_list_row.dart`

Inside an `AppCard.light()` with `clipBehavior: antiAlias`. Row: leading glyph 20 `textSecondary` → title Manrope 14/600 (`Expanded`) → optional trailing `AppTypography.mono` `neutral400` → `chevron_right` 18 `neutral300`. Padding 15 × 16. Divider `1px divider` between rows, none after the last.

---

## 9.22 AppAvatar

**File** `app_avatar.dart`

Circle, radius `full`, sizes 32 (chat header) / 66 (profile). Border 1px `border` on placeholder. Noor's avatar is the brand radial gradient; the user's is a photo or placeholder fill.

---

## 9.23 AppProgressBar

**File** `app_progress_bar.dart`

Track height 3 or 4, radius `full`, `neutral200` (light) / `rgba(255,255,255,.12–.16)` (dark). Fill: `neutral900` for neutral progress, `accent` gold for scores and budgets, `success` for completion. Optional 13–16 circular thumb (`surface` with 2px `neutral900` border) for sliders.

Score bars animate their width over 700ms `easeOutCubic` on first paint, in step with the number counting up.

---

## 9.24 ThinkingIndicator

**File** `thinking_indicator.dart` · **Widget** `ThinkingIndicator`

**Replaces every spinner in the product.** A radial-gradient orb — `oklch(0.7 0.11 55)` centre to transparent at 70% — at 22 / 70 / 76 depending on context, pulsing opacity .55→1 and scale 1→1.06 over 1.5s ease-in-out, infinite.

Always accompanied by a named step in `AppTypography.mono` or Manrope 12.5/600: "reading your closet…", "step 2 of 3 · draping fabric", "shoulder : waist ratio".

Reduced motion: the orb becomes a static dot at full opacity; the text step still updates.

---

## 9.25 AppSkeleton

**File** `app_skeleton.dart`

Bars 11 high, radius 6, widths 70% / 45%, gap 9. Gradient `#EFEBE4 → #F8F6F2 (40%) → #EFEBE4 (80%)` swept 320px over 1.5s linear, infinite. Used for closet grid tiles, product cards and chat responses. Ship as real widgets — do not add a shimmer package.

---

## 9.26 AppEmptyState

**File** `app_empty_state.dart`

Centred in an `AppCard.light()` radius 14–18, padding 14–16. Glyph 26 `neutral300` → title Manrope 12.5/700 at 6 → body Manrope 11/1.4 `textSecondary` at 3 → optional `AppButton.secondary`. Copy is specific and actionable: "Nothing here yet — add five things and Noor starts styling."

---

## 9.27 AppErrorView

**File** `app_error_view.dart`

Same geometry as the empty state on `oklch(0.97 0.02 25)` with a 1px `oklch(0.88 0.06 25)` border. Glyph 26 `error`, title `oklch(0.42 0.14 25)`, body `oklch(0.5 0.1 25)`, always with a retry action. Copy names the cause: "Couldn't reach the stylist. Retry."

---

## 9.28 AppCallout

**File** `app_callout.dart`

Inline advisory block. Radius 14, padding 12–14, Manrope 11/1.5 `#4E4841`.

- **warning / advice** — `oklch(0.96 0.02 90)` on `oklch(0.9 0.05 90)` border. Used for budget advice, privacy notes, rate-limit explanations.
- **info on dark** — `rgba(255,255,255,.06)` on `rgba(255,255,255,.1)`, body `#B9B1A6`.

---

## 9.29 AppSnackBar

**File** `app_snack_bar.dart`

*(Assumption: the design shows no snackbar; this follows the system so one exists when needed.)* `surfaceInverse`, radius 14, padding 14 × 16, Manrope 13/600 `#F6F4F0`, optional trailing text action in `oklch(0.75 0.09 55)`. Floating, 20 side margin, 16 above the tab bar. Duration 3s, 4s with an action.

---

## 9.30 AppToggle

**File** `app_toggle.dart`

Track 38–40 × 22–23, radius `full`. On: `neutral900` track, 16–17 white knob inset 3 right. Off: `#D6D0C6` (light) / `rgba(255,255,255,.16)` (dark), knob inset 3 left. Animation 180ms `easeOutCubic`. Hit target padded to 48.

---

## 9.31 AppImage

**File** `app_image.dart`

Every photographic slot. Props: `aspectRatio`, `radius`, `label`, `imageProvider`.

- **Placeholder** (no image): `repeating-linear-gradient(135deg, …)` at 45°, 6px stripes — light pairs `#EFEBE4/#E4DFD6`, `#E7E4EE/#DCD8E6`, `#E4EAE6/#D8E0DA`, `#F0E8E2/#E6DCD3`; dark pair `#2A2621/#221F1A`. In Flutter, a `CustomPainter` drawing 45° stripes. Optional monospace label bottom-left describing the expected content.
- **Loaded**: `cached_network_image`, `BoxFit.cover`, fade-in 240ms.
- **Error**: falls back to the placeholder plus a `cloud_off` glyph.

---

## 9.32 AppScaffold

**File** `app_scaffold.dart`

Wraps every screen: `background` fill, `SafeArea(bottom: false)`, 20 horizontal padding, bottom padding 108 when the tab bar is present, `SingleChildScrollView` with `BouncingScrollPhysics`, and slot-in `appBar` / `bottomSheet`.
