# C1AF-27 disabled Chapter 1 registry implementation

The installer reconciles the 42 approved authored packages with a read-only
pilot publication receipt, then pins lesson IDs to their current revision and
content hash at installation time. All 42 hashes matched on 15 October 2026.
No lesson or published revision is changed. The generator verifies those hashes
again and generates one migration containing the exact bilingual rubric data,
DOH issuer snapshot, approved test phases and decision reference.

The read-only pilot check during preparation found 27 active legacy staff
qualifications and 18 pending/assigned Chapter 1 legacy assessments, rather
than the earlier preflight receipt's two. All three reviewed registries are
still empty and both global write/award flags are false. Recheck the live queue
at release; do not apply the earlier two-record disposition to the whole queue.

The migration installs one disabled award contract, 42 disabled practice
criteria, nine disabled component requirements, 42 lesson memberships and 42
criterion memberships when the published BHW Reference Manual Chapter 1 exists.
A publication mismatch, changed required count, changed component membership,
pre-existing registry or missing revision aborts installation atomically. Empty
local databases retain the pinned owner decision and can invoke the same private
installer after their disposable content is loaded. Ordinary app roles have no
installer, owner-decision or archive access.

Briefing and simulation accept the existing draft requirements and
`chapter-1:c1af25.pilot-1`; the acknowledgement sends the cohort's actual version.
A draft acknowledgement never satisfies the pilot version, and a simulation
receipt must match its containing state's requirements. No cohort is retargeted.
An old simulation with a different version is blocked until a privileged,
explicit preparation transition archives it. The private archive function
preserves its state and request payloads, then frees the active run slot for
fresh preparation. It refuses earned revised awards, non-draft runs, or an
actor whose cohort has writes/awards/cutover open. The immutable archive does
not alter old qualifications, observations, exams, orientation, or awards.

At merge, first verify the current publication against the receipt and run the
preflight SQL; apply this one migration once using the normal deploy runbook.
Keep all global and cohort writes/awards and cutover controls closed. Disabling
registry rows remains the rollback; do not delete earned evidence or reopen a
cutover legacy path. No production SQL has been applied during PR preparation.

Before a later limited pilot release: record a representative assessor's
uncoached walkthrough; name the assessor and BHW cohort; recheck pending legacy
assessment ownership and exclude those BHWs from cutover until their reviewed
legacy disposition is complete; archive draft preparation only for specifically
selected eligible assessors; retarget only the reviewed cohort; obtain fresh
version-bound briefing and simulation evidence and explicit staff recovery;
then review the activation SQL and before/after counts. Global activation is
not part of C1AF-27. The authored legacy crosswalk audit remains draft and is
not rewritten to claim old indicators equal the new lesson criteria.

Verification: `node scripts/c1af27-registry.mjs --check`, the focused registry
and version-binding tests, lint, typecheck, and full PR CI including the entire
migration chain and local browser story. Review CI before merge. The PGlite
rehearsal verifies atomic drift/membership rejection, exact disabled counts,
app-role denial, immutable archival and legacy qualification retention.
`node scripts/c1af27-local-rehearsal.mjs` runs after the full migration chain in
CI, loads all 42 real authored lesson packages into a throwaway course inside
one rolled-back transaction, invokes the private installer against the real
schema, and checks the disabled counts and unchanged legacy qualifications.
The workspace's direct `supabase start` attempt could not unpack the Postgres
image because its Docker storage ran out of disk space. Full replay evidence
therefore comes from the CI runner; no successful workspace Docker replay is
claimed.
