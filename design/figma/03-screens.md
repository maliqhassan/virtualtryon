# 03 · Screens, navigation & interaction

Sections 10–13 of the handoff.

---

# 10. Screen inventory

26 screens. Numbers match the labels in the design file (`design/AI Stylist.dc.html`).

| # | Screen | Route | Purpose | Entry | Exit |
|---|---|---|---|---|---|
| 01 | Splash | `/` | Brand moment; resolve auth + hydrate profile | App launch | → Onboarding (new) or Today (returning) |
| 02 | Onboarding | `/onboarding` | Three value cards | Splash, first run | → Login · Skip → Login |
| 03 | Login | `/login` | Email, Google, Apple | Onboarding, logout | → Today · Signup · Forgot |
| 04 | Signup | `/signup` | Create account + consent | Login | → Profile setup |
| 05 | Profile setup | `/onboarding/profile` | Style tags, weekly rhythm, budget (step 1/4) | Signup | → Upload photos |
| 06 | Upload photos | `/onboarding/scan` | Face, full body, optional side (step 2/4) | Profile setup | → Analysis |
| 07 | Analysis progress | `/onboarding/analysing` | Named on-device analysis steps | Upload photos | → Analysis results (auto) |
| 08 | Analysis results | `/onboarding/profile-result` | Style profile, palette, silhouette advice | Analysis | → Closet (build my closet) |
| 09 | Clothing details | `/closet/:id` | One garment: tags, wear history, pairings | Closet grid, chat, generator | → Try-On · Laundry · back |
| 10 | Outfit generator | `/generate` | Occasion, formality, region, sources | Today, Closet | → Generated results |
| 11 | Product details | `/shop/:id` | Product, match breakdown, sizing | Shop feed, wishlist | → Try-On · Buy |
| 12 | Wishlist | `/shop/wishlist` | Saved products, budget, alternatives | Shop | → Product details |
| 13 | Calendar | `/today/calendar` | Plan outfits against events | Today | → Outfit generator for a date |
| 14 | Packing planner | `/closet/packing` | Trip capsule, day assignments | You | → Export |
| 15 | Wardrobe stats | `/closet/stats` | Counts, most-worn, dead stock, colour balance | You | → Style it · Resell |
| 16 | Laundry | `/closet/laundry` | Basket, dry-clean, reminders | You, Today | → Mark clean |
| 17 | Notifications | `/notifications` | Today / earlier feed | You | → deep links |
| 18 | Settings | `/you/settings` | Appearance, region, privacy | You | → data deletion |
| 19 | Subscription | `/pro` | Pro paywall, yearly/monthly | Limit exhaustion, You | → purchase |
| 20 | Help centre | `/you/help` | Search, popular articles, contact | You | → Ask Noor · Email |
| 21 | Forgot password | `/forgot` | Request a reset code | Login | → Verify code |
| 22 | Verify code | `/forgot/verify` | 6-digit code + new password rules | Forgot password | → Login |
| 25 | Share a look | `/share/:lookId` | Export a look as a card, story or photo | Try-On, Today | → system share sheet |
| 26 | Eid / wedding lookbook | `/shop/lookbook/:id` | Editorial collection, ownership per look | Shop | → Try-On with a look |
| 27 | 360° try-on player | `/tryon/360/:lookId` | Rotate a generated try-on, fit critique | Try-On (Pro) | → Save · Share |
| 28 | Men's Today | `/today` (variant) | Same shell, Eastern-first weighting | Launch, male profile | as Today |

### Primary tab screens (always reachable)

| Tab | Screen | Purpose | Components used |
|---|---|---|---|
| Today | Daily outfit home | The hero answer + quick actions + week ahead + laundry nudge | `OutfitHeroCard`, `AppOptionCard` ×2, week `AppCard.light()` rail, laundry `AppCallout`, `AppBottomNav` |
| Closet | Wardrobe grid | Browse, filter, favourite, add | `AppAppBar`, `AppIconButton` ×2, `AppChip` row, `ClosetItemCard` grid, add `AppBottomSheet` |
| Try-On | Try-on studio (dark) | Dress the model, generate, review | `AppImage` canvas, `ThinkingIndicator`, `AppGlassPanel` caption, view `AppChip` row, garment rail, `AppButton.accent` |
| Shop | Match feed | Ranked products with reasons | `AppChip` filters, `ProductMatchCard` list, `MatchScoreBadge` |
| You | Profile & settings hub | Style profile, stats, Pro, settings rows | `AppAvatar`, `AppCard.dark()` profile, stat cards, Pro gradient card, `AppListRow` group |

### Global overlays

| Overlay | Purpose | Reachable from |
|---|---|---|
| Noor chat | Conversational styling with inline outfit cards | Today quick action; persistent pill on any tab |
| Rate my fit | Selfie → overall score, sub-scores, three tips | Today quick action |
| Add to closet sheet | Camera roll · shoot · receipt · link | Closet `+` |

---

# 11. Navigation flow

## 11.1 Graph

```
Splash
 ├── (no session) → Onboarding 1-3 → Login ⇄ Signup
 │                                    ├── Forgot → Verify → Login
 │                                    └── Signup → Profile setup → Upload photos
 │                                                  → Analysis → Analysis results
 │                                                  → Closet (first batch upload)
 │                                                  → Today (first outfit)
 └── (session) → Today

Shell (StatefulShellRoute, 5 branches)
 ├── Today   ├── Calendar
 │           ├── Outfit generator → results
 │           ├── Rate my fit
 │           └── Noor chat
 ├── Closet  ├── Clothing details → Try-On
 │           ├── Wardrobe stats → Resell
 │           ├── Laundry
 │           └── Packing planner
 ├── Try-On  ├── 360° player (Pro)
 │           └── Share a look
 ├── Shop    ├── Product details → Try-On / Checkout
 │           ├── Wishlist
 │           └── Lookbook → Try-On
 └── You     ├── Settings
             ├── Subscription
             ├── Notifications
             └── Help centre
```

## 11.2 Route table

| Route | Screen | Guard | Presentation |
|---|---|---|---|
| `/` | Splash | — | fullscreen, no transition |
| `/onboarding` | Onboarding | `!seenOnboarding` | fade-through |
| `/login` `/signup` `/forgot` `/forgot/verify` | Auth | `!authed` | push |
| `/onboarding/profile` `/onboarding/scan` `/onboarding/analysing` `/onboarding/profile-result` | First-run | `authed && !profileComplete` | push, no back past `/onboarding/analysing` |
| `/today` | Today | `authed` | shell branch 0 |
| `/today/calendar` `/today/rate` `/today/chat` | — | `authed` | push (chat: `fullscreenDialog`) |
| `/generate` | Outfit generator | `authed` | push |
| `/closet` | Closet | `authed` | shell branch 1 |
| `/closet/:id` | Clothing details | `authed` | push with `Hero` on the image |
| `/closet/stats` `/closet/laundry` `/closet/packing` | — | `authed` | push |
| `/tryon` | Try-On studio | `authed` | shell branch 2 |
| `/tryon/360/:lookId` | 360° player | `authed && isPro` → else `/pro` | `fullscreenDialog` |
| `/share/:lookId` | Share a look | `authed` | `fullscreenDialog` |
| `/shop` | Shop feed | `authed` | shell branch 3 |
| `/shop/:id` `/shop/wishlist` `/shop/lookbook/:id` | — | `authed` | push |
| `/you` | You | `authed` | shell branch 4 |
| `/you/settings` `/you/help` `/notifications` | — | `authed` | push |
| `/pro` | Subscription | `authed` | `fullscreenDialog` |

**Redirects:** unauthenticated → `/login`. Authenticated with `profileComplete == false` → `/onboarding/profile`. Free user hitting a Pro gate → `/pro` with the originating feature as a query param so the paywall headline can name it ("You've used 3 of 3 today").

**Back behaviour:** each branch keeps its own stack. Android back pops the branch stack, then switches to Today, then exits. Try-On is not popped when the user tab-switches away mid-generation — the job continues.

---

# 12. Screen breakdown

Only the screens with real structural complexity are expanded. Every screen not listed follows the standard pattern: `AppScaffold` → `AppAppBar` → sections of `AppCard`, with loading = `AppSkeleton`, empty = `AppEmptyState`, error = `AppErrorView`.

---

## 12.1 Today

**Widget tree**

```
AppScaffold
└ ListView (padding: 62 top ▸ SafeArea+20, 20 sides, 108 bottom)
  ├ Row  ── greeting Column (overline date, displayMedium "Good morning, Zara")
  │        └ weather pill (AppCard.light radius full, clear_day 17 gold, "34°")
  ├ SizedBox 20
  ├ OutfitHeroCard                       ◀ §9.10
  ├ SizedBox 14
  ├ Row gap 10 ── AppOptionCard "Rate my fit"  (photo_camera, primary)
  │              AppOptionCard "Ask Noor"      (forum, secondary)
  ├ SizedBox 26
  ├ Row ── "This week" (title) · "Calendar" (Manrope 12/600 clay)
  ├ SizedBox 12
  ├ SizedBox(height: ~150) horizontal ListView of week cards
  │   └ 96 wide, AppCard.light radius 16, pad 11: day mono · 62 image · event 11.5/600
  ├ SizedBox 24
  └ AppCallout(warning) ── local_laundry_service 22, "3 items in the laundry basket",
                            "Excluded from today's suggestions", chevron_right
```

**Interactions**

| Action | Result |
|---|---|
| Try on | push `/tryon` preloaded with today's garments |
| Shuffle | regenerate; `generationNote` steps through the free-tier counter (3 → 2 → 1 → exhausted); at 0 the note becomes "free generations used — Pro unlocks unlimited" and the button routes to `/pro` |
| Save/worn | toggles `bookmark_border` ⇄ `check_circle`; logs the wear and decrements laundry freshness |
| Rate my fit | push `/today/rate` |
| Ask Noor | push `/today/chat` |
| Week card | push `/generate` seeded with that date's event |
| Laundry callout | push `/closet/laundry` |

**States** — Loading: hero replaced by an `AppSkeleton` block at the same aspect, quick actions and week rail skeletonised. Empty (closet < 5 items): hero swaps to an `AppEmptyState` — "Add five things and Noor starts styling" + `AppButton.primary` "Add to closet". Error: `AppErrorView` in place of the hero, rest of the screen still renders.

**Animations** — hero mosaic tiles rise 10dp staggered 40ms on first paint (520ms total); shuffle cross-fades the mosaic over 400ms while the reasoning line fades out/in at 180ms.

---

## 12.2 Closet

**Widget tree**

```
AppScaffold
└ CustomScrollView
  ├ SliverToBoxAdapter ── header Row (headline "Closet" · search + add AppIconButtons)
  │                        subtitle mono "128 items · 4 unworn this season"
  │                        horizontal AppChip row (All, Tops, Bottoms, Eastern, Shoes, Accessories)
  └ SliverGrid (2 col, gutter 11, childAspect ≈ .70)
      └ ClosetItemCard                    ◀ §9.11
```

**Interactions** — chip filters the grid immediately (client-side, no spinner); heart toggles favourite with a 120ms 0.9→1.06→1 scale; card tap pushes `/closet/:id` with a `Hero` on the image; `+` opens the add sheet.

**Add-to-closet sheet** — 2 × 2 `AppOptionCard` grid (Camera roll / Shoot now / From receipt / Paste a link) + full-width "Continue". Copy: "Pick up to 20 photos. Noor removes backgrounds, names each piece and tags fabric, colour and formality."

**States** — Loading: 6 skeleton tiles. Empty: `AppEmptyState` with `checkroom`. Filtered-empty: "Nothing in Eastern yet" + "Clear filter". Error: `AppErrorView` with retry.

---

## 12.3 Try-On studio (dark)

**Widget tree**

```
AppScaffold(dark: true, background #12110F)
└ ListView
  ├ Row ── headline "Try-on studio" (#F2EFEA) · quota pill ("2 try-ons" left)
  ├ Canvas AspectRatio 3/4, radius 24, dark placeholder fill
  │   ├ idle    → accessibility_new 34 + "[ your body scan · front view ] drop render here"
  │   ├ busy    → ThinkingIndicator 70 + "Fitting the kurta to your frame"
  │   │                                   + "step 2 of 3 · draping fabric"
  │   └ done    → generated image + AppGlassPanel caption:
  │               auto_awesome gold + "Reads well on you — 91"
  │               + "The ivory lifts your skin tone. Shorten the sleeve by 1cm…"
  ├ Row of 3 view chips ── Front · Side · 360° (360° disabled/Pro, colour #6B655D)
  ├ overline "Dress the model"
  ├ horizontal rail of 78-wide garment tiles (2px ring in clay when selected)
  └ Row ── AppButton.accent (Generate try-on ▸ Save this look) · share AppIconButton
```

**Generation state machine** — `idle → busy (3 named steps, ~2.2s) → done`. Steps: "reading your measurements" → "draping fabric" → "matching light". Quota decrements on entering `busy`; at zero the CTA routes to `/pro`.

**States** — Error: caption slot becomes an `AppErrorView` variant on dark ("Generation failed. Your try-on credit wasn't used. Retry."). Offline: CTA disabled with "Try-on needs a connection".

---

## 12.4 Noor chat

**Widget tree**

```
Column
├ header ── back · Noor AppAvatar 32 · "Noor" + "knows your 128 items" (mono, success)
├ Expanded ListView (18 × 20) of bubbles
│   ├ user  → align end,   surfaceInverse, #F6F4F0, radius 18/18/6/18
│   ├ noor  → align start, surface, textPrimary, 1px border, radius 18/18/18/6
│   ├ typing→ ThinkingIndicator 22 + "reading your closet…"
│   └ cards → Row of 3 suggestion cards (3/4 image, name, "94 match" in success mono)
└ composer
  ├ horizontal prompt chips ("I have a mehndi Friday", "What colour suits me?", "Suggest shoes")
  └ pill input + 38 circular send AppIconButton (neutral900, arrow_upward)
```

Bubble entry: `riseIn` 300ms. Response latency is simulated at 1.6s in the prototype; bind to the real stream and keep the typing indicator until the first token.

---

## 12.5 Rate my fit

Left column: the selfie at 3/4, radius 20. Right column: `AppCard.dark()` — `displayScore` 62 "84", overline "OVERALL", hairline divider, then three sub-score rows (COLOUR 88 / FIT 79 / OCCASION 91), each with a mono label-value row and a 4px gold `AppProgressBar`. Below: three tip cards (`palette` clay / `straighten` slate / `watch` gold), each title Manrope 13/700 + body 12/1.5.

Animation: the number counts up over 700ms while all three bars grow in step.

---

## 12.6 Shop feed

Headline "Matched for you" + mono subtitle naming the active constraint ("ranked by body fit, skin tone & budget ≤ PKR 12k"). Chip row (Eastern edit / Western / Wedding / Under 5k), then a vertical list of `ProductMatchCard`.

Ordering is by match score descending; poor matches are still shown — with the reason — rather than hidden, because the explanation is the product.

---

## 12.7 You

Avatar row (66 avatar + name + "Lahore · profile 92% complete") → `AppCard.dark()` style profile (2-column grid of six mono label / serif value pairs, "rescan" action) → three stat cards (128 items / 41 outfits worn / 88 avg score, the last in clay) → Pro gradient card (`linear-gradient(140deg, #C9A227, #B4713F)`, serif "Stylist Pro", benefit line, `#16130F` price button) → `AppListRow` group (Wardrobe stats · Laundry · Packing planner · Notifications · Settings · Help centre).

---

## 12.8 Onboarding scan & analysis (06–08)

**06 Upload photos** (dark) — step overline, serif title, three capture rows: captured (thumbnail + "captured · sharp" + `check_circle` success), needs-retake (thumbnail + "retake · knees cropped" + `replay` warning), optional-empty (dashed 1.5px border + `add` + "optional · improves fit by 12%"). Callout: height/weight may be typed instead of measured. CTA "Analyse me" in clay.

**07 Analysis** (dark) — `ThinkingIndicator` 76, serif "Reading your proportions", a left-aligned checklist that fills top to bottom (`check` success → `autorenew` white current → `circle` muted pending), a 3px gold progress bar at 62%, and "about 6 seconds". No cancel — the step is short and non-blocking by design.

**08 Results** — overline "Your style profile", serif two-line headline, 2 × 2 attribute grid (FACE Oval / BODY Rectangle / HAIR Dark brown / EYES Hazel), a 5-swatch palette row at 34 high, an avoid-list line, a dark silhouette-advice card, and "Build my closet".

---

## 12.9 Subscription (19)

Dark. Overline names the exhausted limit. Serif "Stylist Pro". Four benefit rows with gold `check` glyphs. Two price cards side by side: yearly is bordered 1.5px gold with a "SAVE 33%" flag overlapping the top-left corner (`top: -9`), monthly has a plain white-alpha border. CTA "Start 7 days free" in clay. Legal line: "Cancel any time. Restore purchase · Terms".

---

# 13. Micro-interactions

| Interaction | Spec |
|---|---|
| Button press | scale 0.98, 120ms `easeOutCubic`, no ripple splash — use `InkWell` with a transparent highlight or a custom `ScaleTap` |
| Button hover (desktop/web) | background lightens one step, 180ms |
| Tab switch | fade-through 180ms; no slide |
| Page push | Material shared-axis Z, 320ms `easeOutCubic` |
| Modal / fullscreen dialog | slide up 320ms + scrim fade |
| Bottom sheet | slide up 320ms `easeOutCubic`, scrim 0→.42 in parallel; drag-to-dismiss with velocity threshold |
| Outfit reveal | mosaic tiles rise 10dp + fade, staggered 40ms, 520ms total |
| Shuffle | mosaic cross-fade 400ms; reasoning text 180ms out / 180ms in |
| AI thinking | breathing orb 1.5s ease-in-out infinite + a named step that changes on each phase — **never a spinner** |
| Try-on result | cross-fade 400ms, then the glass caption slides up 12dp over 260ms |
| Score reveal | number counts up 700ms; bars animate width in step |
| Favourite tap | scale 0.9 → 1.06 → 1 over 120ms, colour cross-fade to `error` |
| Chip select | background/text cross-fade 180ms; grid re-lays out with an implicit 200ms animation |
| Upload progress | per-item determinate bar; the grid tile fades in as each item finishes tagging |
| Image preview | `Hero` on the garment image between grid and detail, 320ms |
| Success | inline — a `check_circle` in `success` replacing the affordance. No confetti, no full-screen success state |
| Failure | inline `AppErrorView` or a field-level error row. Never a modal for a recoverable failure |
| Pull to refresh | custom indicator using `ThinkingIndicator` at 22, not `CircularProgressIndicator` |
| Reduced motion | all of the above collapse to instant state changes; the breathing orb becomes a static dot; `Hero` still runs (it aids comprehension) |
