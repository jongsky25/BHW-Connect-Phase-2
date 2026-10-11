# C1AF-02 — Chapter 1 criteria and evidence mapping audit

Date: 10 October 2026. Source baseline: `a1a54d75`.
Prerequisite: [C1AF-01 contract](chapter-1-assessor-flow-contract.md).
Status: read-only audit and draft crosswalk complete; no mapping approved for live assessment.

## 1. Deliverables and reproduction

- [Draft crosswalk proposals](chapter-1-assessor-map-proposals.json): explicit evidence links for all 42 lessons, with subchapter-specific review notes. Every link means “supports partial component evidence,” not interchangeable rating anchors.
- [Machine-readable audit](chapter-1-assessor-audit.json): complete bilingual objectives/criteria/anchors, source references, guide structure/word counts, legacy targets, activity mappings, calibration coverage and 216 LF-normalized source fingerprints.
- `scripts/lib/chapter1-assessor-audit.mjs`: deterministic local auditor with no network, database, application imports or source writes.
- `scripts/chapter1-assessor-audit.mjs`: stdout-only CLI. The caller chooses whether to save a report.
- `scripts/tests/chapter1-assessor-audit.test.mjs`: checks draft-only behavior, reference/identity errors, missing translation, coverage, drift and local-index isolation.

Commands:

```sh
node scripts/chapter1-assessor-audit.mjs --summary
node scripts/chapter1-assessor-audit.mjs > docs/chapter-1-assessor-audit.json
npm run assessor:check
npx vitest run scripts/tests/chapter1-assessor-audit.test.mjs scripts/tests/assessor-curriculum.test.mjs
```

The saved report is an authored-file snapshot, not a database publication report. Fingerprints identify the inspected bytes; they do not update reviewed curriculum hashes. Run the existing `assessor:check` separately to validate those pinned sources. The new auditor cannot mark a proposal approved or return `ready_for_activation: true`.

## 2. Inventory

| Subchapter | Required lessons / proposed lesson criteria | Legacy module indicators | Activity cards | Calibration cases |
| --- | --- | --- | --- | --- |
| 1.1 BHW roles | 6 | 4 | 1 | 5 |
| 1.2 UHC | 4 | 4 | 1 | 0 |
| 1.3 BHS policies | 5 | 4 | 1 | 0 |
| 1.4 RA 7883 | 5 | 4 | 2 | 0 |
| 1.5 BHW and barangay | 6 | 4 | 6 | 0 |
| 1.6 Communication | 5 | 4 | 6 | 1 |
| 1.7 Problems | 4 | 4 | 2 | 1 |
| 1.8 Occupational safety | 4 | 4 | 5 | 1 |
| 1.9 Sustainable practices | 3 | 4 | 3 | 0 |
| **Total** | **42** | **36** | **27** | **8** |

There are 84 lesson-guide language files, all with the expected twelve sections, plus 18 subchapter-guide language files. Each current lesson rubric has one local indicator. Combined behaviors inside that indicator do not become separately recorded criteria merely because they are numbered in prose.

None of the proposed lesson-to-module relations has identical complete bilingual observable/not-yet/three-level wording. This is an exact-text comparison, not a finding that all 42 lessons are wrong or that all differences are material. It establishes that the old module anchors cannot be substituted automatically. Semantic equivalence, partial coverage and substantive changes need explicit review.

## 3. Priority finding: Lesson 1.6.2 and the simulation

Source: `modules/06-komunikasyon/lessons/communication-clarify/{lesson,competency}.json` and both facilitator guides.

- Lesson objective: open question, clarify a detail and confirm a summary without leading the answer.
- Lesson criterion: an open invitation, one relevant neutral clarification, room for answer/correction, and confirmation of the corrected summary.
- Local indicator index: **0**.
- Legacy module indicator 0: permission, open question and allowing the person to finish. It does not specify the full correction/confirmation sequence.
- Proposed relation: the clarification task contributes evidence to the listening component; it does not automatically satisfy the whole component or replace its anchor.

The simulation can rehearse this precise task using the existing lesson guidance. Its canonical assessment criterion and component sufficiency remain draft until the crosswalk is accepted. If the refined criterion is separately required, introduce an explicit versioned requirement rather than silently expanding legacy indicator 0.

Another clear numerical trap: `communication-record` also has local indicator 0, but its proposed targets are legacy module indicators **2 and 3** (legacy objective indices 1 and 2). A join on local objective 0 would record its information-source/reporting evidence as listening evidence.

## 4. Priority finding: Lesson 1.3 refusal

Sources: `modules/03-polisiya-bhs/lessons/bhs-decline/competency.json`, `facilitator.en.md`, and `modules/03-polisiya-bhs/competency.json`.

| Detail | Lesson guidance/rubric | Legacy module rubric | Consequence |
| --- | --- | --- | --- |
| Local identity | Lesson objective 0, one combined criterion | Refusal is module objective 2 / legacy indicator 3 | Recording against numeric 0 would select policy recall. |
| Required actions | Explicit respectful refusal; matched policy reason/firm boundary; factual supervisor handover | Acknowledgment, policy basis and an alternative way to cooperate | These are different evidence bundles. |
| Pressure response | No workaround or promised exception | Forgetting an alternative lowers the rating | Clarify safe permitted alternatives; do not reward a prohibited workaround. |
| Recording instruction | “Score the three indicators separately” | Lesson stores one combined criterion | Decide whether three subcriteria or one combined decision is intended, then update the recording contract explicitly. |
| Knowledge emphasis | Lesson says law-number recall is not the scoring criterion | Policy-recognition module anchor requires naming four policies without materials | Do not impose recall on the refusal task or discard an independently reviewed knowledge requirement silently. |

Recommended resolution for review: retain the applied refusal behavior, accurate policy basis, firmness and factual handover as the lesson's evidence. Adopt a reviewed component rubric that names how those actions contribute to the policy/refusal outcome. If separately scoring the three actions, assign distinct stable subcriterion IDs and define how they combine; until then treat the one stored criterion as one combined draft observation requirement. No clinical/legal anchor was edited by this audit.

## 5. Remaining subchapter review queue

| Subchapter | Explicit issue to resolve before formal criterion approval |
| --- | --- |
| 1.1 | A demonstration of one role cannot satisfy “all three roles.” Record matching/handoff evidence without conflating it with broad role recall. |
| 1.2 | Coverage and provider/referral checks contribute to the older combined goal/changes requirement. Current lesson practice does not automatically prove a comparison of actual local implementation. |
| 1.3 | See refusal conflict. Additionally, `bhs-improvement`'s observable wording contains a cue-card/model/support instruction; distinguish facilitator support from the learner behavior to be rated. |
| 1.4 | Legacy anchors include actual personal accreditation/standing and recall without materials; current lessons use fictional bounded scenarios and permit verification/reference support. Decide what evidence is appropriate without requiring private disclosures or treating a demonstration as legal eligibility. |
| 1.5 | Separate contact choice, additional local roles, teamwork and self-management. The current SMART-goal task does not automatically supply every older weekly-plan requirement. |
| 1.6 | The clarification/corrected-summary sequence is more specific than broad listening. Writing/source attribution and handoff can contribute to multiple criteria; do not double-count one partial performance as complete coverage. |
| 1.7 | Newer lesson criteria specify verification, calculations, agreement and a complete plan/review. Explicitly decide which refinements are required versus explanatory rather than imposing them through a hidden mapping. |
| 1.8 | Selection of controls on cards is not a physical return demonstration. Link evidence to local approved demonstration checklists and reporting/pause authority; current clinical criteria remain subject to their stated review. |
| 1.9 | Three lesson tasks feed four legacy objectives. Verify baseline, safe savings, agreed routine, workload and quality coverage; no single saving suggestion establishes the whole component. |

Every review proposal names a source lesson and a finite set of legacy targets. These are hypotheses for the reviewer, not semantic approvals. Some lessons may require new criteria, several evidence tasks, or a changed component rule rather than an equivalence link.

## 6. Activities and scoring orientation

Activity mappings are checked for existing lesson keys and legacy indicator references. Empty lesson-key lists remain explicit: the audit does not assign cards to a lesson by title or infer that participation proves every broadly mapped indicator. The actual repository now contains 27 cards across all nine subchapters; an earlier document's 24-card/eight-subchapter inventory is historical.

Scoring calibration contains eight cases: five in 1.1 and one each in 1.6, 1.7 and 1.8. Five subchapters have no calibration case. All case references resolve to existing legacy indicators, but this does not establish full coverage or that the refined lesson criteria are calibrated. Coverage review must retain the existing threshold until a separately reviewed case/rule version is adopted.

The new platform simulation is a workflow exercise. It may use supplied evidence to rehearse missing-observation handling and final chapter review, but it must not compensate for an unreviewed formal rubric or claim to test all 42 lesson skills.

## 7. Activation and historical-evidence boundaries

The draft crosswalk blocks activation of automatic lesson/component rating translation. It does not prevent the planned opening briefing, isolated navigation practice, draft state contracts or a default-off UI from being built.

For each relation accepted in C1AF-03, record the source fingerprints, approving decision, canonical criterion identity/version, required evidence and explicit historical-evidence policy. Never relabel a legacy observation as refined criterion evidence solely because its `objective_index` matches. Preserve original snapshot and rating; any reuse must follow the reviewed evidence contract.

Do not change `curriculum_status` from draft or rehash the pinned module rubrics to pass the old auditor. Publication and versioned rule activation are later steps. Review only the material mapping conflicts and requirements; existing approved learner media/text need not be reopened merely because a draft crosswalk exists.

## 8. C1AF-03 handoff

1. Consume the saved report and explicit proposals as **unreviewed** data.
2. Implement a shared catalog for Chapters 1–3 and pure preparation/evidence/certification/permission states from C1AF-01. Keep publication, eligibility, award validity and actor authority distinct.
3. Keep unresolved criteria unavailable for formal assessment; draft data cannot grant certification authority.
4. Introduce canonical criterion IDs and versions after concrete mapping decisions. Keep local lesson indices as source metadata only.
5. Complete C1AF-03b default-off controls before enabling any later executable revised-flow feature.
6. Use named conflict fixtures above for registry/state tests, then proceed to briefing UI. No production data load or historical-rating conversion belongs in C1AF-03.

This audit changes local scripts and review artifacts only; no application behavior, lesson body, pinned curriculum source or database is modified.

## 9. Local verification record

| Check | Result |
| --- | --- |
| `npm run lint` | Pass, with three existing unused-variable warnings outside the new auditor. |
| `npm run typecheck` | Pass. |
| Focused assessor tests | 31 tests passed across the new auditor and existing assessor-curriculum suite. |
| Focused rerun including lesson 1.5.2 preservation | 43 tests passed across three files after removing the package-script shortcut; `package.json` remains unchanged. |
| New audit CLI and existing `assessor:check` | Pass; both retain explicit activation blockers. |
| Saved report reproducibility | Deep equality against a fresh in-memory audit passed. |
| Document links and whitespace | Pass; local links resolve and no new-file trailing whitespace was found. |
| `npm run test` | Not passed. Reported failures in older lesson/media/process checks, then stopped making progress with a remaining worker; interrupted after approximately five minutes (exit 130). No full-suite success is claimed. |
| Targeted investigation of three broader failures | 24 tests passed / 3 failed: lesson-144 Git child process throws `spawnSync git EPERM`; reference-narration reports twelve stale `problem-prioritize` language entries; Gabay matcher expects a local-only loader error but receives empty stderr. These tests and their application/content inputs are unchanged. |

The initial broad run also listed failures in lesson-145, lesson-162, lesson-165-integration, lesson-172, lesson-173, lesson-181-release and lesson-182-release; their individual causes were not fully diagnosed in this increment. The lesson-152 protection failure caused by the proposed `package.json` shortcut was corrected by removing that change, and its complete twelve-test file passed on rerun. Do not weaken preservation checks or regenerate narration/media as part of this flow audit. Address broader repository verification separately before merge; CI and build were not run, and no UI or database behavior was introduced.

Working-tree boundary: only the new assessor audit scripts/tests and review documents remain. No tracked application, package, curriculum, media, database or publication file is modified. Rollback is removal of these additive local files; there is no runtime or data rollback.

Next bounded task: C1AF-03 draft catalog and pure state contracts. Implement its unavailable/draft states now, while keeping all semantic approvals and live-authority decisions explicit. Follow with C1AF-03b controls before connecting later executable revised-flow features.
