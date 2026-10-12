# C1AF-07 — combined Chapter 1 issuance

Implements the scope in PR #295 on current main (`c54d323f`). This increment
adds issuance and certificate identity. Certification cards, PDF/print,
verification and lifecycle administration remain C1AF-08/C1AF-09 work.

## Evidence and transition

The additive migration `20261012064708_assessor_combined_chapter_issuance.sql`
creates private `award_contracts` and `chapter_awards` tables. Both start empty;
no approval, issuer, cohort, flag or cutover is installed. The TypeScript draft
registry retains its null approvals. Acceptance of the Maria story is rehearsal
approval only.

A reviewed contract must explicitly bind requirements, curriculum, rubric,
orientation, award rule, scenario and eleven checkpoint versions. It must carry
nonblank decision references for requirements, mapping, evidence, orientation,
simulation, issuer and award, plus an issuer organization, signatory and title.
Only reviewed release SQL can populate it; there is no client-facing approval
mutation. The local test contracts are clearly marked fixtures, never production
approvals. The approved mapping and evidence decisions must resolve component
sufficiency, source/rubric review and reuse before any contract is enabled.

The new award stores its own UUID and unique certificate UUID, the original
orientation/pretest/post-test record IDs, the immutable simulation receipt ID
and snapshot, study revision and orientation lesson evidence, version/approval
contract and issuer snapshots. It optionally links an existing AF-05 qualification.
It never rewrites the linked qualification or moves evidence to a new identity.
Used contract versions cannot be redefined; disabling issuance remains possible.
Stored snapshots remain immutable; status and status-change time are reserved
for separately reviewed lifecycle administration. No certificate renderer is
called by issuance, and no identity is attached to the fictional Maria SAMPLE.

Before authority cutover, the existing AF-05 orientation trigger and recovery
behavior remain in effect, even for a rehearsal cohort. After cutover, the
Chapter 1 trigger dispatches to the combined issuer and never falls back to legacy
issuance when a revised gate is off. Chapter 2 retains its existing path, and
Chapter 3 remains unavailable. Overall certification rules are unchanged.

Existing qualifications are not converted on simulation completion or replay.
An explicit recovery request can link one only if the reviewed contract permits
prior evidence reuse. An existing suspended or revoked legacy qualification or
combined award blocks issuance, across requirement versions. Recovery never
reactivates either kind of record. A role, a session, or a rehearsal receipt
alone cannot qualify anyone.

## Transaction and API contract

`assessor_rollout_private.issue_chapter_award` is the single transactional issuer
used by the revised orientation trigger, simulation completion wrapper and
explicit recovery. It derives the authenticated actor and checks active actual
assessor status (excluding preview personas), published program/chapter and org
scope, cohort membership, permanent authority cutover, cohort awards switch,
role-aware global elearning/award flags and an enabled fully reviewed contract.
It then rechecks actual study/exam/orientation records and the stored receipt's
actor, program, chapter, requirements, scenario and ordered checkpoint versions.
No actor, score, pass claim or receipt identifier is accepted by recovery.

Actor-row locking is acquired before cohort or simulation rows. Contract,
cohort, membership, feature flag and existing qualification locks prevent a
concurrent change from crossing the issuance decision. The award unique key and
receipt uniqueness backstop duplicate submissions; retries return the existing
award, with one audit event. A closed gate returns no award from automatic
completion so valid passes and rehearsal receipts can still be saved.

- `rpc_assessor_chapter_award_ensure(chapter_id)` is the explicit recovery action.
  It errors when issuance is unavailable or prerequisites are incomplete.
- The existing `rpc_assessor_qualification_ensure(chapter_id)` dispatches to the
  same recovery after Chapter 1 cutover and otherwise preserves AF-05 behavior.
- `rpc_assessor_chapter_award_state(chapter_id)` returns only the authenticated
  assessor's most recent 50 historical award identities, issuer snapshots and lifecycle state.
  It remains read-only even if rollout is disabled. `currentPermission` is
  deliberately false: this increment does not authorize real assessment writes.
- The simulation RPC keeps its existing payload/response and immutable receipt
  contract. Only its successful finish path attempts issuance; reads and page
  loads never issue. Replays preserve receipt and award history.

Private tables have RLS enabled and no anonymous/authenticated grants. Public
new RPCs are invoker wrappers over narrowly granted private definers with pinned
search paths. The issuer and preserved legacy/rehearsal implementation helpers
are not directly callable by application roles.

## Validation and release boundary

`scripts/tests/assessor-award-database.test.mjs` uses real study, exam,
orientation, simulation, rollout and issuance functions in disposable PGlite.
It covers both prerequisites completing last, orientation without simulation,
prior evidence recovery, all seven approval gates, missing/stale/foreign receipt
fields, role/flag/cohort denial, current study evidence, private ACLs, retained
certificate snapshots, lifecycle denial and unchanged passes/legacy identities.
PGlite does not prove multi-connection concurrency or full platform replay.

`e2e/assessor-award.spec.ts` is restricted to loopback Supabase. It exercises an
actual authenticated assessor, real prerequisite records and the ordered runner
RPC, parallel final completions and recovery, one award/audit identity, the
rendered completion page, disabled-award recovery denial and read-only historical
identity. Existing simulation/preparation tests continue to protect bilingual
and responsive rehearsal UI, source/media fingerprints, scoring and privacy.
The E2E fixture temporarily disables immutability triggers only to dispose of
its own local records, after assertions; production code cannot do so.

Observed command results are recorded in the implementation PR. The six known
main-suite failures remain disclosed; this increment does not skip assertions,
change scoring, repin hashes or regenerate narration.

### Observed local results (12 October 2026)

- Final issuance database tests: **25 passed**, including used-contract immutability.
- Authenticated Playwright: **3 passed** (award, preparation, bilingual simulation),
  including concurrent issuance/recovery, unchanged pass snapshots, axe and overflow.
- Production build and typecheck passed. Lint passed with the three existing warnings.
- Full unit run: **1,964 passed / 17 failed**. Serial rerun of all failed files plus
  the final issuance tests: **163 passed / 8 failed**. The six documented baseline
  assertions remain (`lesson-152`, `lesson-164`, `lesson-165-integration`,
  `lesson-172`, `lesson-173`, `reference-narration`), together with unchanged-file
  timeouts in `lesson-174.test.mjs` (30 seconds) and `chapter2-ipc.test.mjs`
  (5 seconds). Other transient failures cleared after fetching the recorded
  historical review commits and rerunning serially. No assertion, timeout,
  preservation hash, source or media was weakened or changed.
- Full fresh local migration replay and seed succeeded on Supabase CLI 2.118.0 /
  PostgreSQL 17.6. The managed environment's VFS disk budget required flattening
  the pinned Postgres/storage image filesystems into local single-layer images.
  Auth/storage container health probes ultimately reported unhealthy, despite
  working Auth/PostgREST and all three completed authenticated journeys; the CLI
  then stopped the containers. This is not a claim that stack health checks passed.
- Security advisor: only the four existing findings (`course_quiz_questions_public`,
  `course_quiz_review`, `training_revision_immutable`, `e2e_marker_pattern`), none
  on the new objects. Before and after E2E, local controls were off, cutovers and
  approval/award rows zero. No hosted database was used.

The implementation PR remains a draft; these results do not approve release or
activation. The additional timeouts remain disclosed rather than being counted
as passes. Full 83-test E2E and production smoke were not run locally.

No hosted migration, merge, deployment or activation is part of this change.
Before activation, separately resolve rubric/orientation/checkpoint reviews,
criterion mapping, component sufficiency, evidence reuse and issuer/signatory/
award decisions. Review the live migration history to avoid reapplying the
already released simulation migration. Apply only the reviewed new migration,
once at merge time under `docs/deploy-runbook.md`. A rollback disables exposure
and award controls while retaining awards, passes and simulation receipts.
