# Performance slowdown: assessment and fix plan

Assessed 2026-09-24 against production deployment `dpl_DZJjC7CuTCxcySLLLgNMgrRnSmkW`
(commit `a3f95ce`, project `bhw-connect-phase-2`).

## Diagnosis

The app is slow because every page does many Supabase round trips **one after
another**, and each of those round trips crosses the Pacific.

| Where | What was found |
|---|---|
| Vercel serverless functions | Run in **`iad1` (Washington DC)**. This is the Vercel default because nothing sets a region (no `vercel.json`, no `preferredRegion`). |
| Pilot Supabase DB (`ltzicxyefizxoqhfuuzc`) | In **AWS `ap-northeast-1` (Tokyo)**. The DB host's IPv6 address `2406:da14:25a:5800::466c` falls in AWS's published Tokyo range. |
| Users | In the Philippines (Los Baños pilot). |

So a single page render goes: user → Washington (~200 ms) → N × (Washington ↔
Tokyo, ~150–170 ms each) → user. N is the number of sequential DB calls:

| Route | Sequential Supabase calls (page + middleware) | DB wait at ~160 ms each |
|---|---|---|
| `/training/[programId]/…/lesson` (most-hit route, 71 of ~130 prod requests in 7 days) | ~11–13 + 4 | ~1.8–2.1 s |
| `/courses/[id]` | ~20+ + 4 | ~3.5 s+ |
| `/home` | 3 + 4 (no data of its own) | ~0.5 s |
| `POST /api/chat` | ~15–18 + 4 | ~2.5–3 s before the AI call |

Every "sequential call" here is a separate HTTPS round trip. Things that make it worse:

1. **Duplicated work per request.** Middleware already loads `auth.getUser()`,
   the `users` row and `feature_flags`, then every page and layout loads them
   again. That adds up to 33 `getUser`, 34 `getAppUser` and 38 `getFeatureFlags`
   call sites. There is no `React.cache`, so `/admin/kb/articles` reads
   `feature_flags` three times.
2. **Link prefetch multiplies it.** In the logs, opening a chapter fires full
   server renders of every lesson link in the same second (5 lesson renders per
   chapter view, all `cache=MISS`). Each render pays the full chain above.
3. **Middleware work on `/api/*`.** The flags read and the notification unread
   count run on every API call too (e.g. each chat message), even though
   they're only used for page headers.
4. **Per-row RLS functions.** The training and lesson policies
   (`20260924000000_training_lesson_foundation.sql:104-173`) nest
   `SECURITY DEFINER` helpers, which Postgres can't inline, 3–4 levels deep for
   each row. The org-scope policies (notifications, announcements, surveys,
   courses, sessions) call `org_unit_path(row.org_unit_id)` for each row. The
   notifications one runs on every request through the middleware unread count.
5. **Blocking "fire-and-forget" writes.** `kb/[slug]` awaits one
   `rpc_track_event` per article plus an onboarding RPC before rendering.
   `api/chat` awaits 1–4 tracking RPCs.
6. **Payload and bundle.** `/courses/[id]` sends both languages' module bodies,
   SVGs, audio timings and full revisions to a client component. The read-only
   KB viewer ships tiptap/ProseMirror to BHWs. Both full message files
   (~45 KB each) go to every page.
7. **Blind spot.** `lighthouserc.js` only measures signed-out `/`, so none of
   the signed-in routes above have ever been under the perf budget.

Things that were ruled out: Sentry (10% traces, no Replay), polling or realtime
(none in the code), and the service worker (network-first, negligible).
Supabase logs and advisors for the pilot project couldn't be read from this
session because it isn't in the connected Supabase org, so the RLS cost above
comes from reading the code and hasn't been measured.

## Fix plan

Ordered by payoff per unit of effort. Each phase ships and is measured on its own.

### Phase 0: Measure (same day)
- Record a baseline. Time the signed-in routes `/home`, a lesson page,
  `/courses/[id]` and a chat send (server timing from Vercel Observability,
  plus a browser TTFB).
- Add signed-in routes to Lighthouse CI (log in as a seeded e2e user) so we
  catch regressions.

### Phase 1: Co-locate compute with the DB (config only, biggest single win)
**Status: done** — `vercel.json` pins functions to `hnd1`. Verify after
deploy: the deployment's `regions` should read `hnd1`.

- Add `vercel.json` with `{"regions": ["hnd1"]}` (Tokyo), or set it under
  Project Settings → Functions → Region.
- Expected result: each DB round trip drops from ~160 ms to ~2–5 ms, and the
  user → function hop gets shorter too (PH → Tokyo is closer than PH → DC).
  The lesson page should go from ~2 s of DB wait to under ~100 ms.
- Risk is low. Check that no other backend the functions call (AI provider,
  Sentry) is region-restricted.

### Phase 2: Remove duplicated per-request work (small code change)
**Status: done (first pass).**
- `src/lib/supabase/request.ts` adds `React.cache`-memoised
  `getRequestAuthUser`, `getRequestAppUser` and `getRequestFeatureFlags`.
  All pages and layouts use them, so a layout and its page share one
  lookup per request. For example, `/admin/kb/articles` used to read
  `feature_flags` three times and now reads it once. Server actions and
  route handlers keep their uncached reads on purpose.
- Middleware now reads the profile and flags in parallel, and `/api/*`
  requests skip the flags and unread-count queries.
- Still open: `getClaims()` (needs the project's JWT signing-key type
  confirmed), cross-request flag caching, and checking whether Edge
  middleware should move to the Node.js runtime so it also runs in
  `hnd1`.

- Wrap `getAppUser`, `getFeatureFlags` and a `getAuthUser` helper in
  `React.cache` so a request fetches each of them once, shared across its
  layout and page. Alternatively, have pages read the `x-app-*` headers
  middleware already forwards, as the root layout does.
- In middleware, skip the flags and unread-count queries for `/api/*` paths.
- Run middleware's `getAppUser` and `getFeatureFlags` in parallel. Consider
  `auth.getClaims()` (local JWT verification) instead of the network
  `getUser()` where a revocation check isn't needed.
- Consider caching `feature_flags` for 30–60 s with `unstable_cache` or
  `"use cache"` plus a tag that the admin flags page revalidates.

### Phase 3: Parallelise the heavy routes
**Status: done (first pass).** Sequential reads before and after:

| Route | Before | After |
|---|---|---|
| `courses/[id]` | ~20 | ~5 (flags+auth, profile, one batch, one batch, revisions) |
| training lesson page | ~12 | ~6 (flags+auth, profile, program+chapters, course+modules+progress, lessons+completed, lesson+resume+pretest) |
| `api/chat` | ~15–18 | ~7 on the response path |

- `courses/[id]` also drops the duplicate chapter and program reads.
- `api/chat`: analytics and onboarding RPCs move to `after()`, the
  existing-session update runs alongside the user-message insert, and the
  unmatched-question upsert runs alongside the first-answer check.
- `kb/[slug]`: the onboarding RPC runs alongside the page's reads. It stays
  awaited rather than moving to `after()`, because a Server Component can't
  use request cookies after the response.
- The rate-limit check in `api/chat` intentionally stays ahead of the
  knowledge-base load so rejected requests stay cheap.
- Not done yet: caching `kb_entries`/`synonyms` across requests, and
  `prefetch={false}`. With functions now in `hnd1`, re-measure before
  deciding whether either is still worth it.

- `training/[programId]/[[...path]]`: run program + chapters, then
  course + modules + progress, as `Promise.all` batches. That gets it to about
  3–4 dependent steps.
- `courses/[id]`: questions, visuals, audios, test questions, attempts,
  session, progress and certificate all depend only on `id`/`moduleIds`, so
  run them in one `Promise.all`. Drop the duplicate `training_program_chapters`
  read (`:238` vs `:373`).
- `api/chat`: load user, flags and rate limit in parallel. Don't await the
  tracking and onboarding RPCs (use `after()` from `next/server`). Cache
  `kb_entries` + `synonyms` instead of reading them on every message.
- `kb/[slug]`: move the tracking and onboarding RPCs into `after()`.
- Set `prefetch={false}` on long lesson/module link lists, or rely on the
  default viewport prefetch once renders are cheap. Re-check after Phase 1–2.

### Phase 4: Database (migration, needs pilot DB access to verify with `EXPLAIN ANALYZE`)
**Status: first pass done; RLS rewrite deferred.** With the pilot project
connected (2026-09-24), the data turned out to be tiny: the largest table
is `audit_events` with about 2.2k rows, and `users` has 28. The Supabase
advisor reports no `auth_rls_initplan` issues, 31 unindexed foreign keys
(info), 34 unused indexes (info, expected on a young pilot) and 145
overlapping permissive policies (warn). At this size none of that affects
latency, which confirms the slowdown was network round trips (Phases 1–3).
- Done: `20260924120000_perf_hot_path_indexes.sql` indexes the learner and
  chat lookups the app runs on every request: `course_progress.bhw_user_id`,
  `certificates(bhw_user_id, course_id)`, `assessments(bhw_user_id, course_id)`,
  `course_lessons.published_revision_id`, `course_module_progress.module_id`,
  and a partial index on `chat_messages.matched_entry_id`.
- Deferred until the pilot grows to hundreds of BHWs: the RLS helper
  rewrite, consolidating overlapping policies, and the rest of the
  unindexed foreign keys. These change security rules, so they need
  `EXPLAIN ANALYZE` evidence at real volumes before they're worth the risk.

- Rewrite the training RLS helpers so the per-user part (`current_app_user()`,
  `current_org_path()`) is evaluated once with `(select …)`, and replace the
  nested definer calls with direct `exists` joins that the planner can inline.
- For the org-scope pattern, store the materialised `org_units.path` on
  each row (or join `org_units` in the policy instead of calling
  `org_unit_path()` per row).
- Add indexes:
  - `chat_messages(created_at)`
  - `kb_entries(status)`
  - `course_progress(bhw_user_id)`
  - `forum_threads(status, created_at)`
  - `course_lessons(published_revision_id)`
- Run the Supabase performance advisor on the pilot project and fix what it
  flags.

### Phase 5: Payload and bundle
- `/courses/[id]`: select only the current locale's columns and load
  revisions or SVGs for the open module, not all of them.
- Render KB articles server-side (tiptap JSON → HTML) and drop tiptap from
  the BHW bundle.
- Pass only the needed message namespaces to `NextIntlClientProvider`.
- Add `loading="lazy"` to lesson, announcement and flipchart images.
- Add `.limit()` or pagination to forum, announcements, admin KB entries and
  articles, chat-guide unmatched questions, course-progress and survey
  results.

### Done when
Signed-in lesson and course pages have server response times under 500 ms
(p75, measured from the PH). Lighthouse CI covers at least `/home`, a lesson
page and `/courses/[id]`, and all of them meet the ≥80 budget.
