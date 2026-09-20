# Credentials — where each one lives, permanently

This page exists because the same thing kept happening: a session would get
some way into a task, discover it had no credentials, and stop to ask for a
password. That is not a credentials problem. It is a *placement* problem —
the value existed, it was just not anywhere the session could reach.

The rule this page enforces:

> **Every credential has exactly one permanent home. If you are being asked
> to paste one into a session, it is missing from its home. Put it in its
> home, not in the chat.**

Run `npm run doctor` to see the live state of all of it. The SessionStart
hook runs `npm run doctor --brief` automatically, so a session reports what
it is missing in its first few seconds rather than its second hour.

---

## There is no credentials UI to build, and here is why

The obvious-sounding fix is an app screen for managing credentials. It is the
wrong build. A credentials screen has to store secrets somewhere, and anywhere
it could store them is worse than where they already belong:

- App database → secrets in Postgres, readable by anything with a service
  role key, and now *also* needing a credential to reach.
- App env vars → that is Vercel, which already has a UI.
- Anything else → a second copy to keep in sync with the first, which is how
  a stale password becomes a 45-minute debugging session.

The three stores below are already the credential UIs. Each has a web page, an
audit trail, and per-scope access. What was missing was not a fourth UI; it was
a written answer to "which of the three?" — that is the table in §2.

**There is a frontend worth building**, and it is a different one: an admin
operations console for the things that currently force a trip to the Supabase
dashboard's SQL editor. See §5.

---

## 1. The three stores

| Store | Reaches | Set it at |
| --- | --- | --- |
| **Claude Code environment variables** | Every web session, automatically | claude.ai/code → Settings → Environments → *(environment)* → Environment variables |
| **GitHub Actions secrets** | Workflows in `.github/workflows/` | Repo → Settings → Secrets and variables → Actions |
| **Vercel project env vars** | The deployed app at request time | vercel.com → *(project)* → Settings → Environment Variables |

A fourth, `.env.local`, is a developer-machine convenience only. Nothing in a
web session or in CI reads it, and it is gitignored, so it cannot be the
permanent home for anything.

## 2. The register

`scripts/doctor.mjs` holds this table in code and is the source of truth; run
`npm run doctor` for the current, live version with per-value status. When a
new secret enters the project, **add it to `scripts/doctor.mjs` first** — a
secret the doctor does not know about is one the next session rediscovers the
hard way.

The short version, by store:

**Claude Code environment variables** — set these three and web sessions stop
asking:

- `KB_LOADER_USERNAME` — `training.loader`. Not secret.
- `KB_LOADER_PASSWORD` — the loader admin's password. The one that keeps
  getting asked for.
- `KB_LOADER_ANON_KEY` — the pilot project's anon key. Public by design: it
  ships in the browser bundle, so it is safe to paste anywhere.

Optionally also `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
if you want sessions to be able to run the app against the pilot.

**Do not put `SUPABASE_SERVICE_ROLE_KEY` here.** The sandbox refuses commands
carrying it, so it would not work, and it grants far more than any session
needs. It belongs in GitHub Actions and nowhere else.

**GitHub Actions secrets** — `KB_LOADER_PASSWORD` (new, see §3),
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, the four `E2E_*` passwords,
`E2E_SUPABASE_URL`/`E2E_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`/
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the `SENTRY_*` trio.

**Vercel** — `GEMINI_API_KEY` and `GEMINI_MODEL`. Read at request time by the
running app, so neither GitHub nor the Claude environment is any use to them.

## 3. The load no longer needs a password anywhere near a session

`.github/workflows/training-load.yml` runs the pilot content load in CI:

> Actions → **Training content load** → Run workflow

It defaults to a dry run; set `apply` to `true` to write. It reads
`KB_LOADER_PASSWORD` from the repo secrets and the anon key from the
`NEXT_PUBLIC_SUPABASE_ANON_KEY` secret that already exists and already names
the pilot project.

This is the preferred path, above setting the Claude environment variables,
for one reason: it is the only one that also closes the gap noted in the
handoff — that merging a content PR moved nothing to the pilot, because the
loader had no CI equivalent. Now it has one, and anyone who can click a
button, agent included, can run it.

**Setup is one secret.** Add `KB_LOADER_PASSWORD` under Settings → Secrets and
variables → Actions. Everything else the workflow needs is already there.

A dry run is not a way around this: `scripts/training-load.mjs` signs in
before it plans, so even `--dry-run` needs the credential. Content *validation*
does not — `scripts/lib/training-content.test.mjs` runs in ordinary CI on
every PR and needs nothing.

## 4. Rotation

Rotating means changing the value in its home store and nowhere else. The
values that currently need rotating before public launch, carried over from
the handoff:

- `SUPABASE_SERVICE_ROLE_KEY` — exposed in a session transcript on 19 Sep,
  never successfully used. Rotating it means updating the GitHub Actions
  secret; `retention-purge.yml` and `backup.yml` read it.
- `training.loader`'s password — rotate in Supabase, then update the GitHub
  Actions secret and the Claude environment variable. Two places, and the
  doctor will tell you if you miss one.
- `review.facilitator` — a throwaway. Delete the account once INC-23's
  facilitator UI ships, rather than rotating it.

If `training.loader`'s password is lost, it is recoverable from the Supabase
dashboard's SQL editor by setting `auth.users.encrypted_password` with
`extensions.crypt(...)`. Do not hand-insert a new admin row — that is the trap
`20260723020000_fix_city_admin_null_tokens.sql` exists to document.

## 5. The frontend that is actually worth building

Not credentials. The recurring trips to the Supabase dashboard's SQL editor —
those are the ones costing real attention, and each is a small admin-guarded
RPC plus a screen:

1. ~~**Reset a BHW's course progress.**~~ **Done (INC-29).** The pretest
   deadlock — once `course_module_progress` rows exist,
   `rpc_course_test_submit` refuses the pretest, and the progress tables
   have only `SELECT` policies — used to need dashboard SQL. Now:
   `rpc_course_progress_reset(p_course_id, p_bhw_user_id)`, admin-only and
   org-scoped, refuses when an assessment for the pair is pending, assigned,
   or already passed, and `/admin/course-progress` lists every BHW's
   progress with a reset button per row.
2. **Reset a user's password.** `rpc_admin_reset_password` exists but is
   refused from a session as a secret-store write — which is correct, and
   exactly why it should be a screen the user clicks rather than a thing an
   agent does.
3. **Run a content load.** Already solved by §3 for anyone with repo access.
   A button in the app would only be worth it if non-technical staff ever
   need to trigger a load.

(2) is the next one with a live cost, whenever an account's password needs
resetting outside a session.
