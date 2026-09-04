# Build spec — "Strengthening Local Health Systems for Sustainable CESR"

**Deliverable:** `pitch/cesr-pir-blhsd.html` — one self-contained file, no network requests.
**Occasion:** CESR Post-Implementation Review, Day 2, 9 Sept 2026, 4:00–4:30 PM, Best Western Plus
Ivywall, Puerto Princesa. Q&A is separate (4:30–4:50). 30 minutes of speaking.
**Presenter:** Mr. Ray Justin Ventura, Chief Health Program Officer, BLHSD.
**Audience:** DOH Epidemiology Bureau (EB-ESR), EpiC GHS / FHI 360 (the development partner), RESUs
(Central Luzon, MIMAROPA, NCR), PDOHOs/PHOs, DSOs, and BHWs from Quezon City, Puerto Princesa,
Palawan and Marinduque.

This document is the contract for the build. Every number on a slide is listed in §5 with its source.
Do not add a statistic that is not in §5. Do not soften or sharpen the tone chosen in §0.

---

## 0. Decisions already made — do not relitigate

| Decision | Choice |
|---|---|
| Visual system | Inherit `pitch/bhw-connect-who.html` exactly: tokens, registers (`dark`/`darker`/`light`/`problem`/`solution`), eyebrow + headline type, `.statechip`, `.gap`/`.close-row`, `.stat`, `.costlist`, `.src`, chrome (`.brandtab`, `.counter`, `.actbar`, `.navbtns`), `fit()` scaling, `numberEyebrows()`. Copy the CSS wholesale, then delete the demo-chapter/`app-scope` block — this deck has no device mockups. |
| Tone toward CESR | **Implicit only.** No slide says "CESR's weakness is…". Facts from the partner's own reports are shown plainly, each with a source caption, and the audience draws the conclusion. The one framing line permitted is on slide 8: *"This is not a finding about CESR. It is what the model produces, everywhere."* |
| Length / pacing | 19 slides, heavy click-builds. Four are statement slides (1, 10, 18, 19) that take ~30 s each; the rest average ~1.8 min. |
| Language | English. Filipino pull-quotes at the emotional beats (slides 5, 13, 14, 19). Filipino strings are marked `[VERIFY-FIL]` — the presenter is a native speaker and must approve wording before the file is final. |
| Closing | The question stands alone on the last slide. Nothing follows it. |
| Logos | Text-only wordmarks (as the WHO deck). No image assets. |
| Critique of partner | Never by name. "The development partner" / "partner-supported" only. EpiC GHS appears only inside quoted evidence captions where it is the author of the source document. |
| Text density | Significantly lower than the WHO deck. Rule of thumb: one headline, at most one supporting line, and the build carries everything else. If a slide needs a paragraph, it is two slides. |

---

## 1. Engine

Reuse the WHO deck's script skeleton (slides array, `go()`, `fit()`, `markAct()`, `numberEyebrows()`,
keyboard/touch handlers, act bar). Then add the following. Keep everything in one IIFE, ES5-compatible
as the original is.

### 1.1 Step builds (the core new feature)

- Any element inside a slide may carry `data-step="N"` (N ≥ 1). On slide entry, all stepped elements
  are hidden (`opacity:0; transform:translateY(10px); visibility:hidden`). Each **→ / Space / PageDown /
  click on ▶** reveals the next step index; when the last step is shown, the next press advances the
  slide. **← / PageUp** hides the most recent step; at step 0 it goes to the previous slide, arriving
  with **all** steps revealed (so backing up never re-plays a build).
- Multiple elements may share a step number (they appear together). Steps may be non-contiguous;
  the engine sorts the distinct values.
- Reveal transition: `opacity .45s ease, transform .45s ease`. Under `prefers-reduced-motion`,
  transition is `.01s` and transforms are none.
- Stepped elements must not affect `fit()`: the slide is measured with **every step visible** (use
  `visibility:hidden` not `display:none`), so nothing reflows mid-build.
- A slide may also carry `data-autostep="ms"` — not used by any slide below; do **not** add autoplay.
  The presenter controls every reveal.
- `data-step-class="name"`: optional. When that step is revealed, add class `name` to the **slide**
  (used for the state-chip flip on slide 16 and the counter on slide 9).

### 1.2 Presenter notes

- Each slide has `<aside class="notes">…</aside>` — the speaking line, plus the sources for every
  number on that slide. Hidden by default.
- Key **N** toggles a notes panel fixed to the bottom-left (max 40vw, dark translucent, small type)
  showing the current slide's notes. It stays open across slides until toggled off. Never printed.

### 1.3 Overview

- Key **O** (and **Esc** to exit) shows a grid of all slides at ~18% scale (CSS `transform:scale`,
  each in a labelled cell with its number and act). Click a cell to jump. Used to skip ahead if time
  runs short.

### 1.4 Other keys

`Home` / `End` first/last. `B` blanks the screen to black (toggle). `F` requests fullscreen. `?` shows
a small key legend overlay for 4 s. The bottom chrome auto-hides after 3 s of no mouse movement and
returns on movement.

### 1.5 Sizing / responsive

- Fixed-viewport deck; `fit()` scales `.slide__inner` to fit, clamped 0.42–2.6 as in the source.
- Must render correctly at **1366×768** (typical laptop), **1920×1080** (projector), and **1280×720**.
  Test each. The 760px scroll fallback from the WHO deck stays for phones but is not a target.
- 16:9 is assumed. Nothing may depend on exact aspect ratio; nothing may overflow horizontally.

### 1.6 Print / PDF fallback

`@media print`: every slide becomes one landscape page (`@page{size:landscape;margin:0}`), all steps
revealed, chrome/notes/overview hidden, backgrounds forced (`-webkit-print-color-adjust:exact;
print-color-adjust:exact`). Purpose: presenter prints to PDF from the browser as a backup for
someone else's machine. Verify with headless Chromium `--print-to-pdf` that 19 pages come out and
nothing is clipped.

### 1.7 Hard constraints

- Zero external requests. No `<link>`, no `@import`, no `<script src>`, no web fonts, no images by URL.
  Fonts are the WHO deck's system stacks. Verify by loading from `file://` with the network disabled.
- File under 400 KB.
- No `console` output. No errors with JS disabled beyond the deck not advancing (first slide must
  still render).

---

## 2. Visual system additions

All new components use existing tokens only. Register per slide is stated in §3.

| Component | Purpose | Spec |
|---|---|---|
| `.quote-slide` | Slide 2 | Centered serif italic quote, `clamp(2.2rem,5vw,4rem)`, cream on `darker`. Attribution line small caps. The quote is step 1, the two lines after it are steps 2 and 3, each in `.kicker-line` style, marigold `.mark` on the key phrase. |
| `.trio` | Slides 4, 8 | Three tiles in a row (`grid-template-columns:repeat(3,1fr)`), each a `.stat__num` at ~`clamp(3.2rem,8vw,6rem)` over a two-line label and a `.src` caption. Each tile is its own step. On `problem` register the numeral is `--ember`; on `light` it is `--marigold`. |
| `.equation` | Slide 6 | Vertical ledger: rows `label · operator · value`, tabular numerals, serif for the value, each row a step. Final row is `.total` styling (marigold, large). Beneath it a `.compare` bar pair: a full-width bar labelled ₱6,600 and a 1px-wide bar labelled ₱50 — the ratio is the point; do not use a log scale and do not widen the small bar for legibility. Caption `.src`. |
| `.scatter` | Slide 7, callback on slide 11 | Inline SVG, viewBox 600×340. ~28 small circles (r=4) in marigold at fixed pseudo-random positions (seeded, not `Math.random()` at runtime, so it is stable), each with a faint dashed ring r=22 showing its "reach". Step 2 fades all rings to 20%. Slide 11 reuses the same coordinates and, on step 1, animates every dot along a straight line to a single hub at (300,170) over 900 ms (CSS transition on `cx/cy` via transform), rings removed, hub labelled "Clearing house". |
| `.chat-sim` | Slide 14 | A phone-shaped frame (reuse `.dev-phone` sizing but simplified: no app-scope chrome, just `.log` with `.bub.u`/`.bub.b`). Each bubble is a step. Bot bubbles that represent *suppressed* branches are rendered as a single muted row "3 questions skipped — not relevant to this signal" with a strike style, also a step. Right column: a 4-row "log sheet" that fills in as fields are confirmed (each row a step, `.close-row` styling minus the strike). |
| `.timeline` | Slide 17 | Two columns headed 2026 / 2027 with a thin rule; AO cards are `.card` with a `.gtag`-style pill reading the issuance type. "For development" cards are the same card at 70% opacity with a dashed border and pill "PROPOSED". |
| `.close-q` | Slide 19 | `.stance q` styling, but the English question is the only element; Filipino line beneath in `.title-sub` size, step 2. |

State chips: slide 9 headline ends with `<span class="statechip open">6 open</span>`; slide 16 headline
ends with `<span class="statechip closed">6 closed</span>` that is revealed as the final step
(`data-step-class` flips a class that swaps `open→closed` text and style on that slide's chip).

Act bar labels (in order): **The Provocation · What We Know · The Ground · The Direction · The Ask**.
Brandtab text: `DOH · BLHSD`.

---

## 3. Slide-by-slide

Format: **register** · eyebrow · headline · build steps · visual · notes. Eyebrow ordinals are
auto-numbered; the eyebrow text is given. Every stat line ends with a `.src` caption exactly as
written here.

### ACT I — THE PROVOCATION

**1 · Title** — `darker centered`, no act (`data-act=""`)
- Kicker: `CESR POST-IMPLEMENTATION REVIEW · PUERTO PRINCESA · 9 SEPTEMBER 2026`
- H1: **Strengthening Local Health Systems for Sustainable CESR**
- Sub: *Where BLHSD is taking the training of Barangay Health Workers — and what it asks of everyone who trains them.*
- Wordmarks block (as `.partners`): **Republic of the Philippines** · **Department of Health** — Bureau of Local Health Systems and Development · presenter name and title.
- No steps.
- Notes: "Thank the chair. One sentence: this is not a program update; it is where we are going."

**2 · The quote** — `darker centered`, act The Provocation, `.quote-slide`
- Step 1: *"Insanity is doing the same thing over and over and expecting a different result."*
- Step 2: `.kicker-line` — **For thirty years, this was how we worked.**
- Step 3: `.kicker-line` — **RA 7883, 1995.** Thirty years of training, orienting, convening — and not one complete national picture of who our BHWs are.
- Notes: "Let the quote sit for three seconds before step 2. The point of step 3 is not blame — it is that the *method* was the problem, and we did not know it."

### ACT II — WHAT WE KNOW

**3 · The break** — `dark`, act What We Know, `.stat`
- Eyebrow: `What changed`
- Step 1: `.stat__num` **~300,000** small: *BHWs profiled in about a year*
- Step 2: H2 — **It was never impossible. It was the method.**
- Step 3: `.pull` — *BHW Connect Phase 1. One platform, built by BLHSD, delivered through the same CHD, LGU and BHW channels that had failed on paper for three decades.*
- `.src`: *BHW Connect Phase 1 national registry, BLHSD.*
- Notes: "This slide is what earns the rest of the talk. We are not proposing a theory; we already did it once."

**4 · What the registry told us** — `light`, act What We Know, `.trio`
- Eyebrow: `What we know now`
- Step 1: **7 in 10** — *BHWs are high-school graduates or above.*
- Step 2: **45%** — *trained on the BHW Reference Manual. Trained — not assessed.*
- Step 3: **2%** — *hold the TESDA Barangay Health Services NC II.*
- Step 4: `.kicker-line` — **The ceiling was never the BHW.**
- `.src`: *BHW Connect Phase 1 registry; TESDA certification records.* `[CONFIRM: presenter to approve attribution wording]`
- Notes: "45% is the number to slow down on: we trained less than half, and for those we did, we cannot say what they retained. The 2% is what happens when the only credential requires a classroom."

**5 · Palawan** — `light`, act What We Know, `.stat` with the numeral on the left
- Eyebrow: `The proof is in this province`
- Step 1: **344** small: *community microscopists, one per malaria-endemic barangay*
- Step 2: H2 — **Most of them were homemakers. They read Giemsa-stained smears and confirmed species.**
- Step 3: `.pull` — *Kilusan Ligtas Malaria, Palawan, from 1999. Malaria morbidity and mortality fell across the province.*
- Step 4: Filipino pull-quote (`.kicker-line`, serif italic, sampaguita mark): **"Hindi kulang ang BHW. Kulang ang sistema."** `[VERIFY-FIL]`
- `.src`: *Matsumoto-Takahashi et al., Malaria Journal 2013; Tropical Medicine and Health 2016.*
- Notes: "Say it to the Palawan BHWs in the room. This province already proved a BHW can be trained to do confirmatory diagnosis. The ceiling was the delivery system."

**6 · The cost of the old way** — `darker problem`, act What We Know, `.equation` + `.compare`
- Eyebrow: `What one training costs`
- Step 1: row — *Board and lodging, per BHW, per day* · **₱2,200**
- Step 2: row — *× a 3-day training* · **₱6,600**
- Step 3: row — *× 300,000 BHWs* · **₱1.98 B** (`.total`)
- Step 4: `.src`-style line under the total, ember: *Meals and accommodation only. No transport. No trainers. No venue. No materials. No LGU backfill.*
- Step 5: H2 (tight) — **And that buys one training. Once.**
- Step 6: `.compare` — bar **₱6,600** *per BHW, per training event* against bar **₱50** *per BHW, on the platform, every module after the first*. `.src`: *Platform cost from the BLHSD–WHO proposal: ₱629/BHW at regional scale, ₱50/BHW against the national base.*
- Notes: "Do the arithmetic aloud, slowly. If someone says 3 days is too long — the 1-day version is still ₱660 M and still buys one training. The 5-day version is ₱3.3 B. Then: the platform number is our own costing from the WHO proposal, not a hypothetical."

**7 · The scattered effort** — `darker problem`, act What We Know, `.scatter`
- Eyebrow: `What everyone is already building`
- Step 1: SVG of scattered dots with reach rings.
- Step 2: H2 — **Many institutions build good materials for BHWs.**
- Step 3: rings fade; `.kicker-line` — **Every one of them localized. None with a road to the next province.**
- Step 4: `.kicker-line` second line — **Good work, built to stay small.**
- Notes: "Name no one. Everyone in the room has built one of these. The clearing house comes on slide 11 — do not preview it here."

### ACT III — THE GROUND

**8 · CESR, plainly** — `darker problem`, act The Ground, `.trio` with quote tiles
- Eyebrow: `The ground, as documented`
- Step 1: **3.6%** — *of barangays trained in CESR are actively reporting (2 of 55).* `.src`: *CESR M&SS Feedback, June 2026.*
- Step 2: **"Pictures. No database."** (serif, smaller numeral size) — *Signals consolidated at MESU level as photographs of logbooks. The provincial Google Sheet: 8 entries.* `.src`: *CESR M&SS Feedback, June 2026.*
- Step 3: **8 batches · 390 participants · 1 day each** — *A July refresher for BHW supervisors, after BHWs "demonstrated varying levels of recall regarding signal definitions."* `.src`: *CESR M&SS Feedback, June 2026; Activity Report, Refresher for BHW Supervisors, July 2026.*
- Step 4: `.kicker-line` — **This is not a finding about CESR. It is what the model produces, everywhere.**
- Notes: "Read the tiles flat. No adjectives. The framing line is the only editorial sentence in this act, and it points at the method, not the people who ran it. If challenged: every line is quoted from the partner's own monitoring deck and activity report."

**9 · Six things a training event cannot be** — `darker problem wide`, act The Ground, `.gaps` grid, headline with `statechip open`
- Eyebrow: `What survives a perfectly executed training`
- H2: **Six things a training event cannot be.** `6 open`
- Six `.gap` cards, each its own step (1–6), each with `.gtag` G1–G6, `.gstate` "open", h3, one-line p, and `.ev` evidence:
  1. **Affordable at scale** — ₱6,600 per BHW for three days of board and lodging alone. *ev: §5 cost model.*
  2. **Light on labour** — Eight batches, four hotels, six days, to reach 390 people. *ev: Refresher activity report, July 2026.*
  3. **Carried by government alone** — Resource persons, IEC reproduction, logbook redesign and the analysis template all sit with the partner. *ev: Action points, M&SS Marinduque, May 2026.*
  4. **Visible nationally** — Consolidated as photographs; one province's sheet holds 8 entries; one city, on a digital tool, is the exception. *ev: M&SS Feedback, June 2026.*
  5. **Durable through attrition** — No participant list survives the event; attendance is a batch count. When a trained BHW leaves, the training leaves. *ev: Refresher activity report, July 2026.*
  6. **Transferable to the next programme** — Key informants in a separate notebook with a separate template. Every programme brings its own. *ev: M&SS Feedback, June 2026.*
- Notes: "One breath per card. The chip says 6 OPEN; it closes on slide 16."

### ACT IV — THE DIRECTION

**10 · The turn** — `darker centered`, act The Direction, statement
- Step 1: H2 (large, `.stance q` style) — **Our direction is not another training.**
- Step 2: second line, sampaguita — **It is a system that trains.**
- Notes: "Pause here. This is the pivot of the talk."

**11 · How materials reach them** — `light solution`, act The Direction, `.scatter` callback + three `.pillar`s
- Eyebrow: `Delivery`
- H2: **One clearing house. Every package. Every BHW.**
- Step 1: the slide-7 dots converge to a hub.
- Step 2: pillar — **Tiered** · *Fundamentals for every BHW; Advanced modules by programme — CESR among them.*
- Step 3: pillar — **Any mode** · *Phone, offline, print, or face-to-face where it is warranted — not by default.*
- Step 4: pillar — **Any author** · *A package built for one province is published to the country the same day.*
- `.src`: none.
- Notes: "This closes G1, G2 and the waste on slide 7. Say: the institutions on slide 7 do not stop building — they stop building alone."

**12 · How competence is assessed** — `light solution`, act The Direction, `.loop` chain
- Eyebrow: `Assessment`
- H2: **Attendance is not competence.**
- Step 1: node — **Module** · *text, video, quiz; pass mark and retakes set by DOH policy*
- Step 2: node — **Skills demonstration** · *graded in person by an assessor against the DOH checklist*
- Step 3: node — **Certificate** · *QR-verifiable by anyone, without a login*
- Step 4: node — **Registry** · *competency written to the BHW's Phase 1 profile, visible at every tier*
- Step 5: `.kicker-line` — **45% trained becomes a number we can defend: who, in what, assessed by whom, when.**
- Notes: "This is the direct answer to slide 4. Under the direction, 'trained' is a record, not a recollection."

**13 · The chatbot as coach** — `light solution`, act The Direction, `.stat`-style with a short bubble stack on the right
- Eyebrow: `Reinforcement`
- H2: **Between trainings, the training is still there.**
- Step 1: three `.bub` pairs (BHW asks in Taglish; answer from DOH-approved content). Example pair (illustrative, keep to CESR): *"ano ulit ang 4 na signal?"* → the four signal definitions, in Filipino, in the guideline's wording.
- Step 2: `.kicker-line` — *Answers come from approved content only. A question with no answer is logged — and becomes content.*
- Step 3: Filipino pull-quote — **"Sagot agad, sa pintuan ng bahay."** `[VERIFY-FIL]`
- Notes: "This closes G5 — knowledge decay between events. Point out that recall of the four signals — the exact thing the July refresher was for — is one question away."

**14 · The chatbot as the form** — `light solution wide`, act The Direction, `.chat-sim` two-column
- Eyebrow: `Data collection`
- H2: **The report is a by-product of the conversation.**
- Left, phone, each a step:
  1. BHW: *"may 3 batang nilalagnat at may rashes sa Purok 2, magkakapitbahay"*
  2. Bot: *Signal 4 detected — child with rash and fever.* Asks **only**: cough, colds, or red eyes? ages? onset dates?
  3. BHW answers.
  4. Muted row: *3 questions skipped — animal exposure not relevant to this signal.*
  5. Bot: *"Ito ba ang tama?"* — reads back the entry for confirmation.
  6. Bot: *Reported to the midwife and DSO. Detection time stamped.*
- Right, log-sheet panel, rows filling in with steps 3, 5, 6: *Signal type · Cases · Onset · Reported to · Timestamp (7-1-7 clock starts)*.
- Step 7: Filipino pull-quote — **"Ang report ay bunga na lang ng usapan."** `[VERIFY-FIL]`
- `.src`: *Signal definitions and log-sheet fields from the DOH Interim Guidelines for Community-Based Surveillance, July 2024.*
- Notes: "Three things to say: only relevant questions, so no erroneous fields; read-back before submit, so accuracy is checked at entry not at consolidation; the timestamp starts 7-1-7 automatically. This is G4 and G6 closing."

**15 · Privacy** — `dark`, act The Direction, `.costlist`
- Eyebrow: `Insight without exposure`
- H2: **Maximise the insight. Never the exposure.**
- Steps 1–5, one `.costlist` item each:
  1. Consent at first login, in Filipino and English; the privacy notice on every screen.
  2. The BHW consents for herself. Community members never touch the app — so their data is **de-identified at capture**: counts, ages, purok. Not names.
  3. Above the barangay, only aggregates travel.
  4. Chat and analytics purge at 24 months; audit trail kept five years.
  5. Data-subject export and anonymise on request; NPC 72-hour breach playbook, rehearsed.
- Step 6: `.kicker-line` — **Insight comes from patterns across barangays — not from any one household.**
- `.src`: *Data Privacy Act of 2012 (RA 10173); BHW Connect Phase 2 data-privacy and consent design.*
- Notes: "Say this before anyone asks. The honest version: the surveillance value is in aggregates, so that is what we keep."

**16 · One platform** — `light solution wide`, act The Direction, `.closes` grid, headline with statechip
- Eyebrow: `Consolidation`
- H2: **What the barangay enters, the country can see.** `6 closed` (chip revealed as final step)
- Step 1: a one-line roll-up strip: **Barangay → Municipality → Province → Region → National**, each a `.rung`, lighting in sequence.
- Steps 2–7: six `.close-row`s, G1–G6, each struck problem (from slide 9) beneath its answer:
  - G1 ✓ *₱50 per BHW, every module after the first.*
  - G2 ✓ *No batches. Every BHW, at once.*
  - G3 ✓ *Owned, hosted and governed by DOH.*
  - G4 ✓ *One database, every tier, live.*
  - G5 ✓ *Competency stays on the record when the person moves.*
  - G6 ✓ *One clearing house; the next programme is a module, not a cascade.*
- Step 8 (`data-step-class="closed"`): chip flips to `6 closed`.
- Notes: "Do not read all six. Point at two and let the chip flip."

### ACT V — THE ASK

**17 · Issuances 2026–2027** — `dark`, act The Ask, `.timeline`
- Eyebrow: `What DOH will issue`
- H2: **Three issuances, 2026–2027.**
- Step 1: card — **Administrative Order** · *BHW Governance Mechanism and Unified Capacity-Building Framework* — one clearing house; tiered Fundamentals → Advanced; alternative modes of delivery.
- Step 2: card — **Administrative Order + Information System** · *BHW Connect Phase 2 as the national BHW information and learning platform.*
- Step 3: card — **Administrative Order** · *Revised BHW Reference Manual, digital and print, as the foundational learning standard.*
- Step 4: H2 line changes to **…and three being developed.** (small, `.mark`)
- Step 5: proposed card — **Joint DOH–DILG Memorandum Circular** · *LGU adoption and financing of BHW capacity building.*
- Step 6: proposed card — **Department Circular** · *Registration and accreditation of BHW learning packages — every partner-developed package enters the clearing house.*
- Step 7: proposed card — **Policy** · *BHW competency certification and career progression.*
- Notes: "The confirmed three are commitments. The proposed three are the ones this room can shape — say so. The circular on partner-developed packages is the one to leave on screen a beat longer."

**18 · You already asked for this** — `darker centered`, act The Ask, statement
- Step 1: `.kicker-line` large — *In June, the monitoring round closed with a request:*
- Step 2: serif quote — **"a CESR Signal Application"** — *with a database, weekly analysis, a dashboard, and a downloadable file to the level of the BHS.*
- Step 3: H2 — **This is that — for every programme, not one.**
- `.src`: *CESR M&SS Feedback, June 2026, "CESR Signal Application" specification.*
- Notes: "This is the turn that makes the last slide fair. The direction is not imposed on them; it delivers something they wrote down themselves."

**19 · Close** — `darker centered close`, no act, `.close-q`
- Step 0 (visible on entry): **Rather than telling you our plans —**
- Step 1: **what is your plan to align with our direction?**
- Step 2: Filipino line beneath — **Ano ang inyong plano para umayon sa aming direksyon?** `[VERIFY-FIL]`
- Nothing else. No wordmarks, no thank-you, no contact line.
- Notes: "Ask it. Then stop talking. Do not fill the silence; the chair will open the Q&A."

---

## 4. Readiness language — REQUIRED CONFIRMATION before build

The WHO deck (31 Jul 2026) frames Phase 2 as *designed end to end, not built*. The repository README
now lists shipped increments (Chat Guide, courses, assessor, certificates, surveys, forum…) behind
feature flags, ahead of a pilot gate. These are not the same claim.

**Default for this deck if not corrected:** describe Phase 2 as *"designed end to end and in build —
the CESR module is content and configuration on that system, not a new build."* Never say "deployed
nationwide" or "live". Slide 12, 13, 14 and 16 use the default wording; slide 18's "This is that" refers
to the design.

Presenter to confirm or replace this sentence: `[CONFIRM-READINESS]`.

---

## 5. Facts register — the only numbers permitted on slides

| # | Fact | Value | Source (path in repo unless noted) |
|---|---|---|---|
| F1 | RA 7883 enacted | 1995 | Public law |
| F2 | BHWs profiled nationwide, Phase 1 | ~300,000 in about a year | `pitch/bhw-connect-who.html:733,751`; `docs/concept-notes/*-koica.md:25` |
| F3 | BHWs HS graduate or above | 7 in 10 | Presenter (Phase 1 registry) — `[CONFIRM]` |
| F4 | Trained on BHW Reference Manual | 45% | Presenter (BLHSD) — `[CONFIRM]` |
| F5 | TESDA BHS NC II holders | 2% | Presenter (TESDA / registry) — `[CONFIRM]` |
| F6 | Board and lodging per BHW per day | ₱2,200 | Presenter (DOH rate, excludes transport) |
| F7 | Platform cost per BHW, regional / national | ₱629 / ₱50 | `pitch/bhw-connect-who.html:24-25,1105` |
| F8 | Palawan community microscopists | 344, one per endemic barangay, mostly homemakers, from 1999 | Matsumoto-Takahashi et al., *Malaria Journal* 2013 (12:384); *Trop Med Health* 2016 (44:10) |
| F9 | Barangays trained in CESR actively reporting | 3.6% (2/55) | `docs/source-material/cesr/mss-feedback-2026-06.md:300` |
| F10 | Confirmed events within 7-1-7 | 0% (0/2) | same, line 306 (notes only — not on a slide) |
| F11 | Signals consolidated as pictures, no database | quote | same, line 321 |
| F12 | Marinduque Google Sheet entries | 8 | same, line 321 |
| F13 | Quezon City the only digital BHS→CESU tool | quote | same, line 320 |
| F14 | BHW recall of signal definitions | "varying levels of recall" | same, line 413; "gaps in recalling" line 316 |
| F15 | Refresher: batches / participants / duration | 8 / 390 (table sums 347) / 1 day each, 4 venues, 20–24 July 2026 | `docs/source-material/cesr/activity-report-bhw-supervisor-refresher-2026-07.md:31-76` |
| F16 | No participant name list | quote | same, line 254 |
| F17 | Partner-assigned action points | IEC reproduction; logbook redesign; analysis template | `docs/source-material/cesr/activity-report-mss-marinduque-2026-05.md:109,184-186` |
| F18 | Key informants in a separate notebook/template | quote | `mss-feedback-2026-06.md:316,415` |
| F19 | "CESR Signal Application" request | database, weekly/monthly analysis, dashboard, Excel download to BHS level | `mss-feedback-2026-06.md:330,376-383` |
| F20 | Four signal definitions; log-sheet fields | as written | `docs/source-material/cesr/doh-interim-guidelines-cbs-2024.md`; summarised `docs/cesr-module.md` §1 |
| F21 | Privacy mechanics | consent FIL/EN at first login; notice every screen; export + anonymise; 24-month purge; 5-year audit; NPC 72-h playbook | `docs/concept-notes/*-who.md:592` |
| F22 | De-identify at capture; aggregation not observation | design principle | `docs/cesr-module.md:149-155,371-378` |
| F23 | M&SS coverage | Marinduque 6/6; Palawan+PPC 21/24; QC 6/6 | `mss-feedback-2026-06.md:20-24` (notes only) |

Use F10 and F23 in presenter notes only. Do not put 7-1-7 = 0% on a slide; it reads as an attack.

---

## 6. QA before commit

1. Open from `file://` with network disabled: every slide renders, every build works, no console errors.
2. `grep -c "http" pitch/cesr-pir-blhsd.html` returns only occurrences inside `.src` citation text or comments — no `src=`, `href=`, `@import`, `url(`.
3. Keyboard: → advances steps then slides; ← reverses; Home/End; N; O/Esc; B; F; ?.
4. Screenshot at 1366×768, 1280×720, 1920×1080 with Playwright (Chromium is at `/opt/pw-browsers/chromium`); check no clipping on slides 6, 9, 14, 16, 17 — the dense ones.
5. Reduced motion: emulate `prefers-reduced-motion: reduce`; builds still work, nothing animates.
6. Print to PDF headless: 19 landscape pages; every step visible; no chrome.
7. Every `[VERIFY-FIL]`, `[CONFIRM]`, `[CONFIRM-READINESS]` marker is either resolved or rendered with the WHO deck's `.tbc` style so it cannot ship unnoticed.
8. Commit `pitch/cesr-pir-blhsd.html` and this spec on `claude/cesr-presentation-deck-a5swa9`; push; open a draft PR.
