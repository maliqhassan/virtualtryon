# 02 · Component inventory (React Native)

Translates every component in `../figma/02-components.md` §9.1–9.32, plus the 8 feature-scoped components named in `../figma/04-react-native.md` §19, from Flutter widgets to RN components. Two components with no Flutter-side equivalent (`AppText`, `AppIcon`) are added at the top — both exist purely to close translation gaps identified in `01-design-tokens.md` (typography-as-getter, Material Symbols) and everything below depends on them.

Format per component: purpose, what it's built from, a TypeScript prop signature, variants, states, and a one-line reusability rationale — mirroring why each widget was called out as shared in the source (`../figma/04-react-native.md` §19's "why it must be reusable" column).

Spec only — none of these exist as files in `frontend/` yet.

---

## 0 · Primitives everything else depends on

#### `AppText`

*Purpose:* Single point of truth for typography. Closes the gap `01-design-tokens.md` §2 describes — Tailwind utilities alone can't bundle family+size+leading+tracking+weight into one reusable unit the way `AppTypography.headline` did.

*Built from:* RN `Text`, resolving `variant` to the exact pre-weighted font family (`Manrope_700Bold`, not `font-sans` + a weight class) plus the matching NativeWind size/leading/tracking classes from the §2 table.

```ts
type AppTextProps = {
  variant: TypographyVariant; // 'displayLarge' | 'headline' | 'body' | 'overline' | ... (27 values, §2 table)
  color?: keyof typeof inkColorTokens; // defaults per-variant per source table, overridable
  children: React.ReactNode;
} & Pick<TextProps, 'numberOfLines' | 'style' | 'accessibilityRole'>;
```

*Variants:* the 27 named styles in `01-design-tokens.md` §2 — no others permitted without a spec update.

*States:* n/a (presentational only).

*Reusability:* every screen's copy goes through this. A hardcoded `<Text style={{fontSize:15}}>` anywhere outside this file is the RN equivalent of the source's rule-4 violation ("never construct a TextStyle inline") — worth a lint rule once the codebase exists.

---

#### `AppIcon`

*Purpose:* Renders a Material Symbols Rounded glyph. Closes the gap in `01-design-tokens.md` §6 — `@expo/vector-icons` doesn't carry this icon set.

*Built from:* RN `Text` with `fontFamily: 'MaterialSymbolsRounded'` (loaded via `expo-font`), content = the glyph's ligature name.

```ts
type AppIconProps = {
  name: MaterialSymbolName; // typed union generated from the §8 per-screen glyph inventory — not a free string
  size?: keyof typeof AppIconSize; // 'xs' | 'sm' | 'md' | 'lg' | 'xl' — default 'md'
  color?: string; // token value, e.g. tokens.ink.secondary
};
```

*Variants:* none — weight is fixed at 400 across all sizes per source rule (§8: "never optically adjust").

*States:* n/a.

*Reusability:* every icon in the product goes through this one component, which is what makes "swap the icon font" a one-file change instead of a grep-and-replace.

---

## A · Actions

#### `AppButton`

*Purpose:* The one committed action on a screen (primary), a de-emphasised companion action (secondary), or an AI-generation trigger (accent). Source: §9.1–9.3.

*Built from:* `Pressable` + Reanimated for the 0.98-scale/120ms press animation (no ripple — matches source's `InkWell` with transparent highlight note, translated as "no Android ripple effect").

```ts
type AppButtonProps = {
  label: string;
  variant: 'primary' | 'secondary' | 'accent';
  width?: 'full' | 'inline'; // radius 15 vs 14, per source
  onDark?: boolean;
  icon?: MaterialSymbolName; // accent variant always shows 'auto_awesome' unless overridden
  loading?: boolean; // label replaced by a breathing dot — see ThinkingIndicator
  disabled?: boolean;
  onPress: () => void;
};
```

*Variants:* `primary` (ink fill), `secondary` (outline), `accent` (clay fill, gold on dark screens) — see source for exact colour values, already in `01-design-tokens.md` §1.

*States:* default, pressed (0.98 scale), disabled (neutral-300 bg / neutral-500 label), loading (dot, taps ignored). No `hover` state — source's hover spec is a desktop/web affordance this app doesn't target; the Reanimated press-scale is the only interaction feedback on touch.

*Reusability:* three variants × four states × two themes — exactly the combinatorial surface the source flags as guaranteed to drift if hand-duplicated per screen.

---

#### `AppIconButton`

*Purpose:* A tappable icon with no label — search, add, share, overflow.

*Built from:* `Pressable`, sized to guarantee the 48×48 hit target even where the visual box is 40×40 (via `hitSlop`, not a bigger visible box) — directly satisfies `04-react-native.md` §15's touch-target rule.

```ts
type AppIconButtonProps = {
  icon: MaterialSymbolName;
  variant?: 'outline' | 'filled'; // surface+border vs ink+onPrimary
  size?: 'default' | 'compact'; // 44 vs 40 visual box, both hit-target 48
  onPress: () => void;
  accessibilityLabel: string; // required, not optional — an icon-only control with no label fails screen readers
};
```

*Variants:* `outline`, `filled`.

*States:* default, pressed, disabled.

*Reusability:* closet search/add, share, laundry alarm, product overflow, try-on share — six+ call sites per source; `accessibilityLabel` being required at the type level is what prevents the accessibility gap that's easy to introduce when this is re-implemented ad hoc per screen.

---

#### `AppToggle`

*Purpose:* On/off switch (notifications, "include my face" in share sheet, etc.).

*Built from:* Custom `Pressable` + Reanimated-driven knob translation — RN's built-in `Switch` doesn't match the design's track/knob geometry, same reasoning the source gives for not using Flutter's `Switch`.

```ts
type AppToggleProps = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};
```

*Variants:* none.

*States:* on, off, disabled. Hit target padded to 48 regardless of the 22–23px visual track.

*Reusability:* one implementation beats N per-screen reimplementations of a non-standard switch.

---

## B · Inputs

#### `AppTextField`

*Purpose:* The only text input in the system — always-visible label (no floating-label animation), leading/trailing icon slots, inline error row.

*Built from:* `TextInput` wrapped with a label `AppText` and an animated 1px→1.5px border on focus (Reanimated).

```ts
type AppTextFieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  leadingIcon?: MaterialSymbolName;
  trailingIcon?: MaterialSymbolName;
  onTrailingIconPress?: () => void; // e.g. toggle secureTextEntry
  error?: string; // presence toggles the error state + shows the message
  secureTextEntry?: boolean;
  disabled?: boolean;
} & Pick<TextInputProps, 'keyboardType' | 'autoCapitalize' | 'autoComplete'>;
```

Password-strength (three colour-graduated bars) is a **sub-part of this component when `secureTextEntry` + a `showStrength` flag are set**, not a separate component — matches how the source folds it into §9.5 rather than numbering it separately.

*Variants:* none beyond the props above (leading/trailing icon presence is a prop, not a variant).

*States:* rest, focus (1.5px border), error (border + message row), disabled (muted bg, disabled text colour).

*Reusability:* every auth and profile-setup screen; the always-visible label and 1.5px focus border are non-standard-RN behaviours worth centralising once, exactly as the source argues for its Flutter equivalent.

---

#### `AppOtpField`

*Purpose:* Six-digit verification code entry (Verify code screen; source flags a future 2FA reuse).

*Built from:* A single hidden `TextInput` (for real keyboard/paste/autofill behaviour) rendering six visual cells driven off its value — the standard RN OTP-input pattern, not six separate `TextInput`s (which fights autofill).

```ts
type AppOtpFieldProps = {
  length?: number; // default 6
  value: string;
  onChangeText: (v: string) => void;
  onComplete?: (code: string) => void;
};
```

*Variants:* none.

*States:* per-cell — filled, active (caret), empty — derived from `value.length` and focus, not passed in.

*Reusability:* used twice today per source (verify code, future 2FA); the caret/focus logic is genuinely fiddly enough to be worth not re-deriving.

---

#### `AppSearchField`

*Purpose:* Pill-shaped search input — Closet, Shop, Help.

*Built from:* `TextInput` in a rounded-full container.

```ts
type AppSearchFieldProps = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  onSubmit?: () => void;
};
```

*Variants/States:* none beyond standard focus.

*Reusability:* identical geometry across three screens per source — one component, one place to change it.

---

## C · Surfaces

#### `AppCard`

*Purpose:* The base surface for everything that isn't full-bleed. Two variants only — no third card treatment, per source rule.

*Built from:* `View` (or `Pressable` when `onPress` is supplied).

```ts
type AppCardProps = {
  variant: 'light' | 'dark'; // surface vs surface-inverse — "user data" vs "the machine speaking"
  density?: 'compact' | 'list' | 'standard' | 'hero'; // padding 12 / 14 / 16 / 18–20
  onPress?: () => void; // adds pressed-border-darken + 0.99 scale
  children: React.ReactNode;
};
```

*Variants:* `light` (white, 1px border, radius 14/18/20), `dark` (ink fill, no border, radius 16/20/22).

*States:* default, pressed (only when `onPress` supplied).

*Reusability:* the single most repeated surface in the app per source — Today's hero, every closet/product card, every settings group, the style-profile panel.

---

#### `AppGlassPanel`

*Purpose:* Blur-over-imagery panel. **Restricted to three call sites by design rule, not by the component's API** — the bottom nav, the try-on result caption, the 360°-player scrubber. Using it elsewhere is a design violation to catch in review, the same way the source flags it as "expensive — never on a scrolling list."

*Built from:* `expo-blur`'s `BlurView`. **Flag:** `expo-blur` on Android has historically been a weaker approximation of iOS's real blur (true `RenderEffect`-backed blur requires Android 12+ and recent `expo-blur` versions) — visually verify on an Android device before shipping, don't assume parity with the source's iOS-authored screenshots.

```ts
type AppGlassPanelProps = {
  intensity?: number; // maps to the source's sigma 12–18
  style?: ViewStyle;
  children: React.ReactNode;
};
```

*Variants:* light-surface tint vs dark-surface tint (auto-selected from the active surface, not a manual prop).

*States:* n/a.

*Reusability:* exactly three legitimate uses — this component existing at all is what makes a fourth, unreviewed use visible in a diff instead of buried in bespoke per-screen `BlurView` calls.

---

#### `AppScaffold`

*Purpose:* Per-screen content wrapper — background fill, safe-area handling, screen-gutter padding, bottom clearance above the tab bar.

*Built from:* `react-native-safe-area-context`'s `SafeAreaView` (already installed) + `ScrollView`. **Not a navigation primitive** — Expo Router's file-based routes already own screen mounting (see `03-screen-component-map.md`); `AppScaffold` is what each route's component renders as its outermost element, same relationship the source has between `AppScaffold` and each Flutter screen widget.

```ts
type AppScaffoldProps = {
  scroll?: boolean; // default true; false for screens managing their own scroll (e.g. chat's inverted list)
  tabBarClearance?: boolean; // adds bottom-nav-clear padding; false for modal/push screens with no tab bar
  children: React.ReactNode;
};
```

*Variants/States:* n/a.

*Reusability:* every screen. A tab-bar-height change touches this one file instead of 26 screens, per source's stated rationale.

---

## D · Data display

#### `AppChip`

*Purpose:* Filter pill (Closet categories, Shop segments) or a compact read-only tag.

```ts
type AppChipProps = {
  label: string;
  selected?: boolean;
  variant?: 'filter' | 'compact' | 'muted' | 'onDark';
  onPress?: () => void; // omit for the read-only 'muted' variant
};
```

*Variants:* `filter` (interactive, unselected/selected), `compact`, `muted` (read-only tag), `onDark`.

*States:* unselected, selected, muted, onDark-unselected, onDark-selected — five combinations per source.

*Reusability:* filter rows on Closet and Shop, tag pills on cards — same component, never a bespoke pill per screen. **Rule carried over:** never wrap a chip's label; a chip row scrolls horizontally instead (render inside a horizontal `FlatList`/`ScrollView`, never let text wrap).

---

#### `AppBadge`

*Purpose:* Small non-interactive semantic pill — "eastern", "unworn", "auto-tagged".

```ts
type AppBadgeProps = {
  label: string;
  variant: 'neutral' | 'eastern' | 'unworn' | 'autoTagged';
};
```

*Reusability:* closet, product and detail screens all use the same four semantic treatments.

---

#### `MatchScoreBadge`

*Purpose:* The score badge that appears on every match/fit surface. Content is **always** `"{score} · {label}"` — colour is never the sole signal, a hard accessibility rule from the source (§15), not a style preference.

```ts
function getMatchLevel(score: number): 'perfect' | 'good' | 'poor' {
  if (score >= 85) return 'perfect';
  if (score >= 65) return 'good';
  return 'poor';
}

type MatchScoreBadgeProps = {
  score: number; // 0-100; label is derived via getMatchLevel, never passed independently
  size?: 'badge' | 'chip';
};
```

*Reusability:* the thresholds (85/65) live in exactly one function. Every screen that shows a match score — Shop feed, Product details, Try-On result, Rate my fit — imports it instead of re-deriving the cutoffs, which is the whole point per the source's own rationale ("so the thresholds live in one place").

---

#### `AppAvatar`

```ts
type AppAvatarProps = {
  size: 'chat' | 'profile'; // 32 / 66
  imageUri?: string;
  isNoor?: boolean; // renders the fixed radial brand gradient instead of a photo — never hand-recreated elsewhere
  fallbackInitial?: string;
};
```

Noor's gradient (`expo-linear-gradient`, already coverable without new deps) is fixed and defined once inside this component — the source's explicit concern ("Noor's gradient... must never be recreated by hand") is enforced by *not exposing* the gradient stops as a prop at all.

---

#### `AppProgressBar`

```ts
type AppProgressBarProps = {
  value: number; // 0-100
  variant: 'neutral' | 'accent' | 'success'; // ink fill / gold fill / green fill
  height?: 3 | 4;
  animated?: boolean; // width + paired number count-up, 700ms easeOutCubic on first paint
  thumb?: boolean; // for slider use (password strength, 360° scrubber)
};
```

*Reusability:* score bars, budget bars, analysis progress, password strength, 360° scrubber — one implementation per source, five call sites.

---

#### `AppListRow`

```ts
type AppListRowProps = {
  icon: MaterialSymbolName;
  title: string;
  trailing?: string; // mono metadata, e.g. item count
  onPress?: () => void;
  showDivider?: boolean; // auto-false when it's the last row in its AppCard — set by the parent list, not hand-toggled per row
};
```

*Reusability:* Settings, You, Help, Laundry all render the identical row per source — this is the component that makes that true instead of coincidental.

---

#### `AppOptionCard`

```ts
type AppOptionCardProps = {
  icon: MaterialSymbolName;
  title: string;
  caption?: string;
  selected?: boolean; // ink bg, onPrimary title, gold icon
  dense?: boolean; // radius 13 + padding 11, for tighter grids
  onPress: () => void;
};
```

*Reusability:* the 2×2 grid tile in the add-to-closet sheet and the outfit generator — same tile, two contexts.

---

## E · Navigation & chrome

#### `AppBottomNav`

*Purpose:* The five-tab shell — Today, Closet, Try-On (raised centre), Shop, You.

*Built from:* **Not** RN's default tab bar visuals — Expo Router's `Tabs` component supports a fully custom `tabBar` render, which is where this renders (glass panel, raised centre pill, per-tab colour logic). See `03-screen-component-map.md` for how this wires into the route tree.

```ts
type AppBottomNavProps = {
  // driven by Expo Router's tab state, not manually — this is the tabBar prop's render function,
  // not a component instantiated with a hand-passed "active" index
};
```

*States/rules:* the raised Try-On pill (44×44, always-ink background) never changes colour with theme; standard pills get a 44×30 subtle background only when active. Today stays visually active while Chat/Rate-my-fit are pushed on its stack — an Expo Router nested-stack concern (branch 0's stack has depth > 1), not a prop on this component.

*Reusability:* one glass tab bar, wired once into the router config, not reconstructed as a fifth ad hoc nav bar.

---

#### `AppAppBar` (header)

*Purpose:* This design has no Material/native app bar — headers are a plain row inside the scrolling content, never pinned/elevated (except modal flows). This is *why* Phase 0 already set `screenOptions={{ headerShown: false }}` on the root `Stack` in `frontend/src/app/_layout.tsx` — that decision, made before this design was read, turns out to be exactly what this spec needs. No rework required there.

```ts
type AppAppBarProps = {
  title?: string; // AppText headline — omit when leading is a back button + no title needed
  subtitle?: string; // AppText mono, e.g. "128 items · 4 unworn this season"
  onBack?: () => void;
  actions?: { icon: MaterialSymbolName; onPress: () => void; accessibilityLabel: string }[]; // 0-2
};
```

*Reusability:* every non-tab screen's header — one row component instead of ad hoc header markup per screen.

---

## F · Overlays

#### `AppBottomSheet`

*Purpose:* Grabber + radius-28-top + scrim + slide-up, for add-to-closet, filters, confirmations.

*Built from:* **New dependency required** — `@gorhom/bottom-sheet` is the de facto RN standard for this pattern (gesture-driven drag-to-dismiss with a velocity threshold, snap points, backdrop) and isn't in the Phase 0 dependency list. A hand-rolled `Modal` + `PanResponder` reimplementation would be redoing well-trodden ground for no benefit — flagged in `04-inconsistencies-and-recommendations.md` as a dependency to add before this component is built.

```ts
type AppBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};
```

*Reusability:* forgot-password's "use Google/Apple instead" isn't a sheet, but add-to-closet, filters, and confirmations are — one sheet shell, several contents.

---

#### `AppDialog`

*Purpose:* Centred confirmation, max-width 320, ≤2 actions (stacked full-width on narrow screens). Destructive confirm uses `error` as the primary fill.

*Built from:* RN `Modal` (`transparent`) — not `Alert.alert`, which can't be restyled to match the design system.

```ts
type AppDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  actions: { label: string; variant: 'primary' | 'secondary'; destructive?: boolean; onPress: () => void }[]; // max 2
  onDismiss: () => void;
};
```

*Reusability:* keeps every confirmation (delete, sign out, discard) visually and behaviourally identical.

---

#### `AppSnackBar` / toast

*Purpose:* **Not in the approved design** — the source itself flags this as an assumption ("the design shows no snackbar; this follows the system so one exists when needed," `../figma/02-components.md` §9.29). Included here for the same reason: transient feedback (e.g. "Added to closet") will be needed somewhere and should match the system rather than falling back to a default `Alert` when the need arises mid-build.

*Built from:* a small custom implementation (context/portal + Reanimated slide-up) rather than a generic toast library — the styling (`surface-inverse` bg, specific radius/padding, optional trailing text action) would need overriding a library's defaults almost entirely anyway.

```ts
type AppSnackBarOptions = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number; // 3000ms default, 4000ms with an action
};
// exposed via a hook, e.g. useSnackBar().show(options), not a JSX component consumers place directly
```

*Reusability:* one feedback mechanism instead of an `Alert.alert` here and a custom toast there.

---

## G · Feedback & states

#### `ThinkingIndicator`

*Purpose:* **Replaces every loading spinner in the product** — a breathing radial-gradient orb with a named step, never a bare spinner. This is the strongest single rule in the source (`04-react-native.md` §20 rule 6: *"No `CircularProgressIndicator` anywhere... This is a product rule, not a style preference"*) and carries over unchanged.

*Built from:* `expo-linear-gradient` (radial-ish via a circular mask) + Reanimated for the opacity/scale pulse. Respects reduced motion via `AccessibilityInfo.isReduceMotionEnabled()` — becomes a static dot, per source.

```ts
type ThinkingIndicatorProps = {
  size?: 22 | 70 | 76;
  step?: string; // "step 2 of 3 · draping fabric" — accompanies every instance, never shown alone
};
```

*Reusability:* AI generation (Try-On), analysis progress (onboarding), chat typing state, pull-to-refresh — one component enforces the no-spinner rule; anywhere `ActivityIndicator` gets imported instead is a rule violation worth a lint check once the codebase exists.

---

#### `AppSkeleton`

*Purpose:* Loading placeholder for grid tiles, product cards, chat responses.

*Built from:* Reanimated-driven gradient sweep — **"ship as real widgets, do not add a shimmer package"** is an explicit source rule (§9.25) and applies equally here; a third-party shimmer library is exactly what it's warning against.

```ts
type AppSkeletonProps = {
  width: number | `${number}%`;
  height?: number; // default 11 (bar)
  variant?: 'bar' | 'tile';
};
```

*Reusability:* closet grid, product cards, chat — same shimmer geometry everywhere.

---

#### `AppEmptyState`

```ts
type AppEmptyStateProps = {
  icon: MaterialSymbolName;
  title: string;
  body: string; // must be specific and actionable per source rule, e.g. "Add five things and Noor starts styling" — never a generic "No items"
  actionLabel?: string;
  onAction?: () => void;
};
```

*Reusability:* nine screens have an empty state per source; this is what makes them read as the same product instead of nine bespoke ones.

---

#### `AppErrorView`

```ts
type AppErrorViewProps = {
  title?: string; // default "Something went wrong"
  body: string; // names the cause, e.g. "Couldn't reach the stylist." — never a bare "Error"
  onRetry: () => void; // required, not optional — every error state in the source ships a retry
};
```

*Reusability:* same rationale as `AppEmptyState`, for failure instead of absence.

---

#### `AppCallout`

```ts
type AppCalloutProps = {
  variant: 'warning' | 'infoOnDark';
  icon?: MaterialSymbolName;
  children: React.ReactNode; // usually an AppText body
};
```

*Reusability:* budget advice, privacy notes, rate-limit explanations, laundry nudges — eight screens per source, one block.

---

## H · Media

#### `AppImage`

*Purpose:* Every photographic slot in the app — the single most load-bearing component for making the app feel finished before real photography exists, per source.

*Built from:* `expo-image` (Expo's recommended image component — disk+memory caching, better decode performance than RN's built-in `Image`; the direct equivalent of the source's `cached_network_image`) for the loaded state, plus a custom placeholder (diagonal 45° stripe pattern via `react-native-svg`, already installed) for the no-image state.

```ts
type AppImageProps = {
  uri?: string; // omit to force the placeholder regardless of load state
  aspectRatio: number;
  radius: keyof typeof radiusTokens;
  placeholderLabel?: string; // monospace caption, e.g. "your body scan · front view"
  fit?: 'cover' | 'contain'; // default 'cover'
};
```

*States:* placeholder (no `uri`), loading (fetching), loaded (240ms fade-in), error (falls back to placeholder + a `cloud_off` `AppIcon`).

*Reusability:* every garment tile, avatar, product shot, and body-scan slot in the product goes through this — it's what makes "no real photography yet" look designed instead of broken.

---

## I · Feature-scoped (not core, but reused within their feature)

Per source, these live alongside their feature rather than in a shared primitives folder — see `03-screen-component-map.md` for the proposed folder placement under `src/features/*`.

#### `OutfitHeroCard` (Today)

The most structurally complex component in the app — validates the whole token set when built, per the source's own recommended build order (§22).

```ts
type OutfitHeroCardProps = {
  outfitName: string;
  score: number;
  reasoning: string;
  generationNote: string; // "generated 04:12 · 3 of 3 free generations left today" — cycles per shuffle
  garments: [GarmentSlot, GarmentSlot, GarmentSlot]; // main tile (flex 1.5) + two stacked side tiles (flex 1)
  isSaved: boolean;
  onTryOn: () => void;
  onShuffle: () => void;
  onToggleSaved: () => void;
};
type GarmentSlot = { imageUri?: string; label: string }; // e.g. "linen shirt" — AppImage placeholder caption
```

*Reusability:* single call site (Today), but pulled out as its own component regardless because of its complexity — matches source rationale.

---

#### `ClosetItemCard` (Closet)

```ts
type ClosetItemCardProps = {
  name: string;
  imageUri?: string;
  wornCount: number;
  tag?: { label: string; variant: AppBadgeProps['variant'] };
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
  index: number; // drives the staggered 40ms rise-in entry animation
};
```

---

#### `ProductMatchCard` (Shop)

```ts
type ProductMatchCardProps = {
  brand: string;
  name: string;
  price: string; // pre-formatted, e.g. "PKR 6,490" — currency formatting is a util, not this component's job
  imageUri?: string;
  matchScore: number; // feeds MatchScoreBadge
  colorGrade: string; // "A", "B+", etc.
  fitGrade: string;
  reasoning: string;
  isSaved: boolean;
  onToggleSaved: () => void;
  onTryOn: () => void;
};
```

---

#### `ChatBubble` (Noor chat)

```ts
type ChatBubbleProps = {
  text: string;
  role: 'user' | 'noor';
};
// role drives alignment/colour/corner-radius per source (user: end-aligned, ink fill, radius 18/18/6/18;
// noor: start-aligned, surface fill + border, radius 18/18/18/6)
```

A `typing` state (`ThinkingIndicator` + "reading your closet…") and inline suggestion cards (a small `FlatList` of `ProductMatchCard`-like tiles) are siblings in the chat list, not part of `ChatBubble` itself.

---

#### `GarmentRail` (Try-On)

```ts
type GarmentRailProps = {
  items: { name: string; imageUri?: string }[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};
```

Horizontal `FlatList` of 78-wide tiles; selected tile gets a 2px clay ring.

---

#### `ScoreBreakdown` (Rate my fit)

```ts
type ScoreBreakdownProps = {
  overall: number; // displayScore typography, count-up animated
  subs: { label: string; value: number }[]; // COLOUR / FIT / OCCASION, each with an AppProgressBar
  tips: { icon: MaterialSymbolName; color: string; title: string; body: string }[];
};
```

---

#### `WeekRail` (Today → calendar)

```ts
type WeekRailProps = {
  items: { day: string; event: string; imageUri?: string }[]; // e.g. { day: 'FRI 25', event: 'Mehndi · Gulberg' }
  onSelectDay: (index: number) => void; // routes to the outfit generator seeded with that date
};
```

Horizontal `FlatList`, ~96-wide cards.

---

#### `PriceCard` (Subscription)

```ts
type PriceCardProps = {
  period: 'yearly' | 'monthly';
  price: string;
  recommended?: boolean; // yearly: 1.5px gold border + "SAVE 33%" flag overlapping the top-left corner
  flagLabel?: string;
};
```
