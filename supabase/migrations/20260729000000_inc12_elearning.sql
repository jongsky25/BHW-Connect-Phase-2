-- ---------------------------------------------------------------------
-- INC-12: E-Learning Module + Assessor-graded Certification
-- (delivery-plan.md §6.3, requirements-and-vision.md §6.3)
--
-- BHW completes an admin-authored course (text/video/quiz modules, mixed
-- per course), then a qualified assessor grades an in-person skills
-- demonstration (open queue model: any assessor at-or-above the BHW's own
-- org unit can pick up a pending assessment, not a fixed assignment).
-- Passing issues a certificate with a public, QR-linkable verification
-- page.
--
-- Deploy scope and visibility follow the exact same hierarchy pattern as
-- INC-10 (announcements) and INC-11 (surveys): a course's org_unit_id is
-- where it's deployed, a published course is visible to that org unit and
-- everything beneath it, and org_unit_path()/current_org_path() (both
-- security-definer, already defined in INC-10's migration) are used
-- throughout instead of a raw `org_units` lookup, to avoid the RLS
-- composability bug documented at length in INC-10/11: org_units'
-- own read policy only grants a viewer their own org unit and descendants,
-- so a bare `exists (select 1 from org_units o where ...)` inside another
-- table's policy silently collapses any "is this at-or-above my scope"
-- check to false.
--
-- Video modules use a pasted link (YouTube, Facebook, etc.), not native
-- upload — same call as INC-10's announcement attachments, for the same
-- reason (transcoding/hosting cost is out of scope for a lean build).
--
-- New role: `assessor` (nurse/doctor), added alongside the existing
-- `bhw`/`admin` roles. Per the requirements doc, Assessor is a later-phase
-- role that activates with e-learning — admins provision assessor
-- accounts the same way they provision BHW accounts, via
-- rpc_admin_create_user (already role-agnostic; only the `users.role`
-- check constraint needs widening).
--
-- Scope trimmed for this pass (documented, not silently dropped):
--   - No retry after a *failed in-person assessment* — that's terminal
--     for this MVP (course_progress.status = 'failed_assessment'). The
--     requirements doc doesn't specify a re-assessment flow; adding one
--     speculatively would be scope creep beyond what's asked.
--   - No dashboard "Training tab" aggregation (requirements doc §4) —
--     that's a dashboard-increment concern, not this one; course_progress
--     is readable by in-scope admins so the data is there when it's built.
--
-- Ships behind the `elearning` feature flag, defaulted to false (dark
-- launch), same convention as announcements/surveys.
-- ---------------------------------------------------------------------

alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check check (role in ('bhw', 'admin', 'assessor'));

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  org_unit_id uuid not null references public.org_units (id),
  author_user_id uuid not null references public.users (id),
  title_fil text not null,
  title_en text not null,
  description_fil text not null default '',
  description_en text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  quiz_passing_percent integer not null default 80 check (quiz_passing_percent between 1 and 100),
  quiz_max_attempts integer not null default 3 check (quiz_max_attempts >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists courses_org_unit_id_idx on public.courses using btree (org_unit_id);

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

alter table public.courses enable row level security;

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  position integer not null default 0,
  type text not null check (type in ('text', 'video', 'quiz')),
  title_fil text not null,
  title_en text not null,
  body_fil text not null default '',
  body_en text not null default '',
  video_url text,
  created_at timestamptz not null default now()
);

create index if not exists course_modules_course_id_idx on public.course_modules using btree (course_id, position);

alter table public.course_modules enable row level security;

create table if not exists public.course_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules (id) on delete cascade,
  position integer not null default 0,
  prompt_fil text not null,
  prompt_en text not null,
  options jsonb not null, -- [{fil, en}]
  correct_option_index integer not null,
  created_at timestamptz not null default now()
);

create index if not exists course_quiz_questions_module_id_idx on public.course_quiz_questions using btree (module_id, position);

alter table public.course_quiz_questions enable row level security;

create table if not exists public.course_progress (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id),
  bhw_user_id uuid not null references public.users (id),
  status text not null default 'in_progress' check (status in ('in_progress', 'content_completed', 'certified', 'failed_assessment')),
  started_at timestamptz not null default now(),
  content_completed_at timestamptz,
  unique (course_id, bhw_user_id)
);

alter table public.course_progress enable row level security;

create table if not exists public.course_module_progress (
  id uuid primary key default gen_random_uuid(),
  course_progress_id uuid not null references public.course_progress (id) on delete cascade,
  module_id uuid not null references public.course_modules (id) on delete cascade,
  completed_at timestamptz,
  quiz_score integer,
  quiz_attempts integer not null default 0,
  unique (course_progress_id, module_id)
);

alter table public.course_module_progress enable row level security;

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id),
  bhw_user_id uuid not null references public.users (id),
  org_unit_id uuid not null references public.org_units (id), -- snapshot of the BHW's org unit at request time, for assessor-queue scoping
  status text not null default 'pending' check (status in ('pending', 'assigned', 'passed', 'failed')),
  assessor_user_id uuid references public.users (id),
  notes text not null default '',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists assessments_org_unit_id_idx on public.assessments using btree (org_unit_id);
create index if not exists assessments_status_idx on public.assessments using btree (status);

alter table public.assessments enable row level security;

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id),
  course_id uuid not null references public.courses (id),
  bhw_user_id uuid not null references public.users (id),
  verification_code text not null unique,
  bhw_full_name_snapshot text not null,
  course_title_fil_snapshot text not null,
  course_title_en_snapshot text not null,
  issued_at timestamptz not null default now()
);

alter table public.certificates enable row level security;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

drop policy if exists courses_read_scope on public.courses;
create policy courses_read_scope on public.courses for select
  using (
    (
      status = 'published'
      and (select public.current_org_path()) like (select public.org_unit_path(courses.org_unit_id)) || '%'
    )
    or (
      (select public.current_app_user()).role = 'admin'
      and (select public.org_unit_path(courses.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

drop policy if exists courses_admin_write on public.courses;
create policy courses_admin_write on public.courses for all
  using (
    (select public.current_app_user()).role = 'admin'
    and (select public.org_unit_path(courses.org_unit_id)) like (select public.current_org_path()) || '%'
  )
  with check (
    (select public.current_app_user()).role = 'admin'
    and (select public.org_unit_path(courses.org_unit_id)) like (select public.current_org_path()) || '%'
  );

drop policy if exists course_modules_read on public.course_modules;
create policy course_modules_read on public.course_modules for select
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id
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

drop policy if exists course_modules_admin_write on public.course_modules;
create policy course_modules_admin_write on public.course_modules for all
  using (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id
        and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  )
  with check (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id
        and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

drop policy if exists course_quiz_questions_read on public.course_quiz_questions;
create policy course_quiz_questions_read on public.course_quiz_questions for select
  using (
    exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = course_quiz_questions.module_id
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

drop policy if exists course_quiz_questions_admin_write on public.course_quiz_questions;
create policy course_quiz_questions_admin_write on public.course_quiz_questions for all
  using (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = course_quiz_questions.module_id
        and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  )
  with check (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = course_quiz_questions.module_id
        and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

drop policy if exists course_progress_own_read on public.course_progress;
create policy course_progress_own_read on public.course_progress for select
  using ((select public.current_app_user()).id = course_progress.bhw_user_id);

drop policy if exists course_progress_admin_read on public.course_progress;
create policy course_progress_admin_read on public.course_progress for select
  using (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.users u
      where u.id = course_progress.bhw_user_id
        and (select public.org_unit_path(u.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

drop policy if exists course_module_progress_own_read on public.course_module_progress;
create policy course_module_progress_own_read on public.course_module_progress for select
  using (
    exists (
      select 1 from public.course_progress p
      where p.id = course_module_progress.course_progress_id
        and p.bhw_user_id = (select public.current_app_user()).id
    )
  );

drop policy if exists course_module_progress_admin_read on public.course_module_progress;
create policy course_module_progress_admin_read on public.course_module_progress for select
  using (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.course_progress p
      join public.users u on u.id = p.bhw_user_id
      where p.id = course_module_progress.course_progress_id
        and (select public.org_unit_path(u.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

drop policy if exists assessments_bhw_read_own on public.assessments;
create policy assessments_bhw_read_own on public.assessments for select
  using ((select public.current_app_user()).id = assessments.bhw_user_id);

drop policy if exists assessments_assessor_scope_read on public.assessments;
create policy assessments_assessor_scope_read on public.assessments for select
  using (
    (select public.current_app_user()).role = 'assessor'
    and (select public.current_org_path()) like (select public.org_unit_path(assessments.org_unit_id)) || '%'
  );

drop policy if exists assessments_admin_read on public.assessments;
create policy assessments_admin_read on public.assessments for select
  using (
    (select public.current_app_user()).role = 'admin'
    and (select public.current_org_path()) like (select public.org_unit_path(assessments.org_unit_id)) || '%'
  );

drop policy if exists certificates_bhw_read_own on public.certificates;
create policy certificates_bhw_read_own on public.certificates for select
  using ((select public.current_app_user()).id = certificates.bhw_user_id);

drop policy if exists certificates_admin_read on public.certificates;
create policy certificates_admin_read on public.certificates for select
  using (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.courses c
      where c.id = certificates.course_id
        and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

-- users_read_self_or_admin_scope (baseline migration) only grants a user
-- their own row or an admin's own-scope read — an assessor has neither,
-- so the assessment queue's embedded `users:bhw_user_id(...)` join
-- silently returned null for the BHW's name. Mirrors the admin scope-read
-- policy, just for assessors: they legitimately need to see the identity
-- of the BHW whose assessment they're claiming/deciding.
drop policy if exists users_read_assessor_scope on public.users;
create policy users_read_assessor_scope on public.users for select
  using (
    (select public.current_app_user()).role = 'assessor'
    and (select public.org_unit_path(users.org_unit_id)) like (select public.current_org_path()) || '%'
  );

insert into public.feature_flags (key, enabled, description)
values ('elearning', false, 'E-learning: courses with text/video/quiz modules, assessor-graded certification.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------

create or replace function public.rpc_course_create(
  p_org_unit_id uuid,
  p_title_fil text,
  p_title_en text,
  p_description_fil text,
  p_description_en text,
  p_quiz_passing_percent integer,
  p_quiz_max_attempts integer,
  p_modules jsonb -- [{type, title_fil, title_en, body_fil, body_en, video_url, questions: [{prompt_fil, prompt_en, options: [{fil, en}], correct_option_index}]}]
)
returns table (course_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_course_id uuid;
  v_module jsonb;
  v_question jsonb;
  v_module_id uuid;
  v_position integer := 0;
  v_question_position integer;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if trim(coalesce(p_title_fil, '')) = '' or trim(coalesce(p_title_en, '')) = '' then
    raise exception 'title is required';
  end if;

  if jsonb_array_length(coalesce(p_modules, '[]'::jsonb)) = 0 then
    raise exception 'at least one module is required';
  end if;

  if not exists (
    select 1 from public.org_units
    where id = p_org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'org unit out of scope';
  end if;

  insert into public.courses (
    org_unit_id, author_user_id, title_fil, title_en, description_fil, description_en,
    quiz_passing_percent, quiz_max_attempts
  ) values (
    p_org_unit_id, v_actor.id, p_title_fil, p_title_en,
    coalesce(p_description_fil, ''), coalesce(p_description_en, ''),
    coalesce(p_quiz_passing_percent, 80), coalesce(p_quiz_max_attempts, 3)
  ) returning id into v_course_id;

  for v_module in select * from jsonb_array_elements(p_modules)
  loop
    if v_module ->> 'type' not in ('text', 'video', 'quiz') then
      raise exception 'invalid module type';
    end if;

    insert into public.course_modules (course_id, position, type, title_fil, title_en, body_fil, body_en, video_url)
    values (
      v_course_id, v_position, v_module ->> 'type',
      v_module ->> 'title_fil', v_module ->> 'title_en',
      coalesce(v_module ->> 'body_fil', ''), coalesce(v_module ->> 'body_en', ''),
      nullif(trim(coalesce(v_module ->> 'video_url', '')), '')
    ) returning id into v_module_id;

    if v_module ->> 'type' = 'quiz' then
      if jsonb_array_length(coalesce(v_module -> 'questions', '[]'::jsonb)) = 0 then
        raise exception 'a quiz module needs at least one question';
      end if;

      v_question_position := 0;
      for v_question in select * from jsonb_array_elements(v_module -> 'questions')
      loop
        insert into public.course_quiz_questions (module_id, position, prompt_fil, prompt_en, options, correct_option_index)
        values (
          v_module_id, v_question_position,
          v_question ->> 'prompt_fil', v_question ->> 'prompt_en',
          v_question -> 'options', (v_question ->> 'correct_option_index')::integer
        );
        v_question_position := v_question_position + 1;
      end loop;
    end if;

    v_position := v_position + 1;
  end loop;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'course.created', 'course', v_course_id,
    format('Gumawa si %s ng bagong kurso.', v_actor.username),
    format('%s created a new course.', v_actor.username));

  return query select v_course_id;
end;
$$;

create or replace function public.rpc_course_set_status(p_course_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_course public.courses;
begin
  if p_status not in ('draft', 'published', 'archived') then
    raise exception 'invalid status';
  end if;

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

  update public.courses set status = p_status where id = p_course_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'course.status_changed', 'course', p_course_id,
    format('Binago ni %s ang status ng isang kurso patungong %s.', v_actor.username, p_status),
    format('%s changed a course''s status to %s.', v_actor.username, p_status));
end;
$$;

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

  delete from public.courses where id = p_course_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'course.deleted', 'course', p_course_id,
    format('Nagtanggal si %s ng isang kurso.', v_actor.username),
    format('%s deleted a course.', v_actor.username));
end;
$$;

-- Shared by rpc_course_module_complete and rpc_course_quiz_submit: once
-- every module in a course has a completed_at, the BHW is done with
-- content and enters the assessment queue. Not exposed to clients
-- (no grant to anon/authenticated below) — only called from within the
-- two SECURITY DEFINER RPCs above, whose elevated role can still execute
-- it regardless.
create or replace function public.course_progress_maybe_finish(p_course_progress_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_progress public.course_progress;
  v_total_modules integer;
  v_completed_modules integer;
begin
  select * into v_progress from public.course_progress where id = p_course_progress_id;

  select count(*) into v_total_modules from public.course_modules where course_id = v_progress.course_id;
  select count(*) into v_completed_modules
    from public.course_module_progress
    where course_progress_id = p_course_progress_id and completed_at is not null;

  if v_completed_modules < v_total_modules then
    return;
  end if;

  update public.course_progress
    set status = 'content_completed', content_completed_at = now()
    where id = p_course_progress_id and status = 'in_progress';

  if not exists (select 1 from public.assessments where course_id = v_progress.course_id and bhw_user_id = v_progress.bhw_user_id) then
    insert into public.assessments (course_id, bhw_user_id, org_unit_id)
    select v_progress.course_id, v_progress.bhw_user_id, u.org_unit_id
    from public.users u
    where u.id = v_progress.bhw_user_id;
  end if;
end;
$$;

create or replace function public.rpc_course_module_complete(p_course_id uuid, p_module_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_course public.courses;
  v_module public.course_modules;
  v_progress_id uuid;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null then
    raise exception 'not authorized';
  end if;

  select * into v_course from public.courses where id = p_course_id and status = 'published';
  if v_course is null then
    raise exception 'course not found';
  end if;

  select * into v_module from public.course_modules where id = p_module_id and course_id = p_course_id;
  if v_module is null then
    raise exception 'module not found';
  end if;

  if v_module.type = 'quiz' then
    raise exception 'use rpc_course_quiz_submit for quiz modules';
  end if;

  if not exists (
    select 1 from public.org_units o
    where o.id = v_course.org_unit_id
      and (select public.current_org_path()) like o.path || '%'
  ) then
    raise exception 'not authorized';
  end if;

  insert into public.course_progress (course_id, bhw_user_id)
  values (p_course_id, v_actor.id)
  on conflict (course_id, bhw_user_id) do nothing;

  select id into v_progress_id from public.course_progress where course_id = p_course_id and bhw_user_id = v_actor.id;

  insert into public.course_module_progress (course_progress_id, module_id, completed_at)
  values (v_progress_id, p_module_id, now())
  on conflict (course_progress_id, module_id) do update set completed_at = now();

  perform public.course_progress_maybe_finish(v_progress_id);
end;
$$;

create or replace function public.rpc_course_quiz_submit(
  p_course_id uuid,
  p_module_id uuid,
  p_answers jsonb -- [{question_id, selected_option_index}]
)
returns table (passed boolean, score_percent integer, attempts_used integer, max_attempts integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_course public.courses;
  v_module public.course_modules;
  v_progress_id uuid;
  v_module_progress public.course_module_progress;
  v_answer jsonb;
  v_correct_index integer;
  v_selected_index integer;
  v_total_questions integer;
  v_correct_count integer := 0;
  v_score integer;
  v_passed boolean;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null then
    raise exception 'not authorized';
  end if;

  select * into v_course from public.courses where id = p_course_id and status = 'published';
  if v_course is null then
    raise exception 'course not found';
  end if;

  select * into v_module from public.course_modules where id = p_module_id and course_id = p_course_id and type = 'quiz';
  if v_module is null then
    raise exception 'quiz module not found';
  end if;

  if not exists (
    select 1 from public.org_units o
    where o.id = v_course.org_unit_id
      and (select public.current_org_path()) like o.path || '%'
  ) then
    raise exception 'not authorized';
  end if;

  insert into public.course_progress (course_id, bhw_user_id)
  values (p_course_id, v_actor.id)
  on conflict (course_id, bhw_user_id) do nothing;

  select id into v_progress_id from public.course_progress where course_id = p_course_id and bhw_user_id = v_actor.id;

  insert into public.course_module_progress (course_progress_id, module_id)
  values (v_progress_id, p_module_id)
  on conflict (course_progress_id, module_id) do nothing;

  select * into v_module_progress from public.course_module_progress
    where course_progress_id = v_progress_id and module_id = p_module_id;

  if v_module_progress.completed_at is not null then
    raise exception 'quiz already passed';
  end if;

  if v_module_progress.quiz_attempts >= v_course.quiz_max_attempts then
    raise exception 'no attempts remaining';
  end if;

  select count(*) into v_total_questions from public.course_quiz_questions where module_id = p_module_id;
  if v_total_questions = 0 then
    raise exception 'quiz has no questions';
  end if;

  for v_answer in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb))
  loop
    select correct_option_index into v_correct_index
      from public.course_quiz_questions
      where id = (v_answer ->> 'question_id')::uuid and module_id = p_module_id;

    if v_correct_index is null then
      raise exception 'invalid question';
    end if;

    v_selected_index := (v_answer ->> 'selected_option_index')::integer;
    if v_selected_index = v_correct_index then
      v_correct_count := v_correct_count + 1;
    end if;
  end loop;

  v_score := round(100.0 * v_correct_count / v_total_questions);
  v_passed := v_score >= v_course.quiz_passing_percent;

  update public.course_module_progress
    set quiz_attempts = quiz_attempts + 1,
        quiz_score = v_score,
        completed_at = case when v_passed then now() else completed_at end
    where course_progress_id = v_progress_id and module_id = p_module_id;

  if v_passed then
    perform public.course_progress_maybe_finish(v_progress_id);
  end if;

  return query select v_passed, v_score, v_module_progress.quiz_attempts + 1, v_course.quiz_max_attempts;
end;
$$;

create or replace function public.rpc_assessment_claim(p_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_assessment public.assessments;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'assessor' then
    raise exception 'not authorized';
  end if;

  select * into v_assessment from public.assessments where id = p_assessment_id;
  if v_assessment is null then
    raise exception 'assessment not found';
  end if;

  if v_assessment.status != 'pending' then
    raise exception 'assessment already claimed';
  end if;

  if not exists (
    select 1 from public.org_units o
    where o.id = v_assessment.org_unit_id
      and (select public.current_org_path()) like o.path || '%'
  ) then
    raise exception 'not authorized';
  end if;

  update public.assessments
    set status = 'assigned', assessor_user_id = v_actor.id
    where id = p_assessment_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'assessment.claimed', 'assessment', p_assessment_id,
    format('Kinuha ni %s ang isang pagtatasa mula sa pila.', v_actor.username),
    format('%s picked up an assessment from the queue.', v_actor.username));
end;
$$;

create or replace function public.rpc_assessment_decide(p_assessment_id uuid, p_passed boolean, p_notes text)
returns table (certificate_id uuid, verification_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_assessment public.assessments;
  v_bhw public.users;
  v_course public.courses;
  v_certificate_id uuid;
  v_code text;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'assessor' then
    raise exception 'not authorized';
  end if;

  select * into v_assessment from public.assessments where id = p_assessment_id;
  if v_assessment is null then
    raise exception 'assessment not found';
  end if;

  if v_assessment.status != 'assigned' or v_assessment.assessor_user_id != v_actor.id then
    raise exception 'not authorized';
  end if;

  select * into v_bhw from public.users where id = v_assessment.bhw_user_id;
  select * into v_course from public.courses where id = v_assessment.course_id;

  if p_passed then
    update public.assessments
      set status = 'passed', notes = coalesce(p_notes, ''), decided_at = now()
      where id = p_assessment_id;

    update public.course_progress
      set status = 'certified'
      where course_id = v_assessment.course_id and bhw_user_id = v_assessment.bhw_user_id;

    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

    insert into public.certificates (
      assessment_id, course_id, bhw_user_id, verification_code,
      bhw_full_name_snapshot, course_title_fil_snapshot, course_title_en_snapshot
    ) values (
      p_assessment_id, v_assessment.course_id, v_assessment.bhw_user_id, v_code,
      v_bhw.full_name, v_course.title_fil, v_course.title_en
    ) returning id into v_certificate_id;

    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'assessment.decided', 'assessment', p_assessment_id,
      format('Pinasa ni %s ang isang BHW sa pagtatasa at naglabas ng sertipiko.', v_actor.username),
      format('%s passed a BHW''s assessment and issued a certificate.', v_actor.username));

    return query select v_certificate_id, v_code;
  else
    update public.assessments
      set status = 'failed', notes = coalesce(p_notes, ''), decided_at = now()
      where id = p_assessment_id;

    update public.course_progress
      set status = 'failed_assessment'
      where course_id = v_assessment.course_id and bhw_user_id = v_assessment.bhw_user_id;

    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'assessment.decided', 'assessment', p_assessment_id,
      format('Hindi pinasa ni %s ang isang BHW sa pagtatasa.', v_actor.username),
      format('%s failed a BHW''s assessment.', v_actor.username));

    return query select null::uuid, null::text;
  end if;
end;
$$;

create or replace function public.rpc_certificate_verify(p_code text)
returns table (valid boolean, bhw_full_name text, course_title_fil text, course_title_en text, issued_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cert public.certificates;
begin
  select * into v_cert from public.certificates where verification_code = upper(trim(coalesce(p_code, '')));

  if v_cert is null then
    return query select false, null::text, null::text, null::text, null::timestamptz;
  else
    return query select true, v_cert.bhw_full_name_snapshot, v_cert.course_title_fil_snapshot, v_cert.course_title_en_snapshot, v_cert.issued_at;
  end if;
end;
$$;

revoke execute on function public.course_progress_maybe_finish(uuid) from public, anon, authenticated;

revoke execute on function public.rpc_course_create(uuid, text, text, text, text, integer, integer, jsonb) from public, anon;
revoke execute on function public.rpc_course_set_status(uuid, text) from public, anon;
revoke execute on function public.rpc_course_delete(uuid) from public, anon;
revoke execute on function public.rpc_course_module_complete(uuid, uuid) from public, anon;
revoke execute on function public.rpc_course_quiz_submit(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.rpc_assessment_claim(uuid) from public, anon;
revoke execute on function public.rpc_assessment_decide(uuid, boolean, text) from public, anon;

grant execute on function public.rpc_course_create(uuid, text, text, text, text, integer, integer, jsonb) to authenticated;
grant execute on function public.rpc_course_set_status(uuid, text) to authenticated;
grant execute on function public.rpc_course_delete(uuid) to authenticated;
grant execute on function public.rpc_course_module_complete(uuid, uuid) to authenticated;
grant execute on function public.rpc_course_quiz_submit(uuid, uuid, jsonb) to authenticated;
grant execute on function public.rpc_assessment_claim(uuid) to authenticated;
grant execute on function public.rpc_assessment_decide(uuid, boolean, text) to authenticated;

-- Public verification page: no auth required, callable by anon.
grant execute on function public.rpc_certificate_verify(text) to anon, authenticated;
