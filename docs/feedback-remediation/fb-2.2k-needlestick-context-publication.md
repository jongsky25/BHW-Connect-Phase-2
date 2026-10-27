# FB-2.2k — approved pretest T27 needlestick stem release

The owner approved the exact English and Filipino stems in the [review packet](fb-2.2k-late-pretest-scenarios-review.md) with “yes” on 27 October 2026. The packet merged in [PR #424](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/424) at `903b190cfb7c04affd54279e8d6e6e8fb1f7db59`. The [approval record](../../content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-needlestick-context-v8/approval-record.json) binds the exact proposal hash, reviewed commit, release scope and owner reviewer. Independent specialist sign-off is not claimed.

`chapter1-feedback-needlestick-context-v8` replaces only the pretest T27 stem. It names a used-needle injury at the health station while retaining the no-symptom condition. It has a new immutable item identity. Its three choices, order, `o1` key, rationales, safety source and target stay verbatim. The other 59 form items, unchanged posttest item hash and 48 checkpoint items remain as in v7. Cross-release score comparability remains unvalidated.

## Curriculum pin reconciliation

The review packet anticipated all 42 curriculum pins would remain unchanged. Read-only pilot verification before implementation found that two lessons had since been published as separate owner-approved revisions: `bhw-roles-application` through FB-2.2i and `safety-identify` through FB-2.3o. The guarded assessment importer requires every new-release pin to match the **current published** lesson revision. V8 therefore pins those two exact already-live revisions; the other 40 pins remain byte-for-byte unchanged. This is release bookkeeping for the current curriculum, not a new lesson publication or a change to any existing assessment enrollment. The two approved lesson hashes and revision IDs are bound in the v8 approval record and checked in the disposable publication test.

Guarded SQL verifies the active v7 release/hash and both form hashes, all 42 published curriculum revisions and absence of conflicting or withdrawn v8 data. It inserts immutable v8 forms and checkpoints, then activates v8 only for new enrollments. A failed guard rolls back. All 23 current Chapter I enrollments are pinned to v1 and retain both phases, drafts, responses, snapshots and scores. The original Spot Feedback reports remain open for authenticated pilot comments.

Publication and production receipts will be added after CI, merge and the pilot transaction.
