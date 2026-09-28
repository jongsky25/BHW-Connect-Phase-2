# AF-03 — assessor qualifying chapter exams

AF-03 follows assessor personal study in PR #168. It adds a diagnostic pretest, server-scored qualifying post-test, retained attempts, and retakes under the assessor's own account. It does not use BHW `course_test_attempts`, `course_progress`, assessments, or certificates.

## Chapter contract

- Chapter I uses the 42 authored required lessons and the reviewed chapter test bank. Its diagnostic pretest has no passing mark. After all current published lesson revisions are complete, the post-test requires **80%**.
- The current manifest has no required subchapter quizzes. When quizzes are authored and approved, they need their own versioned exam rule before they can become a qualification prerequisite.
- Chapter II has no authored qualifying bank, so no exam rule is installed and its exam route remains unavailable. Its 55 lesson study path remains available under AF-02.
- The candidate curriculum remains draft. An exam pass alone confers no assessor qualification; AF-04 orientation and AF-05 issuance remain separate.

## Persistence and scoring

`assessor_exam_attempts` stores each attempt, result and the curriculum version. A private, immutable question snapshot contains the answer key for that attempt. `rpc_assessor_exam_open` resumes an open attempt across reloads and creates a new one only when a retry is allowed. A bank edit after opening does not change that attempt's scoring. `rpc_assessor_exam_submit` rejects missing, duplicate, foreign and out-of-range answers, scores on the server, and preserves failed history. A passing post-test ends further retakes for that curriculum version.

The public attempt table has active-assessor, self-only read RLS and no client writes. The snapshot and authored requirement table are in an unexposed schema. The three public RPCs derive the actor from authentication, check chapter publication and catchment, and never accept a user id or score from the browser. `rpc_assessor_candidate_exam_state` is the AF-04 unlock contract: it rechecks the diagnostic, all **current-revision** lessons and a passed exam on each read.

AF-02 candidates who completed lessons before AF-03 can still take the diagnostic; the attempt is marked `pretest_late`. New lesson completions require the diagnostic first. The study route directs candidates to that test before opening a lesson.

## Verification and release boundary

- The isolated PostgreSQL test executes the exact migration with the existing auth and visibility helpers. It checks the 42-lesson rule, 80% boundary, retries, retained history, snapshot scoring after a bank edit, answer validation, role/scope denial, RLS and direct-write denial.
- Run a full local Supabase migration replay and a signed-in browser journey before merge. The isolated fixture is narrower than the complete stack.
- Review this migration with the PR. Apply it to the pilot only in the merge-time migration batch under `CLAUDE.md`.
