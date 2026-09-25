# Modules 1.6–1.9: first authoring pass and review record

25 September 2026. **Draft content; no pilot or E2E database writes.**

## Current-main and deployment check

At the beginning of this work, GitHub main was `6c5e05ab16c0290072c6c67e6ed8ad56436b76b3`, the merge of PR #102. Its first parent is PR #103's merge, `1e73081d223e45bf8ef30c8189e577f16d02db32`. Thus #103 is included and the handoff's older main status was superseded. Main was checked again before packaging.

- [Current-main Vercel deployment](https://vercel.com/jongsky25s-projects/bhw-connect-phase-2/7G8vrukggboaBRgt37HRZUw5t9Gh): GitHub `Vercel` status `success`.
- [PR #103 merge deployment](https://vercel.com/jongsky25s-projects/bhw-connect-phase-2/3XUfvxWDQSNFysNzVpwJeRrTMzbw): GitHub `Vercel` status `success`.
- [Production site](https://bhw-connect-phase-2.vercel.app): HTTP 200, HTML response, checked using Node fetch. The production alias-to-commit binding was not independently inspected in Vercel. A successful commit status plus a reachable alias is not an authenticated end-to-end release test.
- The signed-in learner journey, staff progress views, historical certified learner check, actual screen reader and mobile audio checks from the handoff remain open. This task followed the user's priority to begin 1.6–1.9 authoring; it does not claim those checks passed.

## What is drafted

The package lives at `content/training/day1-basic-competencies/drafts/`. All 16 lessons use the existing loader contract and preserve the legacy coverage IDs. Read keeps the useful source scenarios while adding standalone context and practice. Slides have independently written text. New formative checks have three choices and explain the alternatives. Correct answer positions across the 16 checks are 6 / 5 / 5.

| Subchapter | Draft lesson keys, in order | Concepts | Proposed facilitated minutes |
|---|---|---:|---:|
| 1.6 | communication-listen; communication-clarify; communication-explain; communication-record; communication-handoff | 11 | 90 + 90 + 120 + 90 + 90 = 480 |
| 1.7 | problem-define; problem-causes; problem-prioritize; problem-action-plan | 8 | 35 + 50 + 45 + 50 = 180 |
| 1.8 | safety-identify; safety-controls; safety-prepare; safety-demonstrate | 11 | 45 + 60 + 60 + 75 = 240 |
| 1.9 | resources-audit; resources-safe-change; resources-monitor | 8 | 60 + 60 + 60 = 180 |

The time splits are author proposals, not validated lesson durations or a new training-hour rule. They preserve the Facilitator Guide PDF 19 subchapter totals of 8, 3, 4 and 3 hours. Facilitated practice includes observation and retries; clicking through a short lesson does not satisfy those hours. A detailed session schedule and sampling plan still need facilitator review.

Every lesson supplies a concrete practice, solo alternative, next-work-use step and task-specific observable. Private guides include the fixed twelve sections, answer rationale, preparation and a three-level rating. Peer feedback is distinguished from staff observation. Physical OSH performance still requires a qualified trainer using locally approved procedures and dummy equipment.

## Source checks and boundaries

Source inputs were fetched from the pinned main commit rather than trusting the old local snapshot. The four modules' coverage, metadata and bilingual legacy lesson files were used; unrelated local 1.2–1.5 work was not reused. Directly checked the repository's DOH Facilitator Guide PDF-page transcriptions 19, 22 and 28–30, relevant Reference Manual pages, and the implementation plan's earlier original-PDF visual verification. This run did not re-inspect those original DOH page images.

- Communication retains gathering, assessment, recording and presentation, plus profiling, family planning, distress, smoking and access barriers. [AHRQ teach-back guidance](https://www.ahrq.gov/health-literacy/improve/precautions/tool5.html) supports asking for the person's own explanation and repairing unclear communication. It is an instructional addition, not attributed to a verbatim manual passage.
- Problem-solving retains the Four-Criteria/1–5 method and the existing 19/17/16 teaching example. Scores are explicitly not local data. The historical Rosario case is a separate ZFF source, identified in lesson source metadata. Its medicines are not treatment instructions. The source's ambiguous Five Whys graphic still needs a faithful visual adaptation.
- Safety retains all five manual hazard groups, including stress and work-related accidents. [CDC occupational blood-exposure guidance](https://www.cdc.gov/dental-infection-control/hcp/dental-ipc-faqs/occupational-exposure.html) supports washing, reporting and immediate qualified evaluation after a needlestick. [WHO occupational infections guidance](https://www.who.int/tools/occupational-hazards-in-health-sector/occupational-infections) is linked for infection controls. No drug regimen or new clinical certification requirement is introduced.
- Sustainability keeps safe services as a condition of savings, consistent with [WHO facility guidance](https://www.who.int/teams/environment-climate-change-and-health/climate-change-and-health/country-support/climate-resilient-and-environmentally-sustainable-health-care-facilities). Clinical single-use items are not made reusable; cold-chain equipment, hand hygiene and urgent referrals are protected.

### Initial direct TESDA crosswalk for 1.9

Checked [TESDA BHS NC II Revision 01](https://tesda.gov.ph/Downloadables/Barangay%20Health%20Services%20NC%20II.pdf), unit 400311217, PDF pages 33–35 (printed 29–31). This is a draft mapping, not an assessor endorsement.

| Criteria | Draft evidence |
|---|---|
| 1.1–1.3: measure, record and compare resource use | resources-audit audit card; resources-monitor 20/100 versus 5/100 example and workload comparison |
| 2.1–2.3: investigate and validate causes | resources-safe-change worked example checks printouts, the approved master, staff explanation and local procedure |
| 3.1–3.3: report, discuss and clarify feedback | resources-monitor proposal, colleague's no-internet concern, controlled paper master and review conversation |

Workplace procedures and actual observed performance remain to be supplied and assessed locally. The ninth subchapter is an instructional expansion of the competency, not a claim that the manual prints a standalone sustainability chapter. Full criterion-level mapping for 1.6–1.8 remains future review work.

## Verification

- `node scripts/training-validate-drafts.mjs`: passes for 16 lessons, 81 Read sections, 81 slides, 16 three-option checks and all 38 non-excluded legacy concepts. Read and Slides both map each concept; Filipino/English section order, private notes and indicators validate. Each lesson has 4–7 slides and a distinct objective and observable.
- Frozen module/coverage metadata matches the four current module definitions. Facilitated-time sums match 480/180/240/180 minutes. The command performs zero database writes.
- Refreshed the two focused test files from current main, then ran `node node_modules/vitest/vitest.mjs run scripts/tests/reference-content.test.mjs scripts/tests/reference-navigation.test.mjs`: 36 tests passed across two files. Focused ESLint on `scripts/training-validate-drafts.mjs` passed. No production build or shared-database E2E was run for this authoring-only draft.
- No application implementation, database schema, RPC, assessment bank, legacy questions, module/course IDs, project locks, existing completion or Chapter I certificate scope was changed. Chapters II–III remain unavailable. No claim is made that draft content passed production rendering, screen-reader, mobile audio or authenticated integration testing.

## Next authoring and release work

1. Review 1.6's full Read/Slides/practice/indicator set with a facilitator and Filipino-language reviewer; apply the decisions across the remaining drafts. Review clinical boundaries and local pathways in 1.8 with the appropriate clinical trainer. Record actual names, dates and findings rather than implying review occurred.
2. Add lesson-specific visuals. Proposed briefs: listening contrast, open-question rewrite, teach-back dialogue, three-column evidence record, secure handoff; problem statement, branched causes, progressive scoring matrix, action-plan card; hazard scene, five hazard/control pairs, departure checklist, safe dummy demonstration; resource audit, safe/unsafe option comparison, normalized tracker. These are briefs only. No placeholder is marked approved.
3. Expand formative practice where a lesson carries several skills; the first pass has one check per lesson, not the proposed standard's one-per-2–3-section density. Feedback explains choices in the existing shared-feedback field; the app has no per-option feedback schema here. No schema change is proposed in this draft.
4. Produce the printable cards/job aids and trainer checklist, validate timing with a real group, and refine the task-specific rating levels. The in-lesson practice text is not a finished printable kit or a complete observation instrument.
5. After text and visuals stabilize, generate matching bilingual narration and perform listening, mobile and accessibility review. Use the actual ReferenceLessons renderer for preview. Verify the inherited source page references against the original DOH documents.
6. Recheck main and reconcile frozen metadata immediately before moving approved lessons to the production authoring path. Stage complete subchapters through the existing loader, review the immutable revisions, then publish only through the established reviewed release process. Rerun the outstanding authenticated learner/staff/historical-completion checks before claiming release verification.

The proposed Capacity-Building Content Standard informed practical choices but was not adopted as a new mandatory workflow or certification rule in this task. This first pass is intentionally a reviewable authoring package, not a release declaration.
