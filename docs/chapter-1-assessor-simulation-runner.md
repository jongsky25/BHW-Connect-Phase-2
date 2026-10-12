# C1AF-06b — isolated candidate simulation

Based on current main `d2b637fc` and the handoff read from open PR #292. The
handoff branch was not merged. PR #292 records the owner's approval of PR #291's
unchanged Maria story. The runnable familiarization contract is now version
`1.0.0`, explicitly derived from storyboard `0.1.0-draft`, with the same eleven
checkpoint IDs/version 1 and the same pinned lesson rubric hash. This accepts the
story for rehearsal only. Criterion mapping, component sufficiency, evidence
reuse, issuer/signatory and award decisions remain unresolved. The draft award
registry and its null approvals are unchanged.

## Implementation

`/training/[programId]/assessor/chapter-1/simulation` admits active, actual
assessors only. Database admission derives the authenticated actor through the
existing briefing/cohort policy, checks published content, briefing acknowledgement,
feature/role/cohort availability and the existing study/post-test/orientation gate.
No certificate is required. Existing staff can replay, including staff with an
unchanged suspended/revoked qualification; rehearsal never restores their authority.

A private `simulation_control` row defaults off. It is not an official-write or
award flag. There is no browser-accessible control mutation. A later reviewed
release must explicitly decide whether to enable it. This increment does not
change any production control or apply a hosted migration.

`rpc_assessor_simulation_state` is read-only, including initial visits and recovery.
`rpc_assessor_simulation_act` derives the actor, checks the expected scope/version,
locks that actor's program run, and validates the structured action. The first
unfinished checkpoint is authoritative. Guide → learner view → return must be
recorded in order. All three distinct observed facts and a saved nonblank note of
at most 1,200 characters precede rating. Notes are checked for presence/length,
not semantic quality. Unknown fields (including `completed`), foreign choices,
skips, stale revisions and mismatched request reuse are rejected. UI actions
acknowledge inspecting supplied material; this does not prove a person read it or
measure real-world interpersonal competence.

Incorrect choices are retained with corrected choices. Hints and unlimited retries
have no penalty. Guidance is initially visible and later available on request.
Each guide/choice action is saved; editable evidence has an explicit save/pause
button. Failed requests preserve edits. Read-only status recovery reconciles a
lost response, while request IDs deduplicate exact retransmissions and revisions
reject stale tabs. Retrying the same completed checkpoint with a new request ID
cannot create another decision.

After all eleven checkpoints, explicit debrief completion creates one immutable,
server-validated receipt containing actor, program instance/key, Chapter 1,
requirements/scenario/checkpoint versions, ordered IDs and server timestamp.
Concurrent completion returns the same receipt. Replay retains it and the decision
history. Private request records also retain earlier evidence submissions. Tables
have RLS enabled and no direct anonymous/authenticated grants; scoped invoker RPCs
call private definers with pinned search paths and per-request admission checks.
There are no calls to learner observations, assessments, messages, notifications or
certificate mutation paths.

The personal preparation checklist displays remaining/recorded simulation and an
open/replay link only when admitted. The debrief returns to the candidate's current
preparation resolver. Existing qualification/status guidance retains priority.
Revised certification remains unavailable with no issuance button. C1AF-07 owns
issuance; the legacy orientation-pass trigger is unchanged. C1AF-20b must compare
the eleven explicit fictional adapters with the eventual real screens, including
field/action parity, evidence/privacy, changed authority and error recovery.

## Preservation and release boundary

No existing study, exam, calibration pass, qualification identity or lifecycle
state is reset or upgraded. Six orientation lessons, eight cases, 7/8 plus mandatory
safety correctness remain unchanged. All production learner writes, revised
awards and authority cutover remain disabled. Chapter 3 remains unavailable, and
overall certification still requires compatible distinct chapter awards, not a
new exam. The complete Maria record remains a separate BHW SAMPLE with no QR,
verification identity or signature. The old local storyboard is still unsaved.

The additive migration is `20261012051057_assessor_simulation_runner.sql`. Rollback
of application exposure is to keep/restore the private runner control to false;
retain personal completion history. Do not drop stored receipts as part of a UI
rollback. No merge, hosted migration, production activation or deployment is
included in this implementation.

## Reproducible verification

- `npm test`: complete regression suite; disclose the six existing preservation/
  narration failures rather than weakening fingerprints or regenerating media.
- `scripts/tests/assessor-simulation-database.test.mjs`: real SQL in disposable
  PGlite with a prerequisite-state fixture, admission/forgery/order/version tests,
  retries, correction history, pause/resume, receipt idempotency and replay.
- Component, contract and route tests cover failed-save edit retention, read-only
  recovery, bilingual resume, denied routes, and SQL/story contract parity.
- `e2e/assessor-simulation.spec.ts`: local Supabase only, actual authenticated UI,
  real prerequisite functions with 42 fixture lessons and recorded passes, default
  off, saved views/evidence, reload, lost-response recovery, concurrent completion,
  English/Filipino, 1024/390px, keyboard, axe, overflow and replay. It snapshots
  existing passes/qualifications and asserts equality after the runner. The
  fixture never replaces validation functions or changes scoring rules.
- `npm run lint`, `npm run typecheck`, `npm run build`; full local migration replay.

Final observed results and any environment limitations are recorded in the PR.
The six prior failures remain release-review blockers; the prior release exception
is not carried forward as approval for this increment.

Observed local verification (12 October 2026): full unit run **1,950 passed /
6 failed**; the failed files are `lesson-152.test.mjs`, `lesson-164.test.mjs`,
`lesson-165-integration.test.mjs`, `lesson-172.test.mjs`, `lesson-173.test.mjs` and
`reference-narration.test.mjs`, matching the disclosed baseline. Final focused
runner/security/route/checklist checks passed (46 tests); study integration and
expanded privacy/revocation checks also passed. Both authenticated Playwright
journeys passed (existing preparation plus new bilingual simulation), including
axe and overflow. Production build/typecheck passed; lint passed with three
existing warnings. The local security advisor reported only existing findings
for `course_quiz_questions_public`, `course_quiz_review`,
`training_revision_immutable` and `e2e_marker_pattern`; none reference new objects.

Local full migration replay succeeded. This managed environment's VFS Docker
storage exhausted disk while pulling the database image; testing used the same
Postgres image filesystem/config flattened into one local image layer. Auth and
storage container health-check probes reported unhealthy despite the functioning
local services, so CLI health-check timeout was ignored and the authenticated
requests above verified the actual services. No hosted database was used. Local
fixture cleanup restored the runner control to off. No claim of full 82-test E2E
or production verification is made for this local run; CI results belong to the
actual PR head.
