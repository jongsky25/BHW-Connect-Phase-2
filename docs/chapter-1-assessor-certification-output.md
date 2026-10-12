# C1AF-08 — My certifications and Chapter 1 certificate output

Implementation: [PR #298](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/298).

Implementation follows [PR #297's handoff](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/297)
on the C1AF-07 baseline `2225e6fb` (#296). This increment does not authorize
release, hosted migrations, activation, lifecycle administration or overall issuance.

## Output and identity contract

The existing `/training/[programId]/assessor/qualifications` URL now shows
My certifications: three chapter cards and a fixed three-chapter overall progress
card. Combined awards, historical AF-05 qualifications, unpublished content,
incomplete prerequisites and failed reads are separate facts. Chapter 3 remains
unavailable. Legacy records never count as combined chapter awards. Current
requirements come from the actor's program/chapter cohort; a material version
mismatch shows update required. Only distinct currently compatible chapter awards
count toward progress. There is no extra overall exam or overall issuer here.

The existing active actual-assessor access restrictions remain. Admin View-as
cannot read owner output or recover an award. Existing legacy explicit recovery
is preserved before authority cutover; it is not shown as a legacy action after
cutover. No GET handler calls recovery or issuance.

New routes:

- `/assessor-certificates/[certificateId]`: owner-only historical document,
  live status, print and download actions.
- `/api/assessor-certificates/[certificateId]/pdf`: owner-only A4 PDF, Unicode
  font, wrapped/paginated fields, QR to the current verification route, immutable
  certificate ID, private/no-store response and safe rendering failure.
- `/certificates/assessor/[certificateId]`: distinct minimal public verification.
  Exact canonical UUID lookup only; no search, enumeration, personal-name output
  or public PDF download. Existing BHW certificate routes and RPCs are unchanged.

Every document names the BHW Reference Manual assessor/facilitator Chapter 1
scope, uses the awarded issuer snapshot, and explains that achievement does not
grant current authority. `currentPermission: false` remains intentional.
Suspension, revocation and update-required status do not erase the historical
award or prevent its owner from downloading it. Verification reads current status
on each request; it does not cache an old active result.

## Snapshot and public-field policy (v1)

The additive migration `20261012102519_assessor_certificate_output.sql` adds
private RLS-protected display snapshots and read RPCs. It does not alter/reapply
C1AF-07 or change scoring, evidence, identity, issuer concurrency or lifecycle.
A private issuance trigger captures the account holder's display name at issuance,
fixed bilingual Chapter 1 titles and the award's organization/signatory/title.
The snapshot is immutable and never reconstructed on a page load. A later profile
rename does not change the historical document.

Existing awards without a display snapshot retain their identity and evidence.
Their owner can inspect history, but print/download is unavailable (PDF 409).
There is no mutable-profile backfill, silent conversion or synthetic new award.
Approved historical display reconciliation would need a separate reviewed contract.
PDF/read failures return an unavailable response; they never change earned data.

Owner RPC allow-list: certificate identity, program/chapter scope, issue date,
current status, display version, holder name, bilingual titles and the three
issuer display fields. No evidence, scores, exam answers, contracts, receipts,
contact details, rosters or internal approvals are returned.

Public RPC allow-list: availability/found, certificate type/identity, Chapter 1
scope and bilingual titles, issue date, issuer organization, current status and
`currentPermission: false`. Holder name and signatory/title are deliberately
withheld. Unknown, malformed, foreign-type and SAMPLE identifiers never acquire
a verification identity. An existing BHW UUID does not become an assessor award.

Public verification has a separate private default-off control,
`certificate_output_control.public_verification_enabled`. No mutation API or
production setting change is included. Public disclosure and proposed certificate
titles still need owner approval before enabling it; issuer/signatory and all
C1AF-07 activation decisions remain prerequisites too. Local tests enable the
control only for fictional fixtures, then restore it. The RPC exists locally
behind that gate so its security and lifecycle behavior can be tested now.

## Validation

See the implementation PR for final results. The added database tests use the
real prerequisite, orientation, simulation, issuer and recovery harness; they
cover snapshot immutability/profile changes, owner/foreign/anonymous/persona
access, private privileges, the public allow-list, missing snapshots and current
lifecycle/version status. Existing C1AF-07 concurrency and preservation tests
remain in place. New route/PDF/component tests cover failure handling, ID/URL
consistency, Unicode and long fields, distinct card states and cutover recovery.

The authenticated local award journey additionally covers both languages,
390/768/1440px viewports, keyboard focus, axe, overflow, print media, actual
PDF downloads/headers, minimal anonymous verification, changing status, SAMPLE
and anonymous owner/download rejection, and unchanged award/evidence/audit count.
Fixture disposal alone temporarily disables immutable triggers to remove its own
local snapshots/awards; application users cannot do that.

No pilot development, seed, E2E, migration, production deployment or gate activation is part
of this implementation. C1AF-09 owns new lifecycle mutations; later increments
own overall issuance and output. Rollback must preserve snapshots, certificate
identities and earned evidence.

## Observed local results — 12 October 2026

- Full units: **2,004 passed** (216 files; final run used two workers without
  a concurrent build). Certification-focused tests:
  **48 passed**, including all 25 prior issuance tests.
- Authenticated local E2E: **6 passed** (award/output, preparation, simulation,
  and three existing BHW course/certificate regressions). The award/output
  journey also passed after extending the issuer/signatory/title fixture.
- Both downloaded languages were parsed as PDFs with the same certificate ID;
  the English artifact was rendered and its text extracted. The actual QR
  decoded to its printed assessor verification URL. Phone and print screenshots
  were inspected; no certificate text overflowed its container.
- Production build, typecheck, lint and the three Gabay source/release checks
  passed. Lint retains three existing warnings; no warning was added here.
- Fresh local Supabase CLI 2.120.0 / PostgreSQL 17.11 migration replay and seed
  passed. Migration history includes the new migration. Database function lint
  returned no errors. Security advisor has only the four existing findings:
  `course_quiz_review`, `course_quiz_questions_public`,
  `training_revision_immutable` and `e2e_marker_pattern`.
- After fixture disposal: public verification and runner controls false,
  revised write/award flags false, and awards, snapshots, approvals and cutovers
  all zero. No hosted database was used.

Local infrastructure limitation: the sandbox uses VFS and could not unpack the
multi-layer pinned Postgres image within its disk budget. Its pinned filesystem
was flattened into a local single-layer image. Auth/storage container health
probes routed loopback wget through the inherited proxy and returned 403; the
local API worked (Auth health 200) and authenticated journeys passed. Startup
used `--ignore-health-check` after successful replay; these results do not claim
container probes were green. Current-head GitHub CI is the remaining full E2E
reference. No test was skipped, scoring changed, timeout loosened, frozen source
repinned or narration regenerated to achieve these results.
