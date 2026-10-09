# Lesson 1.7.1 enhancement handoff — Carole

## Continue this individual draft

The owner requested four individual handoffs/PRs for lessons 1.7.1–1.7.4 and named **Carole** as the BHW, with the attached photo as her face reference. This independent branch starts from `0bf98ef4e10636fa312091f80ec9f9d766e2de4b`. It prepares future authoring; it does not change teaching, narration, UUIDs or live data.

Suggested next-chat instruction:

> Continue this PR on `codex/lesson-171-carole-handoff`. Implement lesson 1.7.1 using `docs/lesson-171-enhancement-handoff.md`. Use the pinned Carole face reference, produce the full bilingual draft review package, and stop at draft review.

Read [CLAUDE.md](../CLAUDE.md), [session handoff](session-handoff.md), [deploy runbook](deploy-runbook.md), [Carole continuity](lesson-17-carole-continuity.md) and [the exact baseline receipt](lesson-171-handoff-baseline.json). Earlier 1.6 approvals do not approve this new lesson. Keep the PR draft until the owner approves its own complete package. Draft preparation does not include merging, loading, publication, migrations, learner resets or flag/assessment changes.

## Identity, baseline and preservation

Work only in `content/training/day1-basic-competencies/modules/07-problema/lessons/problem-define/` for teaching/private-guide changes. The BHW in this adaptation is Carole; remove Nestor/41 from new target teaching dialogue without transferring that age or inventing a biography. Keep source transcriptions and historical quotations unchanged. The shared module-summary name change is coordinated by 1.7.1 as described in the continuity file; do not edit sibling lesson leaves.

| Preserve exactly | Baseline |
|---|---|
| Lesson | 1.7.1 · `problem-define` · `cc8eee94-60a5-41b3-8a47-c6ae92903c07` |
| Module | `07-problema` · `2ba3c8c2-4fac-4440-bbaa-ab19e5120e54` |
| Course | `73e0edda-6c28-420f-9c35-05a29563abd3` |
| Position / required | 0 / true |
| Titles | Linawin ang problema / Define the problem |
| Original Read anchors, in relative order | `missed-visits`, `worked-example`, `practice`, `check` |
| Slides | Corresponding `slide-` anchors and original concepts |
| Coverage obligations | `m7.define` |
| Guided practice | 35 minutes; 35 + 50 + 45 + 50 = 180 overall |
| Check | Keep every original bilingual choice and correct index 2 |
| Rubric | One directly observable indicator at objective_index 0; six bilingual levels |
| Carole reference | `docs/lesson-17-reference/carole-character-reference-6e2b1c5044d7.png` · SHA-256 `6e2b1c5044d7b0cde3f893a8358c062c1689a4200ba0611203642cda57d1544c` |
| Registry at pinned main | 82 compositions; append exactly two new IDs at implementation |

Keep the complete lesson manifest, including both objectives:

- Filipino: “Mula sa missed-visit case, isulat ang problemang may tiyak na pangyayari, pinagmulan at impormasyong kulang, nang walang paninisi.”
- English: “Given the missed-visit case, write a problem statement with a specific event, source and information gap, without blame.”

The seven target files are frozen at the named main commit:

| File | SHA-256 |
|---|---|
| `competency.json` | `abbe5bcc2864c7b79f2fb5e2d99d248ccc3213cbd3f2539adb8374824ca075ca` |
| `facilitator.en.md` | `0647732a620a4d2d5b59286595a4de0ddfe4f895f3f208a3b914b2476d66f2c9` |
| `facilitator.fil.md` | `967e746e5f8afaae752e447e9743a7a79b1673f33f74198913062b4bd139856a` |
| `lesson.json` | `d6c9d4d8dc5de32d1ec6b8a2002c81112549a983a10c1f3b76fb0bea77856ef7` |
| `read.en.md` | `b1868871519f6a8bad35ff6acfcd71b1b7c0f46f3a08f7489384cc0621b7db00` |
| `read.fil.md` | `cac8131e8e05ee700ed7d509fa54fab928e9e728df4ca9a0e52c633848f18004` |
| `slides.json` | `b8ace20fbc9015b19f26f1cb590f5fea718f8d739d1c60e36387d09d4eae98a6` |

Before implementation verify the receipt against its pinned commit. Capture all target bytes, complete current narration selection/history, UUID lock, current shared sources/registry, all prior public media bytes and earlier approval/proposal receipts. Capture a fresh bounded read-only published lesson/revision/private-guide baseline through the loader admin; do not query learner identities/progress. The repository baseline above is not an authenticated production snapshot.

Preserve all non-target teaching, narration/history, public file bytes and approval receipts, especially released 1.6.1–1.6.4. Do not overwrite old hashed media. Scope any shared provider, speech alias, UI or registry change to this target and prove it with exact successor/predecessor hashes. If main advances, integrate once near final review and reconcile the new baseline; never loosen historical tests or fabricate approval.

## Six proposed paired teaching screens

Filipino first in everyday language, with full equivalent English. Each screen has a relevant action illustration, complete Read body and equivalent Slides narration; slide summaries may be shorter. Retain all original substantive anchors/concepts and add only the named new anchors. Each lesson must work independently.

| Screen | Teaching action | Visual/task direction |
|---|---|---|
| missed-visits | Keep the three missed visits as a fictional event; Carole listens without calling families uncooperative. | Carole listening to three fictional household accounts. |
| worked-example | Separate event, guessed motivation and premature solution, preserving the original comparison. | Three accessible labelled cards: event, assumption, proposed solution. |
| source-gap (new) | New: attribute each statement and name dates, attendance record or household barrier still to check. | Blank source/date/gap task card; typeset all meaningful text outside the image. |
| resident-perspective (new) | New: ask a neutral clarification question, let a resident correct the account, and retain unresolved differences. | Carole in respectful conversation; no expression treated as proof. |
| practice | Write and revise a statement containing event/scope, source and one unknown; partner checks, then a second attempt. | Printable event/guess/solution sorting cards and statement checklist. |
| check | Keep all three original choices and correct index 2; picture before choice, all rationales and a corrected statement afterward. | Carole and the attributed final statement with honest unknowns. |

The story ends with **A corrected problem statement, not a guessed cause or promised solution.** New dialogue is an authoring adaptation, not a DOH quotation. Show residents' perspectives, correction and uncertainty honestly. Labels such as lazy, uncooperative or noncompliant cannot replace evidence. Never infer agreement/motive from silence, a nod or facial expression. Use fictional classroom facts and no filled real patient records.

Present the check illustration before choices. After selection explain all three original options, show the corrected ending and unlock takeaway/summary audio. Do not replace the original decision with a fact-recall quiz. Optional story viewing or clicking a quiz is not direct competency assessment.

## Source audit and lesson boundaries

Audit original PDFs, not only transcriptions: [Facilitator Guide](source-material/day1-basic-competencies/facilitator-guide.md), PDF 29 / topic table at PDF 19; [Reference Manual](source-material/day1-basic-competencies/bhw-reference-manual.md), PDF 19–21; [teaching deck](source-material/day1-basic-competencies/day1-part1-presentation.md), slides 59–66. Follow the [source inventory](source-material/day1-basic-competencies/README.md) for original links. Confirm PDF versus printed pagination, retain hashes/page excerpts, and cite only inspected passages. Check the original TESDA competency mapping before claiming a specific unit or training-hour requirement; distinguish the source's three-hour topic allocation from the new run sheet.

For 1.7.2 consult [ZFF Rosario source](source-material/day1-basic-competencies/kwento-ni-rosario.md), printed pp. 48–51, and obtain/inspect the original workbook. Rosario is a child aged one year and four months, not a mother. Keep diarrhoea/measles historical case analysis separate from the missed-visit adaptation; no medication, hydration, diagnosis or treatment instructions from historical narrative. Other lessons can refer briefly to determinants but must not duplicate the entire source exercise.

Definition belongs to 1.7.1; branching and verifying causes to 1.7.2; transparent scoring/ties to 1.7.3; partner-agreed trial and review to 1.7.4. Do not let one branch silently supply findings for another. A score is a planning aid, not a clinical triage algorithm or local prevalence estimate; higher feasibility means more achievable. Preserve example totals 19/17/16 and mark them as deck/fictional examples. Never postpone immediate care for a score or manufacture an authority-approved schedule, funding, partner commitment or outcome.

Local access, privacy, referral and planning procedures need actual authorized-source/SME review before asserting local rules. Use only necessary attributed information; do not promise absolute secrecy or a universal record-deletion procedure.

## Facilitated practice, rubric and printables

Keep 35 minutes within the same 180-minute program. Proposed run sheet: **5 opening + 7 demonstration + 12 paired attempts/feedback/retry + 7 debrief + 4 transfer = 35.** Clearly separate short self-study estimates, narration duration, optional story and guided practice. Measure new audio before displaying a study estimate.

For a group of 30 use ten triads with rotating BHW/resident-or-partner/observer roles, or a justified equivalent fitting the allocation. Specify actual attempt/feedback/retry times and direct-observation sampling. Unseen attempts are “not observed,” not passed. Give a solo paper equivalent, scaffold a weaker attempt, and let the learner retry. Match the single objective_index 0 indicator and all six bilingual levels to the observable product/action, not attendance or a meeting count.

Retain private bilingual guides with exactly these twelve headings, in order: `purpose`, `time-materials`, `prepare`, `opening`, `steps`, `expected-answers`, `misconception`, `practice`, `answer-key`, `observe`, `support`, `sources-review`. Include exact demo/debrief prompts, expected responses, all check rationales, common errors, sampling, retries and pending policy review.

Supply bilingual A4 printables: **Event/source/gap cards, resident/interviewer/observer instructions and one-page problem-statement aid.** Include sufficient fictional facts and honest unknowns to run practice without improvising findings. Verify page count, legibility, no clipped content and an actual one-page task aid.

## Carole illustrations, actual narration and optional story

Use [the committed Carole reference](lesson-17-carole-continuity.md) and [provenance](lesson-17-carole-reference.json). Inspect it before editing/generating. Preserve face/hair/outfit across distinct teaching actions; do not substitute generic women, use Gibs/Liza art for Carole, or put her face on Rosario. Original photo bytes are not claimed to be archived; the pinned derived reference is available in every branch. New art remains draft; the request for handoffs is not approval of finished lesson scenes.

Generate all final paired Read/Slides narration with Gemini Kore in both languages. Use a stable female narrator; preserve displayed **Carole**. Review actual name pronunciation before adding any target-only speech alias. Retain every old file/selection and full history; old published text must continue selecting its old narration until new revision publication. Do not globally change a narrator or voice style.

Build the optional six-beat Filipino and English story with a real corrected ending, H.264/AAC 854×480, measured encoded-audio beat boundaries, six matching WebVTT cues, adequate ending/post-roll and posters from actual final encoded frames. Append `ProblemDefineStoryFil` and `ProblemDefineStoryEn`; baseline 82 → 84 only if no sibling compositions have since merged. Verify the entire eventual registry, exact IDs/source/order and all actual render logs.

For the six-screen proposal retain 12 actual Read MP3 reviews plus two decoded shipped AAC story reviews, and four focused excerpts per recording (14 full / 56 focused): name, dialogue/meaning, negation/qualification and ending. Keep exact audio/excerpt hashes, prompt revision, raw requests/responses, failed/superseded attempts and reported disagreements. Cache only identical reviewed bytes or proven identical decoded PCM. Model reports do not establish human listening, owner approval or SME signoff; report unresolved concerns truthfully.

## Complete draft review and later controlled release

Use the working lesson-164 review/media/browser/package scripts as examples, with new target-specific paths and receipts; do not overwrite prior lesson evidence. Build a self-contained `lesson-1.7.1-carole-review.html` from actual production components with explicit save/auth fixtures. Embed all relevant image/audio/video/poster/caption bytes; label it offline review. Include bilingual private guides/rubric, A4 printables, source-page excerpts/hashes, full/focused/raw media provenance and browser evidence in the ZIP, with an external integrity receipt.

Verify Fil/En × Read/Slides × desktop/390px mobile for every screen; illustrations before checks; all three rationales/endings; gated takeaway audio; actual zone highlighting; original anchor/concept meaning; optional story completion; unmuted ending/captions; fullscreen, single-player exclusivity, language/mode cleanup, overflow and console errors. Report actual case counts/screenshots, not an assumed 80. Verify current/old narration mapping, all protected source/history/UUID/public bytes, complete manifests, one indicator, guide order and exact inline media.

Use disposable local Supabase for development/E2E. Freeze final source, pass normal CI and the entire current Remotion registry at that exact head, then package. Validate ZIP unique safe member paths, CRC, every size/SHA-256 and inline-media matches. Keep downloadable artifacts below 512 MiB; split/hash-pin raw evidence if necessary. Label human listening, owner review and local-policy SME status accurately. Update this individual PR around the final implementation, attach its package, and stop with a complete reviewable draft.

After separate explicit approval of this exact lesson package, use the established target-only loader: `--mode lessons --modules 07-problema --lesson-keys problem-define`. Dry-run, verify the production commit and selected media, publish only this lesson, and compare bounded before/after revision/private-guide and neighboring lesson records. Preserve UUIDs, other published pointers, learner progress, assessments and flags. Do not replay the 1.6 multi-lesson release. The existing loader-admin password-change gate blocked the prior production UI smoke; respect it and use authorized fixtures for later checks, without account mutation or fabricated browser verification.
