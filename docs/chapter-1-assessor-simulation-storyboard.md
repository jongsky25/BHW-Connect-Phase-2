# C1AF-06a — Maria storyboard for owner review

**Released and owner-approved:** PR #291 was merged/deployed on 12 October 2026.
Continue with the [C1AF-06b next-chat handoff](chapter-1-assessor-simulation-runner-next-chat.md).
The draft review language below records the original authoring state; storyboard
approval does not approve the remaining rubric, sufficiency or award decisions.

Based on current main `a951b012` (PR #289), using the next-chat handoff from
[open PR #290](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/290).
This implementation does not merge or depend on that documentation branch.

## Inspect the concrete storyboard

Run `node scripts/assessor-simulation-storyboard.mjs` and open
`http://127.0.0.1:4176`. The server binds to loopback and does not load environment
files. It mounts the actual React storyboard in a standalone Vite fixture, outside
Next routes, authentication, rollout controls and real learner records. No new
dependencies or package-script changes are needed after the usual `npm ci`.

Choose English or Filipino. Work through eleven scenes, then the debrief. You can
jump between scenes for owner review, but navigation does not satisfy checkpoints.
Correct choices unlock Next; hints and retries are unlimited and unpenalized.
Earlier decisions remain in the debrief, including corrected mistakes. Guide/view
state, the private editable note and choices survive scene/language navigation only.
Reload discards everything. There is deliberately no pause/resume persistence,
actor identity, server receipt, notification, real certificate or production route.

The local checklist is **not** trusted simulation completion. Plan §5.4's scene 12
(debrief) appears below the eleven story scenes; its server completion and real
candidate next-step resolution belong to C1AF-06b. Review navigation is deliberately
permissive; the future runner must enforce actor-bound ordered completion on the
server, not reuse the browser checklist as authority.

## Scenario and checkpoint contract

Source: `src/lib/assessor/simulation-storyboard.ts`.
Scenario ID: `chapter-1-maria-communication-storyboard`; version `0.1.0-draft`;
chapter `chapter-1`; planned lesson `1.6.2`. Every checkpoint has a stable ID,
version `1`, `essential: true`, workflow adapter name, bilingual evidence,
question, hint, structured choices and per-choice explanations. Choice IDs are
scoped to their checkpoint. Scenario and mapping approval are explicitly absent.
Changes to essential decisions/source evidence require a reviewed scenario version;
these draft identifiers are not inserted into the live requirements registry.

| Checkpoint ID | Essential local decision/action | Planned platform adapter / parity work |
| --- | --- | --- |
| `find-maria` | Select fictional Maria, 1.6.2 and explicit draft 1.6 mapping | Chapter workspace/roster; C1AF-10 |
| `prepare` | Open guide, switch to Maria's card, return; choose objective/materials/support | Compact guide and BHW view; C1AF-11 |
| `brief` | Explain supported practice and the clarification objective | Activity selection and facilitation; C1AF-11/12 |
| `observe` | Select all three witnessed facts including the prompt; enter note; choose prompted anchor | Evidence-before-rating observation; C1AF-13 |
| `feedback` | Choose private strength/gap/next-step preview, separate from observer notes | Learner feedback; C1AF-13/15 |
| `missing` | Interrupted P2: insufficient evidence, null rating, another observation | Evidence states and follow-up; C1AF-13/15 |
| `readiness` | Resolve Maria's unfinished lesson; distinguish Alex's authority | Readiness and permission; C1AF-16 |
| `arrange` | Confirm supplied arrangement and explain distinct F1 formal task | Claim, arrangement and explicit start; C1AF-17/18 |
| `formal` | Independent lesson evidence; retain P1/P2; review supplementary F2–F4 separately | Formal submission; C1AF-18 |
| `chapter-gap` | Identify missing 1.9 and arrange its evidence; no chapter award | Chapter review; C1AF-19 |
| `final-review` | Inspect separately labelled complete fixture; SAMPLE only | Chapter decision/certificate preview; C1AF-19 |

All screen adapters are explicitly fictional. C1AF-20b compares their fields,
labels, evidence states, privacy, prerequisites and outcomes with the delivered
working flow; see [the parity handoff](chapter-1-assessor-c1af-20b-implementation-handoff.md).
The real server still rechecks changed authority between opening and saving.
No simulation choice calls a production mutation or changes fixture eligibility
outside the supplied narrative. The updated eligible state and complete chapter
record are explicit author-supplied assumptions, never automatic upgrades.

## Rubric provenance and unresolved approval

The displayed observable and all three anchors come directly from the existing
`communication-clarify/competency.json`, not the legacy module indicator or the
draft registry. Its LF-normalized SHA-256 is
`c23f71dd46321eaaee92ea305d37661ed62760ce6cacddad8098b7b9fb095c56`.
The contract test detects a source change; review the changed source/scenario
rather than silently repinning it. No protected source or historical hash changes.

Preparation and the fictional dialogue adapt the same lesson's English/Filipino
facilitator guides, especially `purpose`, `prepare`, `practice`, `observe` and
`support`. These are authored adaptations, not DOH quotations. P1 demonstrates the
whole sequence after a neutral-clarification prompt; the source needs-practice
anchor applies. P2 is interrupted before clarification and receives no grade.
F1 is a new unprompted clarification/correction/confirmation sequence; only the
lesson judgment follows. F2–F4 illustrate additional listening, record and handoff
evidence without defining a new sufficiency threshold or approving a crosswalk.

The editable note checks only presence after selecting supplied facts. It does not
semantically grade prose. A model note is available for comparison. Private working
notes remain separate from the selected learner-facing message; no message sends.

As documented in the [mapping audit](chapter-1-assessor-mapping-audit.md), local
indicator 0 is not legacy module indicator 0. Canonical criterion identity/version,
lesson/component mapping, component sufficiency, evidence reuse, scenario/checkpoint
acceptance and issuer/signatory still need owner/appropriate rubric review. The
complete SAMPLE assumes accepted chapter evidence only to demonstrate final review;
it cannot resolve those blockers. No invented clinical standard or pass threshold.

## Preserved behavior and next boundaries

All changes are additive. Existing six orientation lessons, eight cases, seven
correct ratings plus mandatory safety correctness, study/exam passes, qualification
IDs and lifecycle states are unchanged. The Alex/Rosa walkthrough, opening tour,
scoring calibration and this storyboard remain distinct activities. The draft
registry stays out of this bundle; only the needed lesson rubric is imported.

Revised writes, awards and authority cutover remain disabled and unchanged. No
migrations, database calls, flag changes, production users or live pilot testing.
Chapter 3 remains unavailable. Overall certification requires three compatible
distinct chapter awards, not another exam. The SAMPLE is a fictional **BHW**
Chapter 1 layout, not Alex's staff award; it has no verification identity or QR.

C1AF-06b owns the isolated persistent runner, ordered server validation, actor-bound
receipt, recovery and real candidate next action. C1AF-07 owns revised issuance.
Rollback removes these new files only; there is no data rollback or award reset.

## Owner review checklist

- Inspect both languages and the facilitation/assessment separation.
- In scene 4 choose the independent rating first; inspect the prompt explanation,
  correct it and confirm the debrief retains the mistake.
- In scene 6 try a failed grade, then choose insufficient evidence with no grade.
- In scene 7 try starting despite the blocker, then choose the missing lesson step.
- Inspect the missing 1.9 record and the separately labelled complete SAMPLE.
- Review the eleven essential decisions and draft mapping/sufficiency limitations.

The concrete story and checklist are ready for content review after verification;
content approval is not inferred from implementation or test success. Approval of
this draft story alone must not be treated as formal rubric approval or permission
to enable writes/awards/cutover.

## Verification

Reproducible browser check: `node scripts/assessor-simulation-browser-check.mjs`.
It exercises both languages at 390/1024px in light/dark themes, keyboard activation,
guided success, incorrect rating, missing evidence, blocker and correction/retry;
checks axe, overflow, console errors, no nonlocal/write requests, empty browser
storage and reset on reload. Screenshots are written to
`/tmp/assessor-simulation-review/`. This is isolated UI verification, not an
authenticated full-stack assessment or proof of interpersonal competence.

Final verification results are recorded in the PR description. PR #289's six
preservation/narration failures and its release exception are not waived for this
PR. Do not weaken or repin tests, regenerate narration or merge/deploy without
reviewing this PR's actual checks and unresolved content decisions.
