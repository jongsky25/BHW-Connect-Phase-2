# CESR Implementation EpiC GHS — source material

Transcriptions of the Google Drive folder
[*CESR Implementation EpiC GHS*](https://drive.google.com/drive/folders/1e7qMO1lAHM3yvHz0BLelKlgpE9rKuE3y),
shared with the project by the EpiC / Global Health Security programme (owner:
danielgarciathe3rd2019@gmail.com, folder created 29 August 2026). Extracted **4 September 2026**.

**What this is.** Fourteen files documenting the Philippine Department of Health's Community
Event-Based Surveillance and Response (CESR) programme — its governing guideline, its field
instruments, its BHW training curriculum, and the June–July 2026 monitoring round that found what is
and isn't working across Marinduque, Palawan and Quezon City.

**Why it's here.** CESR is BHW work: barangay health workers detecting, screening, recording and
reporting community health signals. The monitoring round's findings are largely information-system
failures, and it closes with an explicit ask for a "CESR Signal Application." What BHW Connect should
do about that is worked out in **[`docs/cesr-module.md`](../../cesr-module.md)** — start there. This
folder is the evidence base behind it.

**Status of these files.** Reference transcriptions, not authoritative copies. The Drive originals
remain the source of truth; if the two disagree, Drive wins. They are checked in so the project has a
durable, diffable, searchable record that does not depend on continued access to someone else's Drive
folder.

---

## Read in this order

If you are new to CESR, three files give you the whole picture:

1. **[DOH Interim Guidelines for Community-Based Surveillance](./doh-interim-guidelines-cbs-2024.md)**
   — what CESR is and how it is supposed to work. Normative.
2. **[CESR M&SS Feedback presentation](./mss-feedback-2026-06.md)** — what actually happens in the
   field, and the product ask.
3. **[`docs/cesr-module.md`](../../cesr-module.md)** — what, if anything, we build.

---

## Inventory

### Governing guideline

| File | Original | Notes |
|---|---|---|
| [doh-interim-guidelines-cbs-2024.md](./doh-interim-guidelines-cbs-2024.md) | `DOH_Interim Guidelines for the Community-Based Surveillance.pdf` | **The normative document.** DOH Epidemiology Bureau, July 2024. Roles, the Detect→Confirm→Record→Report loop, the four signal definitions (English + Filipino), the Annex 2 log sheet field-by-field, the Annex 3 notification format, and the BHS performance indicator targets. Anything built for CESR conforms to this. |

### Monitoring & supportive supervision — findings

| File | Original | Notes |
|---|---|---|
| [mss-feedback-2026-06.md](./mss-feedback-2026-06.md) | `CESR M&SS Feedback_2026_06_16.pptx` | **The most product-relevant file.** March–June 2026 monitoring round. Three health-event reviews with 7-1-7 metrics (rabies/Torrijos, ILI/Sta. Cruz, measles/Tatalon), the M&E indicator set with real measured values, the key findings and recommendations, and the explicit **"CESR Signal Application"** specification plus the SHARE reporting mechanism. |
| [activity-report-mss-marinduque-2026-05.md](./activity-report-mss-marinduque-2026-05.md) | `Revised AR - MSS District 1 MDQ -May 25-29- 2026- -1- (1).pdf` | Field-level companion to the deck. Named coverage figures (4%–64% of barangays recording signals), the failure modes in detail, and action points with owners and due dates. |
| [implementation-dashboard-2026-07.md](./implementation-dashboard-2026-07.md) | `CESR Implementation Updates Dashboard_July2026.pdf` | Power BI export, Region IV-B. Training numbers, signal counts, timeliness ratios, and the resource gaps — posters present in ~52% of Palawan BHS, and 38% of BHS with no mobile phone provided for CESR. |
| [activity-report-bhw-supervisor-refresher-2026-07.md](./activity-report-bhw-supervisor-refresher-2026-07.md) | `AR_CESR Refresher for BHW Supervisors_July 19-25, 2026 (Signed) (1).pdf` | ⚠️ **Low-yield.** The PDF is image-based; only the title and signature block extracted. See the file's extraction note. |

### Field instruments

| File | Original | Notes |
|---|---|---|
| [supportive-supervision-tool.md](./supportive-supervision-tool.md) | `[REVISED] 2 ESR_CESR Supportive Supervision Tool 032026.docx` | The instrument the M&SS visits are conducted with. Effectively a form spec — every question is a field with its answer type already decided. Sections 3–4 are the indicator definitions. |
| [bhs-supervisory-checklist-tagalog.md](./bhs-supervisory-checklist-tagalog.md) | `[REVISED] 3 BHS Supervisory Checklist_Tagalog 04062026.docx` | The BHS-level checklist, **entirely in Tagalog** — the best register reference in the folder for how CESR concepts are phrased for frontline workers. Directly useful given Filipino is the default locale. |

### BHW training curriculum

Four English decks delivered at the CESR rollout workshop in Boac, Marinduque, 3–5 September 2025,
plus the sensitization package. **The most directly reusable material in the folder** — candidate
content for the e-learning module (INC-12) and the Knowledge Base.

The decks are heavily participatory: learning objectives, instructor tips on nearly every slide,
metacard True/False and Yes/No quizzes with answer-reveal slides, worked case scenarios with
"injects" that change the answer, group exercises, and role-plays. Deck 3's Tagalog exercise
scenarios and sample log sheets, and Deck 4's entire Tagalog dialogue set, are preserved verbatim.

| File | Original |
|---|---|
| [training-deck-1-intro-to-cesr.md](./training-deck-1-intro-to-cesr.md) | `[2] MDQ_[English_CESR] Deck 1 - Intro to CESR.pptx` |
| [training-deck-2-finding-signals.md](./training-deck-2-finding-signals.md) | `[3] MDQ_[English_CESR] Deck 2 - How to Find Signals in my Community.pptx` |
| [training-deck-3-cesr-steps.md](./training-deck-3-cesr-steps.md) | `[4] MDQ_[English_CESR] Deck 3 - CESR Steps v2.pptx` |
| [training-deck-4-communication-skills.md](./training-deck-4-communication-skills.md) | `[5] MDQ_[English_CESR] Deck 4 - Communication Skills for BHWs.pptx` |
| [sensitization-package-2026-07.md](./sensitization-package-2026-07.md) | `Proposed Sensitization Package Presentation.pptx` — presented to the DOH Epidemiology Bureau. Note its claim that **"CESR does not require expensive technology"**, which sits in deliberate tension with the M&SS application ask; both are discussed in `cesr-module.md` §2. |

### Workshop notes

| File | Original | Notes |
|---|---|---|
| [workshop-breakout-group-1-leptospirosis.md](./workshop-breakout-group-1-leptospirosis.md) | `GROUP 1` (Google Doc) | Breakout notes stocktaking leptospirosis prevention and response 2023–2026, with cross-group critique. Sessions 2–4 are blank templates in the original. Peripheral to CESR tooling; kept for completeness. |

---

## Not transcribed

| Original | Why |
|---|---|
| `CESR Implementation Updates Dashboard.pbix` (Drive ID `15YAZyr0Rd_pqsibAIvdE8YguWKn6dEY3`) | Power BI binary workbook — not text-extractable. Its **rendered output** is captured in [implementation-dashboard-2026-07.md](./implementation-dashboard-2026-07.md), which is the July 2026 PDF export of this same file. Open in Power BI Desktop if the underlying model or queries are ever needed. |

---

## Known gaps

- **The BHW Supervisor refresher activity report did not extract** (image-based PDF). Its
  substance — attendance, numbers trained, pre/post-test results, findings, action points — is not
  captured. Needs manual transcription or an OCR re-export from the Drive original.
- **The Power BI export loses chart labels.** Several values in the dashboard transcription arrive
  detached from their category labels; those are flagged in that file's extraction note rather than
  guessed at.
- **The training decks are image-heavy.** Diagrams, posters and photographs in the original PPTX
  files are not reproduced — only their text. The Filipino-language IEC posters referenced in the DOH
  guideline's Annex 1.2 are likewise images and are not here.

## Re-extracting these files

If you need to pull any of these from Drive again, note that **the Drive content-read tool returns
empty for the large decks** — decks 1, 3 and 4 are 57–74 MB and exceed the extractor's size limit.
Those were recovered by downloading the `.pptx` directly
(`https://drive.google.com/uc?export=download&id=<fileId>`) and parsing locally with `python-pptx`,
pulling shape text in reading order plus tables and speaker notes. Use that route for anything over
roughly 50 MB rather than the read tool.

## Provenance and handling

These documents were produced by the EpiC / Global Health Security programme (FHI 360) and the DOH
Epidemiology Bureau. They name real health workers, real officials, and real health events including
identifiable case details (ages, barangays, clinical descriptions). They are shared working documents,
not published material.

Treat them accordingly: this is internal project reference material. Do not republish, and do not
lift case details or personal names into anything user-facing, public, or deployed.
