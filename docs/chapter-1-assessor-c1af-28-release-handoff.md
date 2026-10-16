# C1AF-28 — Chapter 1 release across the pilot

## Authorization and scope

The owner explicitly instructed: “override this. i am still in pilot phase so
show everything to all users now. release this feature”. This supersedes the
C1AF-27 named limited cohort and uncoached walkthrough prerequisites. It
approves enabling assessment writes and awards across the pilot. It does not
claim that anybody has completed preparation or demonstrated competence.

Release all active actual assessors and BHWs in each published manual program's
organization subtree. Retain existing roles, organizational boundaries, inactive
account restrictions and persona restrictions. Administrators retain their
administrative screens; BHWs retain their own learning/results screens. No
account becomes an assessor by this release. Enroll future eligible accounts
when created, activated, or moved into scope, without writing during page reads.
This release covers Chapter 1 only.

## Release operation

One migration records the external owner decision without impersonating an app
administrator. Cutover accepts exactly one authorization: an app administrator
identity or this immutable external decision. Both identities remain permanent
once cutover occurs. The decision is recorded in the audit event metadata.

The privileged release function checks the approved 42 current published lesson
hashes/revisions, 42 criteria, nine components, membership counts and issuer
contract. Drift aborts atomically. It archives existing draft simulations with
all request payloads before retargeting the single preparation cohort to
`chapter-1:c1af25.pilot-1`. Old briefing acknowledgements cannot satisfy the new
version. It enables the reviewed registry, simulation, training-session UI, write and award
controls and permanently records authority cutover. Future account enrollment
runs only for the released program and organization.

Assessors start at Courses → BHW Reference Manual → Chapter I and complete the
briefing, current study and exams, orientation and simulation. Existing staff
use the explicit recovery path; old staff qualifications alone do not grant
revised authority. Awards still require real server-validated evidence.
DOH / Ray Justin Ventura / Chief Health Program Officer remains the issuer.
The approved dummy checklist and per-LGU/session local contact verification
remain required; centrally blank contacts are intentional.

The initial preparation cohort contained 52 assessors. The release account
report confirmed 62 active assessor accounts (one administrative persona) and
26 active BHW accounts (one administrative persona). All 61 actual assessors
and 25 actual BHWs are enrolled; both personas are excluded. Zero eligible
accounts are missing, and activation created no revised awards. All 18 pending/assigned legacy Chapter 1 assessments remain
stored; after cutover, only an assessor with earned revised authority may
continue official writes. No automatic conversion, completion, certificate or
qualification is created. No legacy observations, exams or awards are erased.

## Verification and deployment

Run lint, typecheck and unit tests. Full PR CI replays all migrations on an empty
local database. The C1AF-28 local rehearsal loads all 42 real authored lessons in
a rollback-only transaction, rejects publication drift, releases every eligible
account, checks future activation enrollment, archives draft evidence, checks
immutable cutover/membership and denied app access to activation, and confirms
an unqualified assessor has no write authority or fabricated award. The existing
C1AF-27 disabled-registry rehearsal remains unchanged. No development or E2E
runs against the pilot. The workspace Docker disk limitation means full replay
is verified by CI, not claimed locally.

After green CI, recheck live publication and closed controls, apply this PR's
single migration once, squash merge, and verify the exact main commit is READY
on Vercel. Check live flag/registry/member counts and unchanged historical data.
Signed-in live smoke needs existing credentials; if unavailable, report that
limit and use CI browser evidence plus bounded live SQL and public HTTP checks.

Rollback disables global/cohort write and award controls and registry enablement.
Do not clear cutover, reassign members, delete earned evidence or restore the
legacy authorization path. New preparation can remain visible during a write
pause. A future public launch is outside this all-user pilot release.

## Activation receipt — 16 October 2026

PR #327 merged as `0e38b1bfe8645c1ca29a09db4ae37560380be459`.
CI run `38831375338` passed 2,136 unit tests and 86 browser tests, including
the full migration chain and release rehearsal. The one migration was applied
once, with permanent cutover at `2026-10-16T00:55:44.163337Z`. All five release
flags are enabled, alongside 42 criteria, nine components and one award contract.
The 27 historical qualifications and 19 historical assessment rows have identical
before/after fingerprints (18 assessments remain pending/assigned).

`node scripts/c1af28-release-report.mjs` emits a read-only scoped SQL report for
repeatable verification. It distinguishes eligible active accounts from personas,
reports missing members, and detects accidental persona membership. It never
connects to or writes to a database. Run its output through the authorized SQL
connection. The original estimate of ten additional assessor personas was
incorrect; the role/persona join above is the authoritative account breakdown.
