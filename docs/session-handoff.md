# Session handoff — pilot-stage working agreement

Read this before starting work on BHW Connect Phase 2. It is not a plan (that
is `docs/training-modules-plan.md`); it is how to work, and the live state of
the pilot project, so a new session does not re-discover either the hard way.

Last updated: 25 September 2026.

**Narration / voice / animation work:** read
`docs/narration-visuals-realignment-handoff.md` first. INC-27/INC-28 were
built for the legacy module view, and that document redirects them to the
chapter route.

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

**INC-23's migration is now applied to both the pilot and the CI project**
(`20260810000000_inc23_facilitator_progress_read.sql`, pushed via
`apply_migration` and verified against `pg_policies` on 20 Sep 2026 — pilot
first, then `bhw-connect-e2e` once the user supplied its ref,
`qeryhxctxslhdkclifom`; see "Reaching the CI project" below). Still owed:
INC-29's migration (`20260920000000_inc29_course_progress_reset.sql`) —
confirmed missing from the pilot via `list_migrations` in the same session
but out of scope for what was being fixed, not pushed yet.

**`list_projects` not listing the pilot/CI project is not proof the
connector can't reach them — check with `get_project`/`list_migrations`
against the known ref before concluding it's the wrong login.** A later
session the same day (issue #58's fix, PR #75) saw `list_projects` return
only `jongsky25's Org`'s five unrelated projects again and initially
concluded, same as the paragraph above once did, that the connector was
back on the wrong account. It wasn't: `get_project`/`list_migrations`/
`apply_migration` against the known refs (`ltzicxyefizxoqhfuuzc`,
`qeryhxctxslhdkclifom`) worked fine the whole time. This is the exact
"list_projects doesn't enumerate that org's projects for this connector"
gap "Reaching the CI project" below already documents for the CI project
specifically — it turns out to apply to the pilot too, and to `list_projects`
generally, not just that one endpoint. **Don't infer "unreachable" from
`list_projects` alone — try `get_project` with the ref you already have
recorded here first.**

**`20260920010000_fix_58_dashboard_bhw_table_pagination.sql` (issue #58's
fix) is now applied to both the pilot and the CI project** (20 Sep 2026,
via `apply_migration`, verified against `pg_get_function_identity_arguments`
on both — exactly one `rpc_dashboard_bhw_table` with the new 5-arg
signature on each). It's DDL (`drop function`/`create or replace function`),
so it couldn't go through the loader's PostgREST token the way a data
write can; needed `apply_migration` directly. Before this was applied it
was confirmed as the cause of two real (non-flake) `e2e` failures on
PR #75 — see that PR's own comments for the diagnosis, now stale once CI
re-runs green.

### Reaching the CI project

`bhw-connect-e2e`'s project ref is not discoverable from a session on its
own: it lives in the same org as the pilot (`jyxsargubbcnzffevzpv`), but
`list_projects` doesn't enumerate that org's projects for this connector the
same way it doesn't enumerate the pilot's — the difference is that the
pilot's ref was already recorded here, and the CI project's never had been.
`get_project`/`list_migrations`/`apply_migration` all work against it fine
once you have the ref; the gap was purely "nobody wrote it down," not an
access problem. The ref is **`qeryhxctxslhdkclifom`** (host
`qeryhxctxslhdkclifom.supabase.co`) — recorded here now so the next session
doesn't have to ask the user for it again.

These are the **legacy** Araw 1 / Module 1 identities. They still own the
Chapter I assessments and certificate, but learners now reach the content
through the chapter route (`/training/:program/:chapter/:subchapter/:lesson`);
the current module and lesson IDs are in
`content/training/day1-basic-competencies/locks/ltzicxyefizxoqhfuuzc.json`.
Chapter I (1.1–1.9) and Chapter II are published as of 25 Sep 2026.

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

*Last verified against `origin/main` (`99ef5f7`) on 20 September 2026, right
after PR #74 merged — check `git log --oneline -20` before trusting a
"not started" claim here again, this section has drifted before.*

**Merged and done:** INC-23 (facilitator UI), INC-26 (slide mode), INC-27
(audio narration + read-along, code-complete — see its own owed items
below), INC-28 tier 1 (animated SVG scenes) and tier 2's licence gate +
render pipeline (below), INC-29 (admin course-progress reset), INC-30
(breadcrumb navigation), and two CI fixes for the e2e flakiness that was
hitting multiple PRs on 20 Sep — [PR #66](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/66)
(repo-wide e2e serialization) and [PR #73](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/73)
(the actual root cause underneath it: a 30s test timeout disposing the
Playwright `request` context mid-attempt, which skips the `finally` that
resets a global feature flag and poisons the retries — fixed by setting the
flag explicitly before asserting, raising the timeout to 60s, and moving
CI concurrency from workflow- to job-level so `e2e` can't be cancelled
mid-spec). None of the above are "not started" any more.

**The user approved Module 1 on 20 Sep 2026.** That gate is closed, and
**INC-24 (author modules 2-5) is now code-complete**, same day — see
`docs/training-modules-plan.md`'s INC-24 section for the full status. All
four modules (`02-uhc-act`, `03-polisiya-bhs`, `04-ra7883`,
`05-bhw-at-barangay`) pass every INC-21 validation including the coverage
check, `npm run kb:check-sources`, lint/typecheck/291 vitest tests, and are
**already loaded (as drafts) and rendered in the real app** on this pilot
project — not just validated offline. Modules 4 and 5 carry forward the text
INC-21r displaced from Module 1's original draft, as instructed. **The user approved Modules 2–5 on 24 September 2026** and authorized
Modules 6–9. Audio/animation verification and e2e/axe-core verification
remain owed independently of content approval. The pilot course was
already `published` by the time this was checked — no action needed there.

**Two more throwaway pilot accounts exist now**, both `assessor`/`bhw`
review accounts created the same way `review.facilitator` was:
`review.facilitator2` (assessor) and `review.inc24` (bhw), used to render
Modules 2-5 at Detalyado density for the INC-24 session. `review.facilitator`
itself still exists but nobody in this session had its password (never
recorded, can't be reset without locking out whoever holds it), so a second
throwaway was the only option rather than taking it over. Neither new
account's password is recorded here either — same convention.

**INC-28 tier 2 (Remotion) — licence resolved, pipeline installed, 20 Sep
2026.** BHW Connect's operating entity is an individual, so Remotion's
free tier applies (confirmed by the user). The official skills are
installed (`.agents/skills/`, symlinked into `.claude/skills/`) and a
blank Remotion project lives in `remotion/` (its own npm project — own
`package.json`/`tsconfig`, excluded from the app's own `lint`/`typecheck`
via `eslint.config.mjs` and `tsconfig.json`'s `exclude`; the first attempt
missed the `tsconfig.json` side and broke `next build`'s TypeScript check
on Vercel — fixed same-day, see the INC-28 section for the exact failure).
`npm run remotion:render -- <composition-id> [output-name]` renders 480p
H.264 + poster frame and was verified working end to end. **Update 25 Sep
2026:** the first real clip exists — Chapter 2.3 `hand-hygiene`'s handrub
steps (`remotion/src/hand-hygiene/`), wired through the lesson asset's new
optional `video` field (JSONB, no migration), `LessonAssetFigure`
(no autoplay, `preload="none"`, poster = all-steps summary), and a
`remotion.yml` CI render job. It is a **draft** asset, so production still
serves the published revision until the clip is reviewed/approved and a new
revision is published. Full detail: `docs/training-modules-plan.md`'s INC-28
section.

**Issue #58 (unpaginated admin BHW table) is fixed (PR #75), and its
follow-up — the 1,055 `e2e.%` throwaway users themselves — now has a
mechanism, not just a flag.** PR #73's investigation found the shared
`bhw-connect-e2e` project carrying 1,055 `e2e.%` throwaway users (860 in
one barangay) plus 131 `anonymized-*` rows, and stopped short of purging
either (destructive on shared infrastructure, flagged for a decision
rather than acted on unilaterally). `rpc_e2e_purge_test_users`
(`20260920020000_e2e_test_user_purge.sql`) is that decision for the
`e2e.%` half: it deletes throwaway users older than 24h along with
everything they authored across the ~11 tables that reference `users`
with no cascade (forum, surveys, announcements, flip charts, elearning/
training-session rows, notifications, audit_events), verified via a real
local Postgres 16 replay (6 scenarios, including the FK-ordering edge
case of a real BHW's certificate graded by a throwaway assessor). The
`anonymized-*` rows are deliberately **not** in scope — that pattern can
also mark a genuine DPA-anonymized production account, so purging it
needs its own decision. `.github/workflows/e2e-test-users-purge.yml`
calls it weekly, dry-run by default (same shape as `retention-purge.yml`,
but authenticating as `admin.stable` rather than a service-role key,
since the CI project has no service-role secret wired in). **Still
owed:** applying this migration to the live `bhw-connect-e2e` project —
this workspace's Supabase MCP connection is scoped to the wrong org (see
§2), the same gap that made INC-23/INC-27/#58's migrations manual steps
too — and then flipping the workflow's `dry_run` off once a human has
reviewed a couple of runs.

**INC-27 — audio narration** is code complete (migration +
`course_module_audio` RLS verified against a real local Postgres 16 replay;
`LessonNarration` read-along wired into both lesson renderers;
`scripts/tts-render.mjs` loader with an Azure/edge-tts fallback chain). Two
things are owed before it's more than code-complete, and both need
something this session didn't have:

*Superseded 25 Sep 2026:* Azure is no longer needed. Narration learners hear
is rendered by `training:narrate` (Edge, and Gemini for Chapter I), and
`training:tts` is frozen as legacy. See
`docs/narration-visuals-realignment-handoff.md`. The two items below are kept
for the record.

1. **An `AZURE_SPEECH_KEY`**, to actually run `training:tts --apply`
   against Module 1 and record the real character count against Azure's
   500K/month free tier (the plan's own "cost check before building" line)
   — without it, every section renders via the edge-tts fallback, whose
   protocol is reverse-engineered and was not exercised against the live
   service in this session either.
2. **The migration applied to the pilot.** `KB_LOADER_USERNAME`/
   `PASSWORD`/`KB_LOADER_ANON_KEY` were available and `tts-render.mjs`
   really did reach `ltzicxyefizxoqhfuuzc` over PostgREST — but a migration
   is DDL, not something a loader script's admin token can apply, and this
   workspace's Supabase MCP connection is scoped to a different org (same
   gap as §2 above). Someone with dashboard/CLI access to the pilot project
   needs to run it, the same "manual step with no CI equivalent" shape
   `training:load` already has. As of 20 September this is still open —
   don't confuse it with INC-23's migration (§2 above), which is a
   different migration and is applied to both projects.

Full detail: `docs/training-modules-plan.md`'s INC-27 section.

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



## INC-25 authoring update — 24 September 2026

Modules 6–9 are authored in both languages with coverage maps, facilitator
notes, matching competency rubrics, five visuals, 17 QA entries and 18 new
assessment questions. The nine-module loader reports 38 questions, 54 QA
entries and no review flags. Chat Guide fixtures cover all nine modules and
preserve previously passing HHP+ answers. See the INC-25 status in
`docs/training-modules-plan.md` for checks and limitations.

This is an authoring increment, not evidence of a live pilot load. No pilot
data, flags, migrations or user accounts were changed in this session.
Modules 6–9 still need user review, live loading/rendering and narration;
the final course/session accessibility flow remains unverified. The current
connector cannot dispatch the training-load workflow, and no authenticated
pilot database connection is available in this session.
