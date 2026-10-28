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
