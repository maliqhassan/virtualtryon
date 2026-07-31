# 04 · Inconsistencies & recommendations

Findings from translating `../figma/` into `01`–`03` of this bundle, organised by what kind of problem each one is — a platform mismatch to resolve, a technical risk to test for, or an existing open question to carry forward rather than silently re-decide.

---

## A. The platform-target mismatch (the big one)

`../figma/README.md` states the target platform is **Flutter**, in the second sentence. `02-components.md` names a Dart file and constructor for every component. `04-react-native.md`'s own first line reads *"04 · Flutter implementation"* — its filename was changed to `04-react-native.md` at some point, but every section (§14–22: folder structure under `lib/`, Dart token classes meant to be pasted verbatim, a Riverpod/`GoRouter` widget plan, `pubspec.yaml` dependencies, a Flutter-specific file generation plan) is unchanged Flutter content.

**This is why `01`–`03` of this bundle exist as separate documents rather than edits to `04-react-native.md`.** The design itself (colour, type, spacing, radii, screens, interactions — §1–13 of the source) is unaffected by this and was treated as ground truth throughout. Only the *implementation* layer (§14–22) needed a real translation, not a find-and-replace of "Dart" with "TypeScript."

**Recommendation:** rename or clearly re-scope `../figma/04-react-native.md` back to describing itself as the Flutter reference it actually is (e.g. revert the filename, or add a banner pointing here), so a future reader doesn't open it expecting RN content and get Dart. Not done as part of this pass since `../figma/` is being treated as the design team's handoff artifact, not something to edit unilaterally — flagging it is the appropriate scope for this phase; the decision to change it belongs to whoever owns that folder.

---

## B. RN-specific technical risks found while translating

These aren't design inconsistencies — they're places where a Flutter-authored spec doesn't map onto React Native cleanly, discovered by actually working through the translation rather than assumed upfront.

1. **Material Symbols Rounded isn't in `@expo/vector-icons`.** The source specifies this icon set throughout (`01-foundation.md` §8); Expo's bundled icon solution carries `MaterialIcons`/`MaterialCommunityIcons` instead — a different, older set with mostly-but-not-fully overlapping glyphs. Resolution proposed in `01-design-tokens.md` §6 (load the font directly, render via ligature names through an `AppIcon` component) — but the variable-font-axis limitation on RN `Text` that makes a *static* font instance necessary should be re-verified against the RN/Expo version in use at implementation time, not taken as a permanent constraint.

2. **`expo-blur`'s Android fidelity is a real, not theoretical, risk.** The design uses glass exactly 3 times by rule (tab bar, try-on caption, 360° scrubber) — but the tab bar is visible on effectively every screen, so if Android blur looks materially different from the iOS-authored screenshots, that's a cross-platform visual gap on the single most-seen piece of chrome in the app. Needs an on-device Android check before the tab bar ships, not just a simulator/iOS check.

3. **RN shadows are platform-forked** (iOS reads `shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius`; Android only reads `elevation`, a fixed-tone shadow that can't reproduce the source's warm-tinted `rgba(22,19,15,.07)` soft shadow). The `boxShadow` token in `01-design-tokens.md` §5 will look right on iOS and visibly different on Android — a platform limitation to budget QA time for, not a config bug to chase.

4. **`AppBottomSheet` needs a new dependency** — `@gorhom/bottom-sheet` isn't in the Phase 0 install list. Flagging now so it's an intentional add during implementation, not a surprise mid-build.

5. **Shared-element transitions** (garment image, closet grid → detail) have more than one viable RN approach (`react-native-shared-element` vs. Reanimated's own layout-animation APIs) and picking one wasn't done here — it's a real decision, not a translation detail, and belongs with whoever builds `ClosetItemCard`'s navigation.

---

## C. Carried forward unchanged — not re-decided here

The source bundle already flags these as open product questions (`../figma/04-react-native.md` §22). Re-deciding them as part of a design-system pass would be scope creep in the same way inventing missing values would be — they're listed here only so they aren't lost in translation, not answered:

- **Checkout** — removed from the approved design; in-app purchase vs. hand-off to a partner store's web flow is unconfirmed.
- **Resale** — removed from the approved design; whether it ships in v1 is unconfirmed.
- **Global dark mode** — tokens exist for every surface (`01-design-tokens.md` §1), but only Try-On and the 360° player are dark *by design*, not by a user toggle. See the note below — screenshot evidence adds information here that the source docs' own open-item note doesn't fully reflect.
- **Urdu / RTL screens** — rules specified (`04-react-native.md` §15), no Urdu screens actually built in the design. RN's `I18nManager` is the mechanism when this is picked up; not started here.
- **360° player** — frame count (design shows 36), and whether frames are server-rendered or a local sprite sheet, both unconfirmed.
- **Free-tier limits** — design shows 3 generations/day and 2 try-ons/week; whether those are the shipping numbers is unconfirmed.
- **Notification triggers** — design shows outfit-ready 06:00, price drop, dry-clean reminder; the full trigger set needs backend confirmation.

### One place screenshot evidence adds information the text doesn't

The Settings screen (`04-screen-library.png`, screen 18) visibly shows a Light/Dark/System segmented control under "Appearance" — this is more concrete than the open-item note asking whether that control "ships in v1 or is a stub." The control exists in the approved visual design either way; what's still unconfirmed is only whether it's *wired up* or a static placeholder in v1. Worth relaying this distinction back to whoever owns that open item rather than treating it as fully unresolved.

---

## D. Spot-check results (confirming, not just asserting, fidelity)

Per the bundle README, the HTML prototype was read in full for several sections and spot-checked elsewhere rather than read line-by-line in its entirety (a 1,440-line file that would cost roughly 250K tokens to read verbatim, tabulating values `02-`/`03-`.md already extract exhaustively). Everything checked matched exactly — worth stating plainly rather than leaving as an implied assumption:

- Every colour value in the design-system board screenshot matches `01-foundation.md` §3 exactly (spot-checked primary/secondary/accent/background/surface/neutral ramp).
- The actual mock-data/state-machine script embedded in the HTML (`class Component extends DCLogic`) matches the documented interaction behaviour exactly — e.g. the shuffle button's generation-note cycling ("3 of 3 free generations left today" → ... → "free generations used") is the literal `NOTES` array the prototype runs, not a paraphrase.
- The screen-numbering gap at 23–24 in `03-screens.md`'s table (entries run 01–22, then jump to 25) lines up exactly with Checkout and Resale being "removed from the approved design" per the open-items list — those were very likely screens 23 and 24 before being cut, which is why the numbers are reserved-but-missing rather than the table just being incomplete.
- `AppShadows.device` (gallery presentation frame shadow) is correctly absent from the actual token set in `01-design-tokens.md` §5 — the source itself scopes it as "not product UI," and omitting it here is a deliberate match to that scoping, not an oversight.

---

## E. New dependencies this bundle implies (beyond Phase 0)

None of these are installed yet — flagged here as a single checklist rather than scattered across `01`–`03`:

| Package | For |
|---|---|
| `@expo-google-fonts/manrope`, `@expo-google-fonts/instrument-serif`, `@expo-google-fonts/ibm-plex-mono`, `@expo-google-fonts/noto-nastaliq-urdu` | Typography (`01-design-tokens.md` §2) |
| `expo-font` (font-loading API; likely already a transitive dependency of Expo, but the Material Symbols static font load is a direct, deliberate use of it) | Icons (`01-design-tokens.md` §6) |
| `expo-blur` | `AppGlassPanel` |
| `expo-image` | `AppImage` |
| `expo-linear-gradient` | Noor's avatar gradient, Pro card gradient |
| `@gorhom/bottom-sheet` | `AppBottomSheet` |
| A shared-element/transition solution (undecided — see §B.5) | Closet grid → detail transition |

`react-native-svg` (placeholder stripe painter) and `react-native-reanimated` (motion, already covered by `01-design-tokens.md` §7) are already installed from Phase 0 — not new.

---

## F. Recommendations

1. **Resolve §A before implementation starts** — whoever owns `../figma/` should know its `04-react-native.md` doesn't describe this stack, so it doesn't get handed to a future contributor as if it does.
2. **Android-test glass and shadows early** (§B.1–3) — these are the kind of gap that's cheap to catch on the first component (`AppGlassPanel`, `AppCard`) and expensive to catch after 20 screens are built against an iOS-only visual assumption.
3. **Add the §E dependencies to `frontend/package.json` as part of the same PR that first uses each one**, not as a batch upfront — keeps the dependency list traceable to why each one exists, consistent with how Phase 0 was built.
4. **Don't answer §C's open items as part of implementing this design system** — they're product decisions, not styling ones, and answering them implicitly (e.g. by just picking a free-tier number when building the quota pill) would bake in an unconfirmed decision as if it were final.
