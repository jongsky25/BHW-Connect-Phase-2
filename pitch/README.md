# Pitch decks

Standalone, self-contained HTML decks for partner conversations. Not part of the Next.js
app — open directly in any browser, or view the hosted Artifact link.

| File | Audience | Year-1 flagship module |
|---|---|---|
| `bhw-connect-who.html` | **WHO Philippines** | HHP+ / PhilPEN 2025 community NCD screening, Western Visayas (Region VI) — the *pilot* for a national standard |
| `koica-bhw-connect.html` | World Vision–KOICA | *(narrative deck only — superseded by the WHO deck)* |

## `bhw-connect-who.html`

**12 slides plus a 5-slide demo annex**, built for a 15–20 minute live slot presented by the
project team: arrows / swipe / keyboard, a five-segment chapter bar, and content auto-fitted
to the viewport.

It argues a **policy** case, not a product case, and the order is the argument. Three
movements, in this sequence:

| # | Slide | Act |
|---|---|---|
| 01 | Title | — |
| 02 | Where DOH and BLHSD are already going | **Direction** |
| 03 | The direction, already executed — the Phase 1 registry | **Direction** |
| 04 | How BHW capacity is built today — the traditional model | **The Problem** |
| 05 | Six gaps that survive a perfectly executed contract (G1–G6) | **The Problem** |
| 06 | The cost of starting over | **The Problem** |
| 07 | **The shift** — module-and-hope vs. standard-and-mandate | **The Opportunity** |
| 08 | What we co-develop — standard · issuance · platform · governance | **The Opportunity** |
| 09 | Standard → Pilot → Issuance → National | **The Opportunity** |
| 10 | The instrument — what a mandatory standard runs on | **The Opportunity** |
| 11 | The ask — four WHO roles | **The Ask** |
| 12 | Close — the goal, and the impact band | — |
| A1–A5 | Clickable Phase 2 mockups | **Annex** |

**Slide 07 is the thesis.** Not a module for one selected LGU in the hope that it scales, but
a national competency standard, made mandatory by DOH issuance, piloted in a select LGU, and
scaled on the registry that already exists. If anything has to be cut, it is never 07.

The annex sits behind the close deliberately — walk into it on demand, not on the way through.

Eyebrow ordinals are assigned at runtime from slide order (`numberEyebrows()`), so cutting,
merging or reordering a slide can never leave a stale or duplicated number. Don't hard-code
them. They run **01–11** across the narrative and continue **12–16** through the annex.

**Controls** — arrow keys / space / Home / End, the chapter bar, or swipe. On demo slides
only, a **Wika** toggle switches the *in-app UI* between Filipino and English and an **App
theme** toggle flips it light/dark. Both are real product features being demonstrated.

### Seven things to keep straight when editing

1. **Deck chrome is always English; only the device content follows the Wika toggle.** The
   toggle used to flip slide headlines too, which made eight consecutive slides unreadable to
   a non-Filipino reviewer. Demo scene chrome is written as English literals in `demo2()`;
   `t()` is for in-device strings only.

2. **Nothing is claimed as built.** Phase 2 is *designed end to end and not yet built*; the
   demo chapter is hand-built HTML mockups, not a running application. The standard is
   deliberately stricter than "the code exists": **nothing is called built until a Barangay
   Health Worker has used it in the field.** The matching leave-behind is
   `docs/concept-notes/bhw-connect-phase2-concept-note-who.md`, whose §9 says the same thing
   — **the two must be changed together.** Do not hand over the KOICA edition alongside this
   deck; its Year-1 scope and framing are different.

3. **Never reintroduce ttCF, Eastern Visayas or Region VIII.** That proposal is preliminary
   and unsettled, and is deliberately absent from both documents. Any first-mover exclusivity
   between partners is a verbal point and is never written down.

4. **No clinical thresholds are asserted.** Health content is procedural and traces to the
   BLHSD/WHO deck "Strengthening Barangay Health Worker Capacity under HHP+" (31 July 2026),
   which contains no PhilPEN numeric cut-offs. The CBG return-demonstration checklist is
   reproduced faithfully — 29 criteria, 87-point maximum, 90% / 75% bands — because those are
   the DOH instrument's own. Every health string carries a validation notice.

5. **Coverage arithmetic is the spine of the value argument**, and the distinction between
   *geography* and *delivery* is the whole point. From the Phase 1 registry, Region VI has
   **23,813** BHWs. The training package covers Iloilo province (**10,519**), Iloilo City
   (**309**) and Guimaras (**705**) — **11,533**, or **48.4%** — but that is the map, not the
   delivery. Training begins only after the package's inception, development and validation
   outputs; a contractor running sessions in the weeks that remain reaches **360–1,200**
   people directly, i.e. **2–5%** of the region. The rest cascade, and the **12,280** in
   Aklan, Antique and Capiz are outside the package entirely.

   These coverage figures now live in exactly three places: **G3 on slide 05**, the *what
   stops* column on **slide 06**, and **concept note §13.1**, plus this file. **If one moves,
   they all move together.**

   The delivery model (6–10 weeks, 2–3 sessions/week, 30–40 participants) is an assumption,
   printed on-slide so it can be challenged. If the contractor's actual session count becomes
   known, use it — a real number beats the model.

6. **`[TO CONFIRM]` markers are load-bearing** and render as conspicuous `.tbc` chips so they
   cannot ship unnoticed. Five remain in the deck — the title slide's date/version/contact,
   the Phase 1 registry-extract evidence, the total already spent on HHP+ content (slide 06),
   the policy instrument and its route (slide 08), and the clinical-workforce comparator
   headcount (slide 12). Replace only with real figures.

7. **There is no cost slide, and that is deliberate.** The scope/coverage/cost slide and the
   three funding tiers were removed when the deck was reframed as a direction-and-partnership
   case. **The money lives in `docs/concept-notes/…-who.md` §13**, which is unchanged and
   remains authoritative: **₱14,980,000 ≈ US$258,000**, bottom-up from the workplan. The ask
   survives on slide 11 as *Year-1 support*, pointing at the concept note for the envelope,
   the tiers and the workplan.

   **Do not reintroduce a peso figure anywhere in this deck** — not on the ask, not on the
   close — without moving §13 and this file in the same commit. A cost figure on a slide and
   a different one in the note is exactly the drift that put the KOICA envelope on the WHO
   deck's close for as long as it did.

### Visual registers

Three grounds, and the register is load-bearing — the deck's shape is the traditional model
stated (04–06), then the shift away from it (07–10), so those two must read as opposites at
projector distance.

| Register | Class | Ground | Accent |
|---|---|---|---|
| **Problem** | `darker problem` | cold near-black, ember wash from the floor | ember |
| **Solution** | `light solution` | warm ground, full-bleed verdant rule along the top edge | verdant |
| **Neutral** | `light` / `dark` / `darker` | existing teal palette | marigold |

**Slide 07 is the one deliberate exception**: it carries a neutral `dark` ground and holds
*both* vocabularies at once, because the turn in the argument happens on that slide. Its left
column keeps the problem grammar (square corners, ember rule, muted text) and its right column
the solution grammar (rounded, lifted, verdant). Don't "fix" it into a single register.

A `problem`/`solution` slide must **also** keep its base `dark`/`darker`/`light` class — the
register only re-grounds and re-accents; every text rule keys off the base class, and dropping
it renders dark ink on a dark ground. Statement slides (title, stance, close) carry `centered`;
everything else pins to a fixed top so the eyebrow does not bounce between slides.

**Meaning is never carried by colour alone** — each gap card is marked `OPEN`, and the headings
on slides 05 and 06 carry `6 open` / `6 still open` counters.

Some CSS is intentionally retained but currently unused (`.closes` / `.close-row`, `.tiers`,
`.splitcost`, `.ladder-v`, `.only` / `.oncard`, `.stance*`, `.chips`, `.ingest`, `.status`,
`.costlist`). Those components belong to slides this reframe merged or retired; they are kept
because slides get re-cut often and because the regression traps below still document them.
Don't treat them as dead code to sweep.

### Regression traps

- `.costlist li` must **not** be a flex container. With `display:flex` a bare text node and any
  inline `<em>` each become separate flex items, which threw an emphasis into a phantom second
  column. The marker is absolutely positioned so body text stays a normal inline flow.
- `.shift .r` hits the same trap and is fixed the other way: the row *is* a flex container
  (so paired rows centre against each other), so its content must stay wrapped in a **single**
  `<span>`. Drop the span and every sentence with an inline `<b>` deals itself into two
  columns — this happened on the first render of slide 07.
- `#confetti` sits at `z-index:3` (under the nav chrome) and `go()` clears it on every slide
  change. Without the reset it rained over the ask and the budget slides.
- `.counter` / `.brandtab` must not use `mix-blend-mode` — it rendered both invisible on
  two-thirds of slides. They read `body[data-ground]`, set per slide in `go()`.
- Mobile `.slide` needs `overflow-x:hidden`: the decorative `::after` bloom sits at
  `right:-12%` and becomes real horizontal page scroll once `overflow-y` opens up.
