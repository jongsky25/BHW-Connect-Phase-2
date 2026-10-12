# C1AF-09 lifecycle implementation and transition boundary

Implemented on the #299 main baseline (`5121b9c2`), following the documentation handoff in PR #300. The new migration is additive. It does not change the released C1AF-07/08 migrations, existing qualification setter, issuer algorithm, evidence, certificate IDs or output allow-lists.

## Delivered

- Combined Chapter 1 awards have a separate, private lifecycle history. Each event records the authenticated operator, award and assessor identities, program/chapter scope, previous and next status, timestamp, reason and policy reference. History cannot be updated or deleted.
- The admin setter locks the assessor before the award, then rechecks account, Chapter 1 program and geographic scope. It requires the state and change timestamp seen by the admin, rejects stale requests, treats a same-state repeat as a no-op, and changes status and inserts history in one transaction.
- Proposed transition graph: active → suspended/revoked; suspended → active/revoked; revoked is terminal. This proposal is implemented behind `award_lifecycle_control.mutations_enabled = false`. It must remain off until the owner adopts a restoration and revocation policy and records its policy reference. No production gate activation is part of this increment.
- The admin console shows scoped combined awards, private lifecycle history and a bounded, read-only legacy reconciliation report beside the existing qualification controls. A report read issues or converts nothing. Chapter 2 is labelled legacy and Chapter 3 unavailable. Existing staff are directed to My certifications or to an administrator as applicable.

## Remaining policy decisions

1. Approve or revise the terminal revocation and suspended-award restoration rules. Define who may authorize an exception if a revoked award must ever be restored.
2. Approve historical evidence reuse and version equivalence. The report currently uses exact accepted versions in the same program instance and marks missing/version-conflicted/restricted records. Its `evidence_complete` category is a screening result; the single issuer's full transactional prerequisite checks still govern any future award.
3. Approve a trusted conversion interface. No conversion RPC exists here. An administrator cannot impersonate an assessor or bypass the single issuer. Any future conversion must preserve old identities/history, be explicit and idempotent, and require the server-validated simulation and every applicable prerequisite.
4. Approve the Chapter 1 rubric, orientation, simulation, issuer identity and award rules before activation. Runner, revised write/award, public verification and cutover gates stay off.

Rollback should disable the lifecycle mutation control and leave earned awards, display snapshots, certificate IDs and lifecycle history intact. The legacy qualification status RPC and BHW certificate paths remain separate. Never restore old legacy write authority after a persisted cutover.

## Local verification — 12 October 2026

- The focused real-migration PGlite harness passed **37 database tests**, including scoped admin/preview/persona denial, a default-off mutation gate, restricted issuer recovery, atomic history, repeated/stale transitions, live owner status and read-only report categories. The rendered admin component passed **2 tests** for a disabled gate, visible next steps and eligible actions.
- Typecheck, lint (three pre-existing warnings), `assessor:check` and the production build passed. The React review found no new accessibility or hook issue in the changed components.
- One broad local unit run completed **2,017 passed / 3 failed** across 216 files. The three failures were lesson 1.8.2/1.9.3 release tests referencing approved Git objects absent from the initial checkout; fetching their exact reviewed commits made those five focused release tests pass. A later broad rerun was stopped after another unrelated historical lesson test encountered the same local Git-object issue. Current-main GitHub CI `checks` is green. Do not count the interrupted rerun as a complete pass.
- The local Supabase CLI could not unpack the pinned Postgres image in this sandbox's VFS disk budget (`no space left on device`), so a full fresh container migration/seed replay, advisors and authenticated browser walkthrough are not claimed. The exact migration did replay in the focused PGlite harness. Final-head PR CI is the remaining full replay and E2E gate.
- No pilot database, production setting, real staff record or hosting deployment was changed. Public verification, runner, revised writes/awards and authority cutover remain off.
