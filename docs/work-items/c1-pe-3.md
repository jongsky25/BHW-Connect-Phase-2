# C1-PE-3 — saved post-test explanations and manual reading

Owner/release coordinator: current Codex session; no parallel batch.
Branch: `feat/c1-pe-3-assessment-review`, based on main `7cd1e1ca` (PR #517).
Updated: 21 November 2026. Status: implemented; release evidence will be recorded
in this increment's PR description after required CI and deployment complete.

## Scope and preserved policy

Fix baseline gap G07: the existing review UI supported wrong-choice explanations,
but the review RPC omitted them. Return `distractor_rationale` from the original
attempt's immutable form snapshot. Never read explanations from today's active
form. Missing saved explanations remain missing; no scores or attempts are edited.

The existing submitted-owner post-test gate and authenticated-only grant remain.
BHW and assessor review keep their current eligibility rules. Pretest detailed
answers, additional BHW retakes and assessor qualification/retry policy are not
changed. Those decisions remain unresolved as documented in C1-PE-0; this is the
independent review improvement, not completion of the entire C1-PE-3 policy phase.

Reuse the reviewed 2022 manual reader for each saved question's mapped lesson.
Label this as later supplemental reading, separate from the saved test and score.
Legacy attempts retain their explicit provenance limitations without invented
manual mappings. Bound the existing lesson lookup and disable review navigation
prefetch. No new content, loader, flags, dependencies or learner writes.

## Verification

Focused page/database tests cover saved explanations, a later active release,
missing explanations, unchanged score, draft/pretest/other-owner/anonymous denial,
English/Filipino copy, mistake filtering and historical provenance.
Local focused tests: 19 passed. Typecheck and production build passed; full lint
passed with the five existing warnings. The actual review page and expanded manual
passed at 320px / 200% text in English/Filipino and light/dark themes, including
WCAG A/AA checks. This browser check is included in CI and uses fictional RPC
results with no database calls.

Read-only pilot preflight: ACTIVE_HEALTHY; existing RPC body MD5
`151388926bdc683b4dd7e1c9836f1b1f` matches the repository baseline. Anonymous
execution is denied, authenticated execution allowed, with empty search_path.

Required CI must pass before release, including a full migration replay using
`supabase start` on its disposable database. Local replay uses the same pinned CLI
as CI. Local checks and any environment limitations are recorded in the PR receipt.

## Delivery and recovery

Apply only `20261121011608_chapter1_review_saved_explanations.sql` once at merge
time, after checking pilot health and verifying the existing function definition.
It replaces one read-only function and preserves its signature and authorization;
no data migration, content load or flag change is required.

Prior production: main `7cd1e1ca`, deployment `dpl_Hz6HbzMWUP8W6TYJWWqu5H5Vh14g`.
An app rollback can leave the extra response field in place. If the RPC must be
reverted, use a corrective migration restoring its definition from
`20261012152647_assessor_chapter1_shared_assessment.sql`; do not rewrite history.
No learner data restoration is needed.

Review: https://bhw-connect-phase-2.vercel.app/my-results
Open an eligible Chapter 1 post-test, choose Needs review, and expand the manual
reading. Check saved selected/correct responses and explanations. Existing login
and eligibility restrictions apply. Signed-in pilot verification requires stable
review credentials, currently unavailable; never substitute automated pilot E2E.

Next independent phase: C1-PE-4 monitoring under the existing attempt definitions.
Any change to retakes or pretest answer disclosure still requires the unresolved
owner policy decision recorded in C1-PE-0.
