# C1AF-07 — next-chat handoff

Prepared 12 October 2026 after [PR #294](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/294)
was merged and deployed. This document prepares the next increment; it does not
implement issuance, approve unresolved policy, or activate any rollout control.

## Start here

Start a fresh implementation branch from current `origin/main`, not from this
handoff branch or the older PR #292 branch. At handoff, main is
`c54d323fa5fa4e30d49c2d750499da77af85f9df` (C1AF-06b). Fetch again before working.
Read `CLAUDE.md`, `docs/session-handoff.md`,
`docs/chapter-1-assessor-facilitator-flow-plan.md` (especially C1AF-07),
`docs/chapter-1-assessor-simulation-runner.md`, and `docs/deploy-runbook.md`.
The runner implementation document describes its pre-release boundary; the
completed release record below supersedes its statements that deployment and
hosted migration have not happened.

Suggested next-chat prompt:

> Continue from this C1AF-07 handoff. Start from current main and implement
> C1AF-07's additive Chapter 1 certification issuance and certificate identity,
> linking the server-validated simulation completion receipt. Preserve existing
> passes, scoring rules, qualification IDs and lifecycle states. Keep runner
> activation, revised writes, awards and authority cutover disabled. Do not invent
> missing approvals or convert existing qualifications automatically. Validate
> locally and open one implementation PR with the remaining activation decisions
> and observed test results.

## Released baseline

- PR #294 added the isolated bilingual Maria runner, ordered server validation,
  saved progress, retries, correction history, debrief, immutable completion
  receipt and replay. The preparation checklist uses its scoped state. No real
  BHW mutations, awards or notifications are invoked.
- Accepted rehearsal scenario: `chapter-1-maria-communication-storyboard`,
  version `1.0.0`, derived from unchanged `0.1.0-draft`; requirements
  `chapter-1:c1af.draft-1`. All eleven checkpoint versions are 1:
  `find-maria`, `prepare`, `brief`, `observe`, `feedback`, `missing`, `readiness`,
  `arrange`, `formal`, `chapter-gap`, `final-review`.
- Story approval permits rehearsal only. The draft registry's requirements,
  mapping, evidence, orientation, simulation, issuer and award approvals remain
  null. Do not interpret a scenario version or rehearsal receipt as rubric or
  award approval.
- Existing six orientation lessons, eight cases, seven correct out of eight
  plus mandatory safety correctness remain unchanged. Existing study, exam and
  calibration passes remain valid under their existing rules. Legacy issuance
  behavior was unchanged by C1AF-06b.

Release evidence (observed during PR #294 release, not a new activation check):

- Single repository migration `20261012051057_assessor_simulation_runner.sql`
  was applied once to pilot `ltzicxyefizxoqhfuuzc`; hosted history records
  `20261012060318`, name `assessor_simulation_runner`. The timestamp differs
  because the migration tool recorded application time. Do not reapply it.
- Vercel production deployment `dpl_AvdZVYUsjadTgjcN75cxtZZiM7t2` was READY
  at merge SHA `c54d323f`, with https://bhw-connect-phase-2.vercel.app assigned.
- Runner control was false, revised write/award flags false, enabled write/award
  cohorts zero, authority cutovers zero and simulation rows zero.
- Login returned 200; signed-out admin and simulation routes redirected to login.
  Deployment-scoped error/fatal logs had no entries. Stable production-account
  credentials were unavailable; authenticated production smoke was not performed.

## Next implementation: C1AF-07

Extend AF-05 additively for the combined Chapter 1 award. Link prerequisite
evidence and versions, including the immutable simulation receipt, and persist
certificate identity and issuer snapshots. Separate historical earned evidence
from current permission to act. Do not build C1AF-08's certification cards,
print/PDF or verification UI in this increment.

Use one transactional issuance helper for the revised path whether orientation
or simulation completes last. Update the orientation-pass trigger's revised path
so orientation alone cannot issue the new award. Preserve legacy behavior outside
the revised rollout; do not silently impose the new requirement on all existing
qualifications. Recheck the actual authenticated actor, role, scope, rollout
eligibility, prerequisites and compatible evidence versions on the server.
Browser-supplied scores, completion claims or identifiers are not authority.

Repeated or concurrent qualifying submissions must yield one award. An explicit
recovery action must handle qualifying previously recorded evidence without
requiring candidates to repeat valid passes. Reads and page loads remain free of
issuance writes. A certificate-rendering failure must not undo earned evidence.
Suspended or revoked rows must never self-reactivate. Preserve old qualification
IDs and linked evidence; no blanket backfill or grandfathering from staff role,
session history or a rehearsal receipt.

Keep production runner activation, revised writes, awards and authority cutover
off. Implement and exercise gated paths using disposable local fixtures. Resolve
applicable rubric/orientation/simulation-checkpoint reviews, criterion mapping,
component sufficiency, evidence reuse and issuer/signatory/award decisions before
activation. Leave unresolved approvals visibly unresolved; do not manufacture
issuer names or production approval snapshots. The previous merge/deploy approval
covered C1AF-06b, not activation or release of the next implementation.

Chapter 3 remains unavailable. Overall certification continues to require
compatible distinct chapter awards, not a new examination. The fictional Maria
sample must retain its SAMPLE status and must not gain real certificate identity,
signature or verification credentials.

## Code entry points

- `supabase/migrations/20260929054250_assessor_chapter_qualification.sql`:
  `assessor_private.issue_chapter_qualification`,
  `assessor_private.issue_after_orientation_pass`,
  `rpc_assessor_qualification_ensure`, state and lifecycle functions. Inspect later
  migrations too before changing the effective definitions.
- `supabase/migrations/20261010145729_assessor_flow_rollout_controls.sql` and
  `20261011120608_assessor_briefing_acknowledgement.sql`: rollout and actor policy.
- `supabase/migrations/20261012051057_assessor_simulation_runner.sql`:
  private runs/requests/control; read-only `rpc_assessor_simulation_state`;
  action RPC `rpc_assessor_simulation_act`. Completion stores one immutable
  receipt; replay retains it. Preserve those guarantees when integrating issuance.
- `src/lib/assessor/flow-registry.ts`, `rollout.ts`, `readiness.ts`,
  `preparation-checklist.ts`, `simulation-runner.ts`: draft approval registry,
  gates, preparation resolution and accepted rehearsal contract.
- `scripts/tests/assessor-simulation-database.test.mjs`,
  `src/lib/assessor/simulation-runner.test.ts`,
  `src/components/elearning/assessor-simulation-runner.test.tsx`,
  `src/app/training/assessor-simulation.test.tsx`,
  `e2e/assessor-simulation.spec.ts`: receipt/security/UI preservation coverage.

## Verification and known baseline

Use local Supabase only for development and E2E; never seed or run candidate
fixtures against the pilot. Create an additive migration and prove full replay.
Test actual database transactions and authenticated journeys, including duplicate
issuance, either prerequisite completing last, missing/stale/foreign receipts,
forged browser scores, orientation without simulation, qualifying prior-pass
recovery, suspended/revoked denial, rollout-off behavior and no writes on reads.
Snapshot existing passes, qualification identities/lifecycle and receipt history
before and after. Preserve scoring, source/media fingerprints and privacy gates.

Run appropriate focused tests, lint, typecheck, build, full unit regression and
local E2E. Report observed failures; do not skip assertions, loosen timeouts,
repin preservation hashes or regenerate narration to make this increment green.

- PR #294 local unit suite: 1,950 passed / 6 known failures. Focused
  runner/security/route/checklist tests: 46 passed; both authenticated local
  preparation/simulation journeys passed. Build/typecheck/migration replay passed;
  lint had three existing warnings.
- PR CI at `e7808c49`: all 82 E2E tests passed; lint/typecheck passed. Units had
  the six baseline failures plus an unchanged `lesson-174.test.mjs` timeout.
  Its seven tests passed on focused local rerun without changes.
- Completed [main CI](https://github.com/jongsky25/BHW-Connect-Phase-2/actions/runs/38210720291)
  at `c54d323f`: lint/typecheck and E2E job passed; units were **1,950 passed /
  6 failed**, with no extra lesson-174 timeout. Failed files:
  `lesson-152.test.mjs`, `lesson-164.test.mjs`,
  `lesson-165-integration.test.mjs`, `lesson-172.test.mjs`,
  `lesson-173.test.mjs`, `reference-narration.test.mjs` (under `scripts/tests/`).
  The previous release exception does not automatically approve the next release.

Open one implementation PR with exact validation and remaining activation
decisions. Apply reviewed new migrations only once at merge time under the deploy
runbook. Rollback must retain earned evidence and simulation receipts. C1AF-08
(My certifications and output) follows C1AF-07; C1AF-20b still owns parity checks
between the fictional adapters and the eventual real working screens.
