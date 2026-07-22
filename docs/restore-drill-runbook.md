# Restore drill runbook

Backs `docs/delivery-plan.md` §5.3: **RPO 24 h / RTO 4 h**, with a restore
drill executed once before pilot launch and quarterly after.

Backups are 3-2-1: Supabase's own daily scheduled backups (first copy,
30-day rolling retention) plus a weekly `pg_dump` to GitHub Actions
artifact storage (second copy, different medium — `.github/workflows/backup.yml`,
90-day retention). This runbook restores from either copy; the steps below
use the `pg_dump` copy since it's the one this repo controls end to end.

## Targets

| Metric | Target | What it means here |
|---|---|---|
| RPO | 24 h | Worst case, restore loses < 24 h of data — covered by the daily Supabase backup cadence. |
| RTO | 4 h | From "we need to restore" to "the app is serving correctly from the restored data" in ≤ 4 h. |

## Prerequisites

- `SUPABASE_DB_URL` (a direct Postgres connection string for the project,
  not the pooler URL — `pg_restore` needs a superuser-equivalent role) —
  same secret the backup workflow uses.
- `psql` and `pg_restore` (both ship with `postgresql-client`; the backup
  workflow installs the same package).
- A **scratch target**, never the live pilot project, for the drill itself:
  either a fresh local Postgres (`docker run -e POSTGRES_PASSWORD=drill -p 5433:5432 postgres:17`)
  or a throwaway Supabase branch created via the dashboard / `create_branch`.
  Restoring into the live project is the real emergency procedure (see
  "Live restore" below), not something to rehearse against production.

## Drill procedure (rehearsal — scratch target)

1. **Get a backup file.** Either download the latest artifact from the
   `Weekly backup` GitHub Actions run, or take a fresh one:
   ```bash
   pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges --format=custom \
     --file=drill.dump
   ```
2. **Start the clock.**
3. **Stand up the scratch target** (see Prerequisites) and get its
   connection string, `$DRILL_TARGET_URL`.
4. **Restore:**
   ```bash
   pg_restore --no-owner --no-privileges --clean --if-exists \
     -d "$DRILL_TARGET_URL" drill.dump
   ```
5. **Verify data integrity** — run a handful of sanity queries against the
   restored database and confirm the counts look right (compare to
   `mcp__Supabase__list_tables` row counts from around the backup time, or
   a `select count(*) from public.<table>` for the tables that matter
   most: `users`, `kb_entries`, `chat_sessions`, `audit_events`):
   ```sql
   select count(*) from public.users;
   select count(*) from public.kb_entries where status = 'published';
   select max(created_at) from public.audit_events;
   ```
6. **Verify the app boots against it** — point a local `.env.local` at the
   scratch target's Supabase-compatible URL (if using a branch) and confirm
   `npm run dev` serves `/login` and an admin can sign in. (Not meaningful
   for a bare Postgres scratch target with no `auth` schema — the branch
   route is the one that actually exercises this step.)
7. **Stop the clock.** Record elapsed time below.
8. **Tear down the scratch target.**

## Drill log

| Date | Backup source | Elapsed time | Within 4h RTO? | Notes | Run by |
|---|---|---|---|---|---|
| _(pending)_ | — | — | — | First drill not yet executed — see "Status" below. | — |

## Status

The migration, feature-flag, DPA-action, and error-tracking pieces of
INC-9 were built and verified this session (unit tests, `tsc`, `lint`,
`next build` all green; the schema migration itself was applied to and
verified against the live pilot Supabase project). The drill procedure
above was written and reviewed for correctness this session, but **the
actual timed run has not been executed yet** — it needs a human to either
approve creating a scratch Supabase branch (a cost-bearing operation this
session isn't authorized to trigger on its own) or run steps 1–8 locally
against a throwaway Postgres container. Fill in the Drill log row above
the first time it runs, and re-run quarterly thereafter per the §5.3
requirement.

## Live restore (real incident, not a drill)

Only follow this against the live pilot project during an actual data-loss
incident, with a second admin's sign-off:

1. Prefer Supabase's own point-in-time recovery (dashboard → Database →
   Backups → Restore) over `pg_restore` when the loss is recent enough to
   be within the daily-backup window — it's the lower-risk path since it's
   Supabase-managed and doesn't require taking the database offline for a
   manual restore.
2. Fall back to the weekly `pg_dump` artifact only if Supabase's own
   backups are unavailable or don't cover the needed point in time. Same
   restore command as the drill (step 4 above), targeted at the live
   project's `$SUPABASE_DB_URL` instead of a scratch target.
3. After any live restore: re-run the DPA/audit sanity queries from step 5,
   smoke-test login + Chat Guide + admin console, and post an
   `audit_events`-adjacent incident note (outside the app, e.g. this repo's
   issue tracker) documenting what was lost and why.
