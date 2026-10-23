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
