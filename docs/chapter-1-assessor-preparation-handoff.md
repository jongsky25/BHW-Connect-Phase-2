# Chapter 1 personal preparation checklist — C1AF-05

Implemented locally, 11 October 2026. Not deployed or cohort-enabled.

The Chapter 1 assessor study landing page now shows one checklist for briefing,
diagnostic pretest, all 42 personal-study lessons, qualifying post-test, scoring
orientation/exercise, platform competency simulation and revised certification.
It recommends one next action using current personal records. Required study is
grouped into nine subchapters, including missing publication slots. Completed
lessons remain available for review, and current saved bookmarks drive resume.
Older lesson revisions do not count as completed current lessons.

The checklist appears only for the explicit revised-flow cohort after a current
briefing receipt has been confirmed. Chapter 2 and the disabled/legacy path retain
their presentation. Lesson and exam routes keep their existing reader and attempts;
no qualification-status query was added there, to layouts or to middleware.

One existing read-only `rpc_assessor_qualification_state` call is added to the
enabled Chapter 1 landing page. It reads current actor/chapter qualification and
orientation state, with curriculum validation before displaying it. A failed,
stale or malformed read stays unknown and never resets personal progress. Known
unfinished study can continue; uncertain later progression recommends reloading.
No new schema, writes, background saves, browser storage or award calls were added.
All links disable prefetch.

Post-test guidance requires both the server pass and the authored passing score;
79.9% is insufficient and 80% passes the current threshold. A later failed attempt
does not erase an earlier valid pass. Publication gaps keep the full denominator
and prevent progression beyond study, while other available lessons may be studied.

Existing active, suspended and revoked qualification records lead to reviewing
their existing status. They are not converted into revised awards and are not
prompted to become an assessor again. The simulation and revised certification are
explicitly unavailable. There is no issuance action from this checklist. This is
navigation guidance, never an authority or award validation boundary.

## Verification

- 160 targeted tests passed across seven files: checklist model, study/briefing
  routes, acknowledgement, navigation tour, rollout and database guards. New
  coverage includes fresh candidate guidance, partial inventory, reload/bookmark,
  stale lesson revisions, score boundary, failed retry after pass, orientation vs
  simulation, existing qualification lifecycle and unknown status.
- Actual checklist component with application styles passed Chromium checks at
  390px and 1024px, English/Filipino, light/dark themes. One recommendation,
  keyboard reachability, exact bookmark link, minimum 44px action height, no
  horizontal overflow, no component network requests and no browser errors.
  English light and Filipino dark phone screenshots were visually inspected.
  Temporary previews/screenshots: `/tmp/c1af05-checklist-preview/`.
- React review: server component, pure derived state, scoped bounded reads,
  semantic lists/headings, labelled regions, keyboard links and responsive wrapping.
- TypeScript passed. Full lint passed with no errors and three existing warnings
  in unrelated lesson/audio scripts. `git diff --check` passed.

These browser checks use fixture records and do not prove authenticated full-app
browser/API/database behavior. The earlier native PostgreSQL replay passed 72
migrations and ten scenarios. Full local Supabase-stack verification remains a
release dependency: Docker image unpacking exhausted the workspace's 32 GB disk.
The workspace currently has space again, but the full stack has not been verified.
No pilot database, lesson content, narration, cohort or flag was changed.

Next feature: C1AF-06, improve scoring-orientation context and recovery. Before
release, close the outstanding full-stack and authenticated browser checks from
C1AF-04/03b. The later simulation and revised award issuer remain unavailable.
