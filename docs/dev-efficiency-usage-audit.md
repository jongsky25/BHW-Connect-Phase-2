# Dev efficiency and free-tier usage audit (28 Sep 2026)

This audit covers the current build, the development process and its rules,
and how the project uses Vercel and Supabase. It ends with a prioritised plan
to stay inside the free tiers so the 27 Sep Disk IO outage doesn't happen
again.

Sources: live `pg_stat_statements` and `pg_stat_user_tables` on the pilot
(`ltzicxyefizxoqhfuuzc`), Supabase edge logs (27–28 Sep), the Supabase
performance advisor, the Vercel deployment history for `bhw-connect-phase-2`,
GitHub Actions timings, and a read of `src/`, `supabase/migrations/`,
`.github/workflows/` and `docs/`.

---

## 1. What actually happened on 27 Sep

| Signal (pilot project) | 27 Sep | 28 Sep (so far) |
|---|---|---|
| API requests per hour, 03:00–13:00 UTC | **21k–57k/h** (~480k in 10 h) | ~1k/h, one 6k spike at 03:00 |
| New auth sessions | **854** (5 accounts) | 29 |
| New accounts | 145 e2e throwaways | 0 |

Real users are about 30 accounts. Almost all of the load came from CI E2E runs
against the shared pilot: 488 CI runs that day across parallel PRs, each doing
logins, fixture users, content, purges and global flag flips. The free plan's
Disk IO burst budget ran out. Queries slowed to 10–35 s, and PostgREST's
schema-cache load timed out (PGRST002 503s) for hours, for real users too.

**Already fixed:** #158 moved CI E2E to a throwaway local `supabase start`
stack. Traffic dropped from ~50k/h to ~1k/h right after.

**Not fixed yet (corrected 28 Sep, 04:10 UTC).** The first draft of this
audit said dev sessions were still using the pilot. A 15-minute breakdown of
28 Sep's logs shows otherwise: apart from Vercel, the **only** traffic was
one burst at 03:15 UTC (4,223 `Next.js Middleware` requests, 1,321 `node`
and 329 browser requests). That burst is a **re-run of #157's old CI run**.
A re-run uses the workflow file from its original commit, which is the
pilot-based E2E, and it reads the pilot URL from the repo secret
`NEXT_PUBLIC_SUPABASE_URL`. So the remaining leak is **old CI workflows**,
not dev servers.

- The fix is to close the pilot-based PRs and rename that secret (see
  `docs/deploy-runbook.md` "Pilot secrets"). The pilot guard
  (`scripts/lib/pilot-guard.mjs`) stops dev servers and scripts from
  drifting back to it.
- #160 proposes a *separate hosted* E2E project, `bhw-connect-e2e`,
  re-created today. It competes with #158 and uses the free org's **second
  (last) active project slot**. The project stays as the sandbox dev
  database, and the CI change is dropped.

---

## 2. Findings: the app (what costs DB and function usage per user)

At pilot size, the DB load comes from **how many requests each page view
makes** and from **writes on read paths**, not from table size (the DB is
69 MB).

### H1. Middleware runs on every lesson MP3/MP4 request

`middleware.ts` matcher only excludes `svg|png|jpg|jpeg|gif|webp`.
`public/training/` holds **1,060 MP3s, 3 MP4s, 2 VTT and 1 PDF (128 MB)**.
For a signed-in user, each media request, including each HTTP Range request
while seeking audio, runs:

- `auth.getUser()`, a network call to Supabase Auth
- a `users` + `org_units` read
- a `feature_flags` read
- a notifications `count: exact` HEAD query
- a `Set-Cookie` (`bhw_last_activity`), which makes the response uncacheable
  at the CDN

That is **4 Supabase calls plus a middleware invocation per narration clip**,
and it blocks CDN caching of files that never change. Signed-out requests for
media get redirected to `/login`.

**Fix:** add `mp3|mp4|webm|vtt|pdf|json|txt|ico|woff2?|map` and
`training/` to the matcher exclusion. Add `headers()` in `next.config.ts` with
`Cache-Control: public, max-age=31536000, immutable` for `/training/*`.
Optionally skip prefetch requests via `missing: [{type:'header', key:'next-router-prefetch'}]`.

### H2. 6–7 Supabase calls before any page data, including 2 Auth calls

| Where | Call |
|---|---|
| middleware | `auth.getUser()` (Auth server) |
| middleware | `users` lookup (**112,736 calls** in `pg_stat_statements`, the most-called app query) |
| middleware | `feature_flags` (125k seq scans) |
| middleware | notifications unread `count: exact` (**95,873 calls, 454 s total DB time**) |
| root layout | `feature_flags` **again** (only 2 flags are forwarded as headers) |
| every page | `getRequestAuthUser()`, a **second** `auth.getUser()` |
| every page | `getRequestAppUser()`, a **second** `users` read |

Signed-out `/`, `/privacy` and `/login` still run the layout `feature_flags`
read, which RLS returns empty for anon.

**Fix:**

- Use `supabase.auth.getClaims()` (local JWT verification) instead of
  `getUser()` in middleware and `request.ts`.
- Have pages read the `x-app-*` headers middleware already forwards, not a
  second `users` query.
- Forward all flags in one header, or cache `feature_flags` for 30–60 s with
  `unstable_cache` plus a tag invalidated from `/admin/flags`.
- Replace the per-request notifications count with a stored unread counter
  on `users`, or a short per-user cache.

Expected effect: about 40% fewer PostgREST and Auth calls app-wide.

### H3. Link prefetch still fans out to full dynamic renders

Only the training manual lists got `prefetch={false}` (#159). Still
prefetching full renders (every route is dynamic):

- lesson prev/next links and the facilitator tabs
- breadcrumbs
- header nav, user menu, drawer and bell on **every page**
- home "Continue" and chapter links
- `/kb` category links, which render a page that **writes**
- `/courses` links, which prefetch the heaviest page
- ~15 admin nav links

Each prefetch costs 4 middleware calls plus the page's own 6–20 queries.

**Fix:** set `prefetch={false}` on these link groups, or add `loading.tsx`
boundaries so prefetch stops at the loading shell.

### H4. The lesson list is the slowest query in the database

`pg_stat_statements`, top query by total time:

> `course_lessons … WHERE module_id = ANY($1) AND published_revision_id IS NOT NULL`
> **3,681 calls · 266 ms mean · ~6,600 buffer reads per call · 980 s total**,
> for a 97-row table.

Cause: the `training_lesson_read` policy calls
`training_module_admin(module_id) OR training_lesson_visible(id)` **once per
row**.

- `training_lesson_visible` is a SECURITY DEFINER 5-table join, plus
  `current_app_user()`, plus 2× `org_visible_to_actor()`.
- Each of those calls `current_app_user`, `current_org_path` and
  `org_unit_path` again.
- SECURITY DEFINER SQL functions can't be inlined, so this is about 15–20
  subqueries per row.
- The same pattern is on `course_lesson_revisions` and `training_programs`.

It is hit on every home, manual and chapter view (`load-manual-progress.ts`
loads all ~113 lessons).

The org-scope helper pattern `(select org_unit_path(row.org_unit_id))` is
correlated with the row, so the `select` wrapper doesn't cache it. This runs
per row on announcements, surveys, courses, notifications (hit on every
request through the unread count) and enrollments.

Related: `org_units` (43,753 PSGC rows, 35 MB, half the DB) shows **87,660
seq scans reading 78M tuples**.

**Fix:**

- Rewrite as set-based policies that compute actor context once per
  statement, e.g. `module_id in (select visible_training_module_ids())`, or
  plain `exists` joins against `(select current_org_path())`.
- Store `org_path` on content rows (or use `ltree`) so the scope check is a
  column compare, not a function call per row.
- Consolidate the 151 `multiple_permissive_policies` warnings (advisor).
  Every extra permissive policy is evaluated for every row.

### H5. Writes on read paths (the main WAL / Disk IO source per user)

1. **Every slide/section move writes.** `reference-lessons.tsx` calls
   `rpc_course_lesson_resume` on each Next/Prev and mode toggle. Each call:
   - runs the full visibility check
   - takes `SELECT … FOR UPDATE` on the **shared `course_modules` row**, so
     all learners in a module serialize on it and it generates WAL
   - upserts `course_progress`, then `course_lesson_resume`, leaving a dead
     tuple each time

   **Fix:** debounce, or save on `pagehide` / `visibilitychange` via
   `sendBeacon`. For resume only, use `FOR KEY SHARE`, or read without a
   lock. The completion path needs the lock; resume doesn't.
2. **`rpc_onboarding_complete_step` always UPDATEs `users`**, the hottest
   read table, and fires its `updated_at` trigger even when the step is
   already done. It runs on every `kb/[slug]` render (including prefetch)
   and every chat question. **Fix:** add `WHERE NOT (onboarding_progress ? p_step)`,
   and skip the call when `onboarding_completed_at` is set.
3. `kb/[slug]` awaits one `rpc_track_event` insert per view. Lesson
   completion calls `router.refresh()`, which re-runs middleware plus a
   ~20-query render.

### H6. `/courses/[id]` over-fetches, then redirects

- The page runs about 9 queries, including module bodies and lesson jsonb in
  both languages, **before** its redirect check for manual-mapped courses.
- The assessment path loads all published revisions (`read_sections` and
  `slides` jsonb), `svg_markup` visuals and audio timings, and ships them to
  the client.
- This drives Supabase egress (5 GB free) and Vercel function CPU.

**Fix:** resolve the mapping and redirect first. Skip reference content,
visuals and audio when the page is `assessmentOnly`.

### Medium and low

- **M1. Chat:** `/api/chat` loads **all published KB entries** (both
  languages) plus all synonyms on every question, and repeats the auth, user
  and flags reads. Cache with `unstable_cache` plus a tag revalidated by the
  KB RPCs.
- **M2. Training page:** the chapter view duplicates its own reads (about 19
  queries), uses `select('*')`, and imports `narration.json` (**1.97 MB**)
  into the server bundle, which costs cold-start time on every lambda.
- **M3. No static or cached pages:** the root layout reads `headers()` and
  `cookies()`, so `/`, `/privacy`, `/offline` and `/certificates/*` are all
  SSR on every hit. The full 54–58 KB messages file goes to the client on
  every HTML response.
- **M4. Unbounded lists** (no `.limit()`): forum, announcements, flip charts,
  surveys, training sessions, assessments, admin forum.
- **M5. Loader scripts write unconditionally.** `kb-load` calls
  `rpc_kb_entry_update` on every entry each `--apply`, which rebuilds the
  tsvector and writes an audit row. `training-load` does the same with
  unconditional PATCHes. They should diff first and write only changes.
- **Advisor:** 39 unindexed FKs (info), 20 unused indexes. At this size they
  are low-cost; tidy them up alongside the RLS work.
- **Fine as is:**
  - The service worker is cache-as-you-browse; it could be cache-first for
    `/_next/static`.
  - Sentry has 10% traces and no Replay.
  - There is no realtime, polling or `setInterval` fetching.
  - Media has `preload="none"`.
  - There is no image-optimization usage.

---

## 3. Findings: CI, deploys and process

### CI (`.github/workflows/ci.yml`)

One healthy run is about **10 runner-minutes**:

| Stage | Time |
|---|---|
| checks: npm ci, lint, typecheck, vitest | 1m40s |
| e2e: npm ci (again) | 32s |
| e2e: `supabase start` | 78s |
| e2e: Playwright install | 25s |
| e2e: build | 41s |
| e2e: 66 tests, `workers: 1` | 4m12s |
| e2e: Lighthouse ×5 | 63s |

What wastes minutes:

- **No `paths-ignore`.** Docs-only commits run the full ~10 minutes. The
  "record PR link" docs commits double the runs per increment.
- **Full re-run on every merge to main**, after the PR already passed on the
  same code.
- **Stacked branches repeatedly merge `origin/main`.** That was 9 of the last
  30 merges, each a full CI plus a Vercel preview, sometimes followed by a
  fix-up commit.
- **No caching** of `.next/cache`, Playwright browsers or Supabase Docker
  images. `npm ci` runs twice.
- **`e2e` waits for `checks`**, which adds ~1m40s to wall time.
- **`retries: 2`, plus the "re-run once" rule**, means up to 3 attempts per
  flaky test, and then a whole second run. There is no `maxFailures`.
- **Lighthouse `numberOfRuns: 5`** on one signed-out URL.
- **A real Gemini call on every E2E run** (`ai-gap-draft.spec.ts`), which
  spends free AI quota.
- **Parallel sessions:** PRs #104 to #160 in about 4 days, with three
  competing CI redesigns open at once (#157, #158, #160).

### Scheduled jobs still hitting the pilot

- `backup.yml`: weekly `pg_dump`. Keep it; it's cheap and needed.
- `retention-purge.yml`: monthly. Keep it.
- `e2e-test-users-purge.yml` and `e2e-test-courses-purge.yml`: weekly sign-in
  plus scans, **only to clean up pre-#158 leftovers**, in dry run
  indefinitely. Run them once with apply, then delete both.

### Vercel

- `vercel.json` has only `regions: ["hnd1"]`. There is no `ignoreCommand`
  and no `git.deploymentEnabled`.
- **Every branch push builds a preview**, including docs-only commits and
  merge-main commits. Two docs commits 6 s apart made two builds.
- There were **39 deployments in ~21 hours** on 27–28 Sep. Hobby allows 100
  deployments a day and a limited build-minute pool, and on a busy day that
  headroom goes.
- Media served from `public/` counts against Hobby's Fast Data Transfer. It
  is fine at pilot size once the `immutable` cache headers let browsers and
  the CDN keep it.
- The same team has other projects (`bhw-connect`, `ofis-platform`, …). Hobby
  limits are per account, so their usage shares the same pool.

### Rules and docs

- There is **no CLAUDE.md**, so each session re-learns the conventions from
  `docs/session-handoff.md`, `docs/deploy-runbook.md` and
  `docs/delivery-plan.md`.
- Several of those docs are **now wrong**, and will send sessions back to
  pilot-based E2E:
  - `session-handoff.md:18-20,358-370,423-425`
  - `credentials.md:82-85`
  - `e2e-test-users-purge.yml:14-16`
  - `doctor.mjs:117-148`
  - `deploy-runbook.md:35,396-407`
- **Migrations are applied to the pilot by hand, from sessions.** That has
  caused drift and cross-PR breakage before (#156's migration broke #157's
  CI).
- `.claude/settings.json` pre-approves `training:load`, and the SessionStart
  hook confirms pilot loader credentials are present. Any session can write
  to the pilot without a prompt.

---

## 4. Recommendations, prioritised

### Progress (updated 28 Sep 2026)

| Items | Status |
|---|---|
| 0 baseline and stats reset | Done: `docs/usage-baseline.md`, stats reset 03:57:50 UTC |
| 1–8 stop the waste | Done in #163. Secrets renamed and old ones deleted; no unused Vercel projects. Preview env vars stay on the pilot, because `bhw-connect-e2e` is paused and empty. |
| 9 asymmetric JWT keys | Already done: ES256 is the current key |
| 10–14 per-user cost | Done in #164: `getClaims()`, forwarded profile and flags, cached unread count, prefetch off everywhere, debounced resume saves, onboarding-step writes skipped once done, slim `/courses/[id]` assessment payload |
| 16 RLS (first pass) | In the follow-up PR, migration `20261005000000_set_based_training_rls.sql`. It adds set-based lesson and revision read policies and a notifications policy without per-row lookups, drops the resume locks, and makes `rpc_onboarding_complete_step` a no-op when the step is done. Checked against the pilot's data for all 30 users with zero differences in visible rows. The lesson list drops from 283 ms to 7 ms. Still open: the org-scope helpers on courses, announcements and surveys, and the `multiple_permissive_policies` warnings. |
| 15, 17–20 | Not started |

Effort: S = under an hour, M = half a day, L = a day or more.
Each item has a **done when** check, in the same style as the delivery plan's
Definition of Done, so every batch can be shown to have worked.

### Step 0: measure first

| # | Action | Done when | Effort |
|---|---|---|---|
| 0 | **Baseline, then reset stats.** Save a snapshot of the top 30 `pg_stat_statements` rows, API requests per hour, edge-log volume by user agent (Vercel vs `Next.js Middleware`/`node`), and the advisor counts. Then run `select extensions.pg_stat_statements_reset();`. The stats have never been reset (they add up from July), so without a reset there is no clean before/after. Repeat the snapshot after each batch below. The snapshot query becomes item 18's recurring check. | A dated baseline is saved in this doc or `docs/`, and the stats reset time is recorded | S |

### Now: stop the remaining waste (no product change)

Ordered by impact. The dev database comes first because it removes traffic
that isn't users at all; the middleware fix only lowers the per-user cost.

| # | Action | Done when | Effort |
|---|---|---|---|
| 1 | **One dev database, enforced in code.** _(Done in the follow-up PR: `scripts/lib/pilot-guard.mjs`, doctor warning, docs. The main leak turned out to be old CI re-runs, closed by the secret rename in "Pilot secrets".)_ Use `supabase start` wherever Docker is available (local machines, GitHub runners). Use the hosted `bhw-connect-e2e` project only for cloud sandbox sessions that can't run Docker. Point `.env.local`, session credentials and loader defaults at it. **Guards:** `next dev`, `playwright test` and `scripts/*` refuse to start when `NEXT_PUBLIC_SUPABASE_URL` contains the pilot ref `ltzicxyefizxoqhfuuzc`, unless `ALLOW_PILOT=1` is set. `doctor.mjs` warns when `.env.local` points at the pilot. The SessionStart hook checks for a *dev* database instead of pilot loader credentials. Remove `training:load` from the pre-approved commands in `.claude/settings.json`, or scope it to `--project local`. | `Next.js Middleware`/`node` user agents are under 5% of pilot edge logs for a week | S–M |
| 2 | **One E2E strategy.** Keep #158 (local stack). Close #157. From #160, drop the CI change but keep the `bhw-connect-e2e` project as the sandbox dev database from item 1. Never re-run a CI run from before #158; push or merge `main` instead. | No pilot sign-ins from CI; #157/#160 closed | S |
| 3 | **Middleware matcher:** exclude `mp3\|mp4\|webm\|vtt\|pdf\|json\|txt\|ico\|woff2?\|map` and `/training/`. Add `Cache-Control: public, max-age=31536000, immutable` for `/training/*` in `next.config.ts` (H1). **Decision to record:** afterwards, lesson media can be downloaded by anyone who has the URL (today, signed-out requests redirect to `/login`). It is public DOH training material already in `public/`, so this should be fine, but it is a deliberate choice, not a side effect. | Media responses have no `Set-Cookie` and are served from the CDN cache (`x-vercel-cache: HIT`); `auth/v1/user` calls per lesson view drop | S |
| 4 | **CI `paths-ignore`** for `docs/**`, `**/*.md`, `pitch/**`, `mockups/**`, `prototypes/**` and `content/**/*.md`, plus workflow-level `concurrency` with `cancel-in-progress`. **Caveat:** if a CI check is *required* by branch protection, a skipped workflow leaves it pending and the PR can't merge. Either keep the checks non-required, or add a tiny always-green `docs-only` workflow on the ignored paths that reports the same check names. The same applies to `[skip ci]`. | A docs-only PR runs no E2E and can still merge | S |
| 5 | **Vercel `ignoreCommand`:** skip the build when only docs or non-app paths changed, e.g. `git diff --quiet HEAD^ HEAD -- src public messages supabase package.json package-lock.json next.config.ts middleware.ts`. Do this before any more docs-only pushes; this audit's own PR built a preview for a Markdown file. | A docs-only push shows "Canceled by Ignored Build Step" in Vercel | S |
| 6 | **Retire the two weekly e2e purge workflows** after one applied run | Both workflow files deleted | S |
| 7 | **Check the other Vercel projects and preview env vars.** Pause `bhw-connect` (and any other unused projects) if they still auto-deploy; they share the account's Hobby pool. Check in the dashboard which Supabase project **preview** deployments use (the API returned 403). If previews point at the pilot, move them to the dev database. | Only `bhw-connect-phase-2` deploys on push; previews don't use the pilot | S |
| 8 | **Fix the stale docs** listed in section 3, and add a short **CLAUDE.md** with the rules in section 5 | No doc says E2E runs on the pilot | S |

### Next: per-user cost (keeps the pilot inside Nano IO as BHW numbers grow)

| # | Action | Done when | Effort |
|---|---|---|---|
| 9 | **Prerequisite:** in the Supabase dashboard (Auth → JWT signing keys), migrate the pilot to **asymmetric signing keys**. `getClaims()` only verifies locally with asymmetric keys; with the legacy shared secret it still calls the Auth server and item 10 saves nothing. Rotate carefully: existing sessions stay valid during the overlap period. | Project shows an asymmetric (e.g. ES256) current key | S |
| 10 | `getClaims()` instead of `getUser()`; pages reuse the `x-app-*` headers; flags cached or forwarded once (H2) | Middleware plus render make ≤2 Supabase calls per page before page data; daily `users` lookups drop by half or more | M |
| 11 | Store the unread notification count on `users` (or use a short cache) instead of a per-request `count: exact` (H2/M3) | The notifications `HEAD` query is gone from the per-request path | S–M |
| 12 | `prefetch={false}` on lesson prev/next, breadcrumbs, header nav, home, `/kb`, `/courses` and admin nav, or add `loading.tsx` (H3) | One lesson view makes one page render in Vercel logs, not 5–10 | S |
| 13 | Debounce or save-on-leave for lesson resume; drop the `course_modules FOR UPDATE` on resume; make `rpc_onboarding_complete_step` a no-op when the step is already set (H5) | ≤1 resume write per lesson visit; no `users` UPDATE from a KB view or chat question once onboarding is done | M |
| 14 | `/courses/[id]`: redirect first; slim the assessment payload (H6) | Manual-mapped courses redirect after ≤2 queries | S–M |
| 15 | Loader scripts: diff before writing (M5) | Re-running a load with no content changes makes zero writes | M |

### Then: structural

| # | Action | Done when | Effort |
|---|---|---|---|
| 16 | Rewrite the training RLS helpers to be set-based, fix the per-row `org_unit_path()` policies, and consolidate overlapping permissive policies (H4) | The `course_lessons` list query is under 10 ms mean (from 266 ms); `multiple_permissive_policies` warnings are cut by at least half | L |
| 17 | Cache the KB and synonyms for chat with `unstable_cache` plus tag revalidation (M1) | A chat question reads no `kb_entries` rows on a cache hit | M |
| 18 | Per-lesson narration JSON instead of the 1.97 MB import (M2); pass only the needed i18n namespaces to the client (M3) | `narration.json` is no longer in the server bundle; HTML shrinks by tens of KB | M |
| 19 | CI speed: run `checks` and `e2e` in parallel; cache `.next/cache` and Playwright; Lighthouse `numberOfRuns: 3`; stub Gemini in CI; set `maxFailures`. **Sharding:** each shard pays its own ~78 s `supabase start` and npm install, so it saves wall time, not runner minutes. On a public repo, shard 2–3 ways. On a private repo's 2,000 min/month, use at most 2 shards. | Wall time per run is about 5 minutes (from about 10) | M |
| 20 | Weekly pilot usage check: the step-0 snapshot (top `pg_stat_statements`, edge-log volume by user agent, advisor counts, DB size, egress), run as a script or a scheduled Claude Routine. Warn before the IO budget runs out, not after | A weekly report exists; there is a threshold to alert on | S |

## 5. Proposed working rules (for CLAUDE.md)

1. **Never point dev, E2E or a session at the pilot.** Use `supabase start`
   locally and in CI. The pilot is only for real users, applying reviewed
   migrations, and the post-deploy smoke check with the stable accounts.
2. **Migrations:** write the file, prove it replays on `supabase start`, then
   apply to the pilot **once**, on merge, from one place (an MCP
   `apply_migration` checklist step, or a manual `workflow_dispatch`). Never
   apply from several parallel sessions.
3. **One PR per increment, squash-merged.** Don't stack branches that keep
   merging `main`. If a branch falls behind, merge `main` once, just before
   merge.
4. **Don't push docs-only commits separately.** Put the "record PR link"
   change in the PR's last code commit, or batch docs in one PR.
5. **Don't re-run old CI runs from before a CI change.** Push or merge
   `main` instead, so the current workflow runs.
6. **Loaders and scripts default to `--dry-run`, write only diffs, and
   target `local` by default.** `--project pilot` must be explicit.
7. **Before adding a query to a layout, middleware or list, check whether
   the data is already forwarded in `x-app-*` headers or `React.cache()`.**
   Every link to a dynamic page needs a deliberate prefetch decision.
8. **Batch migrations to the pilot.** Each applied migration makes
   PostgREST reload its schema cache. That reload query
   (`pg_timezone_names`, about 2 s each) is what timed out on 27 Sep under
   IO pressure. Apply the migrations in one batch per merge, never one per
   session, and never while the IO budget is low.
9. **The pilot is guarded in code.** Tools refuse the pilot URL unless
   `ALLOW_PILOT=1` is set. Set it only for a reviewed migration, a
   deliberate content load, or the post-deploy smoke check.
10. **RLS:** actor context is computed once per statement
   (`(select current_app_user())`). No SECURITY DEFINER helper called per
   row. At most one permissive policy per role and action.

---

## 6. Free-tier headroom after the fixes (rough)

Assuming ~30–100 BHWs piloting:

- **Supabase (Nano).** The IO budget was exhausted only by CI and dev
  traffic (~480k requests in 10 h). Real use is far below that. With items
  1–3 the pilot sees only real users. Items 10–13 cut per-user calls by about
  half and remove most per-slide writes, which leaves wide headroom for a
  larger pilot. Keep an eye on:
  - DB size: 69 MB of 500 MB, and PSGC `org_units` is half of it
  - egress: 5 GB/month
  - MAU: 50k
  - the 2-active-project limit (the pilot plus `bhw-connect-e2e` use both slots, so
    a third project means pausing one)
  - pause after 7 days inactive, so a cohort break longer than a week needs
    a visit
- **Vercel (Hobby).** Items 4–5 remove the docs and merge-main build churn.
  Items 3, 10 and 12 cut function and middleware invocations per page view by
  roughly 3–5×, and immutable media headers stop repeat audio transfers.
  Hobby is non-commercial use only; check that the pilot's status (e.g.
  donor-funded) fits the terms before scaling.
- **GitHub Actions:** unlimited for public repos; 2,000 min/month for
  private repos. At ~10 min per run, 488 runs a day is not sustainable on a
  private repo. With items 4 and 19 each increment costs about 2–3 runs of
  about 5 minutes.
