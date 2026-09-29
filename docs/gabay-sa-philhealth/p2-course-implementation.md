# Gabay sa PhilHealth P2 — draft course and observation flow

This increment is review code only. It builds on the approved P1 packet, stays behind draft PRs, and does not change the pilot database, live app, flags, or PhilHealth channels.

## Content source and local load

`p1-lessons-and-claims.md` and `p1-assessment.md` are the versioned wording source. `scripts/lib/gabay-content.mjs` validates and turns them into stable module IDs `gabay-01` through `gabay-05`, quiz IDs `Q1` through `Q10`, and three unscored opening questions. A parser failure is intentional if the reviewed packet's structure changes. The course uses the existing Courses page and stays separate from Reference Manual chapters.

Run `npm run gabay:load -- --dry-run` to validate and count the package without credentials or database access. `npm run gabay:load -- --apply --project local --org-unit "Batong Malake" --owner admin.stable` writes only a **draft** into the disposable local stack. This P2 loader rejects every nonlocal project and never publishes. Its ignored `locks/local.json` keeps row IDs stable across reruns. It refuses an unlocked same-title course or a locked course that is published or has learner progress.

The course has five bilingual text lessons with a practice prompt, one ten-question quiz, an 80% pass mark, and three quiz attempts. The opening diagnostic reveals its answers without recording a score. A quiz pass completes the course content and creates the existing assessor queue item; it cannot issue a certificate. The learner receives the quiz answer key and bilingual rationales only after passing or exhausting attempts. Repeated answer IDs are rejected before an attempt is spent.

## Observed assessment

`assessment_kind = gabay_roleplay` opts only this course into the six-indicator form. The assessor records a card (`R1`–`R4`), six ratings, observed evidence, whether a neutral prompt was used, and practice advice after a failure. All six ratings must be Observed to pass. The database trigger blocks the older pass/fail RPC from certifying this course without the rubric. A pass uses the existing certificate RPC inside the same transaction. A failed assessment keeps the quiz pass and prior assessment record; the BHW sees feedback and can request another role-play with a different card. The next queue item has a new attempt number. Certification grants no app permission.

## Review and verification

`npm run gabay:check`, `npm run typecheck`, and `npm run lint` validate the package and app code. CI applies the migration, loads the draft, and runs the Gabay end-to-end flow against its own disposable Supabase instance. The end-to-end test publishes only in that disposable instance, checks the learner cannot read the answer key early, rejects duplicate quiz answers and an unobserved legacy pass, then covers fail, feedback, retry, pass, and certificate.

The course is **not** nationally published by this PR. The nationwide org scope, production publication, current PhilHealth source recheck, and final reviewer signoff remain release decisions in P5. The patient flipcharts and offline preparation are P3; KB and Chat Guide content are P4. The role-play rubric includes flipchart use now, and an assessor can use the approved storyboard or pathway aid during local trials until P3 adds the embedded charts.
