# 03 · Screens, navigation & component map

Translates `../figma/03-screens.md` §10–13 — the 26-screen inventory, the `go_router` navigation graph, and the per-screen breakdowns — into Expo Router terms, and maps every screen to the components from `02-component-inventory.md` that build it.

---

## 1. Navigation: `go_router` → Expo Router

The source graph is a `StatefulShellRoute.indexedStack` with 5 branches (each tab keeps its own independent stack), plus auth/onboarding gating and a handful of `fullscreenDialog` presentations. Expo Router's direct equivalent is nested layouts under a `(tabs)` group, where **each tab folder gets its own `_layout.tsx` Stack** — that nesting is what preserves independent per-tab stack state (Today staying on Chat while you switch to Closet and back, per source §11.2's back-behaviour note), not a flag or config option.

```
app/
├── _layout.tsx                 root Stack — providers (Phase 0: QueryClientProvider, SafeAreaProvider —
│                                already wired), font loading (01-design-tokens.md §2), session resolution
├── index.tsx                   Splash — resolves auth + hydrates profile, then redirects
│
├── (auth)/                     guard: redirect to (tabs) if already authenticated
│   ├── _layout.tsx
│   ├── login.tsx
│   ├── signup.tsx
│   ├── forgot.tsx
│   └── forgot-verify.tsx
│
├── onboarding/                 guard: authed && !profileComplete; no back past analysing
│   ├── _layout.tsx
│   ├── index.tsx                (3-card value prop)
│   ├── profile.tsx              (step 1/4)
│   ├── scan.tsx                 (step 2/4)
│   ├── analysing.tsx            (step 3/4, no back button — short + non-blocking by design)
│   └── profile-result.tsx       (step 4/4)
│
├── (tabs)/                     guard: authed
│   ├── _layout.tsx              <Tabs tabBar={AppBottomNav}> — 5 branches below
│   ├── today/
│   │   ├── _layout.tsx           Stack (this branch's independent history)
│   │   ├── index.tsx
│   │   ├── calendar.tsx
│   │   ├── rate.tsx
│   │   └── chat.tsx              presentation: 'fullScreenModal'
│   ├── closet/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── [id].tsx              clothing details — shared-element transition on the image (see §3)
│   │   ├── stats.tsx
│   │   ├── laundry.tsx
│   │   └── packing.tsx
│   ├── tryon/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── 360/
│   │       └── [lookId].tsx       presentation: 'fullScreenModal'; guard: isPro, else redirect to /pro
│   ├── shop/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── [id].tsx
│   │   ├── wishlist.tsx
│   │   └── lookbook/
│   │       └── [id].tsx
│   └── you/
│       ├── _layout.tsx
│       ├── index.tsx
│       ├── settings.tsx
│       └── help.tsx
│
├── generate.tsx                 reachable from Today and Closet; not tab-scoped — see note below
├── notifications.tsx            reachable from You; not tab-scoped
├── share/
│   └── [lookId].tsx              presentation: 'fullScreenModal'; reachable from Try-On and Today
└── pro.tsx                       presentation: 'fullScreenModal'
```

**`/generate` and `/notifications` sit outside `(tabs)`, not inside a branch.** The source table marks them "push" (not `fullscreenDialog`) and reachable from more than one tab. In Expo Router, a route outside `(tabs)` pushed from inside a tab screen covers the tab bar — which is an acceptable, arguably better reading of "push" than duplicating the route inside two branches. If keeping the tab bar visible during outfit generation turns out to matter, the alternative is duplicating the route into both `today/generate.tsx` and `closet/generate.tsx`; flagged as a decision to confirm once this is actually built, not guessed at now.

### Guards

Expo Router (recent versions) supports declarative route guarding via `<Stack.Protected guard={...}>` / `<Tabs.Protected guard={...}>` — the direct equivalent of `go_router`'s per-route `redirect`. **Verify the exact API against the Expo Router version actually installed** (this project is on Expo SDK 54 — downgraded from the original SDK 57 scaffold once Expo Go's app-store release fell behind; see PROJECT_STATUS.md — and the guard API has evolved across recent Expo Router releases, so it shouldn't be assumed stable without checking the installed version's docs at implementation time). The fallback if it's not available/stable is the older, well-established pattern: a root-level auth hook (`useSession()`, backed by the Zustand store + TanStack Query from Phase 0) that each guarded group's `_layout.tsx` checks, rendering a `<Redirect href="/login" />` when the condition fails — functionally identical, just imperative instead of declarative.

| Guard | Applies to | Redirect |
|---|---|---|
| `!authed` | `(auth)/*` | → `(tabs)/today` if already authed |
| `authed` | `(tabs)/*`, `onboarding/*`, `generate`, `notifications`, `share/*`, `pro` | → `(auth)/login` |
| `authed && !profileComplete` | `onboarding/*` | forced until profile complete |
| `authed && isPro` | `(tabs)/tryon/360/[lookId]` | → `/pro?from=360player` (query param names the originating feature, per source, so the paywall headline can reference it — "You've used 3 of 3 today") |

### Shared-element transitions

The source's `Hero` widget (garment image, grid → detail) has a direct RN equivalent via `react-native-shared-element` or Reanimated's `SharedTransitionLayout`/layout animations (React Native Reanimated, already installed, supports shared-element-style transitions in recent versions). Which API to use is an implementation detail to settle when `ClosetItemCard` → clothing-details and the closet grid → add-sheet interactions are actually built — not decided here.

---

## 2. Global overlays (not routes — rendered contextually)

| Overlay | Purpose | Built as |
|---|---|---|
| Noor chat persistent pill | Reachable from any tab | A floating element in `(tabs)/_layout.tsx`, outside the per-branch stacks, always pushing `today/chat` |
| Add to closet sheet | Closet `+` | `AppBottomSheet` instance opened from `closet/index.tsx`, not a route |

---

## 3. Screen → component map

Every screen not listed with a full breakdown below follows the standard pattern per source §12: `AppScaffold` → `AppAppBar` → `AppCard` sections, loading = `AppSkeleton`, empty = `AppEmptyState`, error = `AppErrorView`. Only listing what's screen-specific.

| # | Screen | Route | Components | Notes |
|---|---|---|---|---|
| 01 | Splash | `/` | — | Brand moment only; no shared components, resolves session then redirects |
| 02 | Onboarding | `/onboarding` | `AppButton` | 3 value cards, likely a horizontal `FlatList`/pager |
| 03 | Login | `/(auth)/login` | `AppTextField`, `AppButton` ×3 (email, Google, Apple) | Social buttons are their own thing — Apple's is the platform `SignInWithAppleButton`, not `AppButton`, per source's explicit note in `../figma/README.md` |
| 04 | Signup | `/(auth)/signup` | `AppTextField` ×3, `AppButton`, checkbox (new — no source component for a plain checkbox; likely folds into a small local composition, not worth promoting to `02-component-inventory.md` for one use) |
| 05 | Profile setup | `/onboarding/profile` | `AppChip` (style tags), `AppTextField` (budget), `AppButton` | Step 1/4 |
| 06 | Upload photos | `/onboarding/scan` | `AppCard.dark`, `AppIcon`, `AppCallout`, `AppButton.accent` | Three capture-state rows (captured/retake/optional-empty) — a small local row composition, not a shared component (single-screen use) |
| 07 | Analysis progress | `/onboarding/analysing` | `ThinkingIndicator`, `AppProgressBar` | No cancel action, by design |
| 08 | Analysis results | `/onboarding/profile-result` | `AppCard`, `AppAvatar`-adjacent palette swatches (new, single-use), `AppButton` | |
| 09 | Clothing details | `/(tabs)/closet/[id]` | `AppImage`, `AppBadge`, `AppListRow`, `AppButton` | |
| 10 | Outfit generator | `/generate` | `AppOptionCard`, `AppChip`, `AppButton.accent` | |
| 11 | Product details | `/(tabs)/shop/[id]` | `AppImage` (carousel), `MatchScoreBadge`, `AppButton` ×2 | |
| 12 | Wishlist | `/(tabs)/shop/wishlist` | `ProductMatchCard` list, `AppProgressBar` (budget) | |
| 13 | Calendar | `/(tabs)/today/calendar` | `AppCard` (day cells) | |
| 14 | Packing planner | `/(tabs)/closet/packing` | `AppCard`, `AppListRow`, `AppButton` | |
| 15 | Wardrobe stats | `/(tabs)/closet/stats` | `AppCard`, `AppProgressBar` (colour balance) | |
| 16 | Laundry | `/(tabs)/closet/laundry` | `AppChip` (basket/dry-clean/clean), `AppListRow`, `AppButton` | |
| 17 | Notifications | `/notifications` | `AppListRow`-adjacent feed rows | |
| 18 | Settings | `/(tabs)/you/settings` | `AppToggle`, `AppListRow`, segmented control (new, single-use — appearance Light/Dark/System; see `04-inconsistencies-and-recommendations.md` §3) | |
| 19 | Subscription | `/pro` | `PriceCard` ×2, `AppButton.accent` | |
| 20 | Help centre | `/(tabs)/you/help` | `AppSearchField`, `AppListRow` | |
| 21 | Forgot password | `/(auth)/forgot` | `AppTextField`, `AppButton`, `AppCallout` | |
| 22 | Verify code | `/(auth)/forgot-verify` | `AppOtpField`, `AppButton`, password-strength (part of `AppTextField`) | |
| 25 | Share a look | `/share/[lookId]` | `AppCard.dark`, `AppChip` (format), `AppToggle`, `AppIconButton` ×4 | |
| 26 | Eid/wedding lookbook | `/(tabs)/shop/lookbook/[id]` | `AppImage`, `AppButton.accent` | Editorial palette — see `01-design-tokens.md` §8 |
| 27 | 360° try-on player | `/(tabs)/tryon/360/[lookId]` | `AppIcon`, `AppProgressBar` (scrubber), `AppCallout` (dark), `AppButton` | Pro-gated |
| 28 | Men's Today variant | `/(tabs)/today` (conditional) | Same as Today | Eastern-first weighting, no colour-season copy — a content/data variant, not a separate component tree |

### Fully broken-down screens (source §12.1–12.9)

#### Today (`(tabs)/today/index.tsx`)

`AppText` (overline + displayMedium greeting) → weather pill (`AppCard.light`, `rounded-full`) → `OutfitHeroCard` → two `AppOptionCard`s ("Rate my fit", "Ask Noor") → `WeekRail` → `AppCallout` (laundry nudge).

*States:* loading → hero becomes `AppSkeleton` at the same aspect ratio, quick actions and rail skeletonised. Empty (closet < 5 items) → hero becomes `AppEmptyState`. Error → `AppErrorView` in the hero's place, rest of screen renders normally.

#### Closet (`(tabs)/closet/index.tsx`)

`AppAppBar` (title + `AppIconButton` ×2) → `AppChip` filter row (horizontal `FlatList`) → `ClosetItemCard` grid (2-column `FlatList`, `numColumns={2}`).

*Add sheet:* `AppBottomSheet` with a 2×2 `AppOptionCard` grid + `AppButton`.

*States:* loading → 6 `AppSkeleton` tiles. Empty → `AppEmptyState`. Filtered-empty → `AppEmptyState` with different copy. Error → `AppErrorView`.

#### Try-On studio (`(tabs)/tryon/index.tsx`, always dark — see `01-design-tokens.md` §1)

`AppAppBar` (headline + quota pill) → canvas (`AppImage` at aspect 3/4, states: idle/busy/done — busy shows `ThinkingIndicator` + step text, done shows the result + `AppGlassPanel` caption) → 3 `AppChip`s (Front/Side/360°) → `GarmentRail` → `AppButton.accent` + `AppIconButton` (share).

*Generation state machine:* `idle → busy (3 named steps, ~2.2s) → done`, matching the actual mock state machine found in the source prototype's embedded script (`try: 'idle' | 'busy' | 'done'`) — this isn't invented, it's what the interactive prototype actually runs.

#### Noor chat (`(tabs)/today/chat.tsx`)

Header (`AppAvatar` + `AppText`) → inverted `FlatList` of `ChatBubble` (+ typing state via `ThinkingIndicator`, + inline suggestion cards reusing a condensed `ProductMatchCard`) → composer (prompt chips = horizontal `AppChip` row + `AppTextField`-adjacent pill input + `AppIconButton` send).

#### Rate my fit (`(tabs)/today/rate.tsx`)

Selfie `AppImage` (3/4) + `ScoreBreakdown` (`AppCard.dark`, `displayScore` count-up + 3 sub-score `AppProgressBar` rows + 3 tip cards).

#### Shop feed (`(tabs)/shop/index.tsx`)

`AppText` headline + mono subtitle → `AppChip` row → vertical `FlatList` of `ProductMatchCard`, ordered by match score descending — **poor matches stay visible with their reason rather than being hidden**, a product rule from the source worth keeping explicit here since it's easy to "fix" by accident (e.g. filtering scores below a threshold) when this list is actually implemented.

#### You (`(tabs)/you/index.tsx`)

`AppAvatar` row → `AppCard.dark` style profile (2-column grid of label/value pairs) → 3 stat cards → Pro gradient card (`expo-linear-gradient`, 140°, gold→clay) → `AppListRow` group (Wardrobe stats · Laundry · Packing planner · Notifications · Settings · Help centre).

#### Onboarding scan & analysis (`onboarding/scan.tsx`, `onboarding/analysing.tsx`, `onboarding/profile-result.tsx`)

Scan: three capture-state rows (captured/needs-retake/optional-empty, each with distinct icon+colour) + `AppCallout` + `AppButton.accent`. Analysing: `ThinkingIndicator` (76) + a top-to-bottom checklist (done/current/pending icon states) + `AppProgressBar`. Results: 2×2 attribute grid, 5-swatch palette row, `AppCard.dark` silhouette advice, `AppButton`.

#### Subscription (`pro.tsx`)

Overline naming the exhausted limit (query-param-driven, per the guard table above) → 4 benefit rows (gold check `AppIcon`) → 2 `PriceCard`s → `AppButton.accent` → legal line.

---

## 4. Micro-interactions → Reanimated

Every row in `../figma/03-screens.md` §13 maps to a Reanimated primitive; none require a new dependency beyond what Phase 0 already installed:

| Interaction | Reanimated approach |
|---|---|
| Button press (0.98 scale, 120ms) | `withTiming` on a shared value, driven by `Pressable`'s `onPressIn`/`onPressOut` |
| Tab switch fade (180ms) | Expo Router's `Tabs` default transition, or a custom `animation` option if the default doesn't match |
| Page push (shared-axis Z, 320ms) | Expo Router `Stack` screen `animation` option — verify which built-in option (`'slide_from_right'`, `'fade'`, etc.) matches "shared-axis Z" closest; it may need a custom native-stack animation config |
| Bottom sheet slide + scrim | Handled by `@gorhom/bottom-sheet` (see `02-component-inventory.md` — `AppBottomSheet`) |
| Outfit reveal (staggered rise+fade, 40ms/item, 520ms total) | `withDelay(index * AppDurations.stagger, withTiming(...))` per tile |
| AI thinking (breathing orb) | `withRepeat(withTiming(...), -1, true)` on opacity + scale — see `ThinkingIndicator` |
| Score count-up | `withTiming` driving a numeric shared value, read into `AppText` via `useAnimatedProps` on a Reanimated-wrapped `TextInput`, or a simpler JS `setInterval`-free approach using `useDerivedValue` + `runOnJS` to update state at intervals — implementation detail to settle when `ScoreBreakdown` is built |
| Favourite tap (0.9→1.06→1, 120ms) | `withSequence(withTiming(0.9,...), withTiming(1.06,...), withTiming(1,...))` |
| Reduced motion | `AccessibilityInfo.isReduceMotionEnabled()` (async, cache at app start) gates every animation above to an instant/static equivalent — a single shared hook (`useReducedMotion()`), not checked ad hoc per component |
