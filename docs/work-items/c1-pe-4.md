# C1-PE-4 — Chapter 1 training monitoring in the assessor workspace

Owner/release coordinator: current Codex session, no parallel batch.
Branch: `feat/c1-pe-4-training-monitoring`; base main `0cf15e8d` (PR #518).
Updated: 21 November 2026. Implemented; final release receipt belongs in this
increment's PR body after required CI and production verification.

## Scope and interpretation

Extend the existing assessor workspace RPC and roster. Preserve its active-assessor,
non-persona, visible-program/course, and catchment checks. Enrich only the existing
page of at most 20 active BHWs. No per-learner network requests or new routes.

Each learner shows recorded required-lesson completions / currently published
required lessons, retained pre/post-test scores and form/release, retained submission
counts, completed optional practice checkpoints, and expandable follow-up topics.
Recorded completion counts use the same lesson-ID interpretation as the existing
training dashboard; they do not certify revision currency or formal readiness.

Assessment interpretation:
- Earliest retained submitted result per phase, ordered by submission time then ID.
  This is not a claim about a deleted/reset original attempt.
- A snapshot attempt and its linked final course-test record count once.
- Unlinked historical final records retain their scores but have no invented topic
  mapping. Invalidated attempts are excluded. Drafts have no score or topics.
- A retained submitted result takes precedence over a draft in the phase status.
  Additional retained submissions are counted, not substituted for the first score.
- Completed optional practice is counted separately; skipped/in-progress practice
  is not a completed checkpoint or an assessment attempt.
- No averages or pre/post learning-gain claims combine incompatible forms.

Follow-up counts use only the earliest retained submitted post-test's immutable
question-to-lesson mapping and saved responses. Current published lesson titles
label those saved keys. Unknown/unmapped or unpublished topics are not fabricated.
Each topic reports missed/unknown/missing responses over mapped questions, with
unique question IDs so duplicate mapping keys do not inflate the denominator.
Questions may map to multiple topics: do not sum topic counts. Output is capped
at 60 topics per learner (the current Chapter 1 has 42 lessons). No question text,
answer keys, responses, or draft item data are returned to the assessor client.

Page-level post-test counts explicitly describe the displayed filtered page, not
the full catchment. Low results indicate possible follow-up needs, not incompetence
or an official readiness decision. Existing policies and formal workflow stay intact.

## Verification and delivery

Local focused checks: 20 passed, covering pagination/cohort reconciliation,
catchment/role denial, linked-final deduplication, first versus later forms,
historical/draft/not-started states, practice separation, absent mappings, and UI
language/denominators. Phone rendering with fictional data passed at 320px / 200%
text in English/Filipino and light/dark themes, including expanded topics and WCAG
A/AA checks. That browser check is also in required CI.
Typecheck passed; lint passed with five existing warnings. Production build and
required CI results are recorded in the PR release receipt.

Full migration replay must pass through CI's disposable `supabase start` before
release. Local Docker image unpacking previously exhausted its backing storage;
no automated tests or seeds may be redirected to the pilot.

Read-only pilot preflight: workspace RPC body MD5
`65f6a5793517cf70e926ba59fedc6c04` matches the previous migration; anonymous execute
is denied and authenticated execute allowed, with empty search_path.

Apply `20261121023406_chapter1_workspace_monitoring.sql` once at merge time, after
required CI and pilot health checks. It replaces one read-only RPC. No tables,
content load, learner writes, flags, or assessment policy changes are required.

Prior release: main `0cf15e8d`, production `dpl_2ze5HBtFRH6g9ECK7LbqEHryY4ym`.
Rollback the app independently; extra RPC fields are compatible with the old UI.
If needed, a corrective migration can restore the RPC definition from
`20261012232945_assessor_chapter1_workspace.sql`. No learner data restoration.

Live review route (after deployment):
https://bhw-connect-phase-2.vercel.app/training/8dfe8b88-84ce-4e60-a353-93031eceda59/assessor/workspace#roster
Filter the BHW roster and expand Topics needing follow-up. Stable signed-in pilot
credentials are unavailable; report deployed but authenticated usability unverified.

Next independent phase: C1-PE-5 connectivity resilience and assessor exercises.
The unresolved C1-PE-3 retake/pretest-disclosure policy decisions remain unchanged.
