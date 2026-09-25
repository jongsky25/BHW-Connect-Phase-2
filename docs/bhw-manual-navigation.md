# BHW Reference Manual navigation

The course catalog presents the published training program once, rather than duplicating its underlying delivery course. Generic courses remain listed normally.

The manual has four distinct navigation levels:

1. `/training/:programId`: chapter cards, including unavailable chapters.
2. `/training/:programId/:chapterKey`: numbered subchapters and a separate chapter assessment/certificate area.
3. `/training/:programId/:chapterKey/:moduleId`: a list of short published lessons, or an explicit preparation state.
4. `/training/:programId/:chapterKey/:moduleId/:lessonId`: one short lesson with Read/Slides and links back to its lesson list and adjacent lessons.

Every level has its own URL and breadcrumbs. Refresh and browser Back preserve the selected level. A legacy `/courses/:courseId` link redirects to its published available chapter. `?assessment=1` retains the existing assessment identity and workflow for BHW learners.

The manual route never queries old module bodies, legacy visuals/audio, or private facilitator notes. It renders only the chosen published lesson revision. Unconverted subchapters are explicitly in preparation and cannot silently fall back to the old long page. (When this was written, subchapters 1.6–1.9 were unavailable outline entries and only six lessons were published. As of 25 Sep 2026 all of 1.1–1.9 and Chapter II are published. The 1.1–1.9 grouping is the app's instructional design; the manual's Kabanata I has eight unnumbered topics.)

Personal progress, test attempts and certificate queries explicitly filter by the signed-in app user as well as course. This matters for administrators whose RLS scope can include other learners. Non-BHW users have a clearly labelled preview with no resume/completion RPC calls. The original RPC restriction to active BHW learners remains intact. Certified learners retain their certificates and may review the new lessons without a misleading posttest-lock message.

No migration, renumbering of delivery identities, question replacement, historical progress backfill or certificate-scope change is part of this navigation repair.

## Verification

Regression tests cover the program catalog, chapter availability, subchapter preparation, lesson URLs, pretest gating, certificate ownership, preview behavior, saved-position restoration and retry after a failed save. Verify the deployed UI on both desktop and narrow mobile layouts, including browser Back, reload, Filipino/English and absence of old long content beneath a lesson. Manual screen-reader testing remains a distinct uncompleted check.
