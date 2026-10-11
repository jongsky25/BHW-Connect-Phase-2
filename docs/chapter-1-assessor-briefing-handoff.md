# Chapter 1 opening briefing: items 1–4

Local implementation, 11 October 2026. The opening briefing is implemented locally; it is not a deployed release.

## Implemented

- Item 1: bilingual objectives, nine-topic/42-lesson coverage, facilitator and
  assessor responsibilities, practice/formal-assessment boundaries, evidence
  sufficiency, confidentiality, and chapter authority expectations.
- Item 2: required preparation sequence: opening briefing → diagnostic pretest
  → personal study → post-test → scoring orientation → coached fictional
  platform competency simulation → Chapter 1 certification eligibility.
- Item 3: a bilingual eight-step navigation walkthrough following fictional
  assessor/facilitator Alex and BHW Rosa: personal study → lesson preparation
  → presenting learner content → coached practice → practice observation
  → evidence readiness → a later formal task → feedback and follow-up.
  Each step names its platform area and both participants' actions. The
  ordered step selector, previous/next buttons and replay make it revisitable.
  Local demo buttons reveal example plans, exchanges, observations and
  readiness feedback. No real learner, session or assessment IDs are accepted.
- Post-test threshold and lesson/topic counts come from the existing manifest.
  The explanation does not manufacture personal completion or availability.
- Item 4: explicit versioned acknowledgement, duplicate-safe saving, retry
  recovery and returning-assessor access. Viewing or replaying never saves it.
- The briefing explicitly marks simulation and revised issuance as unavailable. Separate chapter awards and an overall award from
  three valid, compatible chapter awards are explained. Chapter 3 certification
  remains unavailable; no extra overall exam is introduced.

## Integration and access

Route: `/training/[programId]/assessor/chapter-1/briefing`.

The personal-study page exposes a replayable briefing link only for the enabled
Chapter 1 cohort. Both link and route reuse the actual authenticated viewer,
forwarded flags and `loadAssessorRollout`. With the UI master off, no policy
query is added. With it on, one actor-bound policy RPC checks program, chapter,
requirements version and explicit membership. No queries were added to layouts
or middleware. Links disable prefetch.

The route validates a published BHW Reference Manual program and an available
Chapter 1. Actual active admins may inspect a read-only preview, including
View-as, without a candidate policy or study controls. BHWs, designers,
inactive accounts and preview assessor identities cannot use candidate access.

Acknowledgement is personal onboarding evidence tied to the actual actor,
program, Chapter 1, `chapter-1:c1af.draft-1` requirements and
`chapter-1:briefing.v1`. The additive acknowledgement migration uses RPC-only
access, RLS, explicit grants and private functions with pinned search paths.
It verifies live flags, cohort, role, publication, consent, versions and the
expected actor. Duplicate/concurrent saves preserve the original server timestamp
and language and create one audit event. It grants no competency or award.

Enabled cohort members without a confirmed current receipt are redirected from
study, exam and lesson navigation before personal progress reads. Returning
members retain their progress and bookmarks. Unknown status cannot be treated as
an empty acknowledgement; read retry is available. An ambiguous save may already
have succeeded, so status recovery and idempotent retry are provided. Admin preview
has no acknowledgement controls or receipt queries. This navigation gate does not
change legacy study RPCs or provide future award authorization: future award guards
must independently validate current receipts. BHW lessons and narration are unchanged.

The navigation tour is a small client component with authored fictional data
and in-memory state only. It imports no Supabase client, performs no network
requests, and uses no browser storage. Replay and reload clear its demo state.
The early tour produces no completion receipt; the later scored/coached
competency simulation remains distinct. Moving ahead in the tour does not
approve missing evidence or grant a formal result. Admin preview can operate
these same local demos without becoming a candidate.

## Verification

For item 2, the briefing and study route suites passed: 28 tests, including
ordered bilingual steps, unavailable future actions, cohort visibility,
disabled-state reads, roles and publication failure. TypeScript and focused
ESLint passed. Item 1 also passed its rollout/database checks (93 tests across
four files); its full lint had three existing warnings and no errors.

For item 3, the tour, briefing and study suites passed 33 tests. Tests cover
English/Filipino step navigation, boundaries, local demo results, revisiting,
replay/reload, keyboard activation, no network/storage writes, and unchanged
RPC/table reads while interacting with the embedded tour. TypeScript and
focused ESLint passed.

The actual interactive tour component was bundled with application styles and
checked in Chromium at 390px (phone) and 1024px (tablet), in English and
Filipino, in light and dark themes. All eight demo actions, keyboard step selection, replay, and no
horizontal overflow passed; the component emitted no network requests or
browser errors. Screenshots were visually inspected. Disposable interactive
HTML previews and screenshots are under `/tmp/c1af04-tour-preview/`. This is
isolated component verification, not authenticated browser-to-database E2E or
verification of the full briefing page. Nothing was deployed, seeded or enabled
in the pilot.

For item 4, 141 targeted tests passed, as did TypeScript and full lint (three
existing warnings, no errors). Native PostgreSQL 17.11 replay passed all 72
migrations and ten scenarios, including concurrent acknowledgement saving and the
final C1AF-03b guards. This supersedes the earlier native replay limitation.
Item 4's final isolated browser save/resume verification remains unconfirmed after
an interrupted run; do not claim authenticated browser-to-database verification.

Full `supabase start` verification remains required before merge. The local
32 GB workspace disk filled while Docker unpacked its database image, failing with
`no space left on device`. Cancelled pulls recovered space; this was not a pilot
storage failure. Native PostgreSQL and component tests do not replace the full stack.
Nothing has been deployed, applied to the pilot or activated for a cohort.

## Next bounded work

C1AF-05 personal preparation checklist is implemented locally; see
[preparation checklist handoff](chapter-1-assessor-preparation-handoff.md).
Complete outstanding full-stack/authenticated browser verification before release.
The next feature increment is C1AF-06 scoring orientation improvements; the coached
competency simulation remains a later increment after scoring orientation.
