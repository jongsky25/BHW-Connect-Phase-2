-- ---------------------------------------------------------------------
-- INC-19: Training sessions, enrollment, and pre/post-test measurement
-- (docs/training-modules-plan context: BHW training is always facilitated
-- — a supervisor runs a session and knowledge gain is measured with a
-- pre-test before content and a post-test after.)
--
-- Extends INC-12's e-learning schema rather than forking a parallel system.
-- A `course_session` is a facilitator-led, org-scoped wrapper around the
-- *existing* course_progress/course_module_progress mechanics — it never
-- gates them. A course works both facilitator-led (wrapped in a session)
-- and self-paced solo (no session): course_test_attempts.session_id is
-- simply null for a solo attempt. The `assessor` role is reused as
-- facilitator (no new role, no users_role_check change).
--
-- Pre-test and post-test share ONE question bank per course
-- (course_test_questions, parented to courses directly — not per-module,
-- unlike course_quiz_questions). The delta between a BHW's pretest and
-- posttest score is the measured learning gain.
--
-- §A.6 (lesson density): course_sessions.lesson_density is a facilitator-set
-- display setting (short/normal/long), not a gate — it's consumed by the
-- lesson renderer built in a later increment against course_modules.lesson
-- (also a later increment). It lives here because a session is the natural
-- place to set it and the column costs nothing to add now.
--
-- RLS design note — ownership vs. org-cascade, not to be conflated:
-- a facilitator's own policies use OWNERSHIP (facilitator_user_id = the
-- caller), since a facilitator manages the specific sessions they
-- scheduled, not everything in their org subtree. An admin's policies use
-- the proven org-cascade shape from courses_admin_write (an org unit's path
-- extends the admin's own current_org_path() — "at or below my scope"),
-- exactly like every other admin-write policy in this codebase.
--
-- Explicitly NOT reusing rpc_assessment_claim's org-scope predicate
-- (current_org_path() like o.path || '%', checked against a BHW's own
-- barangay-level org_unit_id) for the enrollment scope check. Against a
-- leaf-level target that direction only self-matches (a barangay has no
-- descendants for "at or below" to reach), which would let a facilitator
-- enroll only BHWs at their own exact org unit — not the barangays under
-- them, contradicting the plainly intended "a city-level supervisor trains
-- barangay-level BHWs" use case. rpc_course_session_enroll instead mirrors
-- rpc_admin_transfer_user's proven direction (org_unit_path(target) like
-- current_org_path() || '%' — target is at-or-below the actor), the same
-- one users_read_assessor_scope and course_progress_admin_read already use
-- for "manage/see a specific user in my scope." Whether
-- rpc_assessment_claim itself behaves as its own comment documents is a
-- pre-existing question outside this migration's scope, not fixed here.
--
-- Flags are a UI/route concern in this codebase, never an RPC-level gate —
-- no existing RPC (rpc_course_create, rpc_course_module_complete, etc.)
-- checks feature_flags internally; ai_gap_draft's dependency on
-- ai_external is enforced in its Next.js route
-- (src/app/api/admin/gap/draft/route.ts), not in SQL. These RPCs follow
-- that convention: no feature_flags check here. `course_sessions` (seeded
-- below, default false) gates the facilitator UI and the BHW pretest/
-- posttest UI in later increments, the same way `elearning` already gates
-- /courses today.
-- ---------------------------------------------------------------------

create table if not exists public.course_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id),
  org_unit_id uuid not null references public.org_units (id), -- snapshot of the facilitator's own org unit at creation time
  facilitator_user_id uuid not null references public.users (id),
  scheduled_at timestamptz not null,
  location_note text not null default '',
  lesson_density text not null default 'normal' check (lesson_density in ('short', 'normal', 'long')),
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_sessions_course_id_idx on public.course_sessions using btree (course_id);
create index if not exists course_sessions_facilitator_user_id_idx on public.course_sessions using btree (facilitator_user_id);
create index if not exists course_sessions_org_unit_id_idx on public.course_sessions using btree (org_unit_id);

drop trigger if exists course_sessions_set_updated_at on public.course_sessions;
create trigger course_sessions_set_updated_at
  before update on public.course_sessions
  for each row execute function public.set_updated_at();

alter table public.course_sessions enable row level security;

create table if not exists public.course_session_enrollments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.course_sessions (id) on delete cascade,
  bhw_user_id uuid not null references public.users (id),
  status text not null default 'enrolled' check (status in ('enrolled', 'attended', 'no_show')),
  enrolled_at timestamptz not null default now(),
  unique (session_id, bhw_user_id)
);

create index if not exists course_session_enrollments_bhw_user_id_idx on public.course_session_enrollments using btree (bhw_user_id);

alter table public.course_session_enrollments enable row level security;

-- Course-level shared bank: the SAME questions serve both the pretest and
-- the posttest (per-course, not per-module, unlike course_quiz_questions).
create table if not exists public.course_test_questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  position integer not null default 0,
  prompt_fil text not null,
  prompt_en text not null,
  options jsonb not null, -- [{fil, en}], same shape as course_quiz_questions.options
  correct_option_index integer not null,
  created_at timestamptz not null default now(),
  unique (course_id, position)
);

create index if not exists course_test_questions_course_id_idx on public.course_test_questions using btree (course_id, position);

alter table public.course_test_questions enable row level security;

create table if not exists public.course_test_attempts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id),
  bhw_user_id uuid not null references public.users (id),
  session_id uuid references public.course_sessions (id), -- null = solo (self-paced) attempt
  phase text not null check (phase in ('pretest', 'posttest')),
  score_percent numeric not null,
  answers jsonb not null, -- [{question_id, selected_option_index}], same shape rpc_course_quiz_submit uses
  taken_at timestamptz not null default now(),
  unique (course_id, bhw_user_id, phase)
);

create index if not exists course_test_attempts_bhw_user_id_idx on public.course_test_attempts using btree (bhw_user_id);
create index if not exists course_test_attempts_session_id_idx on public.course_test_attempts using btree (session_id);

alter table public.course_test_attempts enable row level security;

-- ---------------------------------------------------------------------
-- RLS
--
-- course_sessions, course_session_enrollments and course_test_attempts
-- cross-reference each other in their policies (a session's policy checks
-- enrollments; an enrollment's policy checks its session; an attempt's
-- policy checks its session). Found by actually executing this migration
-- against a real Postgres instance: a raw `exists (select 1 from
-- course_sessions ...)` inside course_session_enrollments' policy, combined
-- with course_sessions_bhw_read's own `exists (select 1 from
-- course_session_enrollments ...)`, is a genuine RLS evaluation cycle —
-- Postgres correctly raises "infinite recursion detected in policy for
-- relation course_sessions" rather than silently doing the wrong thing.
-- This is the exact same class of problem org_unit_path()/
-- current_org_path() already exist to solve for org_units (see this
-- migration's header comment and INC-10's), just between two of THIS
-- migration's own tables instead of against org_units. Fix: the same
-- medicine — small `security definer stable` helper functions that look up
-- one table without going through its own RLS, so a cross-referencing
-- policy never has to re-enter the table it started from.
-- ---------------------------------------------------------------------

create or replace function public.course_session_facilitator_id(p_session_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select facilitator_user_id from public.course_sessions where id = p_session_id;
$$;

create or replace function public.course_session_org_unit_id(p_session_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_unit_id from public.course_sessions where id = p_session_id;
$$;

create or replace function public.bhw_session_enrollment_exists(p_session_id uuid, p_bhw_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.course_session_enrollments
    where session_id = p_session_id and bhw_user_id = p_bhw_user_id
  );
$$;

revoke execute on function public.course_session_facilitator_id(uuid) from public, anon;
revoke execute on function public.course_session_org_unit_id(uuid) from public, anon;
revoke execute on function public.bhw_session_enrollment_exists(uuid, uuid) from public, anon;

grant execute on function public.course_session_facilitator_id(uuid) to authenticated;
grant execute on function public.course_session_org_unit_id(uuid) to authenticated;
grant execute on function public.bhw_session_enrollment_exists(uuid, uuid) to authenticated;

drop policy if exists course_sessions_facilitator_own on public.course_sessions;
create policy course_sessions_facilitator_own on public.course_sessions for all
  using (
    (select public.current_app_user()).role = 'assessor'
    and facilitator_user_id = (select public.current_app_user()).id
  )
  with check (
    (select public.current_app_user()).role = 'assessor'
    and facilitator_user_id = (select public.current_app_user()).id
  );

drop policy if exists course_sessions_admin_scope on public.course_sessions;
create policy course_sessions_admin_scope on public.course_sessions for all
  using (
    (select public.current_app_user()).role = 'admin'
    and (select public.org_unit_path(course_sessions.org_unit_id)) like (select public.current_org_path()) || '%'
  )
  with check (
    (select public.current_app_user()).role = 'admin'
    and (select public.org_unit_path(course_sessions.org_unit_id)) like (select public.current_org_path()) || '%'
  );

-- Uses the helper, not a raw join to course_session_enrollments, so
-- evaluating this policy never re-enters course_session_enrollments' own
-- RLS (which in turn references course_sessions — see header note above).
drop policy if exists course_sessions_bhw_read on public.course_sessions;
create policy course_sessions_bhw_read on public.course_sessions for select
  using (public.bhw_session_enrollment_exists(course_sessions.id, (select public.current_app_user()).id));

-- Uses course_session_facilitator_id(), not a raw join to course_sessions,
-- so evaluating this policy never re-enters course_sessions' own RLS
-- (which in turn references course_session_enrollments via the policy
-- immediately above — see header note).
drop policy if exists course_session_enrollments_facilitator_own on public.course_session_enrollments;
create policy course_session_enrollments_facilitator_own on public.course_session_enrollments for all
  using (public.course_session_facilitator_id(session_id) = (select public.current_app_user()).id)
  with check (public.course_session_facilitator_id(session_id) = (select public.current_app_user()).id);

drop policy if exists course_session_enrollments_admin_scope on public.course_session_enrollments;
create policy course_session_enrollments_admin_scope on public.course_session_enrollments for all
  using (
    (select public.current_app_user()).role = 'admin'
    and (select public.org_unit_path(public.course_session_org_unit_id(session_id))) like (select public.current_org_path()) || '%'
  )
  with check (
    (select public.current_app_user()).role = 'admin'
    and (select public.org_unit_path(public.course_session_org_unit_id(session_id))) like (select public.current_org_path()) || '%'
  );

drop policy if exists course_session_enrollments_bhw_read_own on public.course_session_enrollments;
create policy course_session_enrollments_bhw_read_own on public.course_session_enrollments for select
  using (bhw_user_id = (select public.current_app_user()).id);

-- Mirrors course_quiz_questions_read/_admin_write exactly, parented to
-- courses directly instead of via course_modules: the test bank follows
-- the course's own visibility, same as the module-level quiz bank does.
drop policy if exists course_test_questions_read on public.course_test_questions;
create policy course_test_questions_read on public.course_test_questions for select
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_test_questions.course_id
        and (
          (
            c.status = 'published'
            and (select public.current_org_path()) like (select public.org_unit_path(c.org_unit_id)) || '%'
          )
          or (
            (select public.current_app_user()).role = 'admin'
            and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%'
          )
        )
    )
  );

drop policy if exists course_test_questions_admin_write on public.course_test_questions;
create policy course_test_questions_admin_write on public.course_test_questions for all
  using (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.courses c
      where c.id = course_test_questions.course_id
        and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  )
  with check (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.courses c
      where c.id = course_test_questions.course_id
        and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

drop policy if exists course_test_attempts_own_read on public.course_test_attempts;
create policy course_test_attempts_own_read on public.course_test_attempts for select
  using ((select public.current_app_user()).id = course_test_attempts.bhw_user_id);

-- Mirrors course_progress_admin_read exactly: an admin's oversight isn't
-- limited to sessions they scheduled (they don't schedule sessions at all).
drop policy if exists course_test_attempts_admin_scope on public.course_test_attempts;
create policy course_test_attempts_admin_scope on public.course_test_attempts for select
  using (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.users u
      where u.id = course_test_attempts.bhw_user_id
        and (select public.org_unit_path(u.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

-- Ownership, not cascade: a facilitator sees test scores for the cohorts
-- they actually ran a session for. Solo (session_id is null) attempts
-- belong to no facilitator and are not visible here (the admin policy
-- above covers org-wide oversight of solo attempts). Uses
-- course_session_facilitator_id(), not a raw join to course_sessions, for
-- the same recursion-avoidance reason given in the RLS header note above.
drop policy if exists course_test_attempts_facilitator_via_session on public.course_test_attempts;
create policy course_test_attempts_facilitator_via_session on public.course_test_attempts for select
  using (
    (select public.current_app_user()).role = 'assessor'
    and course_test_attempts.session_id is not null
    and public.course_session_facilitator_id(course_test_attempts.session_id) = (select public.current_app_user()).id
  );

-- notifications.notification_type is a fixed check-constraint enum
-- (20260802000000_inc16_notifications.sql:37-40) that never got widened
-- since INC-16 — course_session.enrolled is not in it, so the notification
-- insert in rpc_course_session_enroll below would fail its check constraint
-- without this. Re-list every existing value plus the new one, same
-- widening pattern INC-12 used for users_role_check.
alter table public.notifications drop constraint if exists notifications_notification_type_check;
alter table public.notifications add constraint notifications_notification_type_check
  check (notification_type in (
    'announcement.created', 'survey.published', 'course.published',
    'assessment.decided', 'forum.reply', 'flipchart.reviewed', 'user.transferred',
    'course_session.enrolled'
  ));

insert into public.feature_flags (key, enabled, description)
values ('course_sessions', false, 'Facilitator-led training sessions: enrollment, and pre/post-test measurement on top of e-learning courses.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------

-- Note: the output column is deliberately NOT named "id" — RETURNS TABLE
-- implicitly declares a same-named PL/pgSQL variable in scope for the whole
-- function body, which made "where id = p_course_id" below ambiguous
-- against public.courses.id (caught by actually executing this migration
-- against a real Postgres instance, not by review). Every existing RPC in
-- this codebase avoids "id" as a RETURNS TABLE column name for exactly
-- this reason (rpc_course_create returns course_id, rpc_assessment_decide
-- returns certificate_id, etc.) — this now follows the same convention.
create or replace function public.rpc_course_session_create(
  p_course_id uuid,
  p_scheduled_at timestamptz,
  p_location_note text,
  p_lesson_density text default 'normal'
)
returns table (session_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_course public.courses;
  v_session_id uuid;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'assessor' then
    raise exception 'not authorized';
  end if;

  if coalesce(p_lesson_density, 'normal') not in ('short', 'normal', 'long') then
    raise exception 'invalid lesson density';
  end if;

  select * into v_course from public.courses where id = p_course_id and status = 'published';
  if v_course is null then
    raise exception 'course not found';
  end if;

  -- Consumption-cascade direction, identical to rpc_course_module_complete's
  -- check: a facilitator can only run a session for a course that actually
  -- cascades down to their own org unit — the same rule that already lets
  -- them read that course today via courses_read_scope.
  if not exists (
    select 1 from public.org_units o
    where o.id = v_course.org_unit_id
      and (select public.current_org_path()) like o.path || '%'
  ) then
    raise exception 'course not authorized for your org unit';
  end if;

  insert into public.course_sessions (course_id, org_unit_id, facilitator_user_id, scheduled_at, location_note, lesson_density)
  values (p_course_id, v_actor.org_unit_id, v_actor.id, p_scheduled_at, coalesce(p_location_note, ''), coalesce(p_lesson_density, 'normal'))
  returning course_sessions.id into v_session_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'course_session.created', 'course_session', v_session_id,
    format('Gumawa si %s ng bagong training session.', v_actor.username),
    format('%s created a new training session.', v_actor.username));

  return query select v_session_id;
end;
$$;

create or replace function public.rpc_course_session_set_density(p_session_id uuid, p_lesson_density text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_session public.course_sessions;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'assessor' then
    raise exception 'not authorized';
  end if;

  if p_lesson_density not in ('short', 'normal', 'long') then
    raise exception 'invalid lesson density';
  end if;

  select * into v_session from public.course_sessions where id = p_session_id;
  if v_session is null then
    raise exception 'session not found';
  end if;

  if v_session.facilitator_user_id != v_actor.id then
    raise exception 'not authorized';
  end if;

  -- Do not let density change retroactively on a session that's already
  -- run — that would make a roster's already-rendered lesson disagree with
  -- its own record.
  if v_session.status != 'scheduled' then
    raise exception 'session is no longer scheduled';
  end if;

  update public.course_sessions set lesson_density = p_lesson_density where id = p_session_id;
end;
$$;

create or replace function public.rpc_course_session_enroll(p_session_id uuid, p_bhw_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_session public.course_sessions;
  v_target public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'assessor' then
    raise exception 'not authorized';
  end if;

  select * into v_session from public.course_sessions where id = p_session_id;
  if v_session is null then
    raise exception 'session not found';
  end if;

  if v_session.facilitator_user_id != v_actor.id then
    raise exception 'not authorized';
  end if;

  select * into v_target from public.users where id = p_bhw_user_id;
  if v_target is null or v_target.role != 'bhw' then
    raise exception 'user is not a BHW';
  end if;

  -- rpc_admin_transfer_user's proven direction: target's org unit path
  -- starts with the actor's own path (target is at-or-below the actor).
  -- Deliberately not rpc_assessment_claim's direction — see this
  -- migration's header comment.
  if not exists (
    select 1 from public.org_units
    where id = v_target.org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'BHW out of scope';
  end if;

  insert into public.course_session_enrollments (session_id, bhw_user_id)
  values (p_session_id, p_bhw_user_id)
  on conflict (session_id, bhw_user_id) do nothing;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'course_session.enrolled', 'course_session', p_session_id,
    format('Ipinasok ni %s ang isang BHW sa isang training session.', v_actor.username),
    format('%s enrolled a BHW into a training session.', v_actor.username));

  if (select enabled from public.feature_flags where key = 'notifications') then
    insert into public.notifications (recipient_user_id, notification_type, subject_type, subject_id, title_fil, title_en, body_fil, body_en, link_path)
    values (p_bhw_user_id, 'course_session.enrolled', 'course_session', p_session_id,
      'Bagong Training Session', 'New Training Session',
      'Ikaw ay ipinasok sa isang training session.', 'You have been enrolled in a training session.',
      '/courses');
  end if;
end;
$$;

create or replace function public.rpc_course_session_cancel(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_session public.course_sessions;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'assessor' then
    raise exception 'not authorized';
  end if;

  select * into v_session from public.course_sessions where id = p_session_id;
  if v_session is null then
    raise exception 'session not found';
  end if;

  if v_session.facilitator_user_id != v_actor.id then
    raise exception 'not authorized';
  end if;

  update public.course_sessions set status = 'cancelled' where id = p_session_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'course_session.cancelled', 'course_session', p_session_id,
    format('Kinansela ni %s ang isang training session.', v_actor.username),
    format('%s cancelled a training session.', v_actor.username));
end;
$$;

create or replace function public.rpc_course_test_submit(
  p_course_id uuid,
  p_phase text,
  p_answers jsonb, -- [{question_id, selected_option_index}]
  p_session_id uuid default null
)
returns table (score_percent numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_course public.courses;
  v_progress public.course_progress;
  v_answer jsonb;
  v_correct_index integer;
  v_selected_index integer;
  v_total_questions integer;
  v_correct_count integer := 0;
  v_score numeric;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null then
    raise exception 'not authorized';
  end if;

  if p_phase not in ('pretest', 'posttest') then
    raise exception 'invalid phase';
  end if;

  select * into v_course from public.courses where id = p_course_id and status = 'published';
  if v_course is null then
    raise exception 'course not found';
  end if;

  if not exists (
    select 1 from public.org_units o
    where o.id = v_course.org_unit_id
      and (select public.current_org_path()) like o.path || '%'
  ) then
    raise exception 'not authorized';
  end if;

  if p_session_id is not null then
    if not exists (
      select 1 from public.course_session_enrollments e
      where e.session_id = p_session_id and e.bhw_user_id = v_actor.id
    ) then
      raise exception 'not enrolled in this session';
    end if;
  end if;

  if exists (
    select 1 from public.course_test_attempts
    where course_id = p_course_id and bhw_user_id = v_actor.id and phase = p_phase
  ) then
    raise exception 'this phase has already been submitted';
  end if;

  select * into v_progress from public.course_progress where course_id = p_course_id and bhw_user_id = v_actor.id;

  if p_phase = 'pretest' then
    -- Rejected if any module progress already exists — the pretest must
    -- come before content starts. course_progress itself may not exist
    -- yet (a pretest legitimately precedes it); check module-level
    -- progress, not the course_progress row's mere existence.
    --
    -- Deliberately `v_progress.id is not null`, NOT `v_progress is not
    -- null` on the whole composite. Found by actually executing this
    -- migration and watching the guard silently fail to fire: Postgres's
    -- row-comparison NULL semantics mean a ROW value's `IS NOT NULL` is
    -- true only when EVERY field is non-null — for a real, found
    -- course_progress row that simply hasn't finished yet,
    -- content_completed_at is null, so `v_progress IS NOT NULL` evaluates
    -- to *false* even though a row exists (`IS NULL` is *also* false in
    -- that case — both tests can fail on the same mixed-null row; see
    -- https://www.postgresql.org/docs/current/functions-comparison.html
    -- on row constructor IS [NOT] NULL). Testing a single NOT NULL scalar
    -- column (the primary key) instead sidesteps the ambiguity entirely:
    -- v_progress.id is a plain scalar, null only in the genuine
    -- zero-rows-found case. Every other null check on a composite
    -- variable in this migration (and the rest of this codebase) only
    -- ever tests the *negative* — `v_x IS NULL` meaning "not found" —
    -- which stays reliable regardless of this quirk; it's specifically
    -- asserting the *positive* ("found") via IS NOT NULL that breaks.
    if v_progress.id is not null and exists (
      select 1 from public.course_module_progress where course_progress_id = v_progress.id
    ) then
      raise exception 'content already started; pretest must come first';
    end if;
  else
    if v_progress is null or v_progress.status = 'in_progress' then
      raise exception 'complete all modules before the posttest';
    end if;
  end if;

  select count(*) into v_total_questions from public.course_test_questions where course_id = p_course_id;
  if v_total_questions = 0 then
    raise exception 'course has no test questions';
  end if;

  for v_answer in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb))
  loop
    select correct_option_index into v_correct_index
      from public.course_test_questions
      where id = (v_answer ->> 'question_id')::uuid and course_id = p_course_id;

    if v_correct_index is null then
      raise exception 'invalid question';
    end if;

    v_selected_index := (v_answer ->> 'selected_option_index')::integer;
    if v_selected_index = v_correct_index then
      v_correct_count := v_correct_count + 1;
    end if;
  end loop;

  v_score := round(100.0 * v_correct_count / v_total_questions, 1);

  insert into public.course_test_attempts (course_id, bhw_user_id, session_id, phase, score_percent, answers)
  values (p_course_id, v_actor.id, p_session_id, p_phase, v_score, coalesce(p_answers, '[]'::jsonb));

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'course_test.submitted', 'course_test_attempt', p_course_id,
    format('Nakumpleto ni %s ang isang %s.', v_actor.username, p_phase),
    format('%s completed a %s.', v_actor.username, p_phase));

  return query select v_score;
end;
$$;

-- rpc_course_delete (INC-12) blocks deletion when course_progress rows
-- exist; extend the same guard to course_test_attempts, or deleting a
-- course would silently orphan recorded pre/post-test scores.
create or replace function public.rpc_course_delete(p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_course public.courses;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_course from public.courses where id = p_course_id;
  if v_course is null then
    raise exception 'course not found';
  end if;

  if not exists (
    select 1 from public.org_units
    where id = v_course.org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'not authorized';
  end if;

  if exists (select 1 from public.course_progress where course_id = p_course_id) then
    raise exception 'course has learner progress';
  end if;

  if exists (select 1 from public.course_test_attempts where course_id = p_course_id) then
    raise exception 'course has recorded test attempts';
  end if;

  delete from public.courses where id = p_course_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'course.deleted', 'course', p_course_id,
    format('Nagtanggal si %s ng isang kurso.', v_actor.username),
    format('%s deleted a course.', v_actor.username));
end;
$$;

-- ---------------------------------------------------------------------
-- Audit visibility: extend audit_event_visible_to_admin (per the running
-- note in delivery-plan.md §5.6) with course_session/course_test_attempt,
-- org-scoped exactly like course/assessment. Re-declared in full (not a
-- diff) so this migration doesn't depend on a particular prior version
-- having already run, matching the convention the INC-13/flip-chart
-- follow-up migration set.
-- ---------------------------------------------------------------------

create or replace function public.audit_event_visible_to_admin(p_subject_type text, p_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_subject_type
    when 'kb_entry' then true
    when 'kb_article' then true
    when 'unmatched_question' then true
    when 'report' then true
    when 'forum_category' then true
    when 'forum_thread' then true
    when 'forum_post' then true
    when 'flip_chart' then true
    when 'user' then exists (
      select 1 from public.users u
      where u.id = p_subject_id
        and public.org_unit_path(u.org_unit_id) like (select public.current_org_path()) || '%'
    )
    when 'announcement' then exists (
      select 1 from public.announcements a
      where a.id = p_subject_id
        and public.org_unit_path(a.org_unit_id) like (select public.current_org_path()) || '%'
    )
    when 'survey' then exists (
      select 1 from public.surveys s
      where s.id = p_subject_id
        and public.org_unit_path(s.org_unit_id) like (select public.current_org_path()) || '%'
    )
    when 'course' then exists (
      select 1 from public.courses c
      where c.id = p_subject_id
        and public.org_unit_path(c.org_unit_id) like (select public.current_org_path()) || '%'
    )
    when 'assessment' then exists (
      select 1 from public.assessments a
      where a.id = p_subject_id
        and public.org_unit_path(a.org_unit_id) like (select public.current_org_path()) || '%'
    )
    when 'course_session' then exists (
      select 1 from public.course_sessions s
      where s.id = p_subject_id
        and public.org_unit_path(s.org_unit_id) like (select public.current_org_path()) || '%'
    )
    -- course_test.submitted's subject_id is the course_id (there's no
    -- single natural row id to point at — the event is about an attempt,
    -- but scoping via the course's own org_unit_id is simplest and correct
    -- since a course's org_unit_id is exactly what's already used to scope
    -- 'course' events above).
    when 'course_test_attempt' then exists (
      select 1 from public.courses c
      where c.id = p_subject_id
        and public.org_unit_path(c.org_unit_id) like (select public.current_org_path()) || '%'
    )
    when 'feature_flag' then exists (
      select 1 from public.feature_flags f
      where f.id = p_subject_id
        and (
          f.org_unit_filter is null
          or public.org_unit_path(f.org_unit_filter) like (select public.current_org_path()) || '%'
        )
    )
    else false
  end;
$$;

grant execute on function public.audit_event_visible_to_admin(text, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------

revoke execute on function public.rpc_course_session_create(uuid, timestamptz, text, text) from public, anon;
revoke execute on function public.rpc_course_session_set_density(uuid, text) from public, anon;
revoke execute on function public.rpc_course_session_enroll(uuid, uuid) from public, anon;
revoke execute on function public.rpc_course_session_cancel(uuid) from public, anon;
revoke execute on function public.rpc_course_test_submit(uuid, text, jsonb, uuid) from public, anon;
revoke execute on function public.rpc_course_delete(uuid) from public, anon;

grant execute on function public.rpc_course_session_create(uuid, timestamptz, text, text) to authenticated;
grant execute on function public.rpc_course_session_set_density(uuid, text) to authenticated;
grant execute on function public.rpc_course_session_enroll(uuid, uuid) to authenticated;
grant execute on function public.rpc_course_session_cancel(uuid) to authenticated;
grant execute on function public.rpc_course_test_submit(uuid, text, jsonb, uuid) to authenticated;
grant execute on function public.rpc_course_delete(uuid) to authenticated;
