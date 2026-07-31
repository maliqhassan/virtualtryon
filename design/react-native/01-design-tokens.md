# 01 · Design tokens (Expo / NativeWind / TypeScript)

Translates `../figma/01-foundation.md` §3–8 (colour, typography, spacing, radius, elevation, iconography) into the actual stack. Every value below is carried over from the source spec unchanged — nothing here is a new design decision, only a platform translation. Where the translation isn't a clean 1:1 (typography, icons, shadows), that's called out explicitly rather than papered over.

All code blocks are paste-ready for `frontend/` but **not yet pasted** — see the bundle README.

---

## 1. Colour

### Why CSS variables, not a flat NativeWind palette

The source is a light/dark **theme** — every token has two values sharing hue and chroma. A flat `tailwind.config.js` palette can't express "this token flips with theme" on its own. The standard NativeWind pattern (and the one used here) is CSS custom properties in `global.css`, swapped by a `.dark` class, referenced from `tailwind.config.js`:

```css
/* frontend/src/global.css — add alongside the existing @tailwind directives */
:root {
  --color-primary: #B4713F;
  --color-primary-pressed: #95592E;
  --color-secondary: #4A5578;
  --color-accent: #C9A227;

  --color-success: #3E8F63;
  --color-success-fg: #2E7050;
  --color-success-bg: #DCF0E4;
  --color-warning: #C9922E;
  --color-warning-fg: #7E5A18;
  --color-warning-bg: #F5EBD3;
  --color-error: #B4402E;
  --color-error-fg: #8E3324;
  --color-error-bg: #F7E5E1;
  --color-callout-bg: #F7F3E9;
  --color-callout-border: #E5DCC0;
  --color-error-callout-bg: #FBEFEC;
  --color-error-callout-border: #EBCFC8;

  --color-background: #F6F4F0;
  --color-surface: #FFFFFF;
  --color-surface-inverse: #16130F;
  --color-surface-muted: #F0EDE7;
  --color-scrim: rgba(22, 19, 15, 0.42);
  --color-glass: rgba(255, 255, 255, 0.55);

  --color-neutral-50: #FBFAF8;
  --color-neutral-100: #F0EDE7;
  --color-neutral-200: #E2DED6;
  --color-neutral-300: #C9C3B9;
  --color-neutral-400: #A39B90;
  --color-neutral-500: #8A8278;
  --color-neutral-600: #6B655D;
  --color-neutral-700: #4E4841;
  --color-neutral-800: #3B372F;
  --color-neutral-900: #16130F;

  --color-text-primary: #16130F;
  --color-text-body: #4E4841;
  --color-text-secondary: #6B655D;
  --color-text-muted: #8A8278;
  --color-text-placeholder: #A39B90;
  --color-text-disabled: #C9C3B9;
  --color-text-on-primary: #F6F4F0;
  --color-text-on-accent: #1A1509;

  --color-border: rgba(22, 19, 15, 0.08);
  --color-border-strong: rgba(22, 19, 15, 0.12);
  --color-border-focus: #16130F;
  --color-border-dashed: rgba(22, 19, 15, 0.18);
  --color-divider: rgba(22, 19, 15, 0.06);
  --color-divider-strong: rgba(22, 19, 15, 0.1);
}

.dark:root {
  --color-primary: #CE8A54;
  --color-secondary: #8E9BC4;
  --color-accent: #C9A227;

  --color-success: #57A87B;
  --color-warning: #D9A544;
  --color-error: #C85842;

  --color-background: #12110F;
  --color-surface: #1C1A17;
  --color-surface-inverse: #1C1A17;
  --color-surface-muted: #232019;
  --color-scrim: rgba(0, 0, 0, 0.55);
  --color-glass: rgba(28, 26, 23, 0.62);

  --color-text-primary: #F2EFEA;
  --color-text-body: #B9B1A6;
  --color-text-secondary: #A39B90;

  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-strong: rgba(255, 255, 255, 0.1);
  --color-border-focus: #F2EFEA;
  --color-divider: rgba(255, 255, 255, 0.08);
  --color-divider-strong: rgba(255, 255, 255, 0.1);
}
```

Note what's *missing* from the dark block: `neutral-*`, `text-muted/placeholder/disabled/onPrimary/onAccent`, and most semantic-tint fg/bg pairs. The source spec doesn't redefine them for dark (the neutral ramp is reused as-is; the semantic tint pairs are a light-mode-only badge treatment with no documented dark variant). Carried forward as-is rather than inventing dark values that weren't specified — see `04-inconsistencies-and-recommendations.md`.

```js
// frontend/tailwind.config.js — theme.extend.colors
colors: {
  primary: { DEFAULT: 'var(--color-primary)', pressed: 'var(--color-primary-pressed)' },
  secondary: 'var(--color-secondary)',
  accent: 'var(--color-accent)',

  success: { DEFAULT: 'var(--color-success)', fg: 'var(--color-success-fg)', bg: 'var(--color-success-bg)' },
  warning: { DEFAULT: 'var(--color-warning)', fg: 'var(--color-warning-fg)', bg: 'var(--color-warning-bg)' },
  error: { DEFAULT: 'var(--color-error)', fg: 'var(--color-error-fg)', bg: 'var(--color-error-bg)' },
  info: 'var(--color-secondary)', // shares the secondary ramp by design — see 01-foundation.md §3.1
  callout: { bg: 'var(--color-callout-bg)', border: 'var(--color-callout-border)' },
  errorCallout: { bg: 'var(--color-error-callout-bg)', border: 'var(--color-error-callout-border)' },

  background: 'var(--color-background)',
  surface: { DEFAULT: 'var(--color-surface)', inverse: 'var(--color-surface-inverse)', muted: 'var(--color-surface-muted)' },
  scrim: 'var(--color-scrim)',
  glass: 'var(--color-glass)',

  neutral: {
    50: 'var(--color-neutral-50)', 100: 'var(--color-neutral-100)', 200: 'var(--color-neutral-200)',
    300: 'var(--color-neutral-300)', 400: 'var(--color-neutral-400)', 500: 'var(--color-neutral-500)',
    600: 'var(--color-neutral-600)', 700: 'var(--color-neutral-700)', 800: 'var(--color-neutral-800)',
    900: 'var(--color-neutral-900)',
  },

  ink: {
    primary: 'var(--color-text-primary)', body: 'var(--color-text-body)', secondary: 'var(--color-text-secondary)',
    muted: 'var(--color-text-muted)', placeholder: 'var(--color-text-placeholder)', disabled: 'var(--color-text-disabled)',
    onPrimary: 'var(--color-text-on-primary)', onAccent: 'var(--color-text-on-accent)',
  },

  border: { DEFAULT: 'var(--color-border)', strong: 'var(--color-border-strong)', focus: 'var(--color-border-focus)', dashed: 'var(--color-border-dashed)' },
  divider: { DEFAULT: 'var(--color-divider)', strong: 'var(--color-divider-strong)' },
},
```

`ink` (not `text`) as the group name is deliberate — `text-text-primary` as a className reads badly and Tailwind's own `text-*` utility already owns the `text` prefix for font colour. `text-ink-primary`, `text-ink-body`, `border-border`, `divide-divider-strong` are the resulting classNames. Swap the group name if the team prefers stricter 1:1 traceability to `AppColors.textPrimary` over className readability — it's a one-line change.

### Dark mode: forced-light app, two forced-dark screens — not a global toggle

Per `../figma/03-screens.md` and the screenshot review, this product is **not** "light theme + dark theme, user picks." It's a light-first app where exactly two screens (Try-On, 360° player) are always dark regardless of system/user preference, and Settings shows an Appearance control whose v1 scope is an open question the source docs flag themselves (`04-react-native.md` §22: *"Confirm whether the Settings appearance toggle ships in v1 or is a stub"*).

That means: **don't** wire NativeWind's `dark:` variant to the OS colour scheme app-wide. Two screens can't be reactively dark against a scheme that's supposed to stay light everywhere else without a lot of fighting the framework. Instead:

- App root forces `colorScheme.set('light')` (from the `nativewind` package) on boot, ignoring `Appearance.getColorScheme()`. This is what makes `bg-background`, `text-ink-primary` etc. resolve to their light values everywhere by default.
- Try-On and the 360° player **don't use the `dark:` variant at all.** They apply the literal dark-surface tokens directly — `bg-surface-inverse`, `text-ink-onPrimary` — the same tokens Today's outfit-hero card already uses for its permanently-dark card. A screen that's always dark and a card that's always dark are the same problem; solve it once.
- If/when a real Settings-driven light/dark/system toggle ships, `colorScheme.set()` becomes user-triggered instead of hardcoded, and the CSS variables above already support it — nothing in this token layer needs to change, only the trigger.

---

## 2. Typography

### Why a wrapper component, not just Tailwind tokens

`AppTypography.headline` in the source bundles family + size + line-height + weight + tracking + colour into one named style, and rule 4 in `04-react-native.md` §20 is *"Never construct a TextStyle inline."* Tailwind is utility-first — the equivalent would be composing 4–5 separate classes per usage (`font-sans text-[27px] leading-[32px] font-bold tracking-[-0.54px]`), which is exactly the kind of per-callsite reconstruction the source rule exists to prevent. A raw token layer alone would quietly reintroduce the drift risk the Flutter design explicitly guards against.

So: define the raw tokens (for genuine one-off composition), **and** a small `AppText` wrapper component that maps `variant` 1:1 to the table below — the RN equivalent of the getter. `AppText` is specified in `02-component-inventory.md`; this section is its token source.

### Fonts

Loaded via `@expo-google-fonts/*` (Expo's standard font-loading pattern — the RN equivalent of the source's `google_fonts` package in offline/bundled mode) rather than fetched at runtime:

```
@expo-google-fonts/manrope           — 400, 500, 600, 700, 800
@expo-google-fonts/instrument-serif  — 400, 400 italic
@expo-google-fonts/ibm-plex-mono     — 400, 500
@expo-google-fonts/noto-nastaliq-urdu — 400, 600
```

Loaded once in `app/_layout.tsx` via `useFonts()`, gating first render behind `SplashScreen.preventAutoHideAsync()` until resolved — standard Expo pattern, not yet wired into the current `_layout.tsx` (which has nothing to gate on yet).

```js
// frontend/tailwind.config.js — theme.extend.fontFamily
fontFamily: {
  sans: ['Manrope_400Regular'],       // + weight-specific families below
  serif: ['InstrumentSerif_400Regular'],
  'serif-italic': ['InstrumentSerif_400Regular_Italic'],
  mono: ['IBMPlexMono_400Regular'],
  urdu: ['NotoNastaliqUrdu_400Regular'],
},
```

Expo Google Fonts registers one family name per weight (`Manrope_700Bold`, not `Manrope` + `font-weight:700`) — RN's `Text` doesn't synthesize weights from a single family the way web does. The full set needed:

`Manrope_400Regular` `Manrope_500Medium` `Manrope_600SemiBold` `Manrope_700Bold` `Manrope_800ExtraBold` · `InstrumentSerif_400Regular` `InstrumentSerif_400Regular_Italic` · `IBMPlexMono_400Regular` `IBMPlexMono_500Medium` · `NotoNastaliqUrdu_400Regular` `NotoNastaliqUrdu_600SemiBold`

`AppText` (component doc) resolves `variant` → the correct specific family, not just `font-sans` + a separate weight utility, to sidestep RN's no-weight-synthesis limitation entirely.

### Type scale

Values unchanged from `01-foundation.md` §4 (letter-spacing already converted from em to px there — reused, not recomputed):

| Variant | Family | Size/Line-height | Weight | Tracking | Usage |
|---|---|---|---|---|---|
| `display` | serif | 52/53 | 400 | −0.52px | Brand wordmark, design board only |
| `displayLarge` | serif | 40/40 | 400 | 0 | Hero numbers |
| `displayMedium` | serif | 34/36 | 400 | 0 | "Good morning, Zara"; screen headlines |
| `displaySmall` | serif | 27/30 | 400 | 0 | Gallery-screen headlines |
| `displayScore` | serif | 62/62 | 400 | 0 | The overall rating number |
| `displayStat` | serif | 26/26 | 400 | 0 | Stat card values |
| `outfitName` | serif | 25/27 | 400 | 0 | Outfit title on the hero card |
| `headline` | sans | 27/32 | 700 | −0.54px | Screen titles |
| `headlineSmall` | sans | 20/24 | 700 | −0.2px | Gallery-screen titles |
| `title` | sans | 18/24 | 600 | 0 | Card headers, sheet titles |
| `titleSmall` | sans | 15/20 | 700 | 0 | Product names, list row titles |
| `subtitle` | sans | 14/20 | 600 | 0 | Secondary row titles |
| `body` | sans | 15/23 | 400 | 0 | Reasoning, chat, product copy |
| `bodySmall` | sans | 12.5/19 | 400 | 0 | Dense card copy |
| `bodyXSmall` | sans | 11/16.5 | 400 | 0 | Callout copy, fine print |
| `caption` | sans | 12/17 | 500 | 0 | Metadata in sans contexts |
| `button` | sans | 15/15 | 700 | 0.15px | Button label |
| `buttonSmall` | sans | 12.5/13 | 700 | 0 | In-card buttons |
| `label` | sans | 12.5/16 | 600 | 0 | Chips, filter pills |
| `navLabel` | mono | 9.5/12 | 600 | 0 | Bottom-nav labels |
| `overline` | mono | 11/11 | 500 | 1.54px, uppercase | Section overlines |
| `overlineSmall` | mono | 9.5/11 | 500 | 1.14px, uppercase | In-card field labels |
| `mono` | mono | 11/15 | 500 | 0 | Counts, timestamps |
| `monoSmall` | mono | 10/14 | 500 | 0 | Dense metadata |
| `monoBadge` | mono | 9.5/11 | 600 | 0 | Score/tag badges |
| `hint` | sans | 14/20 | 400 | 0 | Input placeholder |
| `errorText` | sans | 10.5/15 | 500 | 0 | Field-level validation |
| `urduTitle` | urdu | 22/42 (1.9–2.0 lh) | 400 | 0 | Urdu headings |
| `urduBody` | urdu | 12.5/25 (2.0 lh) | 400 | 0 | Urdu body |

Minimum sizes carried over unchanged: nothing below 9.5px; 9.5–10px reserved for mono metadata only; reading copy never below 11px.

---

## 3. Spacing

Base unit 4, unchanged from `01-foundation.md` §5:

```js
// frontend/tailwind.config.js — theme.extend.spacing
spacing: {
  xxs: '2px', xs: '4px', sm: '8px', md: '12px', lg: '16px',
  xl: '20px',   // screen gutter
  xxl: '24px', xxxl: '32px', huge: '48px',

  'screen-gutter': '20px', 'screen-gutter-sm': '16px', // < 360dp width
  'bottom-nav-h': '82px', 'bottom-nav-clear': '108px',
  'card-pad': '16px', 'card-pad-hero': '20px',
  'grid-gutter': '11px', 'chip-gap': '7px',
},
```

Used directly: `p-md`, `gap-sm`, `mt-xxl`, `px-screen-gutter`, `pb-bottom-nav-clear`. Tailwind's own spacing model already matches this system closely — no wrapper needed here, unlike typography.

---

## 4. Radius

Unchanged from `01-foundation.md` §6:

```js
// frontend/tailwind.config.js — theme.extend.borderRadius
borderRadius: {
  xs: '4px', sm: '8px', md: '12px', lg: '14px',
  xl: '16px', xxl: '20px', xxxl: '26px',
  sheet: '28px', // top corners only — apply with rounded-t-sheet, RN needs explicit borderTopLeftRadius/borderTopRightRadius since `rounded-t-*` maps to both top corners which is actually what we want here
  full: '9999px',
},
```

Avatars always `rounded-full`. Images inside cards take the card's radius minus its padding, rounded to the nearest token (in practice 10–14px) — a per-usage judgement call, not a token.

---

## 5. Elevation / shadow

**Cross-platform risk, not a clean translation — read before using.** The source system is one soft warm-tinted shadow (`0 6 22 rgba(22,19,15,.07)`) plus one hero shadow, with an explicit rule that dark theme has *zero* shadows (border instead). React Native's shadow model is platform-forked: iOS reads `shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius` directly (close to CSS `box-shadow`); Android only reads `elevation`, which renders a fixed grey/black shadow shape Android controls, not a custom-tinted soft shadow, and doesn't support colour at all pre-Android 12's `dropShadow`. NativeWind v4.2 (the installed version) does translate a `shadow-*`/arbitrary `[box-shadow:...]` utility to the correct native props, but the *result* will look correct on iOS and visibly different (harder-edged, neutral-toned) on Android — that's a platform limitation, not a config mistake. Flag for visual QA on an Android device once implemented; don't assume parity from the token alone.

```js
// frontend/tailwind.config.js — theme.extend.boxShadow
boxShadow: {
  soft: '0 6px 22px rgba(22, 19, 15, 0.07)',
  hero: '0 10px 30px rgba(22, 19, 15, 0.14)',
},
```

`shadow-none` (Tailwind's built-in) for all standard cards — they use a 1px border instead, per source rule. `shadow-hero` is reserved for the Today outfit-hero card only. Nothing stacks two shadow classes on one element.

---

## 6. Iconography

**The single biggest technical gap between the source spec and what's readily available in Expo — read before building any component that uses an icon.**

The source specifies **Material Symbols Rounded** (weight 400, fill 0, grade 0, optical size 24) throughout, with a per-screen glyph inventory in `01-foundation.md` §8. Expo's standard icon solution, `@expo/vector-icons`, bundles `MaterialIcons` and `MaterialCommunityIcons` — both are **different, older icon sets**, not Material Symbols. Glyph names mostly-but-not-always match (`checkroom`, `auto_awesome` exist in both; exact silhouettes differ because Material Symbols Rounded is a distinct optical variant, not the same artwork). Shipping with `@expo/vector-icons`'s `MaterialIcons` would silently violate the approved design's icon spec on every screen.

**Recommended approach:** load the actual Material Symbols Rounded font and render glyphs as text with ligature names — the same technique the source's own HTML prototype uses (`<span class="ms">favorite</span>` — Material Symbols is a ligature font; the literal word "favorite" renders as the icon glyph). This is directly portable to RN:

1. Download the **static** Rounded instance at weight 400 / fill 0 (Google Fonts serves static cuts of Material Symbols alongside the variable font — use the static one). RN's `Text` doesn't support manipulating variable-font axes (`FILL`, `wght`, `GRAD`, `opsz`) at runtime the way CSS `font-variation-settings` does on web, so the variable font alone isn't reliable here — **verify this against the RN/Expo version in use when implementing**; RN's variable-font support has been improving and this constraint should be re-checked, not assumed indefinitely.
2. Load it via `expo-font` as e.g. `MaterialSymbolsRounded`.
3. An `AppIcon` component (specified in `02-component-inventory.md`) renders `<Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize }}>{name}</Text>` where `name` is the exact glyph ligature (`"favorite"`, `"auto_awesome"`, etc.) — the per-screen inventory in `01-foundation.md` §8 is the glyph list to use verbatim.

### Sizes

Unchanged from `01-foundation.md` §8:

```js
// TypeScript constant, not a Tailwind token — icon size is a component prop, not a className
export const AppIconSize = { xs: 14, sm: 17, md: 20, lg: 22, xl: 26 } as const;
```

Stroke weight fixed at 400 across all sizes — never optically adjusted, matching the source rule.

---

## 7. Motion

Unchanged from `01-foundation.md` §2 and `04-react-native.md` §18. `Curves.easeOutCubic` (Flutter) → Reanimated's built-in `Easing.out(Easing.cubic)` (React Native Reanimated, already installed):

```ts
// frontend/src/constants/motion.ts
export const AppDurations = {
  instant: 120,   // press, favourite
  fast: 180,      // hover, tab fade, toggle
  standard: 240,  // image fade-in
  emphasis: 320,  // sheets, hero, page push
  slow: 400,      // try-on cross-fade
  reveal: 520,    // staggered outfit reveal
  count: 700,     // score count-up
  breath: 1500,   // thinking orb cycle
  stagger: 40,    // per-item delay
} as const;

// usage: withTiming(value, { duration: AppDurations.standard, easing: Easing.out(Easing.cubic) })
```

**No spinner, anywhere** — the source's strongest motion rule (`ThinkingIndicator` replaces every loading spinner; see `02-component-inventory.md`) carries over unchanged as a hard constraint, not a preference.

---

## 8. What's deliberately not tokenised here

- **Placeholder stripe colours** (`stripeA1`/`stripeA2` etc.) and **editorial/lookbook palette** — real values exist in `04-react-native.md` §18's Dart source and are mechanical hex-for-hex translations with no RN-specific wrinkle; omitted here to keep this document to the tokens that needed actual translation work, not copied for completeness. Pull them directly from that file when building `AppImage`'s placeholder painter and the lookbook screens.
