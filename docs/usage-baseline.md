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
