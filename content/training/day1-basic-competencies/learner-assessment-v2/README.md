# Chapter 1 learner assessment source

`orientation.json` contains the bilingual opening, overview, nine major-lesson introductions, and recap. Its editorial status is approved by `jongsky25` for this release.

`draft-items.json` preserves the original 108-item working bank generated from `draft-question-seeds.mjs`. `release.json` is the immutable reviewed snapshot: 60 paired form items and 48 checkpoint items, with item-by-item bilingual and safety/privacy approval attributed to `jongsky25` in `approval-record.json`. `curriculum-revisions.json` pins the 42 published pilot revisions. Form comparability remains unvalidated.

The Chapter 1 v2 switch defaults off. Validate with `node scripts/chapter1-assessment-check.mjs`, import the release transactionally, reconcile the destination curriculum, and activate only after the learner journey and rollback are verified. Once enabled, BHWs and assessor candidates use the same immutable pre-test and post-test forms and assessment UI. Assessor scores are recorded separately for the Chapter 1 qualification gate, including its 80% post-test requirement and retakes. The existing `test-questions.json` remains the legacy fallback while v2 is disabled and must retain at least 38 questions.

The future `release.json` contract is enforced by `scripts/lib/chapter1-assessment-content.mjs`. It has `release_id`, `blueprint_id`, `source_commit`, fixed `program_key`/`chapter_key`, `publication_status: "approved"`, `comparability_status: "unvalidated"`, a 42-entry `curriculum_revisions` array (`lesson_key`, `revision_id`, `sha256`), two forms under `forms.pretest` and `forms.posttest`, and twelve `checkpoints`.

Each form has a unique `form_id`, 30 ordered `items`, and a SHA-256 `hash` of `JSON.stringify(items)`. Each item has a UUID `item_id`, stable `editorial_key`, integer `version`, `target` slot (`T01`–`T30`), bilingual `stem` and `rationale`, three stable option IDs with bilingual labels and distractor rationales, `correct_option_id`, linked `lesson_keys`, `source`, `reviewer`, and `review_status: "approved"`. A safety or privacy sensitive item sets `safety_privacy_review_required` and names its reviewer. The two forms must use different item IDs. Each checkpoint uses its mapped `G01`–`G12` key, `after_lesson_key`, two `first` items and two `alternates`; checkpoint items follow the same schema with the group as `target`.

The private SQL schema stores immutable forms and exact attempt snapshots. It is not a content approval mechanism. Schema validity cannot establish correct clinical guidance, bilingual meaning, fairness, or form comparability.

## FB-2.2a UHC proposal

`proposals/fb-2.2a-uhc/proposal.json` is a draft overlay against the exact
reviewed release, with two new version-2 T05 items and an unscored provider
terminology note. Its [review packet](proposals/fb-2.2a-uhc/REVIEW.md) shows the
current and proposed bilingual stems, every option, proposed keys, rationales
and official-source links. Reviewer identities remain unassigned.

`node scripts/feedback-uhc-proposal.mjs` validates the overlay and reports new
draft form hashes. `--review` prints the review packet. An explicit `--output`
exports a complete draft candidate outside this source folder, without
overwriting existing files. The command has no import/activation operation.
The ordinary approved-release validator still rejects the exported draft.

The active `release.json`, its approval record, T06 referral questions, the
other 58 form items, 48 checkpoint items and 42 curriculum pins are unchanged.
Existing enrollments retain the original release for both phases, drafts finish
their pinned forms and submitted answers/scores remain historical. A separate
reviewed publication and activation change is required; this proposal does not
establish comparability or claim new approvals.

The scoped course-progress reset removes v2 assessment attempts, enrollments, in-progress practice, unshared learning-note drafts, and major-introduction view markers. It preserves completed practice and shared note versions with their replies as learner history; a draft with shared versions remains because those versions refer to it. Account deletion follows the existing user foreign-key cascade. No new retention period is introduced.

## Approved feedback release

The owner approved the exact FB-2.2a review packet with “approved contents then
publish”. The receipt is in
[releases/chapter1-feedback-uhc-v2/approval-record.json](releases/chapter1-feedback-uhc-v2/approval-record.json).
It pins the proposal hash and reviewed commit and records owner approval;
independent specialist sign-off and pilot usability validation are not claimed.
The original proposal and v1 release remain immutable historical artifacts.

The approved snapshot at `releases/chapter1-feedback-uhc-v2/release.json` contains
both new T05 items and the approved unscored terminology text, appended verbatim
to the post-test T05 rationale. The existing submitted-review route displays it;
it is excluded from in-progress assessment payloads and does not affect scoring.
All other questions, checkpoints and curriculum revisions are unchanged.

`node scripts/feedback-uhc-publication.mjs` verifies the approval/proposal binding,
rebuilds the exact snapshot and runs the unchanged release validator. `--sql`
prints a transaction for deliberate publication; the command never connects to
a database. The transaction verifies the expected baseline and all 42 live
curriculum pins, rejects identity/content conflicts, imports new immutable
forms/checkpoints and atomically switches the active release. It can be rerun
without duplicating records. It does not update enrollments, attempts, responses
or scores. The old release becomes `draft`, which remains usable by pinned
enrollments; `withdrawn` would block them. New enrollments use the active v2
release. Form comparability remains unvalidated.

Before executing the transaction, run the publication tests and normal checks,
merge the release PR after CI, and record the live release/form hashes before
and after. Do not run development or E2E against the pilot database. Rollback
changes only assignment: in one transaction set v2 to `draft`, then v1 to
`active`. Keep both immutable releases and all enrollment pins. New v2
assignments already created must finish on v2, even after rollback.

## FB-2.3 accreditation and CSC proposal

[The bilingual review packet](proposals/fb-2.3-accreditation-csc/REVIEW.md)
contains two proposed version-2 T11 items, an agency-name expansion in the
existing BHWE conditions section, and an unscored Read/Slides section separating
filing from certificate receipt. All choices, rationales, displays and narration
copy are included. The proposal pins the approved UHC v2 assessment and the
published `bhw-eligibility` source hash; neither source is edited.

Run `node scripts/feedback-accreditation-csc-proposal.mjs` to validate the draft,
`--review` to reproduce its review copy, or
`--output /tmp/fb-2.3-candidate.json` for the full local bundle. Exports require a
new file outside the repository. The command has no database/import/activation
operation. The assessment remains draft and fails the ordinary import approval
contract. The candidate's 42 old lesson pins are baseline references only: the
CSC lesson must be reviewed, its narration/captions and optional story reconciled,
and a real approved lesson revision published before future assessment pins can
be refreshed. A draft hash cannot stand in for that published revision.

The other 58 test items (including both approved UHC T05 items), all 48 practice
items and current lesson content remain unchanged. The draft keeps comparability
unvalidated and existing enrollment/attempt continuity. No reviewer approval or
new media generation is claimed. The cited DILG committee guidance could not be
freshly retrieved; the packet records that limit for content review.
