# 01 · Foundation

Sections 1–8 of the handoff. Every value here is extracted from the approved design.

---

# 1. Project overview

## Product vision

A wardrobe that thinks. AI Stylist photographs what a user already owns, learns their face shape, body proportions, skin tone and taste, and then dresses them — daily, for events, and while shopping. Global product with first-class support for Pakistani/Eastern fashion (kurta, shalwar kameez, sherwani, waistcoat, dupatta, khussa, prince coat).

## UI philosophy

**The app makes decisions; the user edits them.** Every AI surface presents a committed answer plus one sentence of reasoning, never a menu of possibilities. Every AI answer has an escape hatch (shuffle, edit, "not this").

## Design language

Warm bone paper, ink text, a single clay accent doing all the work, with gold reserved for premium and celebratory moments. Editorial serif for the things a human would name (outfit titles, scores); a geometric sans for interface; monospace for machine metadata. Generous whitespace. One soft shadow, never stacked. Glass only over imagery.

## Visual identity

| Element | Value |
|---|---|
| Wordmark | "AI Stylist", Instrument Serif regular |
| Tagline | "dress with certainty" — IBM Plex Mono, uppercase, .2em tracking |
| AI assistant name | **Noor** |
| Noor's avatar | radial gradient, `oklch(0.78 0.1 90)` at 35%/30% → `oklch(0.55 0.11 55)`, full circle |
| Splash | `#16130F` field, breathing Noor orb, wordmark, tagline |

## Overall experience

Time-to-first-value target is **under 3 minutes**: splash → 3 onboarding cards → auth → 3-photo scan → style profile → batch closet upload → first outfit. Closet ingestion is batch-first (multi-select camera roll, background AI tagging); the user is never asked to label a garment.

---

# 2. Design principles

## Visual hierarchy

1. **One hero per screen.** Today has the outfit card; Closet has the grid; Try-On has the canvas. Everything else is secondary and visually quieter.
2. **Dark cards carry the AI.** A `#16130F` surface signals "this is a machine judgement" (today's outfit, style profile, score panel, price suggestion). Light `#FFFFFF` cards carry user data.
3. **Serif for the named thing, sans for the interface.** Outfit names, score numbers and profile values are Instrument Serif; labels, buttons and body copy are Manrope.
4. **Mono for metadata.** Timestamps, counts, scores, generation notes and section overlines are IBM Plex Mono — visually distinct from anything a user typed.

## Spacing philosophy

A 4pt base scale (4·8·12·16·24·32·48). Screen gutter is 20dp everywhere. Related elements sit at 8–12; distinct sections at 24–32. Vertical rhythm comes from `margin-top` on the following element, never `margin-bottom` — this is why every Flutter section starts with a `SizedBox`, not ends with one.

## Consistency rules

- Never introduce a colour outside §3. Never introduce a radius outside §6.
- Match quality is **never colour-only** — every badge carries its number *and* its word (`94 · perfect`).
- Every card is either `#FFFFFF` + 1px `rgba(22,19,15,.08)` border, or `#16130F` with no border. There is no third card treatment.
- The clay accent is never used for body copy below 16px.
- Icons are always Material Symbols Rounded, always at one of the four sizes in §8.

## Accessibility

Body text passes 4.5:1 (`#4E4841` on `#F6F4F0` = 7.9:1). Hit targets ≥ 48dp. Full detail in `04-flutter.md` §15.

## Responsive behaviour

390dp base. Single-column below 360dp; `NavigationRail` + two-pane master/detail at ≥ 600dp. Full detail in `04-flutter.md` §14.

## Interaction philosophy

Nothing auto-posts, auto-buys or auto-deletes. Destructive and financial actions always require an explicit confirm. Free-tier limits are surfaced as a running count *before* they bite (`3 of 3 free generations left today`), never as a surprise wall.

## Animation philosophy

Motion communicates system state, never decorates. **No spinners** — AI thinking is a breathing radial glow with a named step ("step 2 of 3 · draping fabric"). Nothing bounces. Nothing loops longer than 2s. All easing is `Curves.easeOutCubic`. Full timing table in `03-screens.md` §13.

## Component philosophy

A small set of primitives, heavily reused: one button in three variants, one card in two surfaces, one chip in two states, one score badge in three semantic colours. If a screen needs something new, it is composed from these — not styled bespoke.

---

# 3. Colour system

All colours are authored in **oklch** so light and dark share hue and chroma and shift only in lightness. Hex values below are the sRGB resolutions used in the design; ship the hex.

## 3.1 Brand & semantic

| Token | Light | Dark | oklch | Purpose / usage |
|---|---|---|---|---|
| `AppColors.primary` | `#B4713F` | `#CE8A54` | L .62→.70, C .11, H 55 | Clay accent. Overlines, active links, "Generate" CTA, selected states, Noor's warm end. Never body copy < 16px. |
| `AppColors.secondary` | `#4A5578` | `#8E9BC4` | L .42→.68, C .06/.07, H 262 | Cool slate. Chat/Noor iconography, "Ask Noor" card icon, measurement tips. Used sparingly — roughly one element per screen. |
| `AppColors.accent` | `#C9A227` | `#C9A227` | L .72, C .13, H 90 | Gold. Pro/subscription, Eid & wedding editorial, score progress fills, verified badges, celebratory moments only. |
| `AppColors.success` | `#3E8F63` | `#57A87B` | L .58→.66, C .11, H 150 | "Perfect match", capture confirmed, price drop, outfit locked. |
| `AppColors.warning` | `#C9922E` | `#D9A544` | L .72, C .13, H 70 | "Good match", retake photo, dead stock, budget approaching cap. |
| `AppColors.error` | `#B4402E` | `#C85842` | L .56→.64, C .16, H 25 | "Poor match", validation failure, sold out, dry-clean overdue, delete. |
| `AppColors.info` | `#4A5578` | `#8E9BC4` | = secondary | Informational callouts. Shares the secondary ramp by design; there is no separate info hue. |

### Semantic tint pairs (badges, callouts)

| Use | Foreground | Background |
|---|---|---|
| Perfect match | `oklch(0.45 0.11 150)` `#2E7050` | `oklch(0.94 0.04 150)` `#DCF0E4` |
| Good match | `oklch(0.48 0.13 70)` `#7E5A18` | `oklch(0.95 0.05 85)` `#F5EBD3` |
| Poor match | `oklch(0.46 0.14 25)` `#8E3324` | `oklch(0.95 0.04 25)` `#F7E5E1` |
| Warning callout | `#4E4841` | `oklch(0.96 0.02 90)` `#F7F3E9` on `oklch(0.9 0.05 90)` `#E5DCC0` border |
| Error callout | `oklch(0.42 0.14 25)` `#7A2C1E` | `oklch(0.97 0.02 25)` `#FBEFEC` on `oklch(0.88 0.06 25)` `#EBCFC8` border |

## 3.2 Surfaces

| Token | Light | Dark | Usage |
|---|---|---|---|
| `AppColors.background` | `#F6F4F0` | `#12110F` | Scaffold. |
| `AppColors.surface` | `#FFFFFF` | `#1C1A17` | Cards, inputs, sheets, list rows. |
| `AppColors.surfaceInverse` | `#16130F` | `#1C1A17` | AI cards: today's outfit, style profile, score panel, laundry reminder, price suggestion. Reads as "the machine speaking". |
| `AppColors.surfaceMuted` | `#F0EDE7` | `#232019` | Inactive chips, tag pills, disabled size swatches. |
| `AppColors.scrim` | `rgba(22,19,15,.42)` | `rgba(0,0,0,.55)` | Behind bottom sheets and dialogs. |
| `AppColors.glass` | `rgba(255,255,255,.55)` | `rgba(28,26,23,.62)` | `BackdropFilter` σ 12–18. Tab bar, camera overlays, try-on result caption **only**. |

## 3.3 Neutral ramp

Hue 55, chroma ≤ .012 — warm, never a pure grey.

| Token | Hex | Usage |
|---|---|---|
| `AppColors.neutral50` | `#FBFAF8` | Lightest fill. |
| `AppColors.neutral100` | `#F0EDE7` | Muted surface, tag pill background. |
| `AppColors.neutral200` | `#E2DED6` | Track for progress bars, inactive slider. |
| `AppColors.neutral300` | `#C9C3B9` | Disabled text, inactive chevrons, empty-state icons. |
| `AppColors.neutral400` | `#A39B90` | Placeholder text, mono metadata on dark, inactive tab icons. |
| `AppColors.neutral500` | `#8A8278` | Section overlines, secondary mono. |
| `AppColors.neutral600` | `#6B655D` | Secondary body copy. |
| `AppColors.neutral700` | `#4E4841` | Primary body copy. |
| `AppColors.neutral800` | `#3B372F` | — |
| `AppColors.neutral900` | `#16130F` | Ink. Headings, primary buttons, inverse surfaces. |

Additional fixed neutrals used inside dark surfaces: `#2A2621` / `#221F1A` (placeholder stripe pair on dark), `#B9B1A6` (body copy on dark), `#F2EFEA` (text on dark), `#D6D0C6` (sheet grabber, off-switch track).

## 3.4 Text colours

| Token | Light | Dark | Usage |
|---|---|---|---|
| `AppColors.textPrimary` | `#16130F` | `#F2EFEA` | Headings, card titles, values. |
| `AppColors.textBody` | `#4E4841` | `#B9B1A6` | Reading copy, AI reasoning. |
| `AppColors.textSecondary` | `#6B655D` | `#A39B90` | Supporting copy, captions. |
| `AppColors.textMuted` | `#8A8278` | `#8A8278` | Overlines, mono metadata. |
| `AppColors.textPlaceholder` | `#A39B90` | `#6B655D` | Input placeholders, empty labels. |
| `AppColors.textDisabled` | `#C9C3B9` | `#4E4841` | Unavailable sizes, spent "Resend". |
| `AppColors.textOnPrimary` | `#F6F4F0` | `#12110F` | On `surfaceInverse` / on the light-on-dark CTA. |
| `AppColors.textOnAccent` | `#1A1509` | `#12110F` | On gold and clay fills. |

## 3.5 Icon colours

| Context | Colour |
|---|---|
| Default on light | `#16130F` |
| Secondary on light | `#6B655D` |
| Inactive / decorative | `#A39B90` |
| Empty state | `#C9C3B9` |
| On dark surface | `#F2EFEA` |
| Accent action (clay) | `#B4713F` |
| Chat/Noor (slate) | `#4A5578` |
| Premium (gold) | `#C9A227` |
| Semantic | success / warning / error per §3.1 |

## 3.6 Borders & dividers

| Token | Value | Usage |
|---|---|---|
| `AppColors.border` | `rgba(22,19,15,.08)` | Default card and input border, 1px. |
| `AppColors.borderStrong` | `rgba(22,19,15,.12)` | Icon buttons, secondary buttons at rest. |
| `AppColors.borderFocus` | `#16130F` at 1.5px | Focused input, selected radio card, selected size. |
| `AppColors.borderDashed` | `rgba(22,19,15,.16–.18)`, 1px dashed | Empty slots: "add photo", unplanned calendar day, free packing day. |
| `AppColors.divider` | `rgba(22,19,15,.06)` | Between list rows inside a card. |
| `AppColors.dividerStrong` | `rgba(22,19,15,.10)` | Between sections; the OR rule on Login. |
| Dark equivalents | `rgba(255,255,255,.08)` border · `.10` strong · `.12` focus/glass edge · `.14–.16` progress track | Shadows are replaced by borders in dark. |

---

# 4. Typography

Four families. Bundle all weights listed; do not fetch at runtime.

| Family | Weights | Role |
|---|---|---|
| **Manrope** | 400 500 600 700 800 | All interface text. |
| **Instrument Serif** | 400, 400 italic | Display: outfit names, big numbers, screen-defining headlines. |
| **IBM Plex Mono** | 400 500 | Overlines, metadata, counts, scores, system notes. |
| **Noto Nastaliq Urdu** | 400 600 | Urdu headings and body (RTL locale only). |

## Type scale

| Token | Family | Size / line-height | Weight | Tracking | Usage |
|---|---|---|---|---|---|
| `AppTypography.display` | Instrument Serif | 52 / 53 | 400 | −.01em | Brand wordmark on the design board only. |
| `AppTypography.displayLarge` | Instrument Serif | 40 / 40 | 400 | 0 | Hero numbers. |
| `AppTypography.displayMedium` | Instrument Serif | 34 / 36 | 400 | 0 | "Good morning, Zara"; screen-defining headlines. |
| `AppTypography.displaySmall` | Instrument Serif | 27 / 30 | 400 | 0 | Gallery-screen headlines ("Forgot your password?"). |
| `AppTypography.displayScore` | Instrument Serif | 62 / 62 | 400 | 0 | The single overall rating number. |
| `AppTypography.displayStat` | Instrument Serif | 26 / 26 | 400 | 0 | Stat card values (128, 41, 88). |
| `AppTypography.outfitName` | Instrument Serif | 25 / 27 | 400 | 0 | Outfit title on the hero card. |
| `AppTypography.headline` | Manrope | 27 / 32 | 700 | −.02em | Screen titles (Closet, Shop, Settings). |
| `AppTypography.headlineSmall` | Manrope | 20 / 24 | 700 | −.01em | Gallery-screen titles. |
| `AppTypography.title` | Manrope | 18 / 24 | 600 | 0 | Card headers, sheet titles. |
| `AppTypography.titleSmall` | Manrope | 15 / 20 | 700 | 0 | Product names, list row titles. |
| `AppTypography.subtitle` | Manrope | 14 / 20 | 600 | 0 | Secondary row titles. |
| `AppTypography.body` | Manrope | 15 / 23 | 400 | 0 | Reading size: reasoning, chat, product copy. |
| `AppTypography.bodySmall` | Manrope | 12.5 / 19 | 400 | 0 | Dense card copy, AI reasoning inside cards. |
| `AppTypography.bodyXSmall` | Manrope | 11 / 16.5 | 400 | 0 | Callout copy, fine print. |
| `AppTypography.caption` | Manrope | 12 / 17 | 500 | 0 | Metadata in sans contexts. |
| `AppTypography.button` | Manrope | 15 / 15 | 700 | .01em | Primary/secondary button label. |
| `AppTypography.buttonSmall` | Manrope | 12.5 / 13 | 700 | 0 | In-card buttons. |
| `AppTypography.label` | Manrope | 12.5 / 16 | 600 | 0 | Chips, filter pills. |
| `AppTypography.navLabel` | IBM Plex Mono | 9.5 / 12 | 600 | 0 | Bottom-navigation labels. |
| `AppTypography.overline` | IBM Plex Mono | 11 / 11 | 500 | .14em, uppercase | Section overlines, date lines, step counters. |
| `AppTypography.overlineSmall` | IBM Plex Mono | 9.5 / 11 | 500 | .12em, uppercase | In-card field labels ("EMAIL", "SUGGESTED PRICE"). |
| `AppTypography.mono` | IBM Plex Mono | 11 / 15 | 500 | 0 | Counts, timestamps, generation notes. |
| `AppTypography.monoSmall` | IBM Plex Mono | 10 / 14 | 500 | 0 | Dense metadata, stat labels. |
| `AppTypography.monoBadge` | IBM Plex Mono | 9.5 / 11 | 600 | 0 | Score and tag badges. |
| `AppTypography.hint` | Manrope | 14 / 20 | 400 | 0 | Input placeholder — colour `textPlaceholder`. |
| `AppTypography.errorText` | Manrope | 10.5 / 15 | 500 | 0 | Field-level validation — colour `error`. |
| `AppTypography.urduTitle` | Noto Nastaliq Urdu | 22 / 42 | 400 | 0 | Urdu headings. Line-height 1.9–2.0 is mandatory. |
| `AppTypography.urduBody` | Noto Nastaliq Urdu | 12.5 / 25 | 400 | 0 | Urdu body. |

**Minimum sizes:** no interface text below 9.5px, and 9.5–10px is reserved for mono metadata only. Reading copy is never below 11px.

---

# 5. Spacing system

Base unit 4. `AppSpacing`:

| Token | Value | Usage |
|---|---|---|
| `xxs` | 2 | Icon-to-baseline nudges. |
| `xs` | 4 | Inside pill padding, micro gaps. |
| `sm` | 8 | Icon ↔ label, chip gaps, tight grids. |
| `md` | 12 | Card grid gutters, list-item gaps, stacked cards. |
| `lg` | 16 | Inside-card padding, section starts. |
| `xl` | 20 | **Screen gutter.** Card padding on hero cards. |
| `xxl` | 24 | Between distinct sections. |
| `xxxl` | 32 | Major section break. |
| `huge` | 48 | Rare; large empty-state breathing room. |

## Applied rules

| Context | Value |
|---|---|
| Screen horizontal padding | 20 |
| Screen top padding (below status bar) | 62 on prototype screens, 44 on gallery screens — in Flutter use `SafeArea` + 20 |
| Screen bottom padding (above tab bar) | 108 (tab bar height 82 + 26 clearance) |
| Card internal padding | 12 (compact) · 14 (list row) · 16 (standard) · 18–20 (hero) |
| Gap between stacked cards | 12 |
| Grid gutter (closet 2-col) | 11 |
| Chip row gap | 7 |
| Icon ↔ label inside a row | 8–12 |
| Section overline → content | 9–12 |
| Section → next section | 16–26 |
| Bottom sheet padding | 12 top · 20 sides · 34 bottom |
| Bottom sheet grabber | 40 × 4, `#D6D0C6`, 16 below |

---

# 6. Border radius

`AppRadius`:

| Token | Value | Applied to |
|---|---|---|
| `xs` | 4–5 | Micro tags, "SAVE 33%" flag. |
| `sm` | 8–9 | Calendar day cells, small swatches, colour-balance bars. |
| `md` | 10–12 | Inner image tiles, size selectors, thumbnails, in-card buttons. |
| `lg` | 13–14 | Standard buttons, inputs, compact cards, icon buttons. |
| `xl` | 15–16 | Primary CTA buttons, inset cards on dark. |
| `xxl` | 18–20 | Cards, list cards, product cards, empty states. |
| `xxxl` | 22–26 | Hero cards (today's outfit, style profile). |
| `sheet` | 28 top-left / top-right only | Bottom sheets. |
| `full` | 999 | Chips, badges, pills, avatars, toggles, FAB, weather pill. |

**Avatars** are always `full`. **Images inside cards** take the card's radius minus its padding, rounded to the nearest token — in practice 10–14.

---

# 7. Elevation

There is exactly **one** shadow in the system. Do not stack, do not invent a second.

| Token | Value | Applied to |
|---|---|---|
| `AppShadows.none` | — | All standard cards (they use a 1px border instead). |
| `AppShadows.soft` | `0 6 22 rgba(22,19,15,.07)` | Glass panels, floating overlays. |
| `AppShadows.hero` | `0 10 30 rgba(22,19,15,.14)` | Today's outfit card only. |
| `AppShadows.device` | `0 4 16 rgba(22,19,15,.12)` | Gallery presentation frames — **not product UI**. |

Rules:
- **Elevation is expressed by border and surface colour, not by shadow.** A card is separated from the background by `1px rgba(22,19,15,.08)`.
- **In dark theme there are no shadows at all.** Replace with `1px rgba(255,255,255,.08)`.
- The bottom navigation is a `BackdropFilter` (σ 18) + `1px` top border, not an elevated `Material`. Set `elevation: 0` on the `NavigationBar`.
- Bottom sheets get the scrim, not a shadow.
- Buttons are never elevated.

---

# 8. Iconography

**Library:** Material Symbols Rounded, weight 400, fill 0, grade 0, optical size 24. Flutter package: `material_symbols_icons` (`SymbolsRounded` set, `fill: 0`, `weight: 400`).

## Sizes

| Token | Value | Usage |
|---|---|---|
| `AppIcons.xs` | 14–15 | Inline with mono/caption text, check marks in lists. |
| `AppIcons.sm` | 16–18 | In-card affordances, chevrons, toggles-adjacent. |
| `AppIcons.md` | 19–20 | List rows, input adornments, back arrows on gallery screens. |
| `AppIcons.lg` | 22–23 | Tab bar, app-bar actions, feature-card icons. |
| `AppIcons.xl` | 26–30 | Empty states, sheet option cards, hero moments. |

Stroke weight is fixed at 400 across all sizes — never optically adjust. Icons align to text **baseline** when inline and to **centre** when in a row with a label.

## Icon inventory by screen

| Screen | Glyphs |
|---|---|
| Today | `wb_twilight` `clear_day` `rainy` `verified` `auto_awesome` `visibility` `refresh` `bookmark_border` `check_circle` `photo_camera` `forum` `local_laundry_service` `chevron_right` |
| Closet | `search` `add` `favorite` `favorite_border` `checkroom` |
| Add sheet | `photo_library` `photo_camera` `receipt_long` `link` |
| Try-On | `accessibility_new` `auto_awesome` `ios_share` `3d_rotation` `autorenew` `straighten` `compare` `hd` `close` |
| Shop / Product | `shopping_bag` `bookmark` `bookmark_border` `sell` |
| You / Settings | `person` `insights` `local_laundry_service` `luggage` `notifications` `settings` `help` |
| Auth | `mail` `lock` `visibility_off` `check_box` `error` `arrow_back` `radio_button_checked` `radio_button_unchecked` |
| Analysis | `check` `autorenew` `circle` `replay` `check_circle` `add` |
| Rating | `palette` `straighten` `watch` |
| Calendar / Packing | `event` `luggage` |
| Generator | `business_center` `celebration` `fitness_center` `flight` `school` `mosque` |
| Details | `more_horiz` `add_a_photo` |
| Share | `download` `link` `chat` `more_horiz` `tune` |
| Empty / error | `checkroom` `cloud_off` `alarm` `priority_high` |

## Usage rules

1. An icon never appears alone as the sole meaning of a destructive or financial action — always paired with a label.
2. Tab-bar icons are 22 (23 for the raised centre); labels are always present.
3. Decorative icons inside feature cards take a semantic colour; functional icons inside rows take `textSecondary`.
4. Never mix filled and outlined variants in the same row. Fill is used only for the *active* favourite (`favorite`) against its inactive counterpart (`favorite_border`).
