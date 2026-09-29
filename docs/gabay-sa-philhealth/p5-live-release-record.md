# Gabay sa PhilHealth — pilot live release record

Released on 2026-09-29 to the BHW Connect pilot Supabase project `ltzicxyefizxoqhfuuzc` and the Vercel production app.

## Applied package

- Integrated PR: [#194](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/194); merge commit `e77e44a6c449baf75562eb8532fc7125f54d58bb`.
- Vercel production deployment: `dpl_29RadamdVet1FyQiZ9iQg8XQnw3G`, READY at the merge commit, assigned to `bhw-connect-phase-2.vercel.app`. The previous deployment was `dpl_9vHH9DGnBnKTpbH4b5PtB7FwdtB5`.
- Applied migration: `20261010000100_gabay_observed_assessment.sql`. The two new quiz views trigger Supabase's `security_definer_view` advisor warning. The views have explicit role/progress filters, revoke anonymous access, and passed answer-key access checks in disposable E2E and live read smoke.
- Course ID: `5dbf4ef1-207a-4197-a3d9-e8f892ec944e`. Published in the `Department of Health` root org unit, with six modules (five lessons and a quiz), ten questions, and the `gabay_roleplay` assessment gate.
- Knowledge base: 19 published `ph-*` entries in three categories, review due 2026-10-29. The approved content and artwork manifest check passed immediately before staging.
- Feature flags: `flipcharts` and `offline_pwa` changed from disabled to enabled; `chat_conversation` was already enabled. All three had an empty `disabled_roles` list after release.
- The two lock files committed with this record contain only generated course, module, question, KB category, and entry IDs. Preserve them for idempotent draft updates; they contain no credentials.

## Verification

- PR #194 Linux checks and disposable Supabase E2E passed before merge.
- After staging, the live database showed one draft course in the national root with six modules and ten questions, plus 19 draft KB entries in three categories. Publication through authenticated admin APIs then showed the course and all 19 entries as published.
- Signed-in BHW test persona read smoke found the national course, all six modules, ten learner quiz choices, and all 19 published KB entries. The base quiz answer table returned zero rows to that BHW. The assessor test persona signed in successfully. Neither persona created Gabay progress, an assessment, or a certificate.
- All nine approved chart SVGs returned HTTP 200 with `image/svg+xml` from the stable production URL.
- Live UI review is still needed for the bilingual patient/BHW chart views, offline reopening after preparation, Chat Guide clarifier flow, and observed fail/retry/pass certificate flow. Use test personas and no resident identifiers.

## Rollback reference

Follow [P5 integrated release](p5-integrated-release.md#rollback). Before this release, `flipcharts` and `offline_pwa` were disabled, `chat_conversation` was enabled, and the prior Vercel deployment was `dpl_9vHH9DGnBnKTpbH4b5PtB7FwdtB5`. The applied migration is additive and remains in place on content or app rollback.
