# FB-3.2 — personal test results and completed-test review

The owner directed implementation of the next results/history increment and
live publication for feedback. The seven original reports were checked
read-only against the current system. This slice supplies actual result screens
and supported review improvements, preserving the approved assessment policy.

## Report dispositions

| Report | Delivered behavior or retained rule |
| --- | --- |
| `d28d7fd4-6c0b-4664-8f6f-fcada2b78923` | The assessor queue now links to the assessor's own test results, separately from assessments of learners. |
| `e8e2dab6-6182-4329-960b-539db132357d` | `/my-results` shows personal completed pre/post history, dates, original form versions and supported post-test review links. Courses and Chapter 1 assessment entry/result screens also link to it. |
| `2b015b51-8632-473b-8e0f-1dee70276c15` | Exact raw counts accompany percentages when complete frozen scoring evidence agrees with the saved score. Older/inconsistent/incomplete evidence retains the saved percentage and clearly omits an unverifiable raw count. |
| `433c9daa-82af-4d54-82c7-d475242ba780` | Completed Chapter 1 post-test review is easier to find. It adds a raw count when supported and a Needs review filter including unknown responses, retaining original question numbers and frozen explanations. |
| `6b501f24-7b57-4e89-931e-f4b3de41aa3a` | Existing scoring-orientation labels, contextual anchors and choices are color coded green/amber/red with their text labels retained. Criterion evidence and rating/qualification rules are unchanged. |
| `b9cc01a4-274b-43d0-adc0-e8c27f69db4b` | Pre-test aggregate results are discoverable; baseline answer keys remain withheld under the current policy. The report remains a policy request for any broader disclosure. |
| `5adf3270-ea71-432f-964f-c40df3ca5a42` | Pre-test scores/raw aggregates are visible where supported. Item-level correctness and rationales are not released for the baseline; this request remains separately scoped to policy. |

## Read-only history contract

CLI-generated migration `20261024070200_fb32_personal_test_history.sql` adds
`rpc_my_test_history`. The existing private owner helper requires the current
authenticated active BHW or assessor. There is no learner-ID parameter and no
role claim from editable user metadata. Every source filters to that owner.
Anonymous/PUBLIC execution is revoked; authenticated execution is explicit.
The function has an empty search path and reads private scoring evidence only
to return allowlisted aggregate metadata, never snapshots, options, keys,
responses, rationales or item-level baseline correctness.

The function combines submitted versioned attempts with their unmatched BHW and
assessor legacy records. Mirrored ledger rows are deduplicated by saved IDs,
not by percentage/date guesses. Pagination is bounded and stable. Drafts and
unsubmitted assessor exams are excluded. Course metadata is limited to the
owner's recorded tests. Preview mode does not fetch another persona's results.

For versioned attempts, the raw count uses the submission scorer's exact match
rule against the immutable form snapshot. It is returned only with a complete
response set and agreement with the stored rounded percentage. It does not
update the score or regrade the attempt. Historical percentages are not inverted
to guess a numerator or missing denominator. An assessor legacy question count
is retained as metadata but does not establish a correct-answer count.

Pre-test review links are never offered. Post-test links use the existing
owner-checked review RPCs; the new filter does not widen their authorization.
Legacy review retains its existing form-membership/provenance limits. Different
form versions are not automatically compared, and practical ratings are clearly
separate from knowledge-test scores. No enrollment, release, snapshot, grade,
progress, qualification or award is rewritten.

## Verification and release

Database tests exercise actual owner-helper bodies, BHW/assessor ownership,
stranger isolation, anonymous/inactive/admin denial, mirror deduplication,
pagination, exact and unavailable raw counts, safe output fields and no learner
writes. UI/route tests cover raw/legacy displays, baseline policy, history
navigation, preview/role/feature gates, failure recovery, post-test filtering
without renumbering, and labeled colors without new grading behavior.

A disposable-backend BHW browser journey opens personal history from Courses
on a phone-width viewport. Full unit/CI results and deployment receipts are
recorded in the PR. No write-based tests or fake test attempts run on the pilot.

After CI and merge, apply the additive read-only function migration before the
new production build finishes. Verify its signature, ACL, search path and
owner guard, compare learner/history fingerprints, and compare security
advisories to the recorded baseline. Verify the production commit and login
gate. Rollback can restore the previous frontend while leaving the unused
read-only function in place; no data restoration is needed.

All seven reports remain open for live feedback or the recorded policy decision.
This implementation does not claim owner-directed closure or a new baseline
answer-disclosure policy.
