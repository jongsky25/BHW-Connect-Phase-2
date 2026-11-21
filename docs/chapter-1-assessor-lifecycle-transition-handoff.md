# C1AF-09 next-session handoff: lifecycle controls and transition rehearsal

Prepared 12 October 2026 after C1AF-08 shipped in
[PR #298](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/298).
This is a documentation-only handoff, not implementation, migration or activation
approval. Begin the implementation on a new branch from current `main`; recheck
release state because the observations below are a dated snapshot.

## Released baseline and current main

- C1AF-08 release: `add774b20cabf8bebd1fac2930eafe17ad72f7af` (#298).
  Production deployment `dpl_H7BsDVeMHcWvUmtkxedDY83x79tb` was READY at that
  exact SHA; its source tree matched the tested PR head `22408cbd`.
- **Current main and current production have advanced** to
  `5121b9c267826df57957b96f31d1ce328b79782e` via #299, the Chapter 1 narrated
  story handoff/completion-question fix. Current production deployment
  `dpl_HvcZp8WyYuKgumcd95ndNKQtnENA` is READY, serving
  https://bhw-connect-phase-2.vercel.app. Preserve this newer work and its approved
  historical-preservation receipt; do not start from or reset to `add774b2`.
- #298 final-head CI [38240371076](https://github.com/jongsky25/BHW-Connect-Phase-2/actions/runs/38240371076)
  passed 2,004 units and 83 E2E tests. Its post-merge main CI
  [38242855818](https://github.com/jongsky25/BHW-Connect-Phase-2/actions/runs/38242855818)
  subsequently completed successfully. #299 main CI `38263462667` was still
  running when this handoff was prepared; recheck its result, rather than treating
  #298's result as a check of newer source.
- Pilot: `ltzicxyefizxoqhfuuzc`. C1AF-08 migration
  `20261012102519_assessor_certificate_output.sql` was applied **once** as
  `20261012112739:assessor_certificate_output`.
- C1AF-07 migration `20261012064708_assessor_combined_chapter_issuance.sql` is
  already recorded as `20261012075808:assessor_combined_chapter_issuance`;
  simulation is recorded as `20261012060318:assessor_simulation_runner`.
  **Do not reapply these because repository and hosted timestamps differ.**
- Last verified at #298 release: public verification and runner controls false;
  `assessor_flow_writes` and `assessor_flow_awards` false; awards, display snapshots
  and authority cutovers zero. No combined awards or issuer approvals were seeded.
  These controls were not queried again solely for this documentation PR.
- Pre/post #298 migration checksums matched for 33 legacy qualifications,
  135 exam records and 71 orientation records. Both new output tables have RLS
  and no direct anon/authenticated read grants. Owner/list RPCs deny anonymous
  execution; public verification remains gated and minimally projected.

C1AF-08 supplies My certifications, immutable issuance-time display snapshots,
owner view/print/PDF and a distinct minimal current-status verifier. It does not
supply combined-award lifecycle administration or historical conversion.
Implementation documents contain pre-release scope statements; #298's approved
release record supersedes those statements about whether a release occurred.
It does not supersede unresolved activation decisions.

## Read first

1. `CLAUDE.md`, `docs/session-handoff.md`, `docs/deploy-runbook.md`.
2. `docs/chapter-1-assessor-facilitator-flow-plan.md`, especially C1AF-09,
   C1AF-10/13 and C1AF-21–26.
3. `docs/chapter-1-assessor-flow-contract.md` and
   `docs/chapter-1-assessor-state-contracts.md`: historical achievement versus
   current permission, version compatibility, R06 transition and R07 equivalence.
4. `docs/chapter-1-assessor-issuance.md`,
   `docs/chapter-1-assessor-certification-output.md` and their migrations.

## Bounded implementation scope

Build scoped admin lifecycle controls for combined Chapter 1 awards, with explicit
suspension, restoration and revocation actions, required reasons and readable
append-only audit history. Distinguish those awards from legacy qualifications;
do not route one record type through the other's status setter or silently
synchronize their statuses without an adopted policy.

Derive the actual admin from the authenticated account. Enforce active admin,
non-preview operation, target/program/chapter/geographic scope and operation
eligibility on the server for every read and mutation. Bound lists and reports,
paginate, select named fields, and keep sensitive reasons/evidence private.
An admin UI or browser-supplied scope flag is not authorization.

Define and test the transition graph and restoration policy explicitly before
exposing new live mutation controls. A useful **proposal, not adopted policy**:
ordinary restore handles a suspended award; revoked-to-active is blocked unless
an explicitly approved exception process exists. Restoring status must not erase
version/account restrictions, issue another award, change the certificate ID,
rewrite display/issuer/evidence snapshots or override `currentPermission: false`.
Do not silently apply a stricter proposed policy to the existing legacy RPC.
Keep new production mutation controls off while their policy is unresolved.

Make state mutation and audit insertion atomic. Serialize competing operations
and issuance consistently with C1AF-07's actor-before-award locking. Validate
scope and current state after waiting for locks. Define retry/stale-request
behavior so a repeated operation does not duplicate events or overwrite a newer
administrator's decision. Audit the actual operator, target award/actor, scope,
previous/next status, timestamp and validated reason. Never accept caller-supplied
operator identity or history.

Provide **read-only reconciliation** of existing Chapter 1/2 qualifications and
proposed combined-award conversion eligibility. Categorize complete accepted
evidence, version conflicts, suspended/revoked records and missing evidence;
show concrete blockers and a visible next step before future enforcement.
A report load/export must not issue, recover, convert, restore, reset progress
or persist a purported award. Missing publication, missing evidence and read
failure remain separate. No blanket grandfathering from role or session history.

Use exact accepted versions within the recognized program instance by default.
Preserve accepted unchanged study/exam evidence where the adopted policy permits;
require the new server-validated simulation and any genuinely missing applicable
prerequisite. Never treat an old active qualification, rehearsal receipt alone
or a BHW certificate as a combined award. Chapter 2 remains accurately labelled
legacy; Chapter 3 remains unavailable. No overall issuance belongs here.

Implement explicit, idempotent conversion **only under an adopted transition
policy** and through the single issuer's complete prerequisite/approval checks.
If the policy is unresolved, complete the report and local rehearsal with clear
blockers; do not implement an enabled bypass or convert production records as a
demonstration. Conversion must preserve the legacy identity and history and link
the new combined identity explicitly. Old awards missing display snapshots must
not be backfilled from today's mutable profile as historical fact.

## Existing code and important gaps

- `src/app/admin/assessor-qualifications/page.tsx` and
  `src/components/admin/assessor-qualification-console.tsx`: existing paginated
  legacy console; do not discard its supported behavior while extending it.
- `rpc_admin_assessor_qualification_set_status(uuid,text,text)` in
  `20260929054250_assessor_chapter_qualification.sql`: active actual admin,
  target organization subtree, 10–1,000-character reason, row lock, same-status
  no-op and audit insertion. It currently accepts `active` from either restricted
  legacy state. Its audit RLS is scoped to `assessor_chapter_qualification`;
  combined-award audit reads need their own appropriate scoped contract.
- Private `chapter_awards` and `certificate_display_snapshots`: no direct API
  grants. The award trigger permits only `status`/`status_changed_at` changes;
  display snapshots permit no update/delete. Store reasons in the audit/history
  contract rather than inadvertently making immutable award fields mutable.
- `assessor_rollout_private.issue_chapter_award(chapter_id,recover)` and
  `rpc_assessor_chapter_award_ensure`: the issuer derives `current_app_user()`
  and requires an actual active assessor, all approved prerequisites and gates.
  Recovery also checks `allow_prior_evidence`; any restricted legacy/combined
  award blocks new issuance. An admin cannot call it for another staff member
  by changing JWT claims, bypassing identity checks or supplying browser evidence.
  Decide the trusted conversion interface explicitly; reuse one issuance core
  rather than duplicating or weakening its algorithm for an admin shortcut.
- `assessor_flow_cohorts` and `assessor_flow_cohort_members`: persisted authority
  cutover protects requirements versions and membership. C1AF-08's version-change
  test disabled a trigger only in a disposable fixture. Production code must not
  disable these triggers or mutate a protected cohort to manufacture an update
  or rollback. Any future version-transition adapter needs an additive reviewed
  contract, not a silent change to what an issued version means.
- `src/lib/assessor/{flow,flow-registry,rollout,certifications}.ts`: projections
  and catalogs, not authorization boundaries; approval registry remains draft.
- Output migration's `certificate_current_status`,
  `rpc_assessor_certificate_owner`, `rpc_assessor_certificate_verify` and
  `rpc_assessor_certifications_state`: live lifecycle/version projections.
  Keep owner downloads separate from minimal public verification and preserve
  the public-field allow-list and default-off disclosure control.
- Tests: `scripts/tests/assessor-{qualification,rollout,award}-database.test.mjs`,
  `e2e/assessor-award.spec.ts`, `src/lib/assessor/certifications.test.ts`,
  `src/components/elearning/assessor-certification-card.test.tsx` and
  `src/app/api/assessor-certificates/[certificateId]/pdf/route.test.ts`.

## Required validation for the implementation PR

- Admin/foreign admin/assessor/BHW/inactive/anonymous/preview/persona denial;
  geographic and program/chapter boundaries; private table/history/report grants
  and RLS. Recheck scope when a target's organization or account state changes.
- Allowed/forbidden transitions, invalid/empty/oversized reasons, same-status
  repeats, stale/concurrent operations, audit atomicity, restoration restrictions
  and no self-restoration via recovery or final-prerequisite replay.
- Read-only report categories, real accepted prerequisites versus missing/stale
  evidence, wrong actor/program/version/receipt and failures distinct from
  incomplete evidence. GET, export and dry run cause no writes or hidden recovery.
- If policy permits conversion: real issuer prerequisites, preserved legacy
  records, one new award/certificate/audit event under retries/concurrency and
  no conversion of restricted or incompatible records. Test fictional fixtures
  locally; never disable production safeguards or impersonate an assessor.
- Before/after evidence, legacy/BHW identity, status and progress checksums;
  unchanged scoring thresholds, recorded passes and source/media fingerprints.
  Rollback retains earned records, snapshots and IDs and never reopens a legacy
  bypass after persisted cutover.
- Lifecycle changes reflected in My certifications, owner view/print/PDF and
  minimal verification. Public tests may enable disclosure only in local fixtures;
  exclude private reasons, evidence, scores, contact details and approval refs.
- Filipino/English admin and staff journeys, phone/tablet/desktop, keyboard/axe,
  bounded pagination, empty/error states and a usable next step for existing staff.
- Fresh local migration/seed replay, database lint/advisors, lint, typecheck,
  production build, focused and full repository checks and final-head CI.
  Do not skip assertions, loosen timeouts, repin approved hashes or regenerate
  narration to suppress unrelated failures. Check current main before diagnosing
  an inherited failure. Use a new push rather than rerunning obsolete workflows.

## Known validation limits and release boundaries

#298's local results: 2,004 units, 48 certification-focused tests and six
related authenticated browser journeys passed. Build/typecheck and Gabay checks
passed; lint retained three existing warnings. Fresh replay/seed and function
lint passed; the local security advisor had four existing findings and none on
new objects. Sandbox VFS disk pressure required a flattened pinned Postgres
image. Auth/storage health probes routed loopback wget through the session proxy
and returned 403; Auth API health returned 200 and authenticated journeys worked.
Startup used `--ignore-health-check`; do not claim container probes were green.

Seven signed-out #298 production smoke checks passed: login 200, protected admin
and owner routes 307 to login, private PDF 401, gated verification and safe SAMPLE
handling, and the existing BHW verifier route for an unknown identity. Initial
error/fatal scan was clear. Stable BHW/admin authenticated production smoke and
Chat Guide remain unperformed because credentials were unavailable. Do not use
local seed passwords, reset accounts or create synthetic pilot users to fill
that gap; credentials belong in the established stores, not chat.

Never develop, seed or run E2E against the pilot. Use disposable local Supabase;
the hosted dev project remains paused. Add new migrations; never edit/reapply
released ones. At a separately authorized release, inspect live history, apply
only new reviewed migrations together once at merge time, squash-merge, verify
exact production SHA/alias and report actual smoke results.

Keep runner, revised write/award gates, authority cutover and public disclosure
off. Rubric/criterion mapping, sufficiency/reuse, orientation, simulation,
issuer/signatory/title, award and transition decisions remain prerequisites for
activation. Maria remains fictional SAMPLE with no usable verification identity.
No roster/working-area rollout, real practice/formal assessment writes, overall
issuance, Chapter 3 publication or notifications are included in C1AF-09.
C1AF-10 follows this increment; C1AF-21–23 may follow Phase C if separately chosen.

## Ready-to-use continuation prompt

> Implement C1AF-09 in BHW-Connect-Phase-2. Read
> `docs/chapter-1-assessor-lifecycle-transition-handoff.md`, `CLAUDE.md` and the
> linked roadmap/contracts first. Start a new branch from current main, preserving
> #299 and newer work. C1AF-08 shipped in #298; its migration is already applied
> as `20261012112739:assessor_certificate_output`. Do not reapply released files.
> Build scoped combined-award admin suspension/restoration/revocation, reasons
> and atomic audit history, plus a read-only legacy reconciliation report with
> concrete version/evidence/eligibility blockers and staff next steps. Define the
> transition graph and trusted conversion interface explicitly; keep unapproved
> mutations off. Conversion is explicit/idempotent only under the adopted policy
> and the single issuer's complete checks, never admin impersonation, a second
> issuer or blanket grandfathering. Preserve legacy/BHW records, all passes,
> immutable evidence/issuer/display snapshots and certificate IDs. Respect
> permanent cutover and distinguish historical achievement from current authority.
> Keep all activation/disclosure gates disabled and Chapter 3 unavailable. Use
> local fictional fixtures only; finish security, concurrency, privacy, browser,
> preservation, replay and final-head CI checks. Open one implementation PR with
> actual results and remaining policy decisions. Do not merge, deploy, migrate
> the pilot, convert real records or activate controls under this handoff alone.
