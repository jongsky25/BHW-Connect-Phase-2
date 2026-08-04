# Pitch decks

Standalone, self-contained HTML decks for partner conversations. Not part of the
Next.js app — open directly in any browser, or view the hosted Artifact link.

| File | Audience | Year-1 flagship module |
|---|---|---|
| `bhw-connect-who.html` | **WHO Philippines** | HHP+ / PhilPEN 2025 community NCD screening, Western Visayas (Region VI) |
| `koica-bhw-connect.html` | World Vision–KOICA | *(narrative deck only — superseded by the WHO deck)* |

## `bhw-connect-who.html`

Combines the narrative pitch deck and the clickable product walkthrough
(`mockups/ttcf-demo.html`) into one deck with a single navigation model:
30 slides, arrows / dots / swipe / keyboard, content auto-fitted to the viewport.

**Structure** — Standing (Phase 1 delivered) → The Gap (the failure mode, what HHP+
already built, the APW on the table, six tagged gaps G1–G6) → The Answer → a 13-scene
Phase 2 design prototype → The Ask (why WHO, APW framing, scope and cost) → every gap
closed 1:1 against its G-tag.

**Controls** — arrow keys / space / Home / End, the dot strip, or swipe. On demo
slides only, a **Wika** toggle switches the prototype between Filipino and English,
and an **App theme** toggle flips the in-app mockups between light and dark (both are
real product features being demonstrated; the deck chrome stays constant).

### Three visual registers

Slides carry one of three grounds, and the register is load-bearing for the argument —
the deck's whole shape is problem stated, then problem closed, so those two must read
as opposites at projector distance.

| Register | Class | Ground | Accent | Used on |
|---|---|---|---|---|
| **Problem** | `darker problem` / `dark problem` | cold near-black, ember wash rising from the floor | ember `--ember` | the failure mode, the six gaps, the cost |
| **Solution** | `light solution` | warm cream, marigold bloom top-right, lifted cards | verdant `--verdant` | what BHW Connect is, the engine, built to scale, every gap closed |
| **Neutral** | `light` / `dark` / `darker` | existing teal palette | marigold | title, credit slides, demo chapter, the ask, close |

A `problem` or `solution` slide must **also** keep its base `dark`/`darker`/`light`
class — the register only re-grounds and re-accents; every existing text rule keys off
the base class, and dropping it renders dark ink on a dark ground.

Layout carries the contrast too, not just hue: gap cards are square-cornered with a
hard left rule and evidence pinned to a shared baseline (a defect register), while
closure rows are rounded, elevated and demote the struck problem beneath the answer
that replaced it. **Meaning is never carried by colour alone** — every gap card is
marked `OPEN` and every closure row `✓`, with `6 open` / `6 closed` counters in the
headings, so the argument survives a colourblind viewer or a bad projector.

### Two things to keep straight when editing

1. **Readiness framing is deliberate.** Phase 1 (the national BHW registry and
   profiling) is *delivered*; Phase 2 (Knowledge Base, Chat Guide, Training &
   Certification) is *designed*. The demo chapter is labelled a design prototype, not
   a deployed system, matching `docs/concept-notes/` and its Annex A. Don't relabel
   these without checking the concept note first.
2. **No clinical thresholds are asserted.** The HHP+ content shown is procedural and
   traces to the BLHSD/WHO deck "Strengthening Barangay Health Worker Capacity under
   HHP+" (31 July 2026), which contains no PhilPEN numeric cut-offs. The CBG return-
   demonstration checklist is reproduced faithfully — 29 criteria, 87-point maximum,
   90% / 75% competency bands. Every health string carries a validation notice.
