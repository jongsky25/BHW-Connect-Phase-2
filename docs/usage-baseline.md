# Pilot usage baseline

Recurring snapshot for item 0 and item 20 of `docs/dev-efficiency-usage-audit.md`.
Add a new dated section after each batch of fixes, then compare it with the
previous one. The queries are listed at the bottom.

## 2026-09-28 03:57 UTC (before any audit fixes)

`pg_stat_statements` was reset right after this snapshot, at
**2026-09-28 03:57:50 UTC**. The figures below add up from July.

### Pilot API requests by source, 27 Sep 04:00 → 28 Sep 04:00 UTC

| Source (user agent) | Requests | Share |
|---|---|---|
| `Next.js Middleware`, a local, sandbox or CI `next start`, not Vercel | 347,090 | 73% |
| `node`, server components and scripts outside Vercel | 87,945 | 19% |
| Browser, mostly Playwright plus a few real sign-ins | 32,363 | 7% |
| `Vercel Edge Functions`, **the deployed app** | 6,595 | **1.4%** |
| Other | 157 | 0% |
| **Total** | **474,150** | |

**Target (item 1):** Vercel and real-browser traffic should make up more
than 95% of pilot requests.

### Top queries by total time (cumulative since July)

| # | Query | Calls | Mean | Total |
|---|---|---|---|---|
| 1 | `course_lessons` list (per-row RLS helpers) | 3,681 | 266 ms | 980 s |
| 2 | middleware notifications unread `count` | 95,873 | 4.7 ms | 454 s |
| 3 | `rpc_admin_create_user` (e2e throwaways) | 1,090 | 402 ms | 439 s |
| 4 | auth `INSERT sessions` (logins) | 6,733 | 57 ms | 381 s |
| 5 | auth `INSERT refresh_tokens` | 6,751 | 40 ms | 270 s |
| 6 | `rpc_record_login_attempt` | 2,569 | 78 ms | 201 s |
| 7 | auth user lookup | 7,321 | 25 ms | 183 s |
| 8 | middleware `users` profile lookup | 112,736 | 1.5 ms | 164 s |
| 9 | `rpc_login_precheck` | 3,024 | 50 ms | 150 s |
| 10 | `pg_timezone_names` (PostgREST schema reload) | 60 | 2,146 ms | 129 s |
| 11 | `course_test_questions_current` | 3,675 | 29 ms | 107 s |
| 12 | `rpc_track_event` | 2,933 | 34 ms | 100 s |

Total PostgREST requests (the `set_config` preamble): **413,247**.

### Other stats

- DB size **69 MB** of 500 MB. `org_units` (PSGC) is 35 MB and 43,753
  rows; 87,660 seq scans have read 78M tuples.
- Auth sessions created: 27 Sep **854**, 26 Sep 10, 25 Sep 36.
- Advisor: 151 `multiple_permissive_policies` (WARN), 39 unindexed FKs
  (INFO), 20 unused indexes (INFO).
- Vercel: 39 deployments in about 21 h (27–28 Sep).

## 2026-11-10 07:50 UTC (real-use saturation during a cohort day)

`pg_stat_statements` covers 28 Sep 03:57 → 10 Nov. No reset after this snapshot.

- **Statement timeouts during class hours:** 10 (02:00 UTC), 32 (05:00) and 47
  (07:00). They hit trivial statements, such as a single `users` select,
  `current_org_path()` startup and a one-row resume upsert, so the database as
  a whole was starved; no single query was the cause.
- **Traffic is real use, not a leak.** About 20 active users made ~77k API
  requests (00:00–07:50 UTC): `node` 47k, Vercel Edge 24k, browser 6k.
  - `node` traffic comes from AWS Tokyo, Vercel's `hnd1` function region. It
    is the deployed app's server renders, not dev servers or CI. (The 28 Sep
    entry read `node` as non-Vercel; that applied to that day's sandbox and CI
    traffic only.)
  - Middleware runs on Vercel Edge in Singapore. Browsers connect from PH ISPs.
- **Writes are not the IO driver.** WAL since 19 Sep is only 673 MB. Reads are
  all buffer hits (`blks_read` ≈ 4k against 229M hits). The load is CPU and
  buffer work per render.
- **Top DB time per statement since the reset:**

  | Statement | Calls | Mean | Total |
  |---|---|---|---|
  | `course_lessons` list | 20,061 | 68 ms | 1,357 s |
  | `rpc_learner_assessment_state` | 9,427 | 133 ms | 1,249 s |
  | `rpc_course_lesson_resume` | 5,957 | 182 ms | 1,084 s |
  | `rpc_learner_assessment_save` | 5,006 | 179 ms | 896 s (104 MB WAL) |
  | `rpc_course_test_bank_available` | 7,856 | 106 ms | 836 s |

- **Storage:** DB 177 MB. `learner_assessment_private.mutation_receipts` is
  88 MB (TOAST, ~17 KB of result jsonb per receipt). 4,808 of its 5,075 rows
  belong to submitted attempts.
- **Dashboard load:** Supabase's Query Performance query ran 7 times in the
  incident hours, at 13–19 s each. Don't open it during class hours.

First fix (#508): lesson and subchapter pages no longer call
`rpc_learner_assessment_state`. Lesson pages call
`rpc_course_test_bank_available` only for learners without a pretest attempt.

Second fix (`20261110120000_training_visibility_helpers_plpgsql.sql`): the
training visibility helpers behind the `course_lessons` and
`course_lesson_revisions` read policies are now PL/pgSQL. They read the actor
once and return early when the actor can't qualify. On a pilot-shaped local
dataset (162 lessons, 43,753 org units), the lesson list drops from 1,102 to
323 buffer hits and from 3.2 to 0.5 ms. The visible-module helper drops from
2.3 to 0.17 ms per call, and the admin helper for a BHW from 0.83 to
0.02 ms. Applied to the pilot on 10 Nov at 11:58 UTC; all 141 users' visible
sets were identical before and after.

Third fix (`20261110150000_lesson_resume_cost.sql`):
`training_lesson_visible` is now PL/pgSQL, 2.2 to 0.09 ms per call. It is used
by both resume RPCs, both completion RPCs and the assessor exam bank.
`rpc_course_lesson_resume` skips the write when the bookmark is unchanged and
the lesson is already the learner's most recent. Before this, all 4,809
updates on the pilot were non-HOT because the indexed `updated_at` changed on
every call. An unchanged save drops from 1.2 to 0.26 ms and writes nothing.

## Queries used

Top statements (Supabase MCP `execute_sql`):

```sql
select round(total_exec_time::numeric/1000,1) total_s, calls,
       round(mean_exec_time::numeric,1) mean_ms,
       shared_blks_hit/greatest(calls,1) blks_per_call,
       left(regexp_replace(query,'\s+',' ','g'),110) q
from extensions.pg_stat_statements order by total_exec_time desc limit 20;
```

Requests by source (Supabase MCP `query_logs`, 24 h window):

```sql
select multiIf(event_message like '%Vercel Edge%','vercel-edge',
               event_message like '%Next.js Middleware%','next-middleware-nonvercel',
               event_message like '%| node%','node-server',
               event_message like '%Mozilla%','browser','other') ua,
       count(*) n
from logs where source='edge_logs' group by ua order by n desc;
```

Reset after recording: `select extensions.pg_stat_statements_reset();`
