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

**Shape.** 20 slides in five acts, heavy click-builds. Four statement slides (1, 11, 19, 20)
take about 30 seconds each; the rest average ~1.7 minutes.

---

## 1. Decisions that are load-bearing

Change these only deliberately — each one is holding something up.

| Decision | Choice and why |
|---|---|
| **Tone toward CESR** | **Implicit.** No slide states a criticism. Evidence from the partner's own monitoring deck and activity reports is shown flat with a source caption, and the audience concludes. The single editorial sentence is on slide 9: *"This is not a finding about CESR. It is what the model produces, everywhere."* It points at the method, not at anyone. Do not add a second one. |
| **7-1-7 = 0%** | Presenter notes only, never on a slide. On screen it reads as an attack on people who are in the room. |
| **The partner is never named** | "The development partner", "partner-supported". EpiC GHS appears only inside citation captions, where it is the author of the source document. |
| **Slide 19 before the close** | The June M&SS closed by asking for a *"CESR Signal Application"*. Showing that they already asked for this is what makes the closing question an offer rather than a demand. Do not cut it. |
| **Slide 20 stands alone** | The question, nothing else. No thank-you, no contact line, no Filipino translation — English only, at the presenter's direction. |
| **Filipino** | Deck is English. Filipino pull-quotes at three emotional beats (slides 5, 14, 15) and inside the two chat simulations, where the language *is* the point. |
| **Readiness language** | Phase 2 is described as *designed end to end and in build* — the CESR module is content and configuration on that system, not a new build. Never "deployed nationwide", never "live". |
| **Text density** | One headline, at most one supporting line; the build carries the rest. If a slide needs a paragraph, it is two slides. |
| **Logos** | Text-only wordmarks. No image assets anywhere. |
| **Seven gaps, not six** | G7 *Correctable* came from the presenter: *"paano pag may mali sa materials? Papatawag ba tayo ulit?"* Slide 7 poses it, G7 registers it, slide 12's fourth pillar and G7's closure answer it. That thread is the spine of the cost argument — ₱1.98 B buys one *version*, not a trained workforce. |

---

## 2. The arc

| # | Act | Slide |
|---|---|---|
| 1 | — | Title |
| 2 | The Provocation | "Insanity…" · RA 7883, thirty years, no national picture |
| 3 | What We Know | ~300,000 profiled in a year — *it was the method* |
| 4 | | 7 in 10 · 45% · 2% — *the ceiling was never the BHW* |
| 5 | | Palawan: 344 microscopists, mostly homemakers |
| 6 | | ₱2,200 → ₱6,600 → ₱1.98 B, against ₱50 |
| 7 | | **When the material changes** — do we call 300,000 people back? |
| 8 | | The scattered effort — good work, built to stay small |
| 9 | The Ground | CESR, plainly: 3.6% · "pictures, no database" · 8 batches |
| 10 | | Seven things a training event cannot be · `7 open` |
| 11 | The Direction | *Not another training. A system that trains.* |
| 12 | | One clearing house (dots converge) · tiered · any mode · any author · **corrected once** |
| 13 | | Attendance is not competence — module → demo → certificate → registry |
| 14 | | Chatbot as coach — recall support between events |
| 15 | | Chatbot as the form — the report is a by-product of the conversation |
| 16 | | Privacy — insight without exposure |
| 17 | | One platform · `7 closed` |
| 18 | The Ask | Three issuances committed, three in development |
| 19 | | You already asked for this — the "CESR Signal Application" |
| 20 | — | *What is your plan to align with our direction?* |

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

**Notes-only, never on a slide:** 7-1-7 at 0% (0/2) — `mss-feedback-2026-06.md:306`; M&SS coverage
Marinduque 6/6, Palawan + PPC 21/24, Quezon City 6/6 — same, :20-24.

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
- **Deep links.** `…#s12` opens slide 12 with its build complete. The hash tracks the current
  slide, so a link can be shared or bookmarked mid-deck.
- **Keys.** `→`/Space, `←`, `Home`/`End`, `N` notes, `O` overview (`Esc` closes), `B` blank,
  `F` fullscreen, `?` legend.
- **Notes.** `<aside class="notes">` per slide — the speaking line plus reserve material for
  Q&A. Never printed.
- **Scatter figure.** Dot positions are a fixed table, never `Math.random()` at runtime: the
  same dots must appear in the same places on slides 8 and 12, and must not move between
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
   1920×1080: minimum **0.748** (slide 5 at 1280×720). Comfortable.
3. **Print** — `--print-to-pdf` yields **20** landscape pages, one per slide.
4. **Reduced motion** — emulate `prefers-reduced-motion: reduce`; builds still reveal,
   nothing animates.
5. **Keys** — step forward and back across a build boundary in both directions; `N`, `O`,
   `Esc`, `B`.
