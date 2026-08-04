# Pitch decks

Standalone, self-contained HTML decks for partner conversations. Not part of the Next.js
app — open directly in any browser, or view the hosted Artifact link.

| File | Audience | Year-1 flagship module |
|---|---|---|
| `bhw-connect-who.html` | **WHO Philippines** | HHP+ / PhilPEN 2025 community NCD screening, Western Visayas (Region VI) |
| `koica-bhw-connect.html` | World Vision–KOICA | *(narrative deck only — superseded by the WHO deck)* |

## `bhw-connect-who.html`

**20 slides**, built for a 15–20 minute live slot presented by the project team. Combines
the narrative pitch and the product walkthrough into one navigation model: arrows / swipe /
keyboard, a five-segment chapter bar, and content auto-fitted to the viewport.

Structure — **Standing** (Phase 1 delivered · what BHW Connect is) → **The Gap** (what HHP+
built and the package on the table · six months from now · six gaps G1–G6) → **The Answer**
(stance · the engine · build status) → **Prototype** (five demo slides) → **The Ask** (designed
to last · why WHO · the ask · scope and cost · every gap closed) → close.

**Controls** — arrow keys / space / Home / End, the chapter bar, or swipe. On demo slides
only, a **Wika** toggle switches the *in-app UI* between Filipino and English and an **App
theme** toggle flips it light/dark. Both are real product features being demonstrated.

### Four things to keep straight when editing

1. **Deck chrome is always English; only the device content follows the Wika toggle.** The
   toggle used to flip slide headlines too, which made eight consecutive slides unreadable to
   a non-Filipino reviewer. Demo scene chrome is written as English literals in `demo2()`;
   `t()` is for in-device strings only.

2. **Build status is claimed as *built*, not *deployed*.** The defensible claim is: built and
   tested, shipping behind feature flags defaulted off, pilot launch gate not yet cleared, no
   BHW using it in the field. Do not overshoot into live use, and do not revert to "design
   prototype" — the repository contradicts that. ⚠️ The concept note in `docs/concept-notes/`
   still says Phase 2 is "conceptualized and planned"; **it needs a WHO version with corrected
   build status before it is handed over alongside this deck.**

3. **No clinical thresholds are asserted.** Health content is procedural and traces to the
   BLHSD/WHO deck "Strengthening Barangay Health Worker Capacity under HHP+" (31 July 2026),
   which contains no PhilPEN numeric cut-offs. The CBG return-demonstration checklist is
   reproduced faithfully — 29 criteria, 87-point maximum, 90% / 75% bands — because those are
   the DOH instrument's own. Every health string carries a validation notice.

4. **`[TO CONFIRM]` markers are load-bearing.** The province, Year-1 BHW cohort and cost per
   BHW on the scope slide are unfilled on purpose. The ₱6M and the old "26,000 BHWs" figure
   were imported from the Eastern Visayas concept note and are the wrong region; filling them
   with plausible-looking numbers is the exact failure a funder review flagged. Replace only
   with real figures.

### Visual registers

Three grounds, and the register is load-bearing — the deck's shape is problem stated, then
problem closed, so those two must read as opposites at projector distance.

| Register | Class | Ground | Accent |
|---|---|---|---|
| **Problem** | `darker problem` | cold near-black, ember wash from the floor | ember |
| **Solution** | `light solution` | warm ground, full-bleed verdant rule along the top edge | verdant |
| **Neutral** | `light` / `dark` / `darker` | existing teal palette | marigold |

A `problem`/`solution` slide must **also** keep its base `dark`/`darker`/`light` class — the
register only re-grounds and re-accents; every text rule keys off the base class, and dropping
it renders dark ink on a dark ground. Statement slides (title, stance, close) carry `centered`;
everything else pins to a fixed top so the eyebrow does not bounce between slides.

**Meaning is never carried by colour alone** — each gap card is marked `OPEN`, each closure row
carries `✓`, and the headings carry `6 open` / `6 closed` counters.

### Regression traps

- `.costlist li` must **not** be a flex container. With `display:flex` a bare text node and any
  inline `<em>` each become separate flex items, which threw an emphasis into a phantom second
  column. The marker is absolutely positioned so body text stays a normal inline flow.
- `#confetti` sits at `z-index:3` (under the nav chrome) and `go()` clears it on every slide
  change. Without the reset it rained over the ask and the budget slides.
- `.counter` / `.brandtab` must not use `mix-blend-mode` — it rendered both invisible on
  two-thirds of slides. They read `body[data-ground]`, set per slide in `go()`.
- Mobile `.slide` needs `overflow-x:hidden`: the decorative `::after` bloom sits at
  `right:-12%` and becomes real horizontal page scroll once `overflow-y` opens up.
