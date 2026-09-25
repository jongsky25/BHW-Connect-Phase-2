# Chapter 1 facilitator activities

The Chapter 1 PDF includes suggestions for demonstrations, games, practical tasks and role-plays. The existing course preserved many in facilitator notes but did not provide individual activity plans or records. There are now 24 optional bilingual cards across eight subchapters, with source PDF pages, suggested time, materials, steps, debrief prompts, individual observation cues, alternatives and printable worksheets.

## Facilitate

Open a subchapter's **Facilitator guide → Activities you can run**. Converted short lessons also show cards mapped to that lesson. Select activities to see suggested time and preparation materials, then **Run activity** to open the instructions and printable worksheet. A selection in a guide lasts only for that view.

To keep a plan, open your scheduled **Training session** and use **Add to session plan**. Record **Planned**, **Run**, **Adapted**, or **Skipped**, with optional actual minutes and an adaptation/follow-up note. Successful saves survive reloads. Only the session's facilitator can write these records; completed/cancelled sessions are read-only. **View recorded version** shows the saved instructions even after the authored card changes.

The two team games are alternatives; normally select one. Timings are facilitation estimates, not additional mandatory training hours. Use the alternative on each card when space, materials or group needs require an adaptation.

## Observe

In the subchapter roster, choose the indicator being observed, then optionally choose a relevant activity. The selector includes only activities mapped to that indicator. Observe each learner directly and use the existing rating descriptions. Record a specific strength, an improvement and the next practice opportunity. Activities with broad indicator mappings support gathering evidence; one brief performance does not necessarily cover every part of a combined indicator.

Games and participation do not award competency. Session activity records do not change attendance, lesson completion, delivery logs, final assessment outcomes or certificates. The existing observation action remains available for other evidence. Worksheets use fictional details and clinical demonstrations rely on trainer-approved local procedures.

## Content coverage

| Subchapter | Cards |
|---|---|
| BHW roles | Roles in my barangay |
| UHC | UHC warm-up |
| BHS policies | Explain and practise policies |
| RA 7883 | BHWE experience; form and follow-up |
| BHW and barangay | Sinking vessel; marshmallow tower; team conversation; local team map; meeting practice; weekly plan |
| Communication | Household profiling; family planning; distress; smoking; information check; administrative documentation |
| Problems | Problem tree; priority and action plan |
| Occupational safety | Hazard walk; sharps return-demonstration; IPC/PPE return-demonstration; posture practice; workload and rest |

Source: `DAY 1 - PART 1 PRESENTATION.pdf`, 78 PDF pages. Each card contains exact page references. Steps, timing and worksheet prompts are authored facilitation adaptations, not verbatim source instructions.

## Release and content loading

1. Apply `20261001010000_facilitator_activities.sql` through the normal migration workflow before releasing the app code. It adds fields and records without seeding or rewriting existing course content.
2. Review the cards against the program's local facilitation and assessment procedures.
3. Use the existing authenticated admin loader with a reconciled course/module lock. Dry-run a selected set first:

```sh
npm run training:load -- --project <project-ref> --org-unit "<org-unit>" --mode activities --modules 01-tungkulin-ng-bhw,02-uhc-act,03-polisiya-bhs,04-ra7883,05-bhw-at-barangay,06-komunikasyon,07-problema,08-osh
```

4. Review the report, then repeat with `--apply`. This mode patches only `course_module_facilitator_notes.activities`. It checks course/module identities, existing notes and indicator mappings for the whole selected set before writing. Network failures can leave a partial selected set applied; rerunning reconciles it. It does not publish lessons or reload converted lesson bodies. Missing notes must be loaded through the existing content workflow first.
5. Smoke-test the facilitator guide, session selection/save/reload, and one observation with optional activity evidence.

Change an activity's version whenever its contents change. The loader rejects modifications without a version increase; Postgres checks the submitted version against current content. Old observation and session snapshots remain readable. Activities are optional, so reverting the app code and clearing a catalog does not require deleting historical records. Keep the additive schema when rolling back the app.

## Local verification

`scripts/tests/facilitator-activities-replay.mjs` creates a new disposable database on loopback, replays migrations, then tests permissions, status validation, snapshots, old RPC compatibility and preservation of learner progress/assessment/certificates. Supply `PG_TEST_MODULE` if `pg` is not installed in this repository, and optionally `PG_TEST_PORT` (default 55432) and `PG_TEST_REPORT`. It never uses application environment credentials.

```sh
node scripts/tests/facilitator-activities-replay.mjs
npx vitest run scripts/tests/training-activities.test.mjs src/components/elearning/activity-library.test.tsx src/components/elearning/facilitator-guide.test.tsx src/app/training/manual-navigation.test.tsx
```
