# FB-5.1b — assessor guide access and assessment eligibility

Report `edb47e6c-db88-4f4f-8cca-d97b0c567aaa` asks that a page “Should not be accessible for assessors that did not yet go through the chapters or training”. The original path is `/training/8dfe8b88-84ce-4e60-a353-93031eceda59/chapter-1/5a915215-7237-4211-a189-8d75664d05b6`, the facilitator subchapter guide. It has no screenshot. A read-only pilot query on 25 October 2026 confirmed the report remains `new`.

## Merit and existing rules

The concern has merit as a distinction between preparation and permission to assess real BHWs. It does not establish that reading the guide bypasses an assessment prerequisite. [Flow contract D06 and the permission matrix](../chapter-1-assessor-flow-contract.md) explicitly permit candidates to inspect visible facilitator guides and prepare privately while reserving official actions for current chapter authority. Locking the reference guide would contradict that preparation path. No blanket guide lock is added.

The existing general manual route is read-only for assessors: it does not save personal study progress. Personal assessor study is a separate route with its existing briefing, pretest, lesson and posttest gates. The reported guide had links to study and a generic preview message, but did not explain why it remained accessible or connect access to certification requirements.

Read-only inspection of the live installed function bodies establishes the revised formal-action chain:

- `rpc_assessor_formal_start` delegates to private `formal_start`, which calls `formal_authorized` before inserting or resuming a draft.
- `formal_authorized` requires an arranged request, the current actor's active agreed assignment, `component_request_scope`, learner readiness, and enabled matching component/criterion contracts.
- `component_request_scope` delegates to `chapter_write_scope`. That function requires the actual active assessor, published program/course, cohort membership and persisted cutover, enabled write controls, an active matching chapter award under an enabled award contract, and no suspended/revoked qualification or award. When a BHW is supplied it checks active BHW role, catchment and cohort membership.
- The pilot Chapter 1 cohort uses `chapter-1:c1af25.pilot-1`, with UI/writes/awards and cutover enabled; the four relevant feature flags are enabled. These observations establish configured controls, not an authenticated production mutation rehearsal. No pilot settings or evidence were changed.

This is a focused review of the reported read path and revised formal-start boundary, not a new authorization policy or an assertion that every legacy operation has been audited.

## Visible increment

On the Reference Manual chapter, subchapter and lesson pages, actual assessor views now include a bilingual **Guide access and assessment eligibility** explanation in the existing study notice, before guide content. It states that candidates may read the guide while preparing, that doing so does not save personal study or grant qualification, and that formal assessment separately checks authority and BHW readiness.

Two explicit links open the current chapter's personal preparation and its certification record. Chapter 2 stays in Chapter 2; Chapter 3 links only to its existing certification record because its personal study route is not implemented. Admin, BHW and View-as views do not get the assessor notice. Existing chapter-study and working-area links remain.

There are no new database queries, RPCs, mutations, migrations, role grants, deadlines, learning locks or permission changes. Content, media, exams, awards, saved evidence and historical reader preservation contracts remain unchanged. Ray Justin Ventura remains training owner. The original report stays unchanged; the repository records the guidance increment as partial fix pending live review rather than claiming the requested blanket lock was implemented.

## Verification

- 113 focused tests across manual navigation, qualification, formal-assessment and rollout database suites pass. Seven new route cases cover both languages, same-chapter destinations, unsupported Chapter 3 study, and role/preview exclusions. The formal database test now removes the assessor's award after an otherwise valid request is arranged: start is rejected and creates zero formal attempts; restoring valid authority permits the existing draft flow. Existing incomplete qualification, suspension/revocation and cutover protections pass.
- The actual-component progress browser harness now includes four guide-notice cases at 320px/XL, English/Filipino × light/dark. All 20 total cases pass, including keyboard focus, wrapping, 44px touch targets, 12 clean main-region axe scans, no page errors and no non-GET requests. All four notice screenshots were inspected. This Vite fixture exercises app components/CSS, not Next routing or database authorization.
- The real disposable-Supabase preparation E2E now begins on a facilitator subchapter before any personal preparation. It checks the notice and chapter-specific certification link, compares exact study/exam/qualification/award snapshots, then follows personal preparation into the existing briefing gate. Existing explicit acknowledgement, pretest and progress-navigation assertions remain. The localhost guard runs before account creation. CI supplies this database; no pilot write tests are performed.
- TypeScript, lint and `git diff --check` pass; lint retains four pre-existing unrelated script warnings. The tracker retains exactly 214 unique report IDs. Final full CI, merge SHA and exact READY production/canonical-alias receipts are recorded in the release PR. Public smoke checks do not claim an authenticated production walkthrough.
