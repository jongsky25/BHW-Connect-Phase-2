# Lesson 1.8.3 enhancement handoff — Apple (she/her)

## Continue this individual execution PR

The owner requested separate handoffs and execution PRs for 1.8.1–1.8.4 and named **Apple**, using **she/her**. This branch starts independently from main `f4bf3c25ec498cabac0b6e851337b312ff6333e7`. This PR prepares future authoring; it does not yet change teaching, media, lesson identity or live data.

Suggested execution instruction:

> Continue this draft PR on `codex/lesson-183-apple-handoff`. Implement lesson 1.8.3 using `docs/lesson-183-enhancement-handoff.md` and its pinned baseline. Use Apple (she/her), produce the full bilingual review package with actual media and verification evidence, and stop at draft review.

Read [working rules](../CLAUDE.md), [session handoff](session-handoff.md), [deploy runbook](deploy-runbook.md), [Apple continuity](lesson-18-apple-continuity.md), [baseline receipt](lesson-183-handoff-baseline.json) and [narration/visuals handoff](narration-visuals-realignment-handoff.md). Use the lesson-171 review/media/print scripts as working examples and verify their current assumptions before adapting them. Keep implementation and evidence in this PR. The owner's earlier approval to merge/deploy lesson 1.7.3 does not authorize release of this lesson.

## Identity, exact baseline and preservation

Teaching/private-guide changes are confined to `content/training/day1-basic-competencies/modules/08-osh/lessons/safety-prepare/`. Replace Ana in new visible dialogue with Apple; do not carry over age 33 or invent a biography. Preserve original source transcriptions, quotations and historical media bytes. Follow the shared-change ownership in the continuity file.

| Preserve | Pinned value |
|---|---|
| Lesson | 1.8.3 · `safety-prepare` · `022cc773-1996-4813-9122-de98ade936c4` |
| Module / course | `08-osh` · `ffd36ec0-f8f9-4c7a-bf34-2ab821ac95ec` / `73e0edda-6c28-420f-9c35-05a29563abd3` |
| Position / required | 2 / true |
| Titles | Paghahanda sa ligtas na gawain / Prepare for safe work |
| Original Read anchors, relative order | `station-preparation`, `field-preparation`, `combined-hazards`, `practice`, `check` |
| Slides / concepts | Preserve matching `slide-` identifiers and original concept meanings |
| Coverage | `m8.prepare`, `m8.practice`, `m8.accidents`, `m8.heat`, `m8.requirements` |
| Guided practice | 60 minutes; 45 + 60 + 60 + 75 = 240 overall |
| Original check | All three bilingual choices unchanged; correct index 1 |
| Rubric | One observable indicator at objective_index 0; six bilingual level entries |
| Character reference | Apple (she/her); no face reference supplied or generated in this handoff |

Keep the complete manifest, including the exact bilingual objective:

- Filipino: “Bumuo ng before-work checklist para sa station at field visit na may supplies, ruta, reporting contact at malinaw na dahilan kung kailan magpa-pause.”
- English: “Build a before-work checklist for station work and field visits covering supplies, route, reporting contact and explicit pause conditions.”

The receipt contains all seven original target files as UTF-8 snapshots and SHA-256 hashes, exact anchors/coverage/check, selected narration/history, sibling source hashes, shared-file hashes and source-transcription hashes. Frozen snapshots support shallow CI without assuming old Git objects were fetched. Verify every receipt hash against its pinned main commit before authoring.

| Target file | SHA-256 |
|---|---|
| `competency.json` | `62fa9525b19906f2f3b2e8ccc7a5c19f5320b8f75b156a3881136fdcfc5546f9` |
| `facilitator.en.md` | `81c86df92b96e36651720ad9c31320a6e4f11c0f9eb44ce4aba93afb3145e269` |
| `facilitator.fil.md` | `19d39bb8d4a02afccda2b44e7c101f03a2dc0cc2ea23d4e62bb2c1360e669614` |
| `lesson.json` | `4a9c35f208a616e2f2674e22a4b6db2308e230c65969f220337de90589bb3108` |
| `read.en.md` | `a78d0f1cf47873a3750edb756e5a8397ed07254745d1d40ebc7f04937e2e4ed2` |
| `read.fil.md` | `5ea3e366bcb7130d7a917c96a40105b8a2fb06406ad7e0554d92968df1e5d2c9` |
| `slides.json` | `47eafa47a4fb2a54776e925cf235497a27865079d777e87b88f634a688282374` |

At implementation start capture all prior public media bytes, complete narration selections/history, UUID locks, shared registry/UI/provider sources and all earlier approval/proposal receipts. This handoff is not an authenticated production snapshot. Through an existing authorized loader workflow, obtain a bounded read-only published target/revision/private-guide baseline and neighbor rows; never retrieve production secrets or query learner identities/progress. Missing access stays explicitly unresolved while independent draft work continues.

Preserve every non-target lesson, legacy module teaching, public hashed file, narration history, prior approval and source transcription, especially the current 1.6 and 1.7 releases. Append new hashed media; retain old files/selections for old published text. Any shared UI/provider/registry change must be scoped to this target and supported by exact predecessor/successor hashes. Do not loosen historical tests or exclude this lesson from the narration-current check. If main advances, integrate once near final review and reconcile its newly released source/registry baseline.

## Six paired teaching screens and corrected ending

Use everyday Filipino first with fully equivalent English. Each proposed screen needs complete Read teaching, equivalent full Slides narration, a shorter display summary and a relevant action illustration. Preserve all existing anchors/concepts in relative order; add only the named new anchors with matching slide/coverage mapping. The `ana` identifier, if present, remains a saved-position key even though the visible character is Apple.

| Screen | Teaching action | Visual / task direction |
|---|---|---|
| station-preparation | Prepare task scope, supplies, correct container, hand-hygiene supplies and locally specified PPE; missing essential protection pauses the affected work. | Apple checks a mock station without performing clinical procedures. |
| field-preparation | Plan fictional route, weather/heat, water/shade/rest, reporting contact and return time; buddy arrangements are conditional on local protocol. | Typeset route card with invented classroom landmarks, not real household addresses. |
| combined-hazards | Separate work that must pause, work that can safely change and decisions needing authorization; do not solve a surge through unpaid extra hours alone. | Apple presents a safer proposed alternative to a supervisor. |
| verify-readiness (new) | Check whether the agreed correction actually occurred before starting; record an unresolved condition honestly. | Before/after checklist with ready/not-ready status and responsible contact. |
| practice | Complete all five existing checklist fields; rehearse missing soap and a route threat, obtain feedback and retry the briefing. | Bilingual station/visit checklist and partner verification card. |
| check | Keep all three route-threat choices and index 1; show all rationales and a coordinated alternative, not a promise that the threat vanished. | Apple pauses the unsafe route and confirms an agreed alternative. |

Corrected story ending: **A complete before-work readiness decision with an agreed safe alternative and unresolved conditions made visible.** Label the scenario fictional and the new dialogue an adaptation, not a DOH quotation. Do not invent observed correction, local policy, partner agreement or successful medical outcome. Teach verification when a condition/contact is unknown. Keep this lesson independent of the other Apple stories.

Preserve the quiz's original bilingual choices and correct index. Preserve its question wording except the expressly permitted Ana → Apple identity substitution in 1.8.4. Put the illustration before the decision; reveal all three rationales and the corrected ending afterward. Keep takeaway/summary audio gated as in the production flow. A clicked choice or watched story does not establish demonstrated competence.

## Source audit, clinical review and lesson boundary

Start with [source inventory](source-material/day1-basic-competencies/README.md). The existing lesson cites Facilitator Guide **PDF 30** and Reference Manual **PDF 21–23**; the deck's OSH section is **slides 69–78**, especially 70–71 decision exercise and 73–77 hazard/prevention tables. Inspect the original linked PDFs, distinguish PDF from printed page numbers, retain inspected excerpts/hashes and cite only passages actually checked. The transcriptions identify candidate passages, not a completed PDF audit. Verify the original TESDA OSH competency and four-hour mapping before claiming certification or equivalence.

Audit the source references already attached to this lesson, plus current authoritative WHO occupational-infection and CDC occupational-exposure guidance when relevant. Historical deck/manual content is not an adequate basis for new clinical treatment instructions. Identify discrepancies and obtain an authorized local clinical trainer's review of sharps handling, hand hygiene/PPE demonstration, exposure/reporting routes and any prevention advice before marking them reviewed.

Keep the scope distinct: 1.8.1 identifies/reports hazards; 1.8.2 selects appropriate controls; 1.8.3 prepares/verifies readiness; 1.8.4 demonstrates and rehearses reporting/referral. Use five source/practice hazard groups consistently, while retaining vector and heat coverage where assigned. Do not imply gloves replace hand hygiene, PPE fixes all hazards, absence of symptoms clears an exposure, or extra volunteer hours are the default safety control.

Use dummy equipment only. Do not introduce real sharps/body fluids, unsafe chemical practice, painful exercises or live exposure. Do not invent PPE requirements/sequences, chemical mixtures/dilutions, post-exposure medication/doses/timing, emergency numbers or benefits eligibility. Keep immediate evaluation separate from later paperwork; a qualified provider decides assessment/treatment. Confirm local reporting/buddy/route and pause/resume procedures rather than inventing universal rules. Clinical review, owner approval and automated media review are different evidence states.

## Facilitated practice, observation and printables

Preserve 60 guided minutes within the existing 240-minute allocation. Proposed run sheet: **5 opening + 10 modelled readiness check + 25 checklist/briefing/feedback/retry + 12 combined-hazard debrief + 8 transfer = 60.** Separate guided practice from measured self-study narration and optional story duration; do not label 60 minutes as a measured reading estimate.

For 30 learners use ten rotating triads (BHW / contact-or-partner / observer), with explicit attempt, feedback and retry times that fit the run sheet. State how many performances one trainer can actually observe in that window. Record unobserved attempts as not observed, not passed; peer feedback supports practice. In 1.8.4 physical demonstration requires actual trainer observation; a solo verbal rehearsal cannot substitute. Provide a solo paper/spoken alternative, reading support, a scaffold for a weaker attempt and an observable retry.

Retain exactly twelve private-guide headings in order: `purpose`, `time-materials`, `prepare`, `opening`, `steps`, `expected-answers`, `misconception`, `practice`, `answer-key`, `observe`, `support`, `sources-review`. Include exact demo/debrief prompts, fictional inputs, expected outputs, all check rationales, unsafe-error handling, sampling and retry instructions. Keep one objective_index 0 indicator with six bilingual levels aligned to actual actions/products; do not create attendance-based passing or a new certification rule.

Bilingual A4 printables: **Fictional station/route cards, five-field checklist, readiness verification prompts, role instructions and one-page pause/contact aid.** Include sufficient fictional facts and honest unknowns so a facilitator does not improvise patient records or local rules. Verify page count, readable typography, margins/no clipping and a genuinely one-page task aid. Document clinical checklist items awaiting trainer verification.

## Apple media, narration and optional story

Follow [Apple continuity](lesson-18-apple-continuity.md). Pin the coordinated fictional character reference before final scene generation and inspect it before editing. Use the built-in image generator for reference/action illustrations; retain exact prompts, reference/output hashes, failed and superseded attempts. Images should show Apple making the lesson decision, not generic interchangeable portraits. Keep meaningful labels in accessible HTML. Draft assets stay draft until their own package is approved.

Generate actual matched Read/Slides audio with Gemini Kore in Filipino and English, using a stable female narrator. Preserve displayed Apple; review her name pronunciation in actual audio before adding any target-only speech alias. Keep both languages complete and preserve prior selection/history, including old audio for old published revisions. A narration script is not an MP3. Use repository-secret CI generation workflows when available; never extract hosted secrets or fabricate playback/review evidence. Respect provider failures/budgets and retain resumable evidence.

Produce the optional six-beat bilingual story with the corrected ending above, H.264/AAC 854×480, measured encoded-audio beat boundaries, six matching WebVTT cues, audible ending/post-roll and a poster from actual final frames. Append exactly `SafetyPrepareStoryFil` and `SafetyPrepareStoryEn` to the freshly pinned registry, without changing existing IDs/source/order. Enumerate and render every composition in the eventual full registry; record actual counts/logs rather than copying an earlier lesson's 82/84 count.

For six screens retain **12 actual Read MP3 reviews plus two decoded shipped AAC story reviews**, and **four focused excerpts per recording (14 full / 56 focused)** covering name, meaning/dialogue, negation/qualification and ending. Include exact original/decoded/excerpt hashes, review prompt revision, raw requests/responses, failures/superseded attempts and disagreements. Cache only identical reviewed bytes or proven identical decoded PCM. Automated/model review is not human listening, owner approval or clinical signoff; report each accurately.

## Complete review package, verification and execution stop

Build `lesson-1.8.3-apple-review.html` from actual production components with explicit local auth/save fixtures. Make it self-contained with exact embedded image/audio/video/poster/caption bytes; label fixture limitations. Include both guides/rubric, A4 printables, source excerpts, character/media provenance, full/focused/raw audio reviews and browser evidence in `lesson-1.8.3-apple-draft-review.zip`, with an external integrity receipt. Preserve older lesson packages/evidence.

Verify Filipino/English × Read/Slides × desktop/390px for all six screens; picture-before-check, all original answers/rationales, corrected ending, gated takeaway audio, actual zone highlighting, old anchors/concepts/resume semantics and current/old narration selection. Verify optional story ending/captions, unmuted playback, fullscreen, single-player exclusivity and cleanup on language/mode/navigation changes; check overflow and console errors. Report actual case/screenshot counts. Prove exact non-target source/media/history/UUID preservation and target-only shared changes. Offline fixtures alone do not establish authenticated production or database behavior.

Run normal lint/typecheck/unit checks and disposable local Supabase E2E; never use the pilot for development/E2E. Freeze the final head, verify the entire current Remotion registry, then package. Check ZIP unique/safe paths, CRC, every member size/SHA-256 and every inline-media match. Keep each downloadable artifact below 512 MiB and split/hash-pin raw evidence if required. Missing media, credentials, source access or clinical review must be visible blockers, not reported as completed work. A package missing actual narration/story media is an incomplete draft.

Update this PR title/body around the final implementation and link the package/evidence. **Stop at the complete reviewable draft.** This handoff request does not approve implementation assets or authorize merge/deployment/publication. After separate approval of this exact lesson, promote only its approved asset statuses with exact reviewed/approved hashes; do not bypass `Promotion requires approved assets`. Run the existing target-only loader scope `--mode lessons --modules 08-osh --lesson-keys safety-prepare`: dry-run first, verify production commit/media, apply/publish only this lesson, and compare bounded target/private-guide and neighbor rows. Preserve learner progress, UUIDs, assessment/flag state and sibling published pointers. Respect the loader-admin password-change gate; do not mutate an account or claim an authenticated smoke that never opened the lesson.
