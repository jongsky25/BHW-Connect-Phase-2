# C1AF-08 next-chat handoff: My certifications and Chapter 1 output

Prepared 12 October 2026 after the approved C1AF-07 release in
[PR #296](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/296).
This is a planning handoff, not implementation or activation approval.
Start the implementation in a new branch from current `main`; recheck release
state because the observations below are a dated snapshot.

## Released baseline

- Main/released commit: `2225e6fb62badf4d731cab29e3d4d9926490f4bb`.
- Vercel production: `dpl_2eJiEmMFDHsSnxFPg2GHadBAEggu`, READY at that SHA,
  serving https://bhw-connect-phase-2.vercel.app. Build took approximately 3m24s.
- Pilot: `ltzicxyefizxoqhfuuzc`. Repository migration
  `20261012064708_assessor_combined_chapter_issuance.sql` was applied **once** as
  `20261012075808:assessor_combined_chapter_issuance`.
- Prior simulation migration is already recorded as
  `20261012060318:assessor_simulation_runner`. Do not reapply either migration
  based on the differing repository and hosted timestamps.
- Runner control, `assessor_flow_writes` and `assessor_flow_awards` were false;
  enabled write/award cohorts and authority cutovers were zero. Contracts and
  combined awards were empty. No approvals or issuer identities were seeded.
- Pre/post migration checksums matched for 33 legacy qualifications, 135 exam
  records and 71 orientation records. Simulation runs remained zero.
- New private tables have RLS and no direct anon/authenticated grants. New
  public award RPCs deny anonymous execution.

C1AF-07 implements combined issuance and immutable certificate identity, but
does not provide certificate rendering, a public verifier or lifecycle admin.
Its implementation document contains historical pre-release draft/unmerged
language; PR #296's release record and this snapshot supersede that status.
PR #295 is the earlier C1AF-07 handoff, not the next implementation scope.

## Read first

1. `CLAUDE.md`, `docs/session-handoff.md`, `docs/deploy-runbook.md`.
2. `docs/chapter-1-assessor-facilitator-flow-plan.md`, especially C1AF-07–09
   and C1AF-21–22 (overall issuance/output belong to later increments).
3. `docs/chapter-1-assessor-flow-contract.md` and
   `docs/chapter-1-assessor-state-contracts.md`.
4. `docs/chapter-1-assessor-issuance.md`, its migration, and
   `docs/chapter-1-assessor-simulation-runner.md`.

## Bounded implementation scope

Build **My certifications** with cards for Chapters 1, 2 and 3 and an
overall-progress card. Show certified, in progress, unavailable, update-required,
suspended and revoked states accurately. Keep missing publication, failed reads
and incomplete evidence distinct. Chapter 3 remains unavailable. Overall progress
must not issue an overall award or imply that a Chapter 1 award covers Chapters
2–3. Overall certification requires three compatible chapter awards, with no
extra overall exam; implement its issuance/output only in the later increments.

Provide the earned Chapter 1 certificate view, print layout, downloadable PDF
and verification. Use the existing immutable `certificate_id`; rendering or
retrying a download must never issue another award, change evidence, or invoke
recovery implicitly. Page loads, status reads and public verification are
read-only. A renderer failure cannot remove or roll back earned evidence.

Use a distinct assessor/facilitator certificate type and verification path.
Preserve the existing BHW certificate URLs and their supported behavior. Label
legacy Chapter 1/2 qualifications accurately and keep them visible as appropriate;
do not relabel an old AF-05 qualification as the combined award. Never infer an
award from an assessor role, session history, a rehearsal receipt alone or a BHW
certificate. Do not convert legacy records or create awards to demonstrate UI.

Show the exact program/chapter scope in Filipino and English. The proposed title
is “BHW Reference Manual — Assessor/Facilitator, Chapter 1”; do not imply external
accreditation or invent an issuer/signatory. Render approved issuer data from the
award snapshot. Historical achievement and permission to act now are separate:
`currentPermission: false` from C1AF-07 is intentional, not a UI bug to override.
Suspended/revoked awards remain historical records with their current status.
Downloads should point to current verification and explain that the document
alone does not grant current authority.

## Existing contracts and implementation entry points

- `src/app/training/[programId]/assessor/qualifications/page.tsx`: current own
  qualifications page, restricted to an active actual assessor without preview.
  Currently queries only available Chapters 1/2; extend deliberately to represent
  all three cards and publication gaps, without weakening access checks.
- `src/components/elearning/assessor-qualification-card.tsx`: legacy card and
  recovery behavior. Audit any reused recovery action against the cutover dispatch.
- `src/lib/assessor/{flow,flow-registry,readiness,preparation-checklist,rollout}.ts`:
  catalog, projections, version and rollout semantics. Projections are not
  authorization boundaries. The draft approval registry remains unapproved.
- `supabase/migrations/20261012064708_assessor_combined_chapter_issuance.sql`:
  private `award_contracts` and `chapter_awards`, evidence/issuer snapshots,
  preserved legacy issuer, shared combined issuer and immutable identities.
- `rpc_assessor_chapter_award_state(chapter_id)` returns the authenticated
  assessor's most recent 50 award identities, status and issuer snapshots. It is
  **not** a public verification API or a complete certificate-rendering contract.
- `rpc_assessor_chapter_award_ensure(chapter_id)` is explicit recovery;
  `rpc_assessor_qualification_ensure` dispatches by cutover. Neither belongs in
  a GET/render path. Preserve the single issuer and its concurrency guarantees.
- `src/app/certificates/[code]/page.tsx` and
  `src/app/api/certificates/[code]/pdf/route.ts`: existing public BHW verifier/PDF
  using `rpc_certificate_verify`, `pdf-lib` and `qrcode`. Reuse suitable layout
  utilities without routing assessor identities through the BHW award contract.
- `scripts/tests/assessor-award-database.test.mjs` and
  `e2e/assessor-award.spec.ts`: real prerequisite, issuance and preservation tests.

Before implementation, define the minimal server-owned rendering/verification
projection. C1AF-07 snapshots issuer/evidence/contracts, but has no dedicated
holder display-name/title snapshot or public verification projection. Decide how
approved display fields are captured and versioned without rewriting immutable
awards or using mutable profile data as historical fact. If an additive migration
is needed, add a new one; never edit/reapply a released migration.

Public verification may expose only explicitly allowed certificate fields and
current status. Never return private evidence/contract blobs, exam answers,
scores, learner rosters, contact details or internal approval references. Use
exact certificate-identity lookup, no public enumeration/search; verify unknown,
malformed, foreign-type and SAMPLE identifiers safely. Do not expose a holder's
personal fields merely because the existing BHW verifier does. Document the
public-field policy; unresolved disclosure/issuer decisions block public
activation, not local implementation with clearly fictional fixtures.

Keep owner download access distinct from minimal public verification. Reuse
authorized preview behavior only where already supported; preview must never
issue or recover an award. Ensure verification reflects lifecycle changes rather
than serving stale “active” status. C1AF-09 owns new lifecycle mutation controls;
test status changes using local fixtures, not new production admin actions.

## Validation required for the implementation PR

- Unit/database tests for all card states, legacy/revised distinctions, missing
  publication and read errors, owner/foreign/anonymous/preview access, private
  field exclusion, malformed IDs and current lifecycle status.
- Preserve the C1AF-07 issuance tests: repeated/concurrent requests retain one
  award/certificate/audit event; view, print, PDF and verification perform no
  issuance or evidence mutation; renderer failure preserves the award.
- Authenticated **local** browser coverage for Filipino/English, phone/tablet/
  desktop, keyboard and accessibility, download bytes/headers, printable layout,
  long names/titles, issuer text and QR/link destination. Confirm the downloaded
  artifact is readable, scoped correctly and tied to the same certificate ID.
- Prove historical display plus current suspended/revoked/update-required status;
  unavailable Chapter 3 and incomplete overall progress; no SAMPLE verification
  identity; unchanged BHW certificate view/PDF/verification routes.
- Run lint, typecheck, production build, focused and full repository checks.
  Replay every migration and seed on fresh local Supabase if schema changes.
  Obtain current-head CI results; do not skip tests, loosen timeouts, repin source
  hashes or regenerate narration to suppress unrelated failures.

## Known validation history and release boundaries

C1AF-07 local results: 25/25 issuance database tests and 3/3 focused authenticated
E2E journeys passed. Build/typecheck passed; lint had three existing warnings.
Full units were 1,974 passed / 7 unchanged-test timeouts; a serial rerun was
82 passed / 3 timeouts (`chapter2-ipc`, `lesson-152`, `lesson-163`). **Subsequent
GitHub CI run 38219546171 passed both checks, including units, and E2E.** Do not
carry the local timeouts forward as known current CI failures.

Local fresh migration replay/seed succeeded. VFS disk pressure required locally
flattened pinned Docker images; Auth/storage health probes later reported
unhealthy despite successful authenticated journeys. Stack health was not proven
green locally. Local security checks had four pre-existing findings and none on
new objects; see the issuance document for details.

Production signed-out smoke passed: login 200, protected admin/simulation routes
307 to login. The initial deployment error/fatal scan found no logs. The stable
BHW/admin authenticated smoke and Chat Guide check remain unperformed because
credentials were unavailable. Do not claim those checks passed or use local seed
credentials on production.

Never develop, seed or run E2E against the pilot. Use disposable local Supabase;
the hosted dev project is paused. At an authorized future release, inspect live
migration history, apply only the new reviewed migration(s) together once at
merge time, squash-merge, then verify the exact production SHA and smoke results.

Keep runner, revised write/award gates and authority cutover disabled. Rubric,
orientation/checkpoint, criterion mapping, component sufficiency, evidence reuse,
issuer/signatory and award decisions remain prerequisites for activation. Maria
remains fictional SAMPLE. Preserve scoring thresholds, recorded passes, legacy
identities/lifecycle, source/media fingerprints and existing BHW records/URLs.
No lifecycle admin, real assessment writes, overall issuance or notifications
are part of C1AF-08. Rollback must retain earned evidence and certificate IDs.

## Ready-to-use continuation prompt

> Implement C1AF-08 in BHW-Connect-Phase-2. Read
> `docs/chapter-1-assessor-certification-output-handoff.md`, `CLAUDE.md` and the
> linked roadmap/contracts first. Start a new branch from current main and
> confirm the C1AF-07 release baseline (PR #296, merge 2225e6fb). Build My
> certifications with all three chapter cards and overall progress, plus the
> earned Chapter 1 certificate view, print/PDF and minimal current-status
> verification. Preserve accurately labelled legacy qualifications and existing
> BHW certificate URLs. Design the server-owned display snapshot and public-field
> contract explicitly; do not expose private evidence or imply current authority.
> Keep reads/rendering free of issuance writes, preserve immutable certificate
> IDs and all scoring/passes, and keep Chapter 3 and all activation gates disabled.
> Use local Supabase fixtures only; complete the listed security, database,
> browser/download and regression checks. Open one implementation PR with actual
> results and remaining decisions. Do not merge, deploy, migrate the pilot or
> activate features under this handoff alone.
