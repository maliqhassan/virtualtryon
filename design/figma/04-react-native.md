# 04 · Flutter implementation

Sections 14–22 of the handoff.

---

# 14. Responsive guidelines

**Base:** 390 × 844 dp (iPhone 14 / Pixel 7 class). All values in this bundle are dp at that base.

| Breakpoint | Behaviour |
|---|---|
| **< 360dp** (compact phone) | Closet grid → 1 column. Outfit hero mosaic → single full-width tile, side stack dropped. Stat rows (3 across) → 2 + 1 wrap. Chip rows already scroll. Screen gutter drops 20 → 16. |
| **360–599dp** (phone, default) | The design as specified. |
| **600–904dp** (foldable open, small tablet) | `AppBottomNav` → `NavigationRail` on the leading edge, 88 wide, same five destinations, labels below icons. Content max-width 640, centred. Closet → 3 columns. |
| **≥ 905dp** (tablet, desktop) | Two-pane master/detail: Closet grid ‖ Clothing details; Shop feed ‖ Product details; Chat list ‖ conversation. Master pane fixed 380, detail fills. Closet → 4 columns. |
| **Landscape phone** | Try-On canvas becomes side-by-side (canvas left, garment rail + controls right). Everything else keeps the vertical scroll; the tab bar stays bottom. |

**Safe area** — `SafeArea(bottom: false)` on scroll views; the glass tab bar adds `MediaQuery.viewPadding.bottom` to its own 26 bottom padding. The Try-On canvas is the only surface that may extend under the status bar, and it does so with a scrim.

**Keyboard** — chat and auth screens use `resizeToAvoidBottomInset: true` with the composer pinned above the inset. Never let the keyboard cover a focused field.

**Text scaling** — respect `MediaQuery.textScaler` up to 200%. Cards grow; nothing clips. Every fixed-height container in this design becomes a `min` constraint under scaling: give the outfit hero, stat cards and list rows `IntrinsicHeight` or a `ConstrainedBox(minHeight:)` rather than a hard `height`.

---

# 15. Accessibility

## Contrast

| Pair | Ratio | Verdict |
|---|---|---|
| `#4E4841` on `#F6F4F0` (body) | 7.9:1 | AAA |
| `#16130F` on `#F6F4F0` (headings) | 15.3:1 | AAA |
| `#6B655D` on `#F6F4F0` (secondary) | 5.6:1 | AA |
| `#8A8278` on `#F6F4F0` (mono metadata, ≥ 500 weight) | 3.7:1 | AA large / decorative only — never for essential prose |
| `#F6F4F0` on `#16130F` (inverse) | 15.3:1 | AAA |
| `#B9B1A6` on `#16130F` (body on dark) | 8.1:1 | AAA |
| `#B4713F` on `#F6F4F0` (clay accent) | 3.4:1 | **Large text and non-text only** — never body copy under 16px |

Rules: the clay accent is decorative or ≥16px. Match quality always carries its number and word. Never use hue alone to encode state.

## Touch targets

Minimum 48 × 48 for every interactive element, even where the visual box is smaller — the 28px favourite button, the 38px send button and the 22px toggles all get transparent padding to 48. Adjacent targets keep 8dp of separation.

## Font scaling

Support up to 200%. Test the outfit hero, product card and settings rows at 200% — these have the tightest vertical budgets. Mono metadata may cap at 130% (`TextScaler.clamp(maxScaleFactor: 1.3)`) because it is non-essential and dense; everything else scales freely.

## Screen reader

| Element | Semantics |
|---|---|
| Outfit hero | "Today's outfit. Quiet linen, sharp shoes. Fit score 96 out of 100. Because it's 34 degrees and you have a 2pm client review." — one label, not five |
| Match badge | "Match 94, perfect" |
| Score bars | `Semantics(value: '88 out of 100', label: 'Colour score')` |
| Favourite | toggle role, "Favourite Ivory linen kurta", `toggled: true/false` |
| Placeholder image | its monospace label ("your body scan, front view") |
| Thinking indicator | `liveRegion: true`, announces each named step once |
| Tab bar | standard `NavigationBar` semantics; the raised Try-On tab announces as a tab, not a button |
| Decorative | every gradient, stripe and divider gets `ExcludeSemantics` |

## Keyboard navigation

Full traversal order matches visual order. Focus ring: 2px `#16130F` outline at 2px offset, radius matching the target. `Enter`/`Space` activate; `Escape` dismisses sheets and dialogs. The chat composer supports `Enter` to send, `Shift+Enter` for a newline.

## Motion

Honour `MediaQuery.disableAnimations` / `prefers-reduced-motion`: the breathing orb becomes a static dot, staggers collapse to instant, cross-fades shorten to 100ms. `Hero` transitions are retained.

## Localisation

RTL (Urdu) mirrors the entire layout — chevrons, back arrows, progress fill direction, tab order. Exceptions that stay LTR inside RTL runs: numerals, scores, prices, dates and any mono metadata. Urdu headings use Noto Nastaliq Urdu at line-height 1.9–2.0 (Nastaliq needs the space); Manrope remains for numerals.

---

# 16. Image guidelines

| Slot | Ratio | Radius | Notes |
|---|---|---|---|
| Outfit hero — main tile | 3 / 4 | 14 | `flex: 1.5` of the mosaic |
| Outfit hero — side tiles | ~1 / 1 | 14 | two stacked, `flex: 1` |
| Closet grid tile | 1 / 1 | 12 | background removed at ingest |
| Clothing details header | 250 × 220 fixed | 0 (bleeds to the card top) | |
| Product card thumb | 96 wide × full height | 14 | |
| Product details hero | 250 × 170 | 18 | 5-image carousel |
| Try-on canvas | 3 / 4 | 24 | full-bleed within the card |
| Body scan thumbnails | 52 × 64 | 10 | |
| Avatar — profile | 1 / 1 | full | 66 |
| Avatar — chat | 1 / 1 | full | 32 |
| Week / calendar thumb | ~96 × 62 | 10 | |
| Share card mosaic | 3 / 4 + two 1 / 1 | 11 | inside a 20-radius white card |
| Lookbook hero | 250 × 224 | 0 | top of a full-bleed dark card |
| Lookbook look tile | 3 / 4 | 12 | |

**Placeholders** — 45° stripes, 6px period, using the pair palette in `02-components.md` §9.31, with an optional monospace caption naming the expected content. Ship these; they are part of the design, not a stand-in for it.

**Ingest pipeline (assumption — confirm with backend):** capture → background removal → 1600px longest edge, WebP q80 → thumbnail 400px → upload. Body-scan photos are processed on-device and never leave unencrypted.

**Caching** — `cached_network_image` with a 200MB disk cap and a 7-day stale window. Closet thumbnails are pre-warmed for the first 40 items on app open. Try-on renders are cached indefinitely under the look id since they are expensive to regenerate.

**Compression** — display images WebP; user uploads JPEG q85 at capture, re-encoded server-side. Never ship PNG for photography.

---

# 17. Flutter folder structure

```
lib/
├── main.dart
├── app.dart                     # MaterialApp.router, theme wiring
├── core/
│   ├── theme/                   # the design system, and nothing else
│   │   ├── app_colors.dart
│   │   ├── app_typography.dart
│   │   ├── app_spacing.dart
│   │   ├── app_radius.dart
│   │   ├── app_shadows.dart
│   │   ├── app_durations.dart
│   │   ├── app_icons.dart
│   │   └── app_theme.dart
│   ├── widgets/                 # design-system primitives, zero feature knowledge
│   ├── utils/                   # formatters, extensions, validators
│   └── constants/               # limits (free-tier quotas), regex, keys
├── features/                    # one folder per product area, self-contained
│   ├── auth/          { data/ domain/ presentation/ }
│   ├── onboarding/
│   ├── today/
│   ├── closet/
│   ├── tryon/
│   ├── shop/
│   ├── chat/
│   ├── profile/
│   └── subscription/
├── navigation/
│   ├── app_router.dart
│   ├── routes.dart
│   └── shell_scaffold.dart
├── shared/
│   ├── models/                  # cross-feature entities (Garment, Outfit, StyleProfile)
│   ├── providers/               # cross-feature Riverpod providers
│   └── services/                # api client, storage, analytics, image pipeline
└── assets/
    ├── fonts/
    └── images/
```

**Why each folder exists**

- `core/theme` — the single place a design value may be defined. A colour or size that appears anywhere else is a bug.
- `core/widgets` — primitives that know nothing about the product. `AppButton` must be usable in a to-do app.
- `core/utils` / `core/constants` — pure functions and literals; no Flutter imports in `utils` where avoidable, so they stay unit-testable.
- `features/*` — vertical slices. Each has `data` (repositories, DTOs), `domain` (entities, use cases) and `presentation` (screens, feature widgets, controllers). A feature never imports another feature's `presentation`.
- `navigation` — the router is the only file that knows the full screen graph; features expose screens, not routes.
- `shared/models` — entities used by two or more features, so `closet` and `tryon` agree on what a `Garment` is.
- `shared/services` — I/O boundaries, mockable in tests.
- `assets/fonts` — the four families bundled, so typography never depends on the network.

---

# 18. Design tokens (Dart, ready to paste)

## `core/theme/app_colors.dart`

```dart
import 'package:flutter/material.dart';

abstract final class AppColors {
  // Brand
  static const primary          = Color(0xFFB4713F);
  static const primaryDark      = Color(0xFFCE8A54);
  static const primaryPressed   = Color(0xFF95592E);
  static const secondary        = Color(0xFF4A5578);
  static const secondaryDark    = Color(0xFF8E9BC4);
  static const accent           = Color(0xFFC9A227);
  static const accentSoft       = Color(0xFFD9B84A); // oklch(.75 .09 55) overlines on dark
  static const accentOnDark     = Color(0xFFCE9A5E);

  // Semantic
  static const success          = Color(0xFF3E8F63);
  static const successDark      = Color(0xFF57A87B);
  static const warning          = Color(0xFFC9922E);
  static const warningDark      = Color(0xFFD9A544);
  static const error            = Color(0xFFB4402E);
  static const errorDark        = Color(0xFFC85842);
  static const info             = secondary;

  // Semantic tint pairs
  static const successFg = Color(0xFF2E7050);
  static const successBg = Color(0xFFDCF0E4);
  static const warningFg = Color(0xFF7E5A18);
  static const warningBg = Color(0xFFF5EBD3);
  static const errorFg   = Color(0xFF8E3324);
  static const errorBg   = Color(0xFFF7E5E1);
  static const calloutBg     = Color(0xFFF7F3E9);
  static const calloutBorder = Color(0xFFE5DCC0);
  static const errorCalloutBg     = Color(0xFFFBEFEC);
  static const errorCalloutBorder = Color(0xFFEBCFC8);

  // Surfaces — light
  static const background      = Color(0xFFF6F4F0);
  static const surface         = Color(0xFFFFFFFF);
  static const surfaceInverse  = Color(0xFF16130F);
  static const surfaceMuted    = Color(0xFFF0EDE7);
  static const scrim           = Color(0x6B16130F); // rgba(22,19,15,.42)

  // Surfaces — dark
  static const backgroundDark     = Color(0xFF12110F);
  static const surfaceDark        = Color(0xFF1C1A17);
  static const surfaceMutedDark   = Color(0xFF232019);
  static const scrimDark          = Color(0x8C000000);
  static const placeholderDarkA   = Color(0xFF2A2621);
  static const placeholderDarkB   = Color(0xFF221F1A);

  // Neutral ramp (hue 55, chroma ≤ .012)
  static const neutral50  = Color(0xFFFBFAF8);
  static const neutral100 = Color(0xFFF0EDE7);
  static const neutral200 = Color(0xFFE2DED6);
  static const neutral300 = Color(0xFFC9C3B9);
  static const neutral400 = Color(0xFFA39B90);
  static const neutral500 = Color(0xFF8A8278);
  static const neutral600 = Color(0xFF6B655D);
  static const neutral700 = Color(0xFF4E4841);
  static const neutral800 = Color(0xFF3B372F);
  static const neutral900 = Color(0xFF16130F);
  static const sheetGrabber = Color(0xFFD6D0C6);

  // Text — light
  static const textPrimary     = neutral900;
  static const textBody        = neutral700;
  static const textSecondary   = neutral600;
  static const textMuted       = neutral500;
  static const textPlaceholder = neutral400;
  static const textDisabled    = neutral300;
  static const textOnPrimary   = Color(0xFFF6F4F0);
  static const textOnAccent    = Color(0xFF1A1509);

  // Text — dark
  static const textPrimaryDark   = Color(0xFFF2EFEA);
  static const textBodyDark      = Color(0xFFB9B1A6);
  static const textSecondaryDark = neutral400;

  // Borders & dividers
  static const border        = Color(0x1416130F); // .08
  static const borderStrong  = Color(0x1F16130F); // .12
  static const borderFocus   = neutral900;
  static const borderDashed  = Color(0x2E16130F); // .18
  static const divider       = Color(0x0F16130F); // .06
  static const dividerStrong = Color(0x1A16130F); // .10
  static const borderDark        = Color(0x14FFFFFF);
  static const borderStrongDark  = Color(0x1FFFFFFF);
  static const dividerDark       = Color(0x1AFFFFFF);

  // Glass
  static const glassLight = Color(0x8CFFFFFF); // .55
  static const glassDark  = Color(0x9E1C1A17); // .62
  static const navGlass   = Color(0xD1F6F4F0); // .82

  // Placeholder stripe pairs (light)
  static const stripeA1 = Color(0xFFEFEBE4);
  static const stripeA2 = Color(0xFFE4DFD6);
  static const stripeB1 = Color(0xFFE7E4EE);
  static const stripeB2 = Color(0xFFDCD8E6);
  static const stripeC1 = Color(0xFFE4EAE6);
  static const stripeC2 = Color(0xFFD8E0DA);
  static const stripeD1 = Color(0xFFF0E8E2);
  static const stripeD2 = Color(0xFFE6DCD3);

  // Style-profile palette swatches
  static const paletteCream = Color(0xFFF2E8D8);
  static const paletteBrass = Color(0xFF8E7A54);
  static const paletteOlive = Color(0xFF4E5B44);
  static const paletteRust  = Color(0xFFA8452F);
  static const paletteInk   = Color(0xFF2C2A26);

  // Editorial (lookbook)
  static const editorialBg     = Color(0xFF1A1206);
  static const editorialA      = Color(0xFF3A2C14);
  static const editorialB      = Color(0xFF2E2210);
  static const editorialText   = Color(0xFFF4EBD9);
  static const editorialMuted  = Color(0xFFC9B896);
}
```

## `core/theme/app_typography.dart`

```dart
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

abstract final class AppTypography {
  static TextStyle _serif(double s, double h, {Color? c, double ls = 0}) =>
      GoogleFonts.instrumentSerif(
          fontSize: s, height: h / s, letterSpacing: ls,
          fontWeight: FontWeight.w400, color: c ?? AppColors.textPrimary);

  static TextStyle _sans(double s, double h, FontWeight w,
          {Color? c, double ls = 0}) =>
      GoogleFonts.manrope(
          fontSize: s, height: h / s, fontWeight: w, letterSpacing: ls,
          color: c ?? AppColors.textPrimary);

  static TextStyle _mono(double s, double h, FontWeight w,
          {Color? c, double ls = 0}) =>
      GoogleFonts.ibmPlexMono(
          fontSize: s, height: h / s, fontWeight: w, letterSpacing: ls,
          color: c ?? AppColors.textMuted);

  // Display — Instrument Serif
  static TextStyle get display       => _serif(52, 53, ls: -0.52);
  static TextStyle get displayLarge  => _serif(40, 40);
  static TextStyle get displayMedium => _serif(34, 36);
  static TextStyle get displaySmall  => _serif(27, 30);
  static TextStyle get displayScore  => _serif(62, 62);
  static TextStyle get displayStat   => _serif(26, 26);
  static TextStyle get outfitName    => _serif(25, 27);

  // Interface — Manrope
  static TextStyle get headline      => _sans(27, 32, FontWeight.w700, ls: -0.54);
  static TextStyle get headlineSmall => _sans(20, 24, FontWeight.w700, ls: -0.20);
  static TextStyle get title         => _sans(18, 24, FontWeight.w600);
  static TextStyle get titleSmall    => _sans(15, 20, FontWeight.w700);
  static TextStyle get subtitle      => _sans(14, 20, FontWeight.w600);
  static TextStyle get body          => _sans(15, 23, FontWeight.w400, c: AppColors.textBody);
  static TextStyle get bodySmall     => _sans(12.5, 19, FontWeight.w400, c: AppColors.textBody);
  static TextStyle get bodyXSmall    => _sans(11, 16.5, FontWeight.w400, c: AppColors.textBody);
  static TextStyle get caption       => _sans(12, 17, FontWeight.w500, c: AppColors.textSecondary);
  static TextStyle get button        => _sans(15, 15, FontWeight.w700, ls: 0.15);
  static TextStyle get buttonSmall   => _sans(12.5, 13, FontWeight.w700);
  static TextStyle get label         => _sans(12.5, 16, FontWeight.w600);
  static TextStyle get hint          => _sans(14, 20, FontWeight.w400, c: AppColors.textPlaceholder);
  static TextStyle get errorText     => _sans(10.5, 15, FontWeight.w500, c: AppColors.error);

  // Machine — IBM Plex Mono
  static TextStyle get navLabel       => _mono(9.5, 12, FontWeight.w600);
  static TextStyle get overline       => _mono(11, 11, FontWeight.w500, ls: 1.54);
  static TextStyle get overlineSmall  => _mono(9.5, 11, FontWeight.w500, ls: 1.14);
  static TextStyle get mono           => _mono(11, 15, FontWeight.w500);
  static TextStyle get monoSmall      => _mono(10, 14, FontWeight.w500);
  static TextStyle get monoBadge      => _mono(9.5, 11, FontWeight.w600);

  // Urdu — line-height 1.9–2.0 is mandatory
  static TextStyle get urduTitle =>
      GoogleFonts.notoNastaliqUrdu(fontSize: 22, height: 1.9, fontWeight: FontWeight.w400);
  static TextStyle get urduBody =>
      GoogleFonts.notoNastaliqUrdu(fontSize: 12.5, height: 2.0, fontWeight: FontWeight.w400);
}
```

> Overline letter-spacing: the design uses em units (.14em, .12em). Flutter's `letterSpacing` is in logical pixels — `size × em`. 11 × .14 = 1.54; 9.5 × .12 = 1.14. Recompute if a size changes.

## `core/theme/app_spacing.dart`

```dart
abstract final class AppSpacing {
  static const xxs = 2.0;
  static const xs  = 4.0;
  static const sm  = 8.0;
  static const md  = 12.0;
  static const lg  = 16.0;
  static const xl  = 20.0;   // screen gutter
  static const xxl = 24.0;
  static const xxxl = 32.0;
  static const huge = 48.0;

  static const screenGutter    = 20.0;
  static const screenGutterSm  = 16.0;   // < 360dp
  static const bottomNavHeight = 82.0;
  static const bottomNavClear  = 108.0;  // scroll padding under content
  static const cardPadding     = 16.0;
  static const cardPaddingHero = 20.0;
  static const gridGutter      = 11.0;
  static const chipGap         = 7.0;
}
```

## `core/theme/app_radius.dart`

```dart
import 'package:flutter/widgets.dart';

abstract final class AppRadius {
  static const xs = 4.0, sm = 8.0, md = 12.0, lg = 14.0;
  static const xl = 16.0, xxl = 20.0, xxxl = 26.0;
  static const sheet = 28.0, full = 999.0;

  static BorderRadius all(double r) => BorderRadius.circular(r);
  static const sheetTop = BorderRadius.vertical(top: Radius.circular(sheet));
  static const pill = BorderRadius.all(Radius.circular(full));
}
```

## `core/theme/app_shadows.dart`

```dart
import 'package:flutter/material.dart';

abstract final class AppShadows {
  static const none = <BoxShadow>[];
  static const soft = [BoxShadow(
      color: Color(0x1216130F), blurRadius: 22, offset: Offset(0, 6))];
  static const hero = [BoxShadow(
      color: Color(0x2416130F), blurRadius: 30, offset: Offset(0, 10))];
  // Dark theme: no shadows. Use a 1px AppColors.borderDark instead.
}
```

## `core/theme/app_durations.dart`

```dart
import 'package:flutter/animation.dart';

abstract final class AppDurations {
  static const instant   = Duration(milliseconds: 120); // press, favourite
  static const fast      = Duration(milliseconds: 180); // hover, tab fade, toggle
  static const standard  = Duration(milliseconds: 240); // image fade-in
  static const emphasis  = Duration(milliseconds: 320); // sheets, hero, page push
  static const slow      = Duration(milliseconds: 400); // try-on cross-fade
  static const reveal    = Duration(milliseconds: 520); // staggered outfit reveal
  static const count     = Duration(milliseconds: 700); // score count-up
  static const breath    = Duration(milliseconds: 1500);// thinking orb cycle
  static const stagger   = Duration(milliseconds: 40);  // per-item delay

  static const curve = Curves.easeOutCubic; // the only curve in the system
}
```

## `core/theme/app_icons.dart`

```dart
abstract final class AppIconSize {
  static const xs = 14.0, sm = 17.0, md = 20.0, lg = 22.0, xl = 26.0;
}
```

Icon *identity* comes from `material_symbols_icons` (`SymbolsRounded`, `fill: 0`, `weight: 400`) — see `01-foundation.md` §8 for the per-screen glyph list.

## `core/theme/app_theme.dart`

```dart
import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_typography.dart';
import 'app_radius.dart';

abstract final class AppTheme {
  static ThemeData get light => _base(
        brightness: Brightness.light,
        scheme: const ColorScheme.light(
          primary: AppColors.primary,
          onPrimary: Colors.white,
          secondary: AppColors.secondary,
          onSecondary: Colors.white,
          tertiary: AppColors.accent,
          surface: AppColors.surface,
          onSurface: AppColors.textPrimary,
          error: AppColors.error,
          onError: Colors.white,
          outline: AppColors.borderStrong,
          outlineVariant: AppColors.border,
        ),
        background: AppColors.background,
      );

  static ThemeData get dark => _base(
        brightness: Brightness.dark,
        scheme: const ColorScheme.dark(
          primary: AppColors.primaryDark,
          onPrimary: AppColors.backgroundDark,
          secondary: AppColors.secondaryDark,
          onSecondary: AppColors.backgroundDark,
          tertiary: AppColors.accent,
          surface: AppColors.surfaceDark,
          onSurface: AppColors.textPrimaryDark,
          error: AppColors.errorDark,
          onError: AppColors.backgroundDark,
          outline: AppColors.borderStrongDark,
          outlineVariant: AppColors.borderDark,
        ),
        background: AppColors.backgroundDark,
      );

  static ThemeData _base({
    required Brightness brightness,
    required ColorScheme scheme,
    required Color background,
  }) =>
      ThemeData(
        useMaterial3: true,
        brightness: brightness,
        colorScheme: scheme,
        scaffoldBackgroundColor: background,
        splashFactory: NoSplash.splashFactory,
        highlightColor: Colors.transparent,
        textTheme: TextTheme(
          displayLarge: AppTypography.displayLarge,
          displayMedium: AppTypography.displayMedium,
          displaySmall: AppTypography.displaySmall,
          headlineLarge: AppTypography.headline,
          headlineSmall: AppTypography.headlineSmall,
          titleLarge: AppTypography.title,
          titleMedium: AppTypography.titleSmall,
          titleSmall: AppTypography.subtitle,
          bodyLarge: AppTypography.body,
          bodyMedium: AppTypography.bodySmall,
          bodySmall: AppTypography.bodyXSmall,
          labelLarge: AppTypography.button,
          labelMedium: AppTypography.label,
          labelSmall: AppTypography.mono,
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          color: scheme.surface,
          shape: RoundedRectangleBorder(borderRadius: AppRadius.all(AppRadius.xxl)),
        ),
        bottomSheetTheme: const BottomSheetThemeData(
          elevation: 0,
          backgroundColor: AppColors.background,
          shape: RoundedRectangleBorder(borderRadius: AppRadius.sheetTop),
        ),
        navigationBarTheme: const NavigationBarThemeData(
          elevation: 0,
          backgroundColor: Colors.transparent,
          indicatorColor: Colors.transparent,
        ),
      );
}
```

> **Do not use `ColorScheme.fromSeed`.** It drifts the warm neutrals off hue 55 and breaks the palette. The scheme above is hand-authored on purpose.

---

# 19. Reusable widget plan

| Widget | File | Why it must be reusable |
|---|---|---|
| `AppScaffold` | `core/widgets/app_scaffold.dart` | Every screen shares gutter, safe area, background and tab-bar clearance. Centralising it means a change to the tab bar height doesn't touch 26 files. |
| `AppButton` | `app_button.dart` | Three variants × four states × two themes. Duplicating this guarantees drift. |
| `AppIconButton` | `app_icon_button.dart` | Enforces the 48dp hit target that the 40px visual box would otherwise violate. |
| `AppTextField` | `app_text_field.dart` | The always-visible label, 1.5px focus border and error row are non-Material behaviours; wrapping once keeps them consistent. |
| `AppOtpField` | `app_otp_field.dart` | Used twice (verify code, future 2FA) with fiddly caret and focus logic. |
| `AppSearchField` | `app_search_field.dart` | Appears in Closet, Shop and Help with identical geometry. |
| `AppCard` | `app_card.dart` | The light/dark pair is the single most repeated surface in the app. |
| `AppGlassPanel` | `app_glass_panel.dart` | `BackdropFilter` is expensive; funnelling every use through one widget makes it auditable. |
| `AppChip` | `app_chip.dart` | Five state/theme combinations across four screens. |
| `AppBadge` | `app_badge.dart` | Tag pills on closet, product and detail screens. |
| `MatchScoreBadge` | `match_score_badge.dart` | Encapsulates the score → label → colour mapping so the thresholds live in one place. |
| `AppListRow` | `app_list_row.dart` | Settings, You, Help and Laundry all use the identical row. |
| `AppOptionCard` | `app_option_card.dart` | The 2 × 2 grid tile in the add sheet and the generator. |
| `AppAvatar` | `app_avatar.dart` | Two sizes, plus Noor's gradient which must never be recreated by hand. |
| `AppProgressBar` | `app_progress_bar.dart` | Scores, budgets, analysis, password strength and the 360° scrubber share it. |
| `AppToggle` | `app_toggle.dart` | Material's `Switch` doesn't match; one custom implementation beats six. |
| `AppImage` | `app_image.dart` | Owns the placeholder painter, caching, fade-in and error fallback — the single most important widget for making the app feel finished before real photography lands. |
| `ThinkingIndicator` | `thinking_indicator.dart` | The product's "no spinner" rule is only enforceable if there is exactly one loading widget. |
| `AppSkeleton` | `app_skeleton.dart` | Shared shimmer geometry across grid, list and chat. |
| `AppEmptyState` | `app_empty_state.dart` | Nine screens have an empty state; they must feel like the same product. |
| `AppErrorView` | `app_error_view.dart` | Same, for failure. Forces every caller to supply a retry. |
| `AppCallout` | `app_callout.dart` | Advisory blocks appear on eight screens. |
| `AppBottomSheet` | `app_bottom_sheet.dart` | Grabber, radius, scrim and padding in one place. |
| `AppDialog` | `app_dialog.dart` | Keeps confirmations consistent and destructive styling honest. |
| `AppSnackBar` | `app_snack_bar.dart` | Transient feedback that matches the surface language. |
| `AppBottomNav` | `app_bottom_nav.dart` | The raised centre tab and glass treatment are bespoke. |
| `AppAppBar` | `app_app_bar.dart` | This app has no Material `AppBar`; the header pattern must be shared. |

Feature-scoped (not in `core/widgets`, but reused within their feature): `OutfitHeroCard`, `ClosetItemCard`, `ProductMatchCard`, `ChatBubble`, `GarmentRail`, `ScoreBreakdown`, `WeekRail`, `PriceCard`.

---

# 20. Flutter development rules

1. **Never hardcode a colour.** Every `Color` comes from `AppColors`. A literal hex outside `core/theme` fails review.
2. **Never hardcode spacing.** Use `AppSpacing`. If a value isn't in the scale, it's wrong — check the spec before adding one.
3. **Never hardcode a radius, duration or curve.** `AppRadius`, `AppDurations`, and `AppDurations.curve` only.
4. **Never construct a `TextStyle` inline.** Use `AppTypography`, `.copyWith(color:)` at most.
5. **Always reuse the widgets in §19** before writing a new one. New shared widgets require a token-level justification.
6. **No `CircularProgressIndicator` anywhere.** Use `ThinkingIndicator` or `AppSkeleton`. This is a product rule, not a style preference.
7. **No `ColorScheme.fromSeed`.** The scheme is hand-authored.
8. **Separate business logic from UI.** Screens are `ConsumerWidget`s that read providers; no repository calls or `Future`s inside `build`.
9. **Riverpod** for state — `AsyncNotifier` per feature controller, `ref.watch` in build, `ref.read` in callbacks. No `setState` outside genuinely local widget state (animation flags, text controllers).
10. **GoRouter** for navigation — `StatefulShellRoute.indexedStack` for the five tabs. Never `Navigator.push` a named screen directly; go through the router.
11. **Clean Architecture per feature** — `presentation → domain → data`, dependencies point inward only. A feature never imports another feature's `presentation`.
12. **Every async surface ships three states** — loading, empty, error — using the shared widgets. A screen with only a happy path is incomplete.
13. **Every interactive element ≥ 48dp** hit target, and carries a semantics label.
14. **Every AI output carries a number and one sentence of why.** Enforce in the model layer: a suggestion without a reason string is invalid.
15. **`const` everywhere it compiles.** Widgets in lists must be `const`-constructible or keyed.
16. **`BackdropFilter` only via `AppGlassPanel`,** and never inside a scrolling list.
17. **Images only via `AppImage`.** No raw `Image.network`.
18. **Respect `MediaQuery.disableAnimations`** in every custom animation.
19. **No emoji in product copy.** Not part of the brand.
20. **Copy is data, not decoration.** All user-facing strings live in the l10n ARB files from day one — the product ships English and Urdu.

---

# 21. File generation plan

Create in this order. Each file is independently compilable once its predecessors exist.

### Foundation
| File | Contents |
|---|---|
| `pubspec.yaml` | deps: `flutter_riverpod`, `go_router`, `google_fonts`, `material_symbols_icons`, `cached_network_image`, `freezed`/`json_serializable`, `intl` |
| `lib/main.dart` | `runApp(ProviderScope(child: AiStylistApp()))` |
| `lib/app.dart` | `MaterialApp.router` with `AppTheme.light/dark`, router, l10n delegates |
| `lib/core/theme/app_colors.dart` | §18 verbatim |
| `lib/core/theme/app_typography.dart` | §18 verbatim |
| `lib/core/theme/app_spacing.dart` | §18 verbatim |
| `lib/core/theme/app_radius.dart` | §18 verbatim |
| `lib/core/theme/app_shadows.dart` | §18 verbatim |
| `lib/core/theme/app_durations.dart` | §18 verbatim |
| `lib/core/theme/app_icons.dart` | icon sizes |
| `lib/core/theme/app_theme.dart` | §18 verbatim |

### Core widgets (`lib/core/widgets/`)
`app_scaffold.dart` · `app_app_bar.dart` · `app_button.dart` · `app_icon_button.dart` · `app_text_field.dart` · `app_otp_field.dart` · `app_search_field.dart` · `app_card.dart` · `app_glass_panel.dart` · `app_chip.dart` · `app_badge.dart` · `match_score_badge.dart` · `app_list_row.dart` · `app_option_card.dart` · `app_avatar.dart` · `app_progress_bar.dart` · `app_toggle.dart` · `app_image.dart` · `thinking_indicator.dart` · `app_skeleton.dart` · `app_empty_state.dart` · `app_error_view.dart` · `app_callout.dart` · `app_bottom_sheet.dart` · `app_dialog.dart` · `app_snack_bar.dart` · `app_bottom_nav.dart`

Each implements exactly the spec in `02-components.md` §9.1–9.32.

### Utilities
| File | Contents |
|---|---|
| `lib/core/utils/formatters.dart` | PKR currency, relative dates, wear counts, score → label |
| `lib/core/utils/validators.dart` | email, password rules (8+, number/symbol, not previous) |
| `lib/core/utils/stripe_painter.dart` | the 45° placeholder painter used by `AppImage` |
| `lib/core/constants/limits.dart` | free tier: 3 generations/day, 2 try-ons/week |

### Models (`lib/shared/models/`)
`garment.dart` · `outfit.dart` · `style_profile.dart` · `product.dart` · `match_score.dart` · `chat_message.dart` · `look.dart` · `trip.dart` · `notification.dart` — all `freezed`, all with a non-nullable `reason`/`why` on anything AI-generated (rule 14).

### Navigation
| File | Contents |
|---|---|
| `lib/navigation/routes.dart` | route path constants |
| `lib/navigation/app_router.dart` | `GoRouter` + `StatefulShellRoute.indexedStack`, redirects per §11 |
| `lib/navigation/shell_scaffold.dart` | shell body + `AppBottomNav` |

### Features
Each feature gets `data/`, `domain/`, `presentation/screens/`, `presentation/widgets/`, `presentation/controllers/`.

| Feature | Screens |
|---|---|
| `auth` | `login_screen` `signup_screen` `forgot_password_screen` `verify_code_screen` |
| `onboarding` | `splash_screen` `onboarding_screen` `profile_setup_screen` `upload_photos_screen` `analysis_screen` `analysis_results_screen` |
| `today` | `today_screen` `calendar_screen` `rate_fit_screen` `outfit_generator_screen` + `outfit_hero_card` `week_rail` `score_breakdown` |
| `closet` | `closet_screen` `clothing_details_screen` `wardrobe_stats_screen` `laundry_screen` `packing_planner_screen` + `closet_item_card` `add_to_closet_sheet` |
| `tryon` | `tryon_screen` `player_360_screen` `share_look_screen` + `garment_rail` `tryon_canvas` |
| `shop` | `shop_screen` `product_details_screen` `wishlist_screen` `lookbook_screen` + `product_match_card` |
| `chat` | `chat_screen` + `chat_bubble` `prompt_chips` `suggestion_cards` |
| `profile` | `you_screen` `settings_screen` `notifications_screen` `help_screen` |
| `subscription` | `subscription_screen` + `price_card` |

### Localisation
`lib/l10n/app_en.arb` · `lib/l10n/app_ur.arb` — every string from day one; the Urdu file drives the RTL rules in §15.

---

# 22. Development handoff

## What "done" looks like

A screen is complete when all of the following hold:

1. It renders pixel-accurately at 390dp against the corresponding screen in `design/AI Stylist.dc.html`.
2. It uses **zero** hardcoded design values.
3. Loading, empty and error states are implemented with the shared widgets.
4. Every interactive element has a ≥ 48dp target and a semantics label.
5. It survives 200% text scaling without clipping.
6. Animations use `AppDurations` and honour reduced motion.
7. Every AI-sourced value on screen is accompanied by its reason string.

## Build order

1. **Foundation** — theme files, then `AppScaffold` + `AppCard` + `AppButton` + `AppImage`. Stop and verify against the design system board (option 1b in the HTML) before going further.
2. **Shell** — router, five branches, `AppBottomNav`. Stub screens.
3. **Today** — the hero card is the most complex composition in the app; getting it right validates the whole token set.
4. **Closet** — grid, filters, details, add sheet.
5. **Try-On** — the generation state machine and `ThinkingIndicator`.
6. **Shop** — feed, product, wishlist.
7. **Chat** — bubbles, prompt chips, inline suggestion cards.
8. **You** — profile, stats, settings, notifications, help.
9. **Onboarding & auth** — splash through analysis results.
10. **Subscription, lookbook, 360°, share** — the premium and editorial edges.

## Open items requiring a product decision

These are documented rather than invented. Ask before building:

| Item | Question |
|---|---|
| Checkout | Removed from the approved design. Confirm whether purchase is in-app or a hand-off to the partner store's web flow. |
| Resale | Removed from the approved design. Confirm whether resale ships in v1. |
| Global dark mode | Tokens exist for every surface, but only Try-On and the 360° player are dark by default. Confirm whether the Settings appearance toggle ships in v1 or is a stub. |
| Urdu screens | Rules are specified; no Urdu screens were built. Confirm the v1 locale list. |
| 360° player | Marked Pro. Confirm the frame count (design shows 36) and whether it's server-rendered or a local sprite sheet. |
| Free-tier limits | Design shows 3 generations/day and 2 try-ons/week. Confirm these are the shipping numbers. |
| Notification triggers | The design shows outfit-ready 06:00, price drop, dry-clean reminder. Confirm the full trigger set with backend. |

## Reference

Open `design/AI Stylist.dc.html` in any browser. The document is organised as:

| Section | Contents |
|---|---|
| **1a** | Design brief: assumptions, IA, navigation, first-run journey |
| **1b** | Design system board: colour ramps, type specimens, live components |
| **1c** | Interactive prototype: Today, Closet, Try-On, Shop, You, Chat, Rate, Add sheet — tap through the real state machine |
| **1d** | Screen library: the 20 remaining screens at working fidelity |
| **1e** | Handoff notes: responsive, accessibility, motion, Flutter summary |
| **2a** | Forgot password, verify code, share a look |
| **2b** | Eid/wedding lookbook, 360° player, men's Today variant |

When this document and the HTML disagree, **the HTML is the source of truth** — report the discrepancy so this document can be corrected.
