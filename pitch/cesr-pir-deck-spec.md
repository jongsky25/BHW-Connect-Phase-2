# `cesr-pir-blhsd.html` — deck notes

The deck itself is `pitch/cesr-pir-blhsd.html`. It is the source of truth for content;
this file records **why it is the way it is**, where every number came from, and how to
change it safely.

**Occasion.** CESR Post-Implementation Review, Day 2, 9 September 2026, 4:00–4:30 PM,
Best Western Plus The Ivywall Hotel, Puerto Princesa City. Q&A is separate (4:30–4:50),
so the deck fills 30 minutes of speaking.

**Presenter.** Mr. Ray Justin Ventura, Chief Health Program Officer, BLHSD.

**Room.** DOH Epidemiology Bureau (EB-ESR); EpiC GHS / FHI 360 as the development partner;
RESUs (Central Luzon, MIMAROPA, NCR); PDOHOs/PHOs; DSOs; and BHWs from Quezon City,
Puerto Princesa, Palawan and Marinduque.

**Shape.** 24 slides in five acts, heavy click-builds. Slide 2 is a ten-second outline of the
five acts. Four statement slides (1, 12, 23, 24) take about 30 seconds each. At 30 minutes this
is now tight — roughly 1.2 min/slide. If the session runs long, slides 9 and 16 are the two that
can be cut without breaking an argument.

---

## 1. Decisions that are load-bearing

Change these only deliberately — each one is holding something up.

| Decision | Choice and why |
|---|---|
| **Tone toward CESR** | **Implicit.** No slide states a criticism. Evidence from the partner's own monitoring deck and activity reports is shown flat with a source caption, and the audience concludes. The single editorial sentence is on slide 10: *"This is not a finding about CESR. It is what the model produces, everywhere."* It points at the method, not at anyone. Do not add a second one. |
| **7-1-7 = 0%** | Presenter notes only, never on a slide. On screen it reads as an attack on people who are in the room. |
| **The partner is never named** | "The development partner", "partner-supported". EpiC GHS appears only inside citation captions, where it is the author of the source document. |
| **Slide 22 before the close** | The June M&SS closed by asking for a *"CESR Signal Application"*. Showing that they already asked for this is what makes the closing question an offer rather than a demand. Do not cut it. |
| **Slide 24 stands alone** | The question, nothing else. No thank-you, no contact line, no Filipino translation — English only, at the presenter's direction. |
| **Filipino** | Deck is English. Filipino pull-quotes at three emotional beats (slides 6, 16, 17), the seven gap statements on slide 20, and inside the two chat simulations, where the language *is* the point. |
| **Readiness language** | Phase 2 is described as *designed end to end and in build* — the CESR module is content and configuration on that system, not a new build. Never "deployed nationwide", never "live". |
| **The logbook stops existing** | The operational claim the deck makes, and it must be made identically wherever it appears: slide 17 (the record writes itself as she speaks), slide 23's third demo answer (*"Hindi na po kayo mag-uulat nang mano-mano"*), and slide 15's two `Auto ✓` rows (timeliness is measured, not reconstructed). Nothing in the deck may tell a BHW to write in a log sheet or to file a report by hand — that is the old workflow, and showing it anywhere undercuts every gap closure on slide 20. What is *not* claimed: the DSO and MESU still verify, assess and respond. Only the transcription and the chasing go. |
| **Text density** | One headline, at most one supporting line; the build carries the rest. If a slide needs a paragraph, it is two slides. |
| **Logos** | Text-only wordmarks. No image assets anywhere. |
| **Seven gaps, not six** | G7 *Correctable* came from the presenter: *"paano pag may mali sa materials? Papatawag ba tayo ulit?"* Slide 8 poses it, G7 registers it, slide 13's fourth pillar and G7's closure answer it. That thread is the spine of the cost argument — ₱1.98 B buys one *version*, not a trained workforce. |

---

## 2. The arc

| # | Act | Slide |
|---|---|---|
| 1 | — | Title |
| 2 | — | Outline — the five acts, ten seconds, no build |
| 3 | The Provocation | "Insanity…" · RA 7883, thirty years, no national picture |
| 4 | What We Know | ~300,000 profiled in a year — *it was the method* |
| 5 | | 7 in 10 · 45% · 2% — *the ceiling was never the BHW* |
| 6 | | Palawan: 344 microscopists, mostly homemakers |
| 7 | | ₱2,200 → ₱6,600 → ₱1.98 B, against ₱50 |
| 8 | | **When the material changes** — do we call 300,000 people back? |
| 9 | | The scattered effort — good work, built to stay small |
| 10 | The Ground | CESR, plainly: 3.6% · "pictures, no database" · 8 batches |
| 11 | | Seven things a training event cannot be · `7 open` |
| 12 | The Direction | *Not another training. A system that trains.* |
| 13 | | One clearing house (dots converge) · tiered · any mode · any author · **corrected once** |
| 14 | | **The materials already exist** — CESR's own decks, and the re-echo cascade that carries them |
| 15 | | Attendance is not competence — **three mockup screens**: the BHW's phone, the supervisor's checklist, the national registry |
| 16 | | Chatbot as coach — recall support between events |
| 17 | | Chatbot as the form — the report is a by-product of the conversation |
| 18 | | **Three real signals, three separate logbooks** — the signal field and the roll-up |
| 19 | | Privacy — insight without exposure |
| 20 | | One platform · `7 closed` — Filipino complaint against English answer, side by side |
| 21 | The Ask | Three issuances committed, three in development |
| 22 | | You already asked for this — the "CESR Signal Application" |
| 23 | | **Live demo** — tap a question, the Chat Guide answers |
| 24 | — | *What is your plan to align with our direction?* |

---

## 3. Facts register — the only numbers permitted on slides

Do not put a statistic on a slide unless it is in this table. If a number changes, change it
here first.

| Fact | Value | Source |
|---|---|---|
| RA 7883 enacted | 1995 | Public law |
| BHWs profiled, Phase 1 | ~300,000 in about a year | `pitch/bhw-connect-who.html:733,751`; `docs/concept-notes/…-koica.md:25` |
| BHWs high-school graduate or above | 7 in 10 | BHW Connect Phase 1 registry, BLHSD |
| Trained on the BHW Reference Manual | 45% | BHW Connect Phase 1 registry, BLHSD |
| Hold TESDA BHS NC II | 2% | BHW Connect Phase 1 registry, BLHSD |
| Board and lodging per BHW per day | ₱2,200 (excludes transport) | Presenter, DOH rate |
| Platform cost per BHW | ₱629 regional / ₱50 national base | `pitch/bhw-connect-who.html:24-25,1105` |
| Palawan community microscopists | 344, one per endemic barangay, mostly homemakers, from 1999 | Matsumoto-Takahashi et al., *Malaria Journal* 2013 (12:384); *Trop Med Health* 2016 (44:10) |
| Trained barangays actively reporting | 3.6% (2/55) | `docs/source-material/cesr/mss-feedback-2026-06.md:300` |
| Signals consolidated as pictures, no database | quote | same, :321 |
| Marinduque Google Sheet entries | 8 | same, :321 |
| Quezon City the only digital BHS→CESU tool | quote | same, :320 |
| BHW recall of signal definitions | "varying levels of recall" | same, :413 (and :316) |
| Refresher batches / participants / duration | 8 / 390 (its own table sums 347) / 1 day each, 4 venues, 20–24 July 2026 | `docs/source-material/cesr/activity-report-bhw-supervisor-refresher-2026-07.md:31-76` |
| No participant name list | quote | same, :254 |
| Partner-assigned action points | IEC reproduction; logbook redesign; analysis template | `docs/source-material/cesr/activity-report-mss-marinduque-2026-05.md:109,184-186` |
| Key informants in a separate notebook | quote | `mss-feedback-2026-06.md:316,415` |
| "CESR Signal Application" request | database, weekly/monthly analysis, dashboard, Excel download to BHS level | `mss-feedback-2026-06.md:330,376-383` |
| Four signal definitions; log-sheet fields | as written | `docs/source-material/cesr/doh-interim-guidelines-cbs-2024.md` |
| Privacy mechanics | consent FIL/EN at first login; notice on every screen; export + anonymise; 24-month purge; 5-year audit; NPC 72-hour playbook | `docs/concept-notes/…-who.md:592` |
| De-identify at capture; aggregate, don't observe | design principle | `docs/cesr-module.md:149-155,371-378` |
| Rabies, Barangay Malibago, Torrijos | stray dog bit 4, two Category III; reported by the Barangay Kagawad on Health; <1 day to report | `mss-feedback-2026-06.md:121,149,238`; `activity-report-mss-marinduque-2026-05.md:135` |
| Influenza-like illness, Sta. Cruz | 128 cases; 124 (97%) students; principal reported to the BHW; 8 days to report | `mss-feedback-2026-06.md:160-163,219,238` |
| Measles, Tatalon, Quezon City | 16 cases, 13 (81%) laboratory-confirmed; mother reported to the BHW; 3 days to report | `mss-feedback-2026-06.md:228,238` |
| CESR material inventory (slide 14) | Interim Guidelines; Decks 1–4; BHS Supervisory Checklist (Tagalog); Supportive Supervision Tool; Sensitization Package; Signal Log Sheet Annex 2 | `docs/source-material/cesr/README.md` inventory |
| Re-echo scaling model | supervisors are given the decks and expected to re-deliver at BHS level; no record of who was re-echoed to | refresher activity report, July 2026, via `docs/cesr-module.md` §5 |

**Notes-only, never on a slide:** 7-1-7 at 0% (0/2) — `mss-feedback-2026-06.md:306`; M&SS coverage
Marinduque 6/6, Palawan + PPC 21/24, Quezon City 6/6 — same, :20-24.

### The mockup screens (slide 15)

Three illustrative panels — the BHW's phone, the supervisor's grading view, the
national registry — carrying an `ILLUSTRATIVE SCREENS` tag on the headline and a
source line beneath. What is quoted and what is invented is kept strictly apart:

- **Quoted, not invented.** The five assessment criteria and both thresholds come
  from the BHS Supervisory Checklist (Tagalog, revised April 2026): *"Suriin ang
  mga signal … HINDI AKMA sa apat na kahulugan"*, *"Ang bawat signal ba ay
  naglalaman ng lahat ng kinakailangang impormasyon?"*, *"na-detect nang higit sa
  7 araw"*, *"naiulat nang higit sa 24 na oras"*. The four module names are the
  four real CESR decks. The quiz item restates the guideline's cluster definition.
- **Invented, and labelled as such.** Every count — the 3/4 progress, the 14/15
  score, and all eight registry figures. These are shape, not data. They are the
  one thing on the slide that is not in the facts register, which is why the tag
  and the source line both say so, and why the presenter notes say to volunteer it
  aloud before anyone asks.

### The demo's status claim (slide 23)

The status line under the demo is the one place the deck makes a claim about what is
built, so it is held to the register too. **Real:** Chat Guide (INC-8, conversational
layer INC-17), courses and quizzes with assessor-graded skills demonstrations and
QR-verified certificates (INC-12), roll-up dashboards, and the Phase 1 national
registry. **Not real:** the CESR content pack — `docs/cesr-module.md` opens
*"Status: candidate module. Not scheduled, not approved, not started."* The demo is an
in-deck simulation of the interaction, not the deployed app, and the slide says so.
Do not soften either half: the room contains the people who wrote the source material.

---

## 4. How the deck works

Inherits `pitch/bhw-connect-who.html`: tokens, registers (`dark`/`darker`/`light`/`problem`/
`solution`), eyebrow type, `.statechip`, `.gap`/`.close-row`, `.stat`, `.costlist`, chrome,
`fit()`. The demo chapter and `.app-scope` block are deliberately absent.

- **Builds.** Any element with `data-step="N"`. Elements sharing an N appear together.
  `→`/Space reveals the next step, then advances the slide; `←` reverses, and arriving at a
  slide backwards shows its build already finished. Stepped elements keep their layout box
  (`visibility`, not `display`) so `fit()` measures the finished slide and nothing reflows
  mid-build.
- **Deep links.** `…#s13` opens slide 13 with its build complete. The hash tracks the current
  slide, so a link can be shared or bookmarked mid-deck.
- **Keys.** `→`/Space, `←`, `Home`/`End`, `N` notes, `O` overview (`Esc` closes), `B` blank,
  `F` fullscreen, `?` legend.
- **Notes.** `<aside class="notes">` per slide — the speaking line plus reserve material for
  Q&A. Never printed.
- **Scatter figure.** Dot positions are a fixed table, never `Math.random()` at runtime: the
  same dots must appear in the same places on slides 9 and 13, and must not move between
  rehearsal and the room. Converged targets are a phyllotaxis disc, not a single point —
  dots landing on one pixel read as an empty circle and lose the "many became one" reading.
- **Offline.** Zero network requests. Fonts are system stacks. The venue advisory warns
  Wi-Fi is one device per participant with variable signal, so this runs from `file://`
  with the network off.
- **Print.** `@media print` gives one landscape page per slide with every step revealed —
  the PDF backup for presenting from someone else's machine.

---

## 5. QA

Chromium is at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

1. **No external references** — `grep -cE '(src|href)=["'"'"']https?://|@import|url\(https?://' pitch/cesr-pir-blhsd.html` returns `0`.
2. **Nothing clipped** — for each slide, reveal all steps and compute the scale `fit()` would
   pick; anything below `0.42` is clamped and clipped. Last run at 1366×768 / 1280×720 /
   1920×1080: minimum **0.748** (slide 6 at 1280×720). Comfortable.
3. **Print** — `--print-to-pdf` yields **24** landscape pages, one per slide.
4. **Reduced motion** — emulate `prefers-reduced-motion: reduce`; builds still reveal,
   nothing animates.
5. **Keys** — step forward and back across a build boundary in both directions; `N`, `O`,
   `Esc`, `B`.
