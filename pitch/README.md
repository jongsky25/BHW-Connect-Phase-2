# Pitch decks

Standalone, self-contained HTML decks for partner conversations. Not part of the Next.js
app — open directly in any browser, or view the hosted Artifact link.

| File | Audience | Year-1 flagship module |
|---|---|---|
| `bhw-connect-who.html` | **WHO Philippines** | HHP+ / PhilPEN 2025 community NCD screening, Western Visayas (Region VI) |
| `koica-bhw-connect.html` | World Vision–KOICA | *(narrative deck only — superseded by the WHO deck)* |

## `bhw-connect-who.html`

**23 slides**, built for a 15–20 minute live slot presented by the project team. Combines
the narrative pitch and the product walkthrough into one navigation model: arrows / swipe /
keyboard, a five-segment chapter bar, and content auto-fitted to the viewport.

Structure — **Standing** (Phase 1 delivered · what BHW Connect is) → **The Gap** (what HHP+
built and the package on the table · six gaps G1–G6) → **The Answer** (stance · the whole
system · the engine · where it stands) → **Prototype** (five mockup slides) → **The Ask**
(designed to last · already paid for · why WHO · the ask · scope, coverage and cost · every
gap closed · the cost of the status quo · the impact) → close.

The last three Ask slides are a deliberate sequence and should not be reordered: **every gap
closed** (what funding buys) → **the cost of the status quo** (the same six gaps left open, in
the problem register) → **the impact** (300,000 workers as the output, 114M Filipinos as the
outcome). The status-quo slide is the only place in the deck where the problem register
reappears after the solution register has taken over, and that reversal is the argument.

Eyebrow ordinals are assigned at runtime from slide order (`numberEyebrows()`), so cutting,
merging or reordering a slide can never leave a stale or duplicated number. Don't hard-code them.

**Controls** — arrow keys / space / Home / End, the chapter bar, or swipe. On demo slides
only, a **Wika** toggle switches the *in-app UI* between Filipino and English and an **App
theme** toggle flips it light/dark. Both are real product features being demonstrated.

### Six things to keep straight when editing

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

   Year 1 covers the **whole region — 23,813 BHWs** — at **₱14.98M**, i.e. **₱629 per BHW**,
   falling to **₱50** against the national base. G3, the scope slide, the concept note and
   this file all carry these figures: **if one moves, they all move together.**

   **₱14.98M is the value, and it does not move. The funding mix does.** The scope slide
   presents three tiers of the *same* scope, never three sizes of scope:

   | Tier | Cash | What changes |
   |---|---|---|
   | 1 | ₱14.98M | WHO finances the whole envelope |
   | 2 | **₱5.98M (≈₱6.0M)** | Rollout, M&E, equipment, video, PM, clinical validation and governance — **₱9.00M** — absorbed as direct support and counterpart |
   | 3 | no new instrument | Delivered inside the HHP+ support WHO already provides, over a longer runway |

   5.98 + 9.00 = 14.98 exactly, and the two contingency halves (0.44 + 0.67) sum to the
   original 1.11. **The Tier 2 split is an estimate and is labelled as one** on the slide and
   in the concept note — which lines direct support can absorb is a negotiation, not a
   finding. Never present ₱6.0M as a cheaper or narrower Year 1; the scope line on all three
   tier cards is identical for exactly that reason.

   The delivery model (6–10 weeks, 2–3 sessions/week, 30–40 participants) is an assumption,
   printed on-slide so it can be challenged. If the contractor's actual session count becomes
   known, use it — a real number beats the model.

6. **`[TO CONFIRM]` markers are load-bearing** and render as conspicuous `.tbc` chips so they
   cannot ship unnoticed. Four remain in the deck — the title slide's date/version/contact,
   the Phase 1 registry-extract evidence, the total already sunk into content with a shelf
   life (status-quo slide), and the public clinical-workforce comparator (impact slide).
   Replace only with real figures; a guessed headcount is worse than a visible gap.

7. **The impact slide's denominator is the whole country, on purpose.** ≈114M (PSA
   projections, 2024), because every Filipino lives in a barangay and every barangay has
   BHWs — that universality is the claim, and it is why the ratio is **300,000 ÷ 114M ≈ 1 BHW
   per 380 people**. That ratio is a *coverage denominator, not a caseload*, and the slide
   says so. The four "only BHWs can" cards are: mandated presence in all 42,000+ barangays
   (RA 7883), household delivery rather than facility attendance, scale against the public
   clinical cadre, and GIDA last-mile presence.

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
