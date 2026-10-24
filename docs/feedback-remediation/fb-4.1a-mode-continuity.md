# FB-4.1a — keep the same section when changing lesson format

The owner directed review of FB-4.1 and implementation, testing, merge and live
publication of the first confirmed mismatch. The tracker contains **15** reports,
not the 14 stated in the initial recommendation. All 15 were read from the pilot
on 24 October 2026; all remain `new`. No replies or status updates were sent.

## Confirmed defect and bounded fix

The current published As a Health Educator revision is
`c8e57cba-b0a6-4f7a-90a0-2c9d0888e7b9`. Its Read and Slides headings match:
Start with your audience; Body and environment; Needs change through life;
Reach every community group; Apply your learning. The first two positions share
`m1.role.educator`. The previous switch logic chose an older destination-mode
resume when available, otherwise the first position with that concept. Moving
to Body and environment in Read and selecting Slides could therefore show
Start with your audience. Four bilingual inline/full-screen regressions fail
before the fix and pass afterward. This reproduces a current format-switch
defect; it does not establish the exact historical session sequence.

An explicit format switch now prefers the unique counterpart with a matching
stable section ID and overlapping concept. Current published conventions use
the same ID, `slide-<read-id>` or `<read-id>-slide`. A paired section takes
precedence over a stale bookmark in the other format. Reordering the slides
does not change the match. Ambiguous pairs, conflicting concepts and unpaired
legacy content retain the established resume/concept fallback; no ordinal or
heading-text guess is made. Opening/reopening a lesson still uses the existing
mode-specific resume selector unchanged.

The shared reader calls the new selector only for a format switch. Its existing
move/save path handles the resulting position, so preview remains read-only,
BHW and assessor persistence remain scoped to their existing APIs, and no
completion is inferred. Narrated stories remain optional. No authored text,
media, narration, revision, assessment, grade, gate or database schema changes.

The required small shared-reader edit has an exact successor receipt in
`fb-4.1a-reader-preservation.json`. The historical guard reconstructs its full
predecessor, verifies both full-file hashes and rejects unpinned disk changes.
Existing approval hashes and their receipts are untouched; current application
and behavioral tests execute the actual current source.

## Review of all 15 reports

Read-only inspection covered 12 current published lessons, their complete Read
and Slides arrays and their asset metadata. All 46 distinct static asset paths
referenced by those arrays exist locally and returned HTTP 200 with image
content types on the live domain. This establishes availability, not successful
rendering in an original reporter's browser or the teaching value of an image.

| Feedback ID | Current evidence and next disposition |
| --- | --- |
| `db09b4bd-bde6-464f-a4ed-2884839c93c5` | Educator Read/Slides mismatch: matching published headings exist, but shared concepts/stale resumes cause a reproduced switch jump. Addressed by this increment; retain for live review. |
| `f966bfbc-f3e3-48b4-aea9-206e2ed37b86` | Same educator lesson and discontinuity concern. Switch alignment addressed; broader storytelling/summary completeness still needs a content pass. |
| `f9a4fd5b-44b7-4458-9246-97da738b2dc5` | BHW and HEPO currently has five authored slides with concise display text and a separate narrated story. Format expectations still require a live presentation review; no claim of closure. |
| `243eed1e-025b-4413-baac-24176b4b6f20` | Define the problem now has six text-bearing slides, each with a scene asset, plus a separate story. Recheck current slide presentation; image-only symptom is not established by current data. |
| `74fc1ea8-8f4b-476f-81f2-22717abb68c1` | Empathy and clear explanations now has six contextual Read sections and six matching slides; the report names missing Liza/Jo context in the narrated story. A separate caption/transcript-to-question audit is still needed. |
| `db4911a0-799a-4d5f-9540-c3890d24310e` | Same lesson, selected a details summary without its text. Placement of the story's text alternative remains a distinct UX/content review; this fix does not move it. |
| `7777f674-0bcb-4862-b66c-d1387c620049` | City/municipal partners now uses a context scene and six section-specific visuals. The older report asks about an image's purpose and has a private screenshot. That screenshot has not been inspected; original image identity/purpose remains unconfirmed. |
| `c3c1c66d-89fb-4da3-be22-c92084d8db63` | Four working relationships has six slides, only two with explicit asset references. Some reader scenes also use their built-in illustration. Review the actual presenter before adding/repeating imagery; coverage remains open. |
| `6640339d-15cf-4355-b990-34e9b7bbfdbf` | Positive example: Match hazards and protection has six slides and six distinct scene references. Preserve this model when prioritizing later visual work. |
| `28d88de9-89d3-4a9a-a877-bc624030fd2c` | Legal-basis lesson has six illustrated Read/Slides sections and a separate story. Request for a nurse/midwife/board character needs story-role review; do not imply a fictional official validates legal claims. |
| `09d07323-30b4-4024-81f1-9cea997f1511` | UHC purpose/coverage metadata explicitly identifies AI-generated art; visible AI disclosure remains a separate implementation candidate. Do not label all code-authored SVGs or real photographs AI-generated. |
| `abc62d95-dabd-4150-aa07-1d54ea4f7292` | Choose a safe change now has six illustrated slides; referenced scene paths return 200. Historical missing-image symptom needs current signed-in rendering verification. |
| `2779f718-64a3-42a0-b19f-e539938d5229` | Resource-audit lesson now has six illustrated slides; referenced scene paths return 200. Historical load failure is not proved resolved by URL availability. |
| `471c4f96-1a5e-4ec9-9e2e-1f838164e13c` | BHW/HEPO request for real BHW photographs remains a distinct asset choice; no existing illustration is represented as a real photograph and no replacement is included here. |
| `488a0652-6c4c-4769-98e6-60615ee76c7a` | Following up constructively currently uses one Demi scene in all six sections. Asset availability confirmed; its fit with each discussion remains a content/visual review. |

The broader subchapter wordiness/illustration request
`40aa8a6e-5a25-44d8-9a54-20c0c3f25d2e` remains assigned separately and is not
closed by section switching. Training owner remains Ray Justin Ventura.

## Verification and release

Unit coverage checks bilingual inline/full-screen transitions, shared concepts,
reordered slides, stale resumes, both ID conventions, same IDs, conflicting or
ambiguous matches, unpaired fallback, unchanged reopen behavior, and the real
resume callback without automatic completion. Existing completion/answer-state,
assessor/BHW/read-only/error and historical-preservation suites are retained.

The disposable Chapter 2 browser journey now has two sections sharing a concept
and tests both directions of format switching inline and in native fullscreen,
in English/Filipino and general training/assessor study. Its reading-tool,
normal/XL mobile, light/dark accessibility and zoom/fit checks remain. No
write-based browser test runs against the pilot. The PR records final CI,
merge SHA, exact production readiness and public smoke checks. All reports
remain open for live comments or their separately recorded follow-ups.
