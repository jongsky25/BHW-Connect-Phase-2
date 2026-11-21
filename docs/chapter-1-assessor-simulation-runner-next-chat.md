# Next-chat handoff: C1AF-06b simulation runner and receipt

Prepared 12 October 2026 after PR #291 was approved, merged and deployed.
This handoff is documentation only; it does not implement the runner.

## Starting prompt

> Continue from PR #291 and
> `docs/chapter-1-assessor-simulation-runner-next-chat.md`. Start from current
> main and implement C1AF-06b in a small PR: turn the approved bilingual fictional
> Maria storyboard into an isolated candidate preparation runner with pause/resume,
> ordered server-validated checkpoints, hints/retries, debrief and an actor-bound
> completion receipt. Preserve existing passes, scoring rules and qualifications.
> Keep real learner writes, revised awards and authority cutover disabled. Do not
> treat storyboard approval as approval of draft criterion mappings or component
> sufficiency. Keep issuance in C1AF-07. Verify with local fixtures/local Supabase,
> never the live pilot, and report exact-head checks and unresolved blockers.

If this handoff PR is still open, read this file from its branch, but base the
implementation on current main. Do not silently merge the handoff PR, stack on a
stale release branch, or repeat the completed storyboard increment.

## Released state and approval scope

- [PR #291](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/291) delivered
  eleven English/Filipino Maria scenes and a separate debrief, versioned draft
  checkpoint metadata, supplied evidence, source lesson anchors, hints/retries,
  a private editable note, retained corrections and a SAMPLE chapter record.
- Tested head: `987b5f8cb2d46c463efacd856393cc61a5ee3b43`. Squash merge:
  `d2b637fc4cae91c7b4481f9f21a3770e2096fceb`. The merged tree matched the tested
  head. Current main was still that merge when this handoff was prepared.
- The owner explicitly said **“approved. merge and deploy”** after the storyboard
  and six known test failures were disclosed. Treat the concrete story/checklist
  as approved for continuing this work; do not ask the owner to approve the same
  unchanged storyboard again. This was not approval of canonical criterion mapping,
  component sufficiency, evidence reuse, issuer/signatory or revised award rules.
- Production [deployment](https://vercel.com/jongsky25s-projects/bhw-connect-phase-2/7U7KS1iiWFDnJB1Si1yVfRkwqe1C)
  was verified READY at the exact merge SHA, with
  `https://bhw-connect-phase-2.vercel.app` assigned. Login returned 200 with its
  form; signed-out admin and assessor orientation routes redirected to login.
  No error/fatal runtime logs appeared in the checked window. Stable-account
  credentials were not configured, so no authenticated production smoke is claimed.
- The storyboard is **still a local review fixture**, not a production route or
  a saved simulation. Deployment did not expose a runner, persist a receipt, issue
  an award, change flags or apply migrations. Revised writes/awards/cutover were
  left disabled. Their last live read-only values were recorded in PR #290's
  #289 handoff; #291 did not reread or change those database controls.

## Read first and reuse

1. `CLAUDE.md` and `docs/session-handoff.md` for repository/database rules.
2. `docs/chapter-1-assessor-facilitator-flow-plan.md`, especially §5.4 and
   C1AF-06b/07/20b. The plan's twelfth scene is the debrief after eleven story scenes.
3. `docs/chapter-1-assessor-simulation-storyboard.md` for the concrete story,
   checkpoint/adapter table, provenance and remaining review gates.
4. `docs/chapter-1-assessor-flow-contract.md`,
   `docs/chapter-1-assessor-state-contracts.md` and
   `docs/chapter-1-assessor-mapping-audit.md` for identity, evidence and authority.
5. `docs/chapter-1-assessor-scoring-orientation-handoff.md` and
   `docs/chapter-1-assessor-briefing-handoff.md` for existing preparation behavior.

Implementation references:

- `src/lib/assessor/simulation-storyboard.ts` and its test: authored scenario
  `chapter-1-maria-communication-storyboard`, version `0.1.0-draft`; eleven stable
  checkpoint IDs with version 1. Current metadata still says unreviewed with null
  approval/receipt. Record the actual story approval/version transition explicitly
  when defining the runner contract; do not fabricate semantic rubric approvals.
- `src/components/elearning/assessor-simulation-storyboard.tsx` and its test:
  in-memory interaction reference. Its permissive scene navigation is for review,
  not a secure runner. React state, a correct-choice flag or a nonempty note must
  never be accepted as a trusted receipt. Source anchors are imported directly
  from the lesson, not the draft registry.
- `src/lib/assessor/flow.ts`: `PreparationEvidence.simulationReceipt` carries
  actor/program instance/program/chapter/requirements identity, scenario version,
  ordered checkpoint IDs and `serverValidated`. These are pure projections of
  trusted records, not authentication or server validation implementations.
- `src/lib/assessor/flow-registry.ts`: draft requirements and unresolved approvals.
  Keep the full audit-backed registry out of client bundles. Supply only the
  display data the runner needs; keep authoritative validation on the server.
- `src/lib/assessor/rollout.ts`, `load-rollout.ts`, `briefing.ts`,
  `load-briefing.ts`, `preparation-checklist.ts` and the assessor routes under
  `src/app/training/[programId]/assessor/[chapterKey]/`: reuse actor/cohort/access,
  prerequisite reads and versioned personal-preparation patterns. The checklist
  currently reports simulation unavailable and has no real receipt adapter.
- `scripts/assessor-simulation-storyboard.mjs` serves the reference at
  `http://127.0.0.1:4176`; `scripts/assessor-simulation-browser-check.mjs` exercises
  it without any production app/database. Both are committed and reproducible.

The optional offline HTML/screenshots from the prior session are not repository
dependencies. Regenerate local review evidence instead of requiring an old
workspace artifact or an uploaded file.

## Bounded C1AF-06b implementation

Build candidate-owned familiarization, not real BHW assessment or new issuance.
Place it after accepted study/post-test/scoring orientation and before the future
revised certification step. Candidates must not already need the certificate they
are preparing to earn. Keep completed staff able to replay without resets/upgrades.

1. Define an explicit accepted scenario/checkpoint contract from the approved
   storyboard. Retain exact lesson-source provenance and visible draft component
   limitations. Version material changes rather than silently changing receipt
   meaning. Do not approve all `FlowRequirements.approvals` to make a route work.
2. Add minimal candidate progress/attempt persistence with trusted actor identity,
   program instance, program, Chapter 1, requirements/scenario/checkpoint versions
   and ordered actions. Preserve earlier mistakes and corrected attempts. Protect
   read and write access; another candidate, BHW or Admin View-as cannot write or
   obtain a receipt as the candidate. Derive identities from the authenticated
   server context, never client-provided names, actor IDs or preview personas.
3. Validate structured actions server-side, including guide/learner-view/return
   order, selected observed facts and the required note field before rating.
   Validate note presence/limits only; do not claim semantic grading of prose.
   Hints and unlimited retries have no score penalty. Reject missing, foreign,
   stale, duplicated or out-of-order checkpoint claims and `completed=true` forgery.
4. Persist pause/resume at the first unfinished checkpoint. Preserve unsaved work
   on failed requests and support read-only recovery after an ambiguous save.
   Repeated/concurrent completion requests must return the same accepted receipt,
   not duplicate completion evidence. A replay must retain the earlier receipt.
5. Finish with the debrief, completed/remaining checkpoints, retained corrections
   and the actual candidate's next preparation state. A valid receipt is personal
   familiarization evidence only. No BHW certificate, staff award or overall award
   is created; do not expose an actionable issuance button before C1AF-07.
6. Keep eleven fictional screen adapters and the separate complete SAMPLE record
   explicit. Carry their field/action parity checklist forward to C1AF-20b. Do not
   route simulated claims, messages, observations or decisions to real learner RPCs.

Personal candidate progress persistence is distinct from official learner writes.
Review the existing candidate-progress policy and implement the necessary scoped
server checks without enabling `assessor_flow_writes`, `assessor_flow_awards` or
setting `authority_cutover_at`. If a new runner-specific control is needed, keep
production activation separate and default off. Test enabled/disabled behavior
locally. No production flag changes are authorized by this handoff.

## Boundaries that must survive

- Preserve six orientation lessons, eight cases, seven correct ratings and mandatory
  safety-case correctness. Coverage expansion is a separate reviewed version.
- Preserve study/exam/calibration passes, progress, qualification IDs and lifecycle
  states. A historical award is not a revised award; a receipt cannot restore a
  suspended/revoked qualification. Do not change the existing issuance trigger in
  this increment; C1AF-07 owns that transition.
- The opening tour, Alex/Rosa walkthrough and scoring exercise are not completion
  receipts for Maria's simulation. Practice stays separate from formal evidence.
- Missing/interrupted observation has a null grade, not `hindi_pa`. A single
  lesson performance never satisfies a whole component/chapter. F2–F4 and the
  complete chapter SAMPLE are supplied assumptions, not approved sufficiency rules.
- Separate private notes and learner-facing feedback; use fictional information
  only. Do not add a real verification identity, QR, signature or message delivery.
- Chapter 3 stays unavailable. Overall certification eventually needs three
  distinct compatible chapter awards, not an additional exam.
- Never develop or run E2E against pilot `ltzicxyefizxoqhfuuzc`. Use local Supabase
  and isolated fixtures; never seed a hosted project. Prove additive migrations
  replay locally. Read `docs/deploy-runbook.md` before any later authorized release;
  apply a reviewed migration batch once at merge time, not during development.
- This handoff authorizes no merge/deploy of the next implementation. The prior
  release instruction is not a blanket waiver of future failures or review gates.

## Verification and known baseline

At PR #291's tested head, local and
[PR CI](https://github.com/jongsky25/BHW-Connect-Phase-2/actions/runs/38199050483)
reported **1,917 passed / 6 failed** unit tests. The failed files were
`scripts/tests/lesson-152.test.mjs`, `lesson-164.test.mjs`,
`lesson-165-integration.test.mjs`, `lesson-172.test.mjs`, `lesson-173.test.mjs` and
`reference-narration.test.mjs`. These are retained preservation/narration failures,
including pinned `messages/en.json` and `assessor-orientation.test.tsx` fingerprints
and twelve stale `problem-prioritize` narration entries. Assertions were not
weakened, skipped or repinned. Do not regenerate media or protected content merely
to make a runner PR pass.

PR CI passed lint/typecheck, the production build, local database setup and all
81 E2E tests. The eight local storyboard browser journeys passed in both languages,
390/1024px and light/dark themes, including keyboard/focus, axe, no external/write
requests, no browser storage and reload reset. Those are fixture results, not
authenticated production verification. Post-merge
[main CI](https://github.com/jongsky25/BHW-Connect-Phase-2/actions/runs/38199711395)
also passed the E2E job but failed at unit tests. Do not call main green.

An early local run lacked historical Git objects for
`12ef2c8d6c802995a37bfe14847de49e23fdc0ef` and
`6db0e35ef27903f8ca9f93ef42d8a23e5409bcdd`. Fetching those exact reviewed commits
resolved three additional errors; the final full run above retained only six.
Follow CI's frozen-source fetch setup and diagnose missing objects before treating
release-source checks as new regressions.

For C1AF-06b, verify the full local path from authenticated candidate → checkpoint
mutation → persisted scoped record → read/reload → one accepted receipt. Include
wrong actor/program/chapter/version, View-as/BHW/inactive access, prerequisite and
cohort denial, out-of-order or missing actions, forged completion, concurrent and
ambiguous submissions, unlimited retries, replay and retained existing passes.
Test English/Filipino parity, mobile/keyboard use, no real learner mutation or
notification, disabled awards/cutover and migration replay. Update the fixture
expectations deliberately: the old storyboard stays unsaved, while the new runner
persists only authorized personal simulation state. Report actual exact-head CI
results and remaining limitations before requesting any release approval.
