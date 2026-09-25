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

`20260811000000_inc27_training_audio.sql` was also absent by name from both
histories. See the next section.

### INC-27 (`20260811000000_inc27_training_audio.sql`) — applied late, 2026-09-25

Same symptom as INC-29, same result: **it had never been applied to either
project, under any name**.

What the file creates (no functions, so no SECURITY DEFINER RPC and nothing
to revoke; no explicit grants):

- table `public.course_module_audio`, 11 columns (`id`, `module_id` →
  `course_modules` on delete cascade, `section_index`, `language` check
  `fil|en`, `audio_url`, `format` check `opus|mp3` default `opus`,
  `duration_seconds` check `>= 0`, `content_hash`, `timings` jsonb,
  `created_at`, `updated_at`), unique `(module_id, section_index, language)`,
  index `course_module_audio_module_id_idx`, trigger
  `course_module_audio_set_updated_at` (uses `public.set_updated_at()`), RLS on
- policies `course_module_audio_read` (select) and
  `course_module_audio_admin_write` (all), copies of the
  `course_module_visuals_*` pair
- public storage bucket `training-audio`, with `storage.objects` policies
  `training_audio_public_read` (select) and `training_audio_admin_write`,
  `training_audio_admin_update` and `training_audio_admin_delete`
  (insert, update and delete)

Checks before applying, read-only, on both projects: `to_regclass('public.course_module_audio')`
null; no public table named `%audio%`; no `training-audio` bucket; no
`training_audio%` storage policy; no `schema_migrations.statements` entry
matching `course_module_audio`, `training-audio` or `training_audio`; no
function body mentioning either. So it was not folded into another migration.
Its dependencies (`set_updated_at()`, `current_app_user()`,
`current_org_path()`, `org_unit_path(uuid)`, `course_modules`,
`courses.status/org_unit_id`) were present on both. The course page
(`src/app/courses/[id]/page.tsx`) ignores the error from its
`course_module_audio` query, so narration was silently absent rather than
failing. `scripts/tts-render.mjs` could not have written anywhere.

| Project | `inc27_training_audio` |
|---|---|
| `bhw-connect-e2e` (`qeryhxctxslhdkclifom`) | applied as `20260925003607` |
| pilot (`ltzicxyefizxoqhfuuzc`) | applied as `20260925004759` (owner-confirmed) |

Applied verbatim from the file via `apply_migration`. Verification query (run on
each project after applying):

```sql
select
 (select string_agg(version||':'||name, ', ') from supabase_migrations.schema_migrations where name like 'inc27%') as migration_rows,
 (select count(*) from information_schema.columns where table_schema='public' and table_name='course_module_audio') as n_cols,
 (select string_agg(pg_get_constraintdef(oid), ' | ' order by contype, conname) from pg_constraint where conrelid='public.course_module_audio'::regclass) as cons,
 (select string_agg(indexname, ',' order by indexname) from pg_indexes where schemaname='public' and tablename='course_module_audio') as idx,
 (select string_agg(tgname, ',') from pg_trigger where tgrelid='public.course_module_audio'::regclass and not tgisinternal) as trg,
 (select relrowsecurity from pg_class where oid='public.course_module_audio'::regclass) as rls,
 (select string_agg(policyname||':'||cmd, ',' order by policyname) from pg_policies where schemaname='public' and tablename='course_module_audio') as tbl_policies,
 (select bool_and(md5(replace(coalesce(a.qual,'')||'|'||coalesce(a.with_check,''),'course_module_audio','X'))
                = md5(replace(coalesce(v.qual,'')||'|'||coalesce(v.with_check,''),'course_module_visuals','X')))
    from pg_policies a join pg_policies v on v.tablename='course_module_visuals'
     and replace(v.policyname,'course_module_visuals','X') = replace(a.policyname,'course_module_audio','X')
   where a.tablename='course_module_audio') as policies_match_visuals,
 (select string_agg(id||':public='||public::text, ',') from storage.buckets where id='training-audio') as bucket,
 (select string_agg(policyname||':'||cmd, ',' order by policyname) from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'training_audio%') as storage_policies;
```

Result, identical on both projects apart from `migration_rows`: `n_cols = 11`,
with the types and not-null flags matching the file. `cons` = the three
checks, the FK `ON DELETE CASCADE`, the PK and the unique key.
`idx = course_module_audio_module_id_idx,
course_module_audio_module_id_section_index_language_key,
course_module_audio_pkey`. `trg = course_module_audio_set_updated_at`,
`rls = true`, `tbl_policies = course_module_audio_admin_write:ALL,
course_module_audio_read:SELECT`, `policies_match_visuals = true`,
`bucket = training-audio:public=true`, `storage_policies =
training_audio_admin_delete:DELETE, training_audio_admin_update:UPDATE,
training_audio_admin_write:INSERT, training_audio_public_read:SELECT`.
`anon`/`authenticated` get the table privileges from schema default privileges,
as the file's closing comment says. RLS is what enforces access.

Security advisor, before → after, per finding (not just counts): no finding
added or removed on either project. CI: anon 26, authenticated 92, 5
`rls_enabled_no_policy`, 1 `function_search_path_mutable`, 1
`auth_leaked_password_protection`, unchanged. Pilot: anon 27, authenticated 98,
the same other lints, unchanged.

### Security-advisor drift between the projects (checked 2026-09-25)

The pilot shows 27 anon / 98 authenticated `*_security_definer_function_executable`
findings, CI 26 / 92 (27/97 vs 26/91 before INC-29 added one authenticated
finding to each). Diffing the flagged functions by name gives 3 + 2 anon and 6
authenticated differences, which account for both gaps exactly:

| Function | Flagged on | Cause |
|---|---|---|
| `rpc_kb_entry_mark_ai_drafted(uuid)`, `rpc_kb_entry_confirm_ai_draft(uuid)`, `rpc_dashboard_ai_flywheel(timestamptz, timestamptz)` | pilot only (authenticated) | **Missing migration on CI**: `20260806000000_inc18b_ai_gap_draft.sql` was never applied to CI. The three RPCs, the `kb_entries.ai_drafted_at`/`ai_draft_confirmed_at` columns and the `ai_gap_draft` flag are absent there, and CI's `rpc_kb_entry_update` is still the inc8 body (md5 `61dabe40…`), without the AI-draft publish gate. On the pilot all four bodies match the file (md5 `feda1ce0…`, `cf322a16…`, `1b3ee38a…`, `ee621499…`). There is no history row mentioning them, so it was applied outside the migration tool. These findings are intended: authenticated-only, anon revoked. |
| `survey_org_unit_path(uuid)`, `survey_response_org_unit_path(uuid)`, `survey_status(uuid)` | pilot only (anon + authenticated) | **Pilot-only migration that is not in the repo.** The pilot's `fix_surveys_org_unit_rls_composability` (`20260726082227`) is a different version from CI's (`20260724065425`). It creates these three SECURITY DEFINER helpers, `grant … to anon, authenticated`, and the pilot's `survey_questions_read`, `survey_questions_admin_write`, `survey_responses_admin_read` and `survey_answers_admin_read` policies call them. No file in `supabase/migrations/` defines them, and CI has none of them. It has a history row, so it went through the migration tool rather than a dashboard SQL edit, but its SQL was never committed. |
| `rpc_give_consent()`, `rpc_complete_password_change()` | CI only (anon) | **Pilot-only hardening that never reached the repo.** The pilot's history has `harden_function_grants` and `harden_function_grants_v2` (`20260720031328`/`…31501`), which revoke PUBLIC/anon execute on these. The committed baseline (`20260720000000_baseline_captured_from_remote.sql`) only `grant … to authenticated` and never revokes PUBLIC, so CI, built from the repo, still has `=X/postgres, anon=X/postgres` on both. Bodies are identical on both projects. |

Also not listed by name in either history, but present and matching the file
on both: inc17 (`rpc_track_event` md5 `ea09baeb…`, `chat_conversation` flag),
inc17b (`kb_entries.content_id`) and inc18a (`rpc_ai_check_budget`,
`rpc_ai_record_call`, `rpc_ai_usage_summary`, all bodies matching). So they
were applied without a history row. They cause no drift.

**Update: inc18b applied to CI on 2026-09-25**, as `20260925012108:inc18b_ai_gap_draft`,
verbatim from the file. Beforehand, CI had every dependency (`kb_entries`
columns, `unmatched_questions.resolved_entry_id/text`, the `ai_usage` and
`analytics_events` columns, `feature_flags`) and none of the file's objects.
No migration after inc18b redefines `rpc_kb_entry_update`, so replacing the
inc8 body loses nothing. Verification (same shape as the INC-29 query above,
over the four functions):

| Function | `body_md5` | security definer | `search_path=public` | anon exec | authenticated exec |
|---|---|---|---|---|---|
| `rpc_kb_entry_update(…11 args)` | `ee621499e697a5f00efc52a16e899a28` | yes | yes | true (unchanged; same on the pilot, not revoked by the file) | true |
| `rpc_kb_entry_mark_ai_drafted(uuid)` | `feda1ce03a44bb704d7ac0ffa9479482` | yes | yes | false | true |
| `rpc_kb_entry_confirm_ai_draft(uuid)` | `cf322a16b6fdf7db97f8f7134a3d6c69` | yes | yes | false | true |
| `rpc_dashboard_ai_flywheel(timestamptz, timestamptz)` | `1b3ee38aecc7038143dab52219c71d4c` | yes | yes | false | true |

All four match the md5 of the file's `$$` bodies and the pilot. Also present:
`kb_entries.ai_drafted_at` and `ai_draft_confirmed_at` (timestamptz), the partial
index `kb_entries_ai_drafted_at_idx … WHERE (ai_drafted_at IS NOT NULL)`, and
`ai_gap_draft=false`. Security advisor, before → after: anon 26 → 26,
authenticated 92 → 95. The three added findings are exactly the three new RPCs.
They are intended and are the same findings the pilot has. Nothing else
changed. The two projects now differ only by the survey helpers
(pilot-only, 3 anon + 3 authenticated) and the consent/password grants
(CI-only, 2 anon): pilot 27/98, CI 26/95.

**Update: consent/password revoke applied to CI on 2026-09-25.** The corrective
migration `20260930000000_revoke_anon_consent_password_rpcs.sql` revokes
`public, anon` execute on `rpc_give_consent()` and
`rpc_complete_password_change()` and re-grants `authenticated`. Both functions
act only on the caller's row via `auth.uid()`, and their only callers
(`consent-form.tsx`, `change-password-form.tsx`) run signed in, so the only
behaviour change is that anon gets a permission error instead of a no-op.

| Project | `revoke_anon_consent_password_rpcs` |
|---|---|
| `bhw-connect-e2e` (`qeryhxctxslhdkclifom`) | applied as `20260925012507` |
| pilot (`ltzicxyefizxoqhfuuzc`) | not applied, by owner decision. Its July `harden_function_grants` rows already give the same grants, so applying it would only add a history row |

Verification on CI:

```sql
select p.oid::regprocedure::text sig, p.proacl::text acl,
  has_function_privilege('anon', p.oid, 'execute') anon_x,
  has_function_privilege('authenticated', p.oid, 'execute') auth_x
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('rpc_give_consent', 'rpc_complete_password_change');
```

Result: both `acl = {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}`,
`anon_x = false`, `auth_x = true`. This is the same ACL the pilot has, and
the bodies are unchanged. Security advisor, before → after: anon 26 → 24 (the
two findings for these functions removed), authenticated 95 → 95, nothing
added. The only remaining difference is the pilot's survey helpers: pilot
27/98, CI 24/95.

**Update: survey-helper drift fixed on 2026-09-25.** The repo's shape was
kept, not the pilot's. The migration
`20261001000000_survey_policies_repo_shape.sql` re-creates the four child-table
policies verbatim from `20260728000000_inc11_surveys.sql` (policies first,
because the pilot's depended on the helpers), then drops `survey_status(uuid)`,
`survey_org_unit_path(uuid)` and `survey_response_org_unit_path(uuid)`.

Why the repo's shape rather than the pilot's: the two admit the same rows.
The pilot's helpers read `surveys`/`survey_responses` as definer, while the
repo's `exists (…)` reads them through their own RLS. Those RLS policies
restate exactly the conditions the helper checks test, so the result is the
same. CI and e2e already run the repo's shape. The pilot's helpers were also
callable directly via `/rest/v1/rpc`, so anon could read any survey's status
and org path, drafts included. No app code, script or e2e test calls them.

| Project | `survey_policies_repo_shape` |
|---|---|
| `bhw-connect-e2e` (`qeryhxctxslhdkclifom`) | applied as `20260925020459`. No change: the policy md5s were identical before and after, and there were no helpers to drop |
| pilot (`ltzicxyefizxoqhfuuzc`) | applied as `20260925020632` (owner-confirmed) |

Verification query (run on each project):

```sql
select string_agg(policyname||'='||md5(cmd||'|'||coalesce(qual,'')||'|'||coalesce(with_check,'')), ', ' order by policyname) policies,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('survey_org_unit_path','survey_response_org_unit_path','survey_status')) helper_count
from pg_policies where schemaname = 'public' and tablename like 'survey%';
```

Result, identical on both projects: `helper_count = 0` and
`survey_answers_admin_read=9c59f2b2…, survey_questions_admin_write=6002989c…,
survey_questions_read=25ae7b24…, survey_responses_admin_read=8f9f4e91…,
surveys_admin_write=af5ef86f…, surveys_read_scope=4374cc21…`.

Security advisor, before → after: CI 24/95 → 24/95, nothing added or
removed. Pilot 27/98 → 24/95: the six survey-helper findings (3 anon, 3
authenticated) were removed and nothing was added. **The two projects' security
advisor findings are now identical, finding for finding.** The only remaining
history difference is that the pilot has no
`revoke_anon_consent_password_rpcs` row (owner decision; its July rows already
give the same grants), and inc17/17b/18a still have no history row on either
project.

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
