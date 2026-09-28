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

**Not fixed yet.** The pilot is still being used as a development database:

- In today's logs, about **1,100 of ~1,200 middleware auth calls came from
  `Next.js Middleware` / `node` user agents**. That is a local or sandbox
  `next start`, not Vercel (Vercel shows `Vercel Edge Functions`, 105 calls).
  So dev sessions and PR re-runs are still hitting the pilot.
- The 03:00 UTC spike today lines up with a **re-run of #157's old CI run**.
  A re-run uses the workflow file from its original commit, which is the
  pilot-based E2E.
- #160 is still open. It proposes a *separate hosted* E2E project,
  `bhw-connect-e2e`, re-created today. That competes with #158 and uses the
  free org's **second (last) active project slot**.

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

Effort: S = under an hour, M = half a day, L = a day or more.

### Now: stop the remaining waste (no product change)

| # | Action | Saves | Effort |
|---|---|---|---|
| 1 | **Middleware matcher:** exclude media and static extensions and `/training/`; add `immutable` cache headers for `/training/*` (H1) | 4 DB/Auth calls per audio clip; CDN caching of 128 MB of media | S |
| 2 | **Pick one E2E strategy:** keep #158 (local stack), close #160 and #157's pilot-based CI, never re-run pre-#158 CI runs (push or merge main instead) | Stops the pilot re-run spikes and frees the 2nd project slot | S |
| 3 | **Repurpose or pause `bhw-connect-e2e`** as the *dev* database for Claude sessions and local `next dev`. Point `.env.local` and session credentials at it (or at `supabase start`). **The pilot is for real BHWs, deploy smoke checks and migrations only** | Removes ~90% of today's non-user pilot traffic | S–M |
| 4 | **CI `paths-ignore`** for `docs/**`, `**/*.md`, `pitch/**`, `mockups/**`, `prototypes/**`, `content/**/*.md`; add workflow-level `concurrency` with `cancel-in-progress` | ~10 runner-min per docs commit | S |
| 5 | **Vercel `ignoreCommand`:** skip builds when only docs or non-app paths changed, e.g. `git diff --quiet HEAD^ HEAD -- src public messages supabase package.json next.config.ts middleware.ts` | Preview builds per docs commit | S |
| 6 | **Retire the two weekly e2e purge workflows** after one applied run | Weekly pilot sign-ins and scans | S |
| 7 | **Fix the stale docs** listed above, and add a short **CLAUDE.md** with the rules in section 5 | Stops sessions from rebuilding pilot-based CI | S |

### Next: per-user cost (keeps the pilot inside Nano IO as BHW numbers grow)

| # | Action | Saves | Effort |
|---|---|---|---|
| 8 | `getClaims()` instead of `getUser()`; pages reuse the `x-app-*` headers; flags cached or forwarded once (H2) | ~40% of all API and Auth calls | M |
| 9 | Store the unread notification count on `users` (or use a short cache) instead of a per-request `count: exact` (H2/M3) | The #2 query by call count | S–M |
| 10 | `prefetch={false}` on lesson prev/next, breadcrumbs, header nav, home, `/kb`, `/courses` and admin nav, or add `loading.tsx` (H3) | 5–10 hidden renders per page view | S |
| 11 | Debounce or save-on-leave for lesson resume; drop the `course_modules FOR UPDATE` on resume; make `rpc_onboarding_complete_step` a no-op when already set (H5) | Most per-user writes, WAL and dead tuples | M |
| 12 | `/courses/[id]`: redirect first; slim the assessment payload (H6) | Egress, function CPU | S–M |
| 13 | Loader scripts: diff before writing (M5) | Pointless rewrites, tsvector rebuilds and audit rows on each load | M |

### Then: structural

| # | Action | Saves | Effort |
|---|---|---|---|
| 14 | Rewrite the training RLS helpers to be set-based, fix the per-row `org_unit_path()` policies, consolidate overlapping permissive policies (H4) | The #1 query (266 ms to about 5 ms expected); scales with users | L |
| 15 | Cache the KB and synonyms for chat with `unstable_cache` plus tag revalidation (M1) | Full KB read per question | M |
| 16 | Per-lesson narration JSON instead of a 1.97 MB import (M2); pass only the needed i18n namespaces to the client (M3) | Cold start, HTML size | M |
| 17 | CI speed: run `checks` and `e2e` in parallel; cache `.next/cache` and Playwright; shard E2E across 2–3 jobs (each has its own local DB now, so shared-state races no longer apply); Lighthouse `numberOfRuns: 3`; stub Gemini in CI; `maxFailures` | ~10 min down to ~5 min wall time per run | M |
| 18 | Add a pilot usage check (weekly or on demand): top `pg_stat_statements`, edge-log volume by user agent, advisor count. Alert before the IO budget runs out, not after | Early warning | S |

---

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
8. **RLS:** actor context is computed once per statement
   (`(select current_app_user())`). No SECURITY DEFINER helper called per
   row. At most one permissive policy per role and action.

---

## 6. Free-tier headroom after the fixes (rough)

Assuming ~30–100 BHWs piloting:

- **Supabase (Nano).** The IO budget was exhausted only by CI and dev
  traffic (~480k requests in 10 h). Real use is far below that. With items
  1–3 the pilot sees only real users. Items 8–11 cut per-user calls by about
  half and remove most per-slide writes, which leaves wide headroom for a
  larger pilot. Keep an eye on:
  - DB size: 69 MB of 500 MB, and PSGC `org_units` is half of it
  - egress: 5 GB/month
  - MAU: 50k
  - the 2-active-project limit
  - pause after 7 days inactive, so a cohort break longer than a week needs
    a visit
- **Vercel (Hobby).** Items 4–5 remove the docs and merge-main build churn.
  Items 1, 8 and 10 cut function and middleware invocations per page view by
  roughly 3–5×, and immutable media headers stop repeat audio transfers.
  Hobby is non-commercial use only; check that the pilot's status (e.g.
  donor-funded) fits the terms before scaling.
- **GitHub Actions:** unlimited for public repos; 2,000 min/month for
  private repos. At ~10 min per run, 488 runs a day is not sustainable on a
  private repo. With items 4 and 17 each increment costs about 2–3 runs of
  about 5 minutes.
