# Gabay sa PhilHealth — P0 implementation contract

- **Status:** Draft PR, no pilot write or deployment
**Parent documents:** [approved course blueprint](./gabay-sa-philhealth-course-blueprint.md) and [phased development blueprint](./gabay-sa-philhealth-phased-development-blueprint.md)

## Live isolation for this PR series

- Branches named `philhealth-gabay-*` do not get Vercel Git deployments. The branch rule is in `vercel.json`. It does not match `main`.
- A PR runs `ci.yml` against its own `supabase start` database. Its KB load uses `--project local`; no pilot migration, content load, flag change, or user login is part of P0.
- The manually dispatched `training-load.yml` can target the pilot and is **out of scope** for this PR series until a separate reviewed release decision.
- Do not merge these PRs while the owner is using the live system. Merge to `main` triggers a production Vercel deployment even if the branch had no preview deployment.
- No preview app will be available while this rule is active. Browser verification should use a local app connected to a disposable Supabase stack.

The repository's deploy runbook says Vercel Preview environment variables currently point to the pilot. Preventing branch deployments avoids both a preview build and a preview URL that might later be opened against the pilot. GitHub's [branch deployment setting](https://vercel.com/docs/project-configuration/git-configuration) supports this branch pattern.

## Existing paths to reuse

| Need | Current path | P0 decision |
|---|---|---|
| Standalone course | `/courses`, `courses`, `course_modules`, quiz module | Use a separate course, not a BHW Reference Manual chapter. A course is visible down its `org_unit_id` subtree; one LGU-scoped row does not automatically cover other LGUs. |
| Knowledge gate | `rpc_course_quiz_submit`, 80% and three-attempt defaults in course authoring | Use the course quiz for the required 10-item assessment. The short diagnostic is unscored practice. |
| Observation and certificate | `/assessments` queue, assessor claim and pass, public certificate verification | Preserve this flow, but store the six rubric indicators and feedback in P2. Verify the server-side two-part gate. |
| Content source | `content/training/` versioned files and loader | The loader already accepts `--course <key>`; add a stable PhilHealth package and validate each needed mode before loading any target database. |
| Patient education | `flip_charts` and `flip_chart_pages`, patient/BHW toggle | Add draft staging for admin-created package content; fix current English-only rendering and offline completeness in P3. |
| KB and Chat Guide | `content/kb/`, published `kb_entries`, matcher, conversational clarifiers | Author new entries as draft, test against the full corpus, publish only during P5. |

## Gaps confirmed in the current code

1. `src/components/flipcharts/flipchart-viewer.tsx`, `src/app/flipcharts/page.tsx`, and the detail page read the English title/caption/script directly. The data model has Filipino fields; the viewer needs locale selection.
2. The admin flipchart form creates a published chart immediately. A coordinated package needs a draft or review stage so a partially authored chart is not visible.
3. `public/sw.js` caches navigation responses and app static assets; it does not explicitly prepare all flipchart images for offline visits.
4. Chat Guide only reads published KB entries. The course loader does not make a new course answerable in chat by itself.
5. Conversational clarifiers are bundled from content at build time and require a deployment; KB answer text is loaded separately. P4 must keep these in sync.
6. The existing course E2E covers quiz → assessor certification. It does not prove storage of the approved six-indicator role-play rubric, feedback, or retry history.
7. A failed in-person assessment is **terminal in the current course flow**: `rpc_assessment_decide` sets `course_progress.status` to `failed_assessment`, and the learner page presents that as a terminal state. P2 must add a controlled reassessment path that retains the passed quiz and every observation attempt.
8. Course read policy compares the BHW's org path with the course org path. The approved content can be national in wording, but distribution must be deliberately scoped to a common parent org or repeated per authorized org. P0 must avoid assuming that a Los Baños course reaches all BHWs.
9. The repository contains a national PSGC root, but the earlier training handoff records no admin at that root when the pilot training loader was provisioned. National publication is therefore a release-time identity/scope decision, not something to improvise during PR development.

## P0 exit checks before P1/P2

- Choose a national rollout model after confirming the actual org tree: one course at a shared parent org if permitted, or repeatable deployment of the same stable package per org. Keep separate course progress and certificates traceable to the appropriate course row.
- Design the new assessor retry path around the confirmed terminal failure state without resetting valid quiz evidence.
- Verify how all needed loader modes use the existing `--course` argument and select a stable content ID.
- Confirm the planned rubric schema does not alter historical assessments or certificates.
- Verify the branch deployment suppression appears as disabled/skipped in the PR's Vercel status. If a preview builds, stop before opening it and correct the isolation rule.

P0 records current implementation findings; it does not grant consent to load or publish content in the pilot.
