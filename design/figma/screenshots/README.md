# Screenshots

Captured from the approved design at 2–3× for reference. The HTML in `../design/` remains the source of truth — measure from it, not from these PNGs.

| File | What it shows |
|---|---|
| `01-design-brief.png` | Assumptions, information architecture, navigation model, first-run journey |
| `02-design-system.png` | Colour ramps (light + dark), type specimens, live component examples, grid & motion rules |
| `03-prototype-today.png` | Today — outfit hero card, quick actions, week rail, laundry callout, tab bar |
| `03b-prototype-closet.png` | Closet — filter chips, 2-column grid, favourites, add affordance |
| `03c-prototype-tryon.png` | Try-On studio (dark) — generated result with glass caption, view chips, garment rail |
| `03d-prototype-shop.png` | Shop — match feed with score, colour and fit badges plus reasoning |
| `03e-prototype-you.png` | You — style profile card, stats, Pro card, settings rows |
| `03f-prototype-chat.png` | Noor chat — bubbles, thinking state, inline suggestion cards, prompt chips |
| `04-screen-library.png` | All 20 library screens in one sheet: splash → help centre |
| `05-handoff-notes.png` | Responsive, accessibility, motion and Flutter notes as shown in the design |
| `06-recovery-sharing.png` | Forgot password, verify code, share a look |
| `07-editorial.png` | Eid/wedding lookbook, 360° try-on player, men's Today variant |

## Known capture artifacts

These are limitations of the DOM-to-image capture, **not** defects in the design. Open the HTML to see the correct rendering:

- `03f-prototype-chat.png` — the two dynamically-inserted bubbles (the user message and Noor's reply) render clipped and semi-transparent. In the live prototype both are fully opaque with complete text.
- `03b-prototype-closet.png` — scrollbars are visible on the chip row and page. The live design uses overlay scrollbars.
