# C1AF-25 pilot preflight handoff

**Status:** release preparation only. The read-only inventory in
`scripts/c1af25-pilot-preflight.sql` is the bounded deliverable. It does not
install a policy, migrate a BHW, select a pilot cohort, or enable any gate.
Run it again immediately before an approved activation because the pilot changes
while the application is in use. The query contains no password, note text,
learner name, or free-form assessment content.

## Pilot receipt — 15 October 2026, 01:16 UTC

The query ran through the Supabase SQL tool against pilot project
`ltzicxyefizxoqhfuuzc` and returned one published Chapter 1 program. The
preparation cohort (`chapter1-preparation-release`) contains 52 active
assessors and zero BHWs. Its UI control is on; its writes, awards, and
authority cutover are off. Global `assessor_flow_ui` is on and global
`assessor_flow_writes` and `assessor_flow_awards` are off.

The reviewed registry has zero award contracts, practice criteria, and
component requirements. Revised Chapter 1 staff awards, BHW component
requests, formal attempts, and chapter reviews are all zero. There are 27
active legacy Chapter 1 staff qualifications; these are not revised awards.
The two pending legacy Chapter 1 assessments are unassigned and their BHWs
are outside the preparation cohort:

| Assessment ID | Created UTC | Proposed pilot disposition |
| --- | --- | --- |
| `20b64c43-6fdc-413c-9ab0-81eaea450ce8` | 14 Oct 13:07 | Finish through the existing legacy queue; exclude this BHW from the first cutover cohort. |
| `aa2c94e0-13a8-4ffc-b330-15bec7487bf6` | 15 Oct 00:08 | Finish through the existing legacy queue; exclude this BHW from the first cutover cohort. |

`npm run assessor:check` and
`node scripts/chapter1-assessor-audit.mjs --summary` still report
`readyForActivation: false`: all 42 lesson relations are draft partial-evidence
proposals, with no exact bilingual anchor matches to the 36 legacy module
indicators. No repository or pilot approval record resolves the component
mapping, orientation rubric, evidence sufficiency, and Chapter 1 award rule.
Passing C1AF-24's synthetic local story did not approve those decisions.

## Next release decision

Before a C1AF-25 activation PR, record the approving reference and exact
versions for the Chapter 1 curriculum, criterion mapping, bilingual rubric,
evidence sufficiency, orientation, simulation, issuer, and award rule. Name
each required lesson, criterion and test phase for each of nine components;
decide the 1.3 refusal and 1.6.2 clarification conflicts in the
[mapping audit](chapter-1-assessor-mapping-audit.md). State whether any prior
evidence may be reused. Record the representative assessor's uncoached
C1AF-24 walkthrough findings. Identify one limited assessor/BHW cohort and
how its members will obtain genuine revised staff qualification. The proposed
disposition above keeps both pending BHWs on the existing legacy path. Recheck
their status and cohort membership immediately before cutover; if either BHW
has joined the selected cohort, stop and review that record separately.

Once these decisions exist, prepare a separate reviewed release package that
installs exact approved registry rows and cohort members, rehearses the full
migration chain locally, and tests the proposed transition against the 27
legacy staff qualifications and the pending BHW records. The production
activation must then follow the flow plan's limited pilot review. A failed
pilot can close new writes while preserving evidence and read access; an
authority cutover cannot be undone to reopen the unqualified legacy path.

## Verification and release boundary

The SQL was executed read-only against the pilot and returned the counts above.
The existing C1AF-24 PR's local E2E passed the full synthetic story. This
preflight PR needs normal CI review, but has no database migration or runtime
deployment effect. Merge must not be interpreted as permission to switch
`assessor_flow_writes`, `assessor_flow_awards`, cohort writes/awards, or
`authority_cutover_at`.
