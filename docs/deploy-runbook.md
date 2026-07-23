# Deploy runbook

## Normal deploy

1. Open a PR against `main`. CI (`.github/workflows/ci.yml`) runs lint,
   typecheck, unit tests, an E2E smoke pass, a production build, and the
   Lighthouse performance-budget check.
2. If the change includes a `supabase/migrations/*.sql` file, apply it to
   the live pilot Supabase project **before or alongside** merging — every
   increment in this repo's history has done this via the Supabase MCP
   `apply_migration` tool (or `supabase db push` from the CLI if working
   locally). The app and the schema should never drift: a merged PR whose
   migration wasn't applied means the deployed code will call RPCs that
   don't exist yet.
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
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | required | required (CI + E2E) |
| `E2E_STABLE_*_PASSWORD` | not needed | required (E2E job) |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | optional — app runs fine unset | optional (build-time only) |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | not needed | optional — enables source-map upload |
| `SUPABASE_DB_URL` | not needed | required for `backup.yml` |
| `SUPABASE_SERVICE_ROLE_KEY` | not needed (never expose to the app) | required for `retention-purge.yml` |

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
