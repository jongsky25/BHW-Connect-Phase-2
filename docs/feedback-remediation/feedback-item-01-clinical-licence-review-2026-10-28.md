# Queue item 1 — clinical licence / lisensiya

Feedback `17c08e60-1a43-415f-ad54-d04de8e1cfa7` was reviewed individually on
28 October 2026. Disposition: **reviewed_open**, live status **new**.

## Original evidence and current publication

The live message is “wrong spelling. clinical license or lisensiya sa filipino”.
Its route is
`/training/8dfe8b88-84ce-4e60-a353-93031eceda59/assessor/chapter-1/5b638e25-76e2-4bc7-a997-8ce47531fa60/cf99b391-efbf-4efd-9588-59a7136567fc`.
The paragraph selector is `article > div > div:nth-of-type(2) > p:nth-of-type(2) > span:nth-of-type(2) > span`.
There is no screenshot and no later reply.

A fresh read confirms `bhw-legal-role` still publishes revision
`5f9cb97b-9e02-4da5-abf2-c0f0d1e8d303`, hash
`7a4880da236ea31a78647bb447ba6ff66eb7be701eb442059c3fabf77eddc57e`.
The Filipino `status-and-other-processes` Read paragraph and
`slide-status-and-other-processes` narration both contain:

> Hindi awtomatikong appointment o propesyonal na clinical licence ang akreditasyon bilang BHW.

“Licence” is valid British English for the noun; the spelling complaint alone
does not establish an error. The request for Filipino wording is identifiable,
however, and the source sentence still uses the English phrase.

[PR #386](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/386) supplied a
bilingual contextual note in Read and Slides, including “propesyonal na
lisensiya para sa gawaing klinikal”. The [earlier review](fb-2.3b-ambiguous-terms-review.md)
expressly distinguishes that note from replacement lesson text and narration.
The current production app contains that exact revision-gated note. A fresh
Vercel read confirms that the canonical alias `bhw-connect-phase-2.vercel.app`
still belongs to READY production deployment `dpl_5H1Zr4rvLzAJpWN9ATcs4iCpKuCi`
at commit `64e314204bbd5b11b1ba08aabd8f13bc6c6721d0`, which includes PR #386.
This verifies deployed code and published database content; it is not an
authenticated production learner observation.

## Remaining work

Keep this multi-part report open: the explanation is released, but a direct
Filipino source replacement has not been published. The precise proposed
sentence is:

> Hindi awtomatikong appointment o propesyonal na lisensiya para sa gawaing klinikal ang akreditasyon bilang BHW.

This retains the original accreditation distinction. It is a proposal, not a
claim of an approved or live replacement. Completing it requires a coherent
successor lesson release covering Read, Slides narration and the corresponding
Filipino audio/read-along, with focused verification of version gates and
current-revision progress effects. Do not mutate the immutable revision or
silently substitute text under its existing audio. No answer-key correction
is supported by this report.

This review changes no published lesson, narration, completion, enrollment,
attempt, score or live feedback status, and sends no reply. It records the
remaining exact source work rather than closing the report on the strength of
a contextual note.

## Count receipt

The fresh read at `2026-10-28 00:35:35 UTC` (`08:35:35 Asia/Manila`) found
214 total reports: 50 new, 5 in_review, 94 resolved and 65 dismissed. Comparing
all 55 open IDs with the fixed queue found zero open IDs outside the baseline;
both owner-deferred IDs remain open.

Reviewed baseline items: **1/55**; baseline items awaiting review: **54**;
live open feedback: **55** (**50 new, 5 in_review**); of these, **2 owner-deferred**;
new reports since baseline: **0**.
