# BHW Connect Phase 2: working rules

Next.js 16 on Vercel (Hobby, `hnd1`) with Supabase (free plan, Tokyo). Both run
on free tiers, and on 27 Sep 2026 CI and dev traffic used up the pilot
database's Disk IO budget and took it down for hours. These rules exist to
keep that from happening again. The reasoning is in
`docs/dev-efficiency-usage-audit.md`, and the measurements are in
`docs/usage-baseline.md`.

Start with `docs/session-handoff.md` for context, and use
`docs/deploy-runbook.md` for deploys and migrations.

## Databases

- **Never develop or run E2E against the pilot** (`ltzicxyefizxoqhfuuzc`). It
  is for real BHWs. Use `npx supabase start` (`--project local`); the Claude
  Code cloud sandbox has Docker too (start the daemon with `dockerd &` first).
  The hosted dev project `bhw-connect-e2e` (`ekehmwzyhlagtfuvquho`) is paused
  and nearly empty. Restore and seed it only if a hosted dev database is
  really needed; it takes the free org's second project slot.
- Dev servers and the loaders refuse the pilot unless `ALLOW_PILOT=1` is set
  (`scripts/lib/pilot-guard.mjs`). Set it only for a reviewed migration, a
  deliberate content load, or the post-deploy smoke check, and never in
  `.env.local`. E2E refuses the pilot even with it set.
- **Migrations:** write the file, prove it replays on `supabase start`, then
  apply it to the pilot **once, at merge time**, applying all of the PR's
  migrations together. Every apply reloads PostgREST's schema cache, which is
  the query that timed out on 27 Sep. Never apply migrations from several
  parallel sessions.
- `supabase/seed.sql` is for the local stack only. Never run it against a
  hosted project.
- Loaders default to dry run and must write only what changed.

## CI and deploys

- **One PR per increment, squash-merged.** Don't stack branches that keep
  merging `main`. If a branch falls behind, merge `main` once, just before
  merging.
- **Don't push docs-only commits on their own.** Fold a "record PR link"
  change into the PR's last code commit. Docs-only changes skip CI (the
  `changes` job) and the Vercel build (`scripts/vercel-ignore-build.sh`), but
  they still cost a run to decide that.
- **Never re-run a CI run from before a CI change.** A re-run uses its
  original commit's workflow file, and runs from before #158 run E2E against
  the pilot. Push a commit or merge `main` instead.
- Flaky test: check that `main` is green. Never skip, disable or loosen a
  test to get green.

## Code: every request costs quota

- **Middleware runs on every matched request.** Keep static files
  (`public/`, media, fonts) out of its matcher. Don't add queries to it.
- Before adding a query to a layout, middleware or list page, check whether
  the data is already forwarded in an `x-app-*` header or `React.cache()`
  helper (`src/lib/supabase/request.ts`).
- Every route is dynamic, so every `<Link>` prefetch is a full server render
  with its own Supabase reads. Decide on prefetch for each link, and default
  to `prefetch={false}` on lists and nav.
- Bound every list with `.limit()`. Select named columns, not `*`, on hot
  paths. Don't write to the DB on a read path: no unconditional UPDATEs, and
  debounce progress and resume saves.
- **RLS:** compute actor context once per statement
  (`(select current_app_user())`). Never call a SECURITY DEFINER helper for
  every row. Keep to one permissive policy per role and action.
- `public/training/` files are content-hashed and served `immutable`. A
  changed file must get a new name, as the loaders already do.
