-- ---------------------------------------------------------------------
-- Versioned pre/post test bank.
--
-- INC-19 made course_test_questions one flat bank per course, scored as a
-- whole: rpc_course_test_submit divided by every row for the course. Two
-- problems follow (docs/content-assessment-2026-09.md, S5):
--
-- - A question could not be corrected once BHWs had answered it. The
--   loader refused to change a loaded bank, because editing a row in place
--   silently changes what past answers meant.
-- - A bank that covers modules the course does not yet contain (the Day 1
--   bank covers modules 06-09, which have no course_modules rows yet)
--   scores BHWs on content they cannot open.
--
-- This adds:
--
-- - module_position: which module (by course_modules.position) a question
--   tests. Null means course-wide. A position is used instead of a
--   module_id because a question's module may not have a row yet, and the
--   manual already treats "no module row at this position" as unavailable.
-- - retired_at: a retired question is kept (past answers still point at
--   it) but no longer served or scored. Correcting a question means
--   retiring the old row and inserting a new one at the same position,
--   so only one active row per position is allowed.
-- - course_test_questions_current: the questions that are served and
--   scored — active, and either course-wide or tagged to a module the
--   course contains. security_invoker, so the table's RLS still decides
--   who sees what; select-only.
-- - rpc_course_test_submit now scores against that same set, ignores
--   answers to questions outside it, and counts each question once.
--
-- Stored course_test_attempts rows and their score_percent are unchanged.
-- ---------------------------------------------------------------------

alter table public.course_test_questions
  add column if not exists module_position integer check (module_position >= 0),
  add column if not exists retired_at timestamptz;

alter table public.course_test_questions
  drop constraint if exists course_test_questions_course_id_position_key;

create unique index if not exists course_test_questions_active_position_key
  on public.course_test_questions (course_id, position)
  where retired_at is null;

create or replace view public.course_test_questions_current
with (security_invoker = true) as
select q.id, q.course_id, q.position, q.prompt_fil, q.prompt_en, q.options,
       q.correct_option_index, q.module_position, q.created_at
from public.course_test_questions q
where q.retired_at is null
  and (
    q.module_position is null
    or exists (
      select 1 from public.course_modules m
      where m.course_id = q.course_id and m.position = q.module_position
    )
  );

revoke all on public.course_test_questions_current from public, anon, authenticated;
grant select on public.course_test_questions_current to authenticated;

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
  v_question_id uuid;
  v_correct_index integer;
  v_selected_index integer;
  v_total_questions integer;
  v_correct_count integer := 0;
  v_seen uuid[] := '{}';
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
    -- `v_progress.id is not null`, not `v_progress is not null`: see the
    -- INC-19 version of this function for the ROW IS NOT NULL pitfall.
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

  -- Only the questions a BHW is served count: active, and course-wide or
  -- tagged to a module this course contains. This function is security
  -- definer, so the view is read as its owner, not through the caller's RLS.
  select count(*) into v_total_questions
    from public.course_test_questions_current where course_id = p_course_id;
  if v_total_questions = 0 then
    raise exception 'course has no test questions';
  end if;

  for v_answer in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb))
  loop
    v_question_id := (v_answer ->> 'question_id')::uuid;

    if not exists (
      select 1 from public.course_test_questions
      where id = v_question_id and course_id = p_course_id
    ) then
      raise exception 'invalid question';
    end if;

    -- A question retired or made unavailable after the page loaded is not
    -- an error: the answer is kept in the attempt but not scored. Each
    -- question counts once, whatever the payload repeats.
    select correct_option_index into v_correct_index
      from public.course_test_questions_current
      where id = v_question_id and course_id = p_course_id;
    if v_correct_index is null or v_question_id = any (v_seen) then
      continue;
    end if;
    v_seen := v_seen || v_question_id;

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

revoke execute on function public.rpc_course_test_submit(uuid, text, jsonb, uuid) from public, anon;
grant execute on function public.rpc_course_test_submit(uuid, text, jsonb, uuid) to authenticated;
