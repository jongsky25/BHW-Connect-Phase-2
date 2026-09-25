# Deploy runbook

## Normal deploy

1. Open a PR against `main`. CI (`.github/workflows/ci.yml`) runs lint,
   typecheck, unit tests, an E2E smoke pass, a production build, and the
   Lighthouse performance-budget check.
2. If the change includes a `supabase/migrations/*.sql` file, apply it to
   **both** Supabase projects — the live pilot project and the dedicated
   `bhw-connect-e2e` CI project (see "CI test project" below) — before or
   alongside merging, via the Supabase MCP `apply_migration` tool (or
   `supabase db push` from the CLI if working locally). The app and the
   schema should never drift on either project: a merged PR whose migration
   wasn't applied to the pilot project means the deployed code will call
   RPCs that don't exist yet; not applying it to the CI project means the
   next PR's E2E run fails on unrelated code.
3. Merge to `main` once CI is green and the migration (if any) is applied.
4. Vercel's GitHub integration auto-deploys `main` (per INC-0's scaffold —
   see `docs/delivery-plan.md` §3/§7). No separate deploy step in this
   repo; merging *is* deploying.
5. **Post-deploy smoke check** (2–3 min): log in as the stable BHW and
   stable admin fixture accounts, ask the Chat Guide a known-answered
   question, and open `/admin/dashboard`. If `SENTRY_DSN` is configured,
   also check the Sentry project for a spike right after the deploy
   (a real regression usually shows up within the first few requests).

## Environment variables / secrets checklist

Anything new in `.env.example` needs a matching entry in both Vercel's
project settings (for the running app) and GitHub Actions repo secrets
(for CI and the scheduled jobs) — the two are configured independently.

| Variable | Vercel | GitHub Actions |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | required (pilot project) | required for `retention-purge.yml` only (pilot project) |
| `E2E_SUPABASE_URL` / `E2E_SUPABASE_ANON_KEY` | not needed | required (`ci.yml`'s build + E2E job — the dedicated `bhw-connect-e2e` project, never the pilot project) |
| `E2E_STABLE_*_PASSWORD` | not needed | required (E2E job; accounts live on the `bhw-connect-e2e` project) |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | optional — app runs fine unset | optional (build-time only) |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | not needed | optional — enables source-map upload |
| `SUPABASE_DB_URL` | not needed | required for `backup.yml` |
| `SUPABASE_SERVICE_ROLE_KEY` | not needed (never expose to the app) | required for `retention-purge.yml` |
| `GEMINI_API_KEY` | optional — unset means external AI is unavailable and features fall back to their rule-based baseline | not needed (unit tests stub the transport; no CI step calls a provider) |
| `GEMINI_MODEL` | optional — defaults to `gemini-3.6-flash`. **Set this when the provider retires a model**: a shut-down model returns 404 on every call, and this is the switch that fixes it without a deploy. `gemini-2.0-flash` was shut down 2026-06-01 | not needed |

## CI test project

`ci.yml`'s build + E2E + Lighthouse steps run against a dedicated,
schema-identical Supabase project (`bhw-connect-e2e`, free tier, same org as
the pilot project) instead of the pilot project — PR runs on every branch
must never write test data into the database real BHWs and admins depend on.
It's seeded with the same `org_units` chain and one `kb_categories` row the
migrations + `e2e/fixtures/auth.ts` expect, plus the four stable fixture
accounts (`admin.stable`, `bhw.stable`, `bhw.other`, `admin.city.stable`),
fully onboarded so tests can log straight in. Throwaway accounts created by
`e2e/fixtures/auth.ts`'s `createThrowawayBhw` (`e2e.<timestamp>.<random>`)
accumulate on this project across runs the same way they used to on the
pilot project; since it's a test-only database this is expected and
harmless, but it's still worth an occasional purge (same pattern as the
one-off cleanup this doc's history records for the pilot project) if it
grows large enough to slow queries down.

## Migration history notes

### INC-29 (`20260920000000_inc29_course_progress_reset.sql`) — applied late, 2026-09-25

Noticed 2026-09-24 while deploying the versioned test bank: neither project's
applied-migration history had an `inc29*` entry, although both had later
ones (`facilitation_log`, `versioned_test_bank`). Checked with read-only
queries on 2026-09-25. **It had never been applied to either project, under
any name**:

- `public.rpc_course_progress_reset(uuid, uuid)`, the migration's only object
  (plus its `grant execute … to authenticated`; no tables, columns or
  policies), was absent from `pg_proc` on both.
- No `supabase_migrations.schema_migrations.statements` entry mentioned
  `course_progress_reset`, and no function body emitted the
  `course_progress.reset` audit event. So it was not folded into another
  migration.
- Its dependencies were all present on both (`current_app_user()`,
  `current_org_path()`, the `courses`/`assessments`/`course_test_attempts`/
  `audit_events` columns it reads or writes, and the `ON DELETE CASCADE` from
  `course_module_progress` to `course_progress`). `/admin/course-progress`
  had therefore been calling a missing RPC on both projects.

Applying it as-is added one new security-advisor WARN
(`anon_security_definer_function_executable`): the file grants to
`authenticated` but never revokes the default PUBLIC execute. The function's
admin check still refused anon calls. The corrective migration
`20260929000000_inc29_revoke_anon_execute.sql` brings it in line with its
sibling RPCs.

| Project | `inc29_course_progress_reset` | `inc29_revoke_anon_execute` |
|---|---|---|
| `bhw-connect-e2e` (`qeryhxctxslhdkclifom`) | applied as `20260925001959` | applied as `20260925002056` |
| pilot (`ltzicxyefizxoqhfuuzc`) | applied as `20260925002450` (owner-confirmed) | applied as `20260925002458` |

Verification query (run on each project after applying):

```sql
select p.oid::regprocedure::text as sig, p.prosecdef as security_definer,
  p.proconfig::text as config, md5(p.prosrc) as body_md5,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_exec,
  has_function_privilege('anon', p.oid, 'execute') as anon_exec,
  (select string_agg(version||':'||name, ', ' order by version)
     from supabase_migrations.schema_migrations where name like 'inc29%') as migration_rows
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'rpc_course_progress_reset';
```

Expected: `body_md5 = 07fc882bbce0b6499d5f18cd2fe182b8` (the md5 of the text
between the file's `$$` delimiters), `security_definer = true`,
`config = {search_path=public}`, `authenticated_exec = true`,
`anon_exec = false`.

Result on `bhw-connect-e2e`: all expected values matched, and
`migration_rows = 20260925001959:inc29_course_progress_reset,
20260925002056:inc29_revoke_anon_execute`. Security advisor before, then
after both migrations: `anon_security_definer_function_executable` 26 → 26,
`authenticated_security_definer_function_executable` 91 → 92 (the new admin
RPC, intended; its own role check gates it like the other 91). All other
lints unchanged.

Result on the pilot, after the owner confirmed: the same values matched, and
`migration_rows = 20260925002450:inc29_course_progress_reset,
20260925002458:inc29_revoke_anon_execute`. Security advisor before, then
after: anon lint 27 → 27, authenticated lint 97 → 98 (the same intended
RPC). All other lints unchanged. The pilot's baseline counts differ from the
CI project's (27/97 vs 26/91). That drift predates this change and was not
investigated here.

Separately, `20260811000000_inc27_training_audio.sql` is also absent by name
from both histories. It was not investigated here and needs the same check.

## Rolling out a risky feature

Prefer a feature flag (`/admin/flags`, `rpc_flag_toggle`) over a
feature-branch-then-big-bang-merge when the change is UI/route-scoped and
can be gated cleanly (see `src/lib/flags/get-flags.ts` and how
`kb_articles`/`reports_export` are wired into their nav links and routes).
Ship the code behind a flag defaulted to `false` in the migration, merge
and deploy normally, then flip it on for real once verified — no second
deploy needed to turn it on, and flipping it back off is the fastest
possible rollback for that specific feature if something's wrong with it
alone.

## Rollback

- **Bad app code, schema unchanged**: revert the merge commit on `main`,
  push — Vercel redeploys the previous build automatically. Fastest path;
  use this whenever the migration (if any) in the bad PR is additive-only
  and safe to leave in place (new nullable columns, new tables, new RPCs
  nothing yet calls — all true for every migration in this repo so far).
- **Bad migration**: schema changes here are additive (`create table if
  not exists`, `create or replace function`) by convention — there is no
  destructive migration in this repo's history to roll back. If one ever
  ships, write and apply a corrective migration (as INC-6/INC-7 did for
  their post-merge fixes — see `20260723010000_fix_gap_resolution_null_check.sql`
  and `20260723020000_fix_city_admin_null_tokens.sql`) rather than trying
  to "undo" a migration file, since Supabase doesn't track a
  down-migration for `apply_migration`-applied changes.
- **Incident-grade data loss**: this is a restore, not a rollback — follow
  `docs/restore-drill-runbook.md`'s "Live restore" section instead.

## Scheduled jobs

Two GitHub Actions workflows run independently of any deploy:

- `.github/workflows/backup.yml` — weekly `pg_dump` second copy (§5.3).
- `.github/workflows/retention-purge.yml` — monthly retention purge
  (§5.3/§5.4), dry-run by default; a human flips it to a real run via
  "Run workflow" once comfortable with what a few dry runs reported.

Both need their secrets configured (see table above) before they'll do
anything but fail loudly with a clear `::error::` message — they're
designed to fail closed, not silently no-op, if misconfigured.
