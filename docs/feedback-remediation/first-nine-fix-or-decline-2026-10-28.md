# First nine feedback reports — fixes and explicit declines

The owner clarified on 28 October 2026 that each item needs a completed fix
where applicable or an explicit **will not fix** decision. The earlier nine
review-only packets do not satisfy that instruction and are superseded by this
disposition work. Original feedback messages and historical review evidence
remain intact.

## Concrete dispositions

| Item | Disposition | Scope and reason |
| --- | --- | --- |
| 1 | Fix | Replace the untranslated Filipino `clinical licence` phrase with `lisensiya para sa gawaing klinikal` in Read and Slides narration, with matching Filipino audio. Retain valid British English `licence` in English. |
| 2 | Will not fix further | The current UHC Read/narration explains inclusion versus covered services, and the released slide note supplies the missing qualification. The report identifies no other sentence. Decline an additional speculative rewrite. |
| 3 | Fix | Replace `company representative` / `kinatawan ng kumpanya` with a visitor in the exact Read and Slides narration, with matching English/Filipino audio. Preserve the offer and Milk Code refusal. |
| 4 | Will not fix further | The safety glossary and clearer approved wet-floor choice address identified wording problems. No specific further mistranslation is identified. Decline a broad unbounded translation rewrite. |
| 5 | Will not fix further | Keep the released HEPO layouts, focus, viewing guidance and Filipino clarification. The mixed praise/readability report supplies no further difficult passage; decline another unspecified curriculum rewrite. |
| 6 | Fix | Replace the shortened Filipino HEPO role clause with the requested fuller sentence in Read, with matching Filipino audio. |
| 7 | Fix | Replace both Filipino open-question headings with `Maging bukas muna, hanapin ang linaw`, with matching timed Filipino narration. |
| 8 | Will not fix | Retain the approved fictional health-team helper, explicit role cards and statute links. Decline adding an official-character credential as a substitute for legal source verification; no new speaker/story rewrite. |
| 9 | Will not fix | Keep the released visual hierarchy, authored HEPO Slides and contrast correction. Decline an additional font/background redesign from the general “more lively” preference; preserve established readability and theme behaviour. |

“Will not fix further” declines additional work beyond the existing released
improvement. It does not claim that the original historical session was
reproduced or that the reporter endorsed the current design. These five reports
will be dismissed under the owner's fix-or-decline instruction. The four fixes
will be resolved only after their exact successor content is published and
matching code/media is verified on the canonical deployment.

## Release safeguards

[Exact replacements and successor hashes](../../src/lib/elearning/feedback-wording-releases.json)
bind four immutable successor lessons. Authoring packages, existing recordings,
original narration manifest, prior lesson revisions, formal assessment releases,
enrollment pins, attempts, answers and saved scores remain unchanged. Only
the unused formative practice criteria follow the new published revision;
guarded SQL refuses publication if practice attempts appear or the baseline
pointer/text drifts. Private facilitator notes are copied unchanged.

The existing current-revision completion policy applies: old lesson completion
rows remain historical evidence, and affected learners may need to complete
the successor lesson's check before current progress counts it. Historical
progress is never rewritten to claim completion of revised content.

Five new recordings cover only the changed Read section/language pairs. The
runtime selects them by exact text/timing match and retains the old recordings
for old/pinned sections. Existing HEPO and legal-context presentation gates
accept only the exact successor hashes; unchanged text/asset/source checks
remain. Original optional story videos retain their original recordings; no
newly voiced story is claimed.

The new additive narration receipt pins all five new MP3 hashes. Historical
media audits still compare every original byte; their only new exclusions are
those five verified additions. Two historical release tests incorrectly looked
for rendered media-package source in pre-render commits. They now compare the
actual frozen owner-approved artifact bytes/hashes instead. The older CI audit
still sees its exact original test bytes through a hash-bound predecessor
receipt; no earlier approval record or source/media hash changes.

## Verification and live receipt

Publication SQL is tested in disposable in-memory Postgres for exact wording,
unchanged source/history, and rejection of practice-attempt and pointer drift.
Presentation/narration tests verify successor bindings and independent playback
selection for historical sections. All five actual replacement MP3s passed model-mediated checks for intelligibility,
complete endings, and no meaning changes, omissions or additions. The reviewer
noted the English pronunciation of “section” for “seksiyon” on item 1; it found
no meaning change. This is not human listening or an authenticated production
journey. The full report is [recorded here](first-nine-audio-review.json).

Before publication, the live formal assessment baseline was 23 enrollments,
45 attempts, 1,294 responses and score sum 3,943.6. Global lesson-completion
counts were 786 BHW and 2,922 assessor rows. Post-publication results and the
per-item live feedback counts will be recorded here after the guarded writes.

The nine reports were already reviewed in the fixed baseline, so baseline
reviewed stays **9/55** and awaiting review stays **46** during this correction.
Each actual resolved/dismissed report reduces the fresh live-open count; the
two owner-deferred reports remain open. No reply is sent and no staff actor is
impersonated when recording a feedback disposition.

### Item 1

Disposition: **fixed**; live status: **resolved**.

Published the Filipino lisensiya para sa gawaing klinikal replacement in Read and Slides narration, with matching Filipino audio. Retained valid British English licence in English.

Published revision `ac99a005-8262-4897-9dd4-9e58b33eed8c`, hash `b308c59307f5dfc09c77f1137fc4d675b11d268c918adb3efa4187a23ab0bce9`.

Verified at `2026-10-28T02:15:25.523251+00:00`. Reviewed baseline items: 9/55; baseline items awaiting review: 46; live open feedback: 54 (49 new, 5 in_review); of these, 2 owner-deferred; new reports since baseline: 0.

### Item 2

Disposition: **will_not_fix**; live status: **dismissed**.

No further speculative rewrite: the current UHC Read/narration and released slide qualification explain inclusion versus covered services; the report identifies no other sentence.

Verified at `2026-10-28T02:15:49.426372+00:00`. Reviewed baseline items: 9/55; baseline items awaiting review: 46; live open feedback: 53 (48 new, 5 in_review); of these, 2 owner-deferred; new reports since baseline: 0.

### Item 3

Disposition: **fixed**; live status: **resolved**.

Published visitor/bisita in place of company representative/kinatawan ng kumpanya in the exact Read and Slides narration, with matching English and Filipino audio. Preserved the offer, Milk Code refusal and answer keys.

Published revision `bc1091b3-910d-4e1a-b759-4b8e6e6443a7`, hash `b57ed597db2633581d612eae7685d46aa3224dc2d43d31bee49e7912288a5f5d`.

Verified at `2026-10-28T02:16:11.340284+00:00`. Reviewed baseline items: 9/55; baseline items awaiting review: 46; live open feedback: 52 (47 new, 5 in_review); of these, 2 owner-deferred; new reports since baseline: 0.

### Item 4

Disposition: **will_not_fix**; live status: **dismissed**.

No broad additional translation rewrite: the released glossary and clearer approved wet-floor choice address the identified issues, and this report names no further mistranslated sentence.

Verified at `2026-10-28T02:16:21.626174+00:00`. Reviewed baseline items: 9/55; baseline items awaiting review: 46; live open feedback: 51 (46 new, 5 in_review); of these, 2 owner-deferred; new reports since baseline: 0.

### Item 5

Disposition: **will_not_fix**; live status: **dismissed**.

No additional unspecified curriculum rewrite: retain the released HEPO layouts, learning focus, viewing guidance and Filipino clarification. The mixed praise/readability report supplies no further difficult passage. The separately identified exact sentence is handled as item 6.

Verified at `2026-10-28T02:16:34.001225+00:00`. Reviewed baseline items: 9/55; baseline items awaiting review: 46; live open feedback: 50 (45 new, 5 in_review); of these, 2 owner-deferred; new reports since baseline: 0.

### Item 6

Disposition: **fixed**; live status: **resolved**.

Published the requested fuller Filipino HEPO role sentence in the Read source, with matching Filipino narration. Preserved the lesson examples and all check choices and keys.

Published revision `bc9331ba-e21c-4e52-943e-09b34b5f0de3`, hash `71f85fe16b606e4d3d806e78a28518ee1444d0fab4842dd43f719be500a15da3`.

Verified at `2026-10-28T02:17:00.241446+00:00`. Reviewed baseline items: 9/55; baseline items awaiting review: 46; live open feedback: 49 (44 new, 5 in_review); of these, 2 owner-deferred; new reports since baseline: 0.

### Item 7

Disposition: **fixed**; live status: **resolved**.

Published Maging bukas muna, hanapin ang linaw as both Filipino Read and Slides headings, with matching timed Filipino narration.

Published revision `1929bbec-5a77-474f-8c3c-a09ba45f630c`, hash `866eb828d42c12f36121a713ab2a88c4e56c2bbc12f95459e0429ff093a74813`.

Verified at `2026-10-28T02:17:28.465148+00:00`. Reviewed baseline items: 9/55; baseline items awaiting review: 46; live open feedback: 48 (43 new, 5 in_review); of these, 2 owner-deferred; new reports since baseline: 0.

### Item 8

Disposition: **will_not_fix**; live status: **dismissed**.

Decline an additional official-character/story rewrite. Retain the approved fictional health-team helper, role/authority cards and visible statute links; legal legitimacy is established through the source and proper records rather than a character's title.

Verified at `2026-10-28T02:17:38.265374+00:00`. Reviewed baseline items: 9/55; baseline items awaiting review: 46; live open feedback: 47 (42 new, 5 in_review); of these, 2 owner-deferred; new reports since baseline: 0.

### Item 9

Disposition: **will_not_fix**; live status: **dismissed**.

Decline an additional font/background redesign from the general more-lively preference. Retain the released visual hierarchy, authored HEPO Slides, focus panels and contrast correction, and preserve the established themes and readability.

Verified at `2026-10-28T02:17:46.965119+00:00`. Reviewed baseline items: 9/55; baseline items awaiting review: 46; live open feedback: 46 (41 new, 5 in_review); of these, 2 owner-deferred; new reports since baseline: 0.

## Completed release and final verification

[PR #446](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/446) merged as `da86308aa1349d0081e51cb9e0e997a162c128bb` after [CI run 40617141473](https://github.com/jongsky25/BHW-Connect-Phase-2/actions/runs/40617141473) passed all 323 files / 2,669 unit tests and 116 disposable browser tests. Typecheck and lint passed.

Canonical production deployment `dpl_EKbLUUb1YgkBYAcSTFuEHQ763wsm` is READY for that exact merge SHA and owns `bhw-connect-phase-2.vercel.app`. `/login` returned 200 and all five replacement MP3s served their exact recorded hashes. This is public deployment/media verification and read-only content verification, not an authenticated production learner journey.

Each of the four guarded publications was verified against the exact compiled Read and Slides JSON, successor hash, unchanged facilitator notes/checks and current unused practice criterion. All nine feedback dispositions were applied separately, guarded against status changes and later replies; `resolved_by` remains null and no reply was sent.

Formal assessment history remains byte-for-byte equal by database JSON checksums: 23 enrollments, 45 attempts, 1294 responses and score sum 3943.6. The 786 BHW and 2922 assessor completion rows remain stored.

Final live total: 214 — **41 new, 5 in_review, 98 resolved, 70 dismissed**. The first nine are closed (**4 fixed/resolved; 5 will_not_fix/dismissed**). **46 baseline items await review; 46 reports remain live open**, including 2 owner-deferred, with 0 open reports outside the baseline. The next pending item is **10**. Exact per-item counts and publication IDs are in the [machine-readable receipt](first-nine-live-receipt-2026-10-28.json).
