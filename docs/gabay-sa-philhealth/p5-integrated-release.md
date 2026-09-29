# Gabay sa PhilHealth — P5 integrated pilot release

## Approval and source recheck

The pilot admin approved the coordinated live release on 2026-09-29. The content IDs, source files, and illustrations are recorded with line-ending-normalized SHA-256 values in `content/gabay-release-manifest.json`. `npm run gabay:release:check` fails if any approved file changes. PhilHealth review is requested after the pilot package is available and does not alter this approval history.

On 2026-09-29 the official [YAKAP overview](https://www.philhealth.gov.ph/yakap/), [accredited facilities list](https://www.philhealth.gov.ph/partners/providers/facilities/accredited/), [clinic selection advisory](https://www.philhealth.gov.ph/advisories/2026/PA2026-0019.pdf), [GAMOT circular](https://www.philhealth.gov.ph/circulars/2025/PC2025-0013.pdf) and [2026 supplement](https://www.philhealth.gov.ph/circulars/2026/PC2026-0002.pdf) were rechecked. [Circular 2026-0007](https://www.philhealth.gov.ph/circulars/2026/PC2026-0007.pdf) clarified that the First Patient Encounter collects or updates basic health data and is not yet a consultation; the course, flipchart, and Chat Guide now use that distinction. Provider pages are a point-in-time reference, not a stock or access guarantee.

## Targets and preflight

- App: Vercel production deployment of `main`. Pilot Supabase project: `ltzicxyefizxoqhfuuzc`.
- Scope: national root `Department of Health`, so BHWs in descendant org units can see the course. A national admin must stage and publish it. The course has five lessons, ten quiz items, an unscored diagnostic, and the observed role-play gate.
- Before any live write, confirm current `main`, a green CI run on the integrated PR, a healthy pilot database, the release manifest, and absence of an existing Gabay course/KB package. Record the prior production deployment ID and current `flipcharts` and `offline_pwa` flags.
- Apply `20261010000100_gabay_observed_assessment.sql` **once**, using the Supabase migration tool at merge time. Confirm the new course and assessment columns, quiz views and Gabay RPCs, and compare security advisors before and after. No other migration belongs to this release.

## Publication sequence

1. Merge the integrated release PR to `main` after CI is green. Vercel's Git integration deploys `main`; verify the production deployment is READY and its commit matches the merge.
2. Set `ALLOW_PILOT=1`, `KB_LOADER_USERNAME`, `KB_LOADER_PASSWORD`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the release terminal. Keep secrets out of files, commits, logs, and the release record.
3. Stage the course as a **draft** through `npm run gabay:load -- --apply --project ltzicxyefizxoqhfuuzc --release-pilot --org-unit "Department of Health" --owner <signed-in-national-admin>`.
4. Stage the 19 KB entries as **drafts** through `npm run kb:load -- --project ltzicxyefizxoqhfuuzc --corpus philhealth-gabay --release-pilot --apply --owner <signed-in-national-admin>`. Verify 19 `ph-*` IDs, three categories, and source/review dates. This step must not publish content.
5. Preview the three approved Gabay flipcharts at `/admin/gabay-flipcharts` and check patient cards versus BHW notes, Filipino and English, and the corrected FPE wording.
6. Publish the KB through the same command with `--publish`. Publish the course through `npm run gabay:publish -- --project ltzicxyefizxoqhfuuzc --release-pilot --org-unit "Department of Health" --owner <signed-in-national-admin> --apply`. That command checks scope and counts, then calls the audited `rpc_course_set_status`.
7. Use the super-admin feature-flag controls to enable `flipcharts` and `offline_pwa` for BHWs. Keep their previous values in the release record. `chat_conversation` is already on; verify it has not changed. An offline preparation test requires the service worker flag.
8. Signed-in pilot smoke: BHW sees/enrolls in the national course, completes quiz but receives no certificate before the observed role-play, assessor records a failure with feedback, BHW retries with a different card, assessor passes and certificate appears. In the flipcharts, prepare for visit while online, verify all pages in both languages and both views, then reopen offline. Ask Chat Guide the vague registration question, select the clinic option, and ask about GAMOT dose and stock. Confirm no new permission after certification. Use fixture accounts and avoid real resident identifiers.
9. Record deployment SHA, course/KB IDs and counts, flag values, smoke results, and any limitation. Prepare the PhilHealth review copy from the versioned P1 packet, charts, and 19 KB entries.

## Rollback

For a content defect, unpublish the three `philhealth-*` KB categories with `npm run kb:unpublish -- --project ltzicxyefizxoqhfuuzc --category "philhealth-*" --apply` using the national admin token, then set the Gabay course back to `draft` through the audited course-status RPC or admin console. Turn `flipcharts` and, if needed, `offline_pwa` back to their recorded flag values. If the conversational rule itself misroutes, disable `chat_conversation` until a corrected deployment is ready. A Vercel rollback can restore the prior app deployment; the additive database migration remains in place. Keep the content and audit trail for correction rather than deleting learner records.
