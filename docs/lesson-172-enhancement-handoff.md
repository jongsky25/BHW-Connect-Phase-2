# Lesson 1.7.2 enhancement handoff — Carole

## Continue this individual draft

The owner requested four individual handoffs/PRs for lessons 1.7.1–1.7.4 and named **Carole** as the BHW, with the attached photo as her face reference. This independent branch starts from `0bf98ef4e10636fa312091f80ec9f9d766e2de4b`. It prepares future authoring; it does not change teaching, narration, UUIDs or live data.

Suggested next-chat instruction:

> Continue this PR on `codex/lesson-172-carole-handoff`. Implement lesson 1.7.2 using `docs/lesson-172-enhancement-handoff.md`. Use the pinned Carole face reference, produce the full bilingual draft review package, and stop at draft review.

Read [CLAUDE.md](../CLAUDE.md), [session handoff](session-handoff.md), [deploy runbook](deploy-runbook.md), [Carole continuity](lesson-17-carole-continuity.md) and [the exact baseline receipt](lesson-172-handoff-baseline.json). Earlier 1.6 approvals do not approve this new lesson. Keep the PR draft until the owner approves its own complete package. Draft preparation does not include merging, loading, publication, migrations, learner resets or flag/assessment changes.

## Identity, baseline and preservation

Work only in `content/training/day1-basic-competencies/modules/07-problema/lessons/problem-causes/` for teaching/private-guide changes. The BHW in this adaptation is Carole; remove Nestor/41 from new target teaching dialogue without transferring that age or inventing a biography. Keep source transcriptions and historical quotations unchanged. The shared module-summary name change is coordinated by 1.7.1 as described in the continuity file; do not edit sibling lesson leaves.

| Preserve exactly | Baseline |
|---|---|
| Lesson | 1.7.2 · `problem-causes` · `9d468901-a2be-4805-afbd-be798136918b` |
| Module | `07-problema` · `2ba3c8c2-4fac-4440-bbaa-ab19e5120e54` |
| Course | `73e0edda-6c28-420f-9c35-05a29563abd3` |
| Position / required | 1 / true |
| Titles | Hanapin ang mga sanhi / Investigate causes |
| Original Read anchors, in relative order | `whys`, `manual-example`, `rosario`, `practice`, `check` |
| Slides | Corresponding `slide-` anchors and original concepts |
| Coverage obligations | `m7.whys`, `m7.diarrhoea-example`, `m7.determinants` |
| Guided practice | 50 minutes; 35 + 50 + 45 + 50 = 180 overall |
| Check | Keep every original bilingual choice and correct index 1 |
| Rubric | One directly observable indicator at objective_index 0; six bilingual levels |
| Carole reference | `docs/lesson-17-reference/carole-character-reference-6e2b1c5044d7.png` · SHA-256 `6e2b1c5044d7b0cde3f893a8358c062c1689a4200ba0611203642cda57d1544c` |
| Registry at pinned main | 82 compositions; append exactly two new IDs at implementation |

Keep the complete lesson manifest, including both objectives:

- Filipino: “Gumawa ng cause map na may dalawang posibleng sangay at paraan ng pagberipika, nang hindi itinuturing na patunay ang limang tanong lamang.”
- English: “Build a cause map with two possible branches and verification steps, without treating five questions alone as proof.”

The seven target files are frozen at the named main commit:

| File | SHA-256 |
|---|---|
| `competency.json` | `192906e7b4a9e1f9ae1144d9dea54540a282a4416b91c64827cc804978ff908a` |
| `facilitator.en.md` | `d349b1f70db0e85cc791300fb49706b068360ac0a473951eb737ceb56b33a4a7` |
| `facilitator.fil.md` | `5049c91b801a81cd252bc3dfb9b444f0f0aff8f618ca217efcaa09f0f929355d` |
| `lesson.json` | `c331bb48da80fa9705a3bd628f21684c09d71be7ac080179e1d798029e2f67b6` |
| `read.en.md` | `3243c4fafea43155a2727aea0dc62961df5b2fb3ea9d7eca2a846c7643ae83bb` |
| `read.fil.md` | `6b5739494f2594bec795fe95e5430578dbdaafc094cfc29b4842760381c60a76` |
| `slides.json` | `75ce7eaae63c1c147d7328642ec8a19ce3a3272e5363bc05359e00e653f49227` |

Before implementation verify the receipt against its pinned commit. Capture all target bytes, complete current narration selection/history, UUID lock, current shared sources/registry, all prior public media bytes and earlier approval/proposal receipts. Capture a fresh bounded read-only published lesson/revision/private-guide baseline through the loader admin; do not query learner identities/progress. The repository baseline above is not an authenticated production snapshot.

Preserve all non-target teaching, narration/history, public file bytes and approval receipts, especially released 1.6.1–1.6.4. Do not overwrite old hashed media. Scope any shared provider, speech alias, UI or registry change to this target and prove it with exact successor/predecessor hashes. If main advances, integrate once near final review and reconcile the new baseline; never loosen historical tests or fabricate approval.

## Six proposed paired teaching screens

Filipino first in everyday language, with full equivalent English. Each screen has a relevant action illustration, complete Read body and equivalent Slides narration; slide summaries may be shorter. Retain all original substantive anchors/concepts and add only the named new anchors. Each lesson must work independently.

| Screen | Teaching action | Visual/task direction |
|---|---|---|
| whys | Carole asks evidence-seeking whys across more than one branch; five is a tool name, not a quota or proof. | Branching map with each arrow attributed and marked reported/verified/to check. |
| manual-example | Keep the manual diarrhoea example and separate it from new fictional missed-visit dialogue. | Respectful systems diagram for water/access/training; no diagnostic image. |
| rosario | Preserve Rosario as a child aged one year four months; analyse environment, livelihood and service branches without blaming her mother. | Respectful historical-case diagram rather than a death scene or Carole acting as Rosario. |
| verify-branch (new) | New: choose a person/authorized record to check an unsupported arrow; show a corrected map while an alternate explanation stays open. | Before/after cause map with one tested branch and one honest unknown. |
| practice | Create two plausible branches with a verification step for each; observer flags unsupported arrows; revise and retry. | Printable cause cards, evidence-status tokens and branch verification aid. |
| check | Retain the three choices and correct index 1; show all rationales after selection and an evidence-qualified map. | Carole discussing the corrected map with affected people. |

The story ends with **Two evidence-qualified branches and proportionate verification steps, not a single blamed person.** New dialogue is an authoring adaptation, not a DOH quotation. Show residents' perspectives, correction and uncertainty honestly. Labels such as lazy, uncooperative or noncompliant cannot replace evidence. Never infer agreement/motive from silence, a nod or facial expression. Use fictional classroom facts and no filled real patient records.

Present the check illustration before choices. After selection explain all three original options, show the corrected ending and unlock takeaway/summary audio. Do not replace the original decision with a fact-recall quiz. Optional story viewing or clicking a quiz is not direct competency assessment.

## Source audit and lesson boundaries

Audit original PDFs, not only transcriptions: [Facilitator Guide](source-material/day1-basic-competencies/facilitator-guide.md), PDF 29 / topic table at PDF 19; [Reference Manual](source-material/day1-basic-competencies/bhw-reference-manual.md), PDF 19–21; [teaching deck](source-material/day1-basic-competencies/day1-part1-presentation.md), slides 59–66. Follow the [source inventory](source-material/day1-basic-competencies/README.md) for original links. Confirm PDF versus printed pagination, retain hashes/page excerpts, and cite only inspected passages. Check the original TESDA competency mapping before claiming a specific unit or training-hour requirement; distinguish the source's three-hour topic allocation from the new run sheet.

For 1.7.2 consult [ZFF Rosario source](source-material/day1-basic-competencies/kwento-ni-rosario.md), printed pp. 48–51, and obtain/inspect the original workbook. Rosario is a child aged one year and four months, not a mother. Keep diarrhoea/measles historical case analysis separate from the missed-visit adaptation; no medication, hydration, diagnosis or treatment instructions from historical narrative. Other lessons can refer briefly to determinants but must not duplicate the entire source exercise.

Definition belongs to 1.7.1; branching and verifying causes to 1.7.2; transparent scoring/ties to 1.7.3; partner-agreed trial and review to 1.7.4. Do not let one branch silently supply findings for another. A score is a planning aid, not a clinical triage algorithm or local prevalence estimate; higher feasibility means more achievable. Preserve example totals 19/17/16 and mark them as deck/fictional examples. Never postpone immediate care for a score or manufacture an authority-approved schedule, funding, partner commitment or outcome.

Local access, privacy, referral and planning procedures need actual authorized-source/SME review before asserting local rules. Use only necessary attributed information; do not promise absolute secrecy or a universal record-deletion procedure.

## Facilitated practice, rubric and printables

Keep 50 minutes within the same 180-minute program. Proposed run sheet: **6 opening + 10 demonstration/source-case discussion + 18 group attempts/feedback/retry + 10 debrief + 6 transfer = 50.** Clearly separate short self-study estimates, narration duration, optional story and guided practice. Measure new audio before displaying a study estimate.

For a group of 30 use ten triads with rotating BHW/resident-or-partner/observer roles, or a justified equivalent fitting the allocation. Specify actual attempt/feedback/retry times and direct-observation sampling. Unseen attempts are “not observed,” not passed. Give a solo paper equivalent, scaffold a weaker attempt, and let the learner retry. Match the single objective_index 0 indicator and all six bilingual levels to the observable product/action, not attendance or a meeting count.

Retain private bilingual guides with exactly these twelve headings, in order: `purpose`, `time-materials`, `prepare`, `opening`, `steps`, `expected-answers`, `misconception`, `practice`, `answer-key`, `observe`, `support`, `sources-review`. Include exact demo/debrief prompts, expected responses, all check rationales, common errors, sampling, retries and pending policy review.

Supply bilingual A4 printables: **Cause/evidence cards, resident/staff/BHW roles, observer checklist and two-branch verification map.** Include sufficient fictional facts and honest unknowns to run practice without improvising findings. Verify page count, legibility, no clipped content and an actual one-page task aid.

## Carole illustrations, actual narration and optional story

Use [the committed Carole reference](lesson-17-carole-continuity.md) and [provenance](lesson-17-carole-reference.json). Inspect it before editing/generating. Preserve face/hair/outfit across distinct teaching actions; do not substitute generic women, use Gibs/Liza art for Carole, or put her face on Rosario. Original photo bytes are not claimed to be archived; the pinned derived reference is available in every branch. New art remains draft; the request for handoffs is not approval of finished lesson scenes.

Generate all final paired Read/Slides narration with Gemini Kore in both languages. Use a stable female narrator; preserve displayed **Carole**. Review actual name pronunciation before adding any target-only speech alias. Retain every old file/selection and full history; old published text must continue selecting its old narration until new revision publication. Do not globally change a narrator or voice style.

Build the optional six-beat Filipino and English story with a real corrected ending, H.264/AAC 854×480, measured encoded-audio beat boundaries, six matching WebVTT cues, adequate ending/post-roll and posters from actual final encoded frames. Append `ProblemCausesStoryFil` and `ProblemCausesStoryEn`; baseline 82 → 84 only if no sibling compositions have since merged. Verify the entire eventual registry, exact IDs/source/order and all actual render logs.

For the six-screen proposal retain 12 actual Read MP3 reviews plus two decoded shipped AAC story reviews, and four focused excerpts per recording (14 full / 56 focused): name, dialogue/meaning, negation/qualification and ending. Keep exact audio/excerpt hashes, prompt revision, raw requests/responses, failed/superseded attempts and reported disagreements. Cache only identical reviewed bytes or proven identical decoded PCM. Model reports do not establish human listening, owner approval or SME signoff; report unresolved concerns truthfully.

## Complete draft review and later controlled release

Use the working lesson-164 review/media/browser/package scripts as examples, with new target-specific paths and receipts; do not overwrite prior lesson evidence. Build a self-contained `lesson-1.7.2-carole-review.html` from actual production components with explicit save/auth fixtures. Embed all relevant image/audio/video/poster/caption bytes; label it offline review. Include bilingual private guides/rubric, A4 printables, source-page excerpts/hashes, full/focused/raw media provenance and browser evidence in the ZIP, with an external integrity receipt.

Verify Fil/En × Read/Slides × desktop/390px mobile for every screen; illustrations before checks; all three rationales/endings; gated takeaway audio; actual zone highlighting; original anchor/concept meaning; optional story completion; unmuted ending/captions; fullscreen, single-player exclusivity, language/mode cleanup, overflow and console errors. Report actual case counts/screenshots, not an assumed 80. Verify current/old narration mapping, all protected source/history/UUID/public bytes, complete manifests, one indicator, guide order and exact inline media.

Use disposable local Supabase for development/E2E. Freeze final source, pass normal CI and the entire current Remotion registry at that exact head, then package. Validate ZIP unique safe member paths, CRC, every size/SHA-256 and inline-media matches. Keep downloadable artifacts below 512 MiB; split/hash-pin raw evidence if necessary. Label human listening, owner review and local-policy SME status accurately. Update this individual PR around the final implementation, attach its package, and stop with a complete reviewable draft.

After separate explicit approval of this exact lesson package, use the established target-only loader: `--mode lessons --modules 07-problema --lesson-keys problem-causes`. Dry-run, verify the production commit and selected media, publish only this lesson, and compare bounded before/after revision/private-guide and neighboring lesson records. Preserve UUIDs, other published pointers, learner progress, assessments and flags. Do not replay the 1.6 multi-lesson release. The existing loader-admin password-change gate blocked the prior production UI smoke; respect it and use authorized fixtures for later checks, without account mutation or fabricated browser verification.
