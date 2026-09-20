# Session handoff — pilot-stage working agreement

Read this before starting work on BHW Connect Phase 2. It is not a plan (that
is `docs/training-modules-plan.md`); it is how to work, and the live state of
the pilot project, so a new session does not re-discover either the hard way.

Last updated: 20 September 2026.

---

## 1. How to work here (the part that matters most)

The project is in **early pilot**. The user is building and piloting at the
same time, alone. Their scarcest resource is their own attention, not
correctness and not security hardening. Optimise for that.

**Do the thing. Do not hand back instructions.** If a step can be done from
the session — a database write, a content load, a flag flip, an account
created — do it. Handing the user SQL to paste, or a script to run, is a
failure mode, not a deliverable. It cost this session roughly an hour and
four rounds of back-and-forth before anything moved.

**Know which operations the sandbox refuses, so you do not design around
them and then stall.** Learned by hitting each one:

- The Supabase `service_role` key cannot be used from a session — commands
  carrying it are refused. There is no point asking the user for it. Use the
  loader's ordinary admin sign-in instead (below); it reaches everything the
  app's own RPCs expose.
- `rpc_admin_reset_password` is refused as a secret-store write. If someone
  needs access to an account, prefer an account that already works.
- The progress tables have only `SELECT` policies, so rows they own can only
  be changed through an RPC. Where no RPC exists, the operation needs the
  Supabase dashboard — which means it lands on the user, so prefer adding the
  missing RPC (see "Owed" below).

The training scripts, the linters, the tests and `npm run doctor` are
pre-approved in **`.claude/settings.json`**, which is committed, so the
approvals survive a fresh container instead of dying with the session. (They
used to live in the gitignored `settings.local.json`, which is why every
session started by re-asking.) `.claude/settings.local.json` is still the
place for personal overrides.

If other work needs standing approval, propose it to the user and let them
decide — widening your own permissions without saying so is not the kind of
low friction they asked for.

**Ask at most one question, once, at the end.** Batch everything. A question
mid-task stops the user's day; a question at the end costs them one reply. If
a reasonable default exists, take it and say which one you took.

**Prefer a committed script over a manual runbook step.** Anything done twice
should become a script with `--dry-run`/`--apply`, like
`scripts/training-load.mjs` and `scripts/training-review-setup.mjs`. A runbook
step is a step the user eventually performs; a script is one they never do
again.

**Say security things once, then move on.** Flag an exposed secret in one
line, record it under "Owed" below, and keep building. The user has
explicitly accepted pilot-stage risk and will rotate before public launch.
Repeating the warning is friction, not diligence.

**Verify in the real app.** Green tests did not catch that the pilot database
was serving Module 1 from before the re-write. A rendered page did.

---

## 2. Pilot project — live state

Supabase project ref **`ltzicxyefizxoqhfuuzc`**, org unit **"Los Baños"**,
org `jyxsargubbcnzffevzpv` ("gibs-21's Project"). Reachable through the
Supabase MCP tools in this workspace as of 20 Sep 2026 — see below. Also
reachable through the loader scripts over PostgREST, independently.

**History, for whoever hits this next:** earlier the same day, the Supabase
MCP connector was authenticated as a *different* Supabase identity — one
whose only org, `jongsky25's Org` (`rparoyuerqqrozxehztm`), holds five
unrelated projects (`jongsky25's Project`, `bhw-connect`, `KaniManong`,
`koica-journey-tracker`, `ofis-dev`) and not the pilot. `list_projects` didn't
list it and `get_project` returned a permission error. That was a login
problem, not a design constraint: the user reconnected the Supabase
connector under the account that actually owns `ltzicxyefizxoqhfuuzc`, and
`get_project`/`list_migrations`/`apply_migration` all work against it now.
If a future session hits the same permission error, check which Supabase
account the connector is authenticated as before concluding the MCP path is
unusable — it may just be the wrong login, the same way it was here. The
loader credential (`KB_LOADER_USERNAME`/`PASSWORD`/`ANON_KEY`) was never the
issue — that's a PostgREST application login and was genuinely present the
whole time; it only ever unlocked `training:load`/`training:review-setup`,
never schema/migration access, which is by design (see `docs/credentials.md`
§"Do not put `SUPABASE_SERVICE_ROLE_KEY` here").

**INC-23's migration is now applied to the pilot**
(`20260810000000_inc23_facilitator_progress_read.sql`, pushed via
`apply_migration` and verified against `pg_policies` on 20 Sep 2026). Still
owed: the same file against the CI project (`bhw-connect-e2e`, ref unknown to
either Supabase account this session has checked), and INC-29's migration
(`20260920000000_inc29_course_progress_reset.sql`) — confirmed missing from
the pilot via `list_migrations` in the same session but out of scope for
what was being fixed, not pushed yet.

| Thing | Value |
| --- | --- |
| Course (Araw 1) | `73e0edda-6c28-420f-9c35-05a29563abd3`, **published** |
| Module 1 | `5a915215-7237-4211-a189-8d75664d05b6` |
| Long-density session | `aab3292f-e9ea-4883-b464-8311c75ea025` |
| Flags `elearning`, `course_sessions` | both **on** |
| Enrolled at Detalyado | `demo.viewer`, `review.bhw` |

Two accounts do the work. Their passwords are **not** recorded here — a
password in git survives every later rotation and reaches every clone.
**Do not ask the user for them either.** See `docs/credentials.md`: the
loader password lives in the GitHub Actions secrets and (optionally) the
Claude Code environment variables, so a session either has it already or
runs the load through CI. `npm run doctor` says which.

- `training.loader` — admin. Pass as `KB_LOADER_USERNAME` /
  `KB_LOADER_PASSWORD`, with `KB_LOADER_ANON_KEY` set to the project's anon
  key (public by design — it ships in the browser bundle, so it is the one
  value here that is safe to paste anywhere).
- `review.facilitator` — assessor, created by
  `training:review-setup --create-facilitator`. Owns the session above.

If `training.loader`'s password is lost, it is recoverable from the Supabase
dashboard's SQL editor by setting `auth.users.encrypted_password` with
`extensions.crypt(...)`; do not hand-insert a new admin row, which is the
trap `20260723020000_fix_city_admin_null_tokens.sql` exists to document.

Module 1 on the pilot is the re-authored INC-21r content: 8 core, 2 standard,
2 deep sections. The two deep ones — *Ang BHW sa pagpaplano ng barangay* and
*Mali at tama: "Hindi ko naman trabaho 'yan"* — are the tell that a render is
actually at Detalyado rather than Karaniwan.

### Re-running the setup

```bash
npm run training:load -- --project ltzicxyefizxoqhfuuzc --org-unit "Los Baños" --apply
npm run training:review-setup -- --project ltzicxyefizxoqhfuuzc --bhw <username> --apply
```

Both are idempotent. Content changes still do not reach the pilot on merge —
a load has to be triggered — but it is no longer a *manual* step: run

> Actions -> **Training content load** -> Run workflow

which holds the loader password as a repo secret and defaults to a dry run.
Prefer it over the local commands above; it needs no credentials in the
session. The local commands still work wherever `KB_LOADER_*` is set.

### Known sharp edge: the pretest gate — now self-service (INC-29)

`rpc_course_test_submit` refuses a pretest when `course_module_progress` rows
already exist, so a BHW who completed modules *before* `course_sessions` was
turned on is deadlocked: modules gated behind a pretest the RPC will not
accept. The guard is correct — a pretest after the content makes the
pre/post delta meaningless.

This used to need dashboard SQL, run once against `demo.viewer`. It no longer
does: **Admin nav → Course progress** (`/admin/course-progress`) lists every
BHW's progress in the admin's org scope — course, status, modules completed,
pretest/posttest scores — with a **Reset progress** button per row.
`rpc_course_progress_reset(p_course_id, p_bhw_user_id)` does the actual work,
admin-only and org-scoped, and refuses when an assessment for the pair is
pending, assigned, or already passed (a failed one does not block — that is
the retry case). Verified against a real local Postgres 16 replay: the
deadlock reproduced, refused pretest confirmed, reset via the RPC, same
pretest accepted afterward.

---

## 3. What is next

**INC-24 (authoring modules 2–9) is blocked only on the user's approval of
Module 1**, now that it renders at Detalyado in the real app. If they have
said yes, that gate is closed and authoring starts.

Unblocked and not started, in the order the plan argues for:

- **INC-23 — facilitator UI.** Includes the density selector, which is what
  makes `training:review-setup` unnecessary. Also the assessor console and
  the read-only observation checklist.
- **INC-26 — slide mode.** One `LessonSection` is already one slide; tier
  filtering gives density control for free.
- **INC-27 — audio narration**, pre-rendered at content-load time.
- **INC-28 — animation.**

### Owed, small, worth doing when nearby

- **An admin path to reset a BHW's course progress** — done (INC-29), see
  above. `rpc_course_progress_reset` plus `/admin/course-progress`.
- **A single register of which credential lives in which store** — done,
  `docs/credentials.md`, backed by `npm run doctor`. Add new secrets to
  `scripts/doctor.mjs` as they appear.
- **Rotate before public launch, not before then**: the `service_role` key
  (exposed in the 19 Sep session transcript and never successfully used),
  `training.loader`'s password, and the `review.facilitator` throwaway.
  Rotating `service_role` also means updating `SUPABASE_SERVICE_ROLE_KEY` in
  GitHub Actions secrets — `retention-purge.yml` and `backup.yml` read it.
- **Delete `review.facilitator`** once INC-23 ships a real facilitator UI.

### CI

`e2e/` runs against a shared `bhw-connect-e2e` project, and specs early in
the run occasionally fail at login (three did on 19 Sep, green on re-run with
no code change). Before assuming a failure is yours: check whether `main` is
green, and re-run once. Do not "fix" it by touching tests.
