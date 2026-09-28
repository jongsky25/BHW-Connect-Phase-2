-- AF-03: assessor candidate diagnostics and qualifying chapter exams.
-- Candidate attempts never enter BHW course_test_attempts or certificates.
begin;

create table assessor_private.exam_requirements (
  chapter_key text primary key,
  curriculum_version text not null,
  required_lessons jsonb not null check (jsonb_typeof(required_lessons)='array' and jsonb_array_length(required_lessons)>0),
  minimum_questions integer not null check (minimum_questions>0),
  passing_percent numeric not null check (passing_percent>0 and passing_percent<=100)
);
revoke all on assessor_private.exam_requirements from public,anon,authenticated;
insert into assessor_private.exam_requirements values
  ('chapter-1','2026-09-28.1','[{"position":0,"key":"bhw-roles-hepo"},{"position":0,"key":"bhw-health-educator"},{"position":0,"key":"bhw-community-organizer"},{"position":0,"key":"bhw-service-provider"},{"position":0,"key":"bhw-records"},{"position":0,"key":"bhw-roles-application"},{"position":1,"key":"uhc-coverage"},{"position":1,"key":"uhc-primary-care"},{"position":1,"key":"uhc-local-system"},{"position":1,"key":"uhc-improvement"},{"position":2,"key":"bhs-promotions"},{"position":2,"key":"bhs-support-environment"},{"position":2,"key":"bhs-decline"},{"position":2,"key":"bhs-resources"},{"position":2,"key":"bhs-improvement"},{"position":3,"key":"bhw-legal-role"},{"position":3,"key":"bhw-benefits"},{"position":3,"key":"bhw-eligibility"},{"position":3,"key":"bhw-accreditation"},{"position":3,"key":"bhw-follow-up"},{"position":4,"key":"bhw-relationships"},{"position":4,"key":"bhw-barangay-partners"},{"position":4,"key":"bhw-local-partners"},{"position":4,"key":"bhw-teamwork"},{"position":4,"key":"bhw-self-management"},{"position":4,"key":"bhw-right-contact"},{"position":5,"key":"communication-listen"},{"position":5,"key":"communication-clarify"},{"position":5,"key":"communication-explain"},{"position":5,"key":"communication-record"},{"position":5,"key":"communication-handoff"},{"position":6,"key":"problem-define"},{"position":6,"key":"problem-causes"},{"position":6,"key":"problem-prioritize"},{"position":6,"key":"problem-action-plan"},{"position":7,"key":"safety-identify"},{"position":7,"key":"safety-controls"},{"position":7,"key":"safety-prepare"},{"position":7,"key":"safety-demonstrate"},{"position":8,"key":"resources-audit"},{"position":8,"key":"resources-safe-change"},{"position":8,"key":"resources-monitor"}]'::jsonb,38,80);
-- Chapter II has no approved qualifying bank. Do not create a usable rule for it.

create table public.assessor_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  assessor_user_id uuid not null references public.users(id),
  chapter_id uuid not null references public.training_program_chapters(id),
  curriculum_version text not null,
  exam_id text not null,
  phase text not null check (phase in ('pretest','posttest')),
  status text not null default 'open' check (status in ('open','submitted')),
  question_set_hash text not null check (question_set_hash ~ '^[0-9a-f]{32}$'),
  question_count integer not null check (question_count>0),
  passing_percent numeric,
  score_percent numeric check (score_percent between 0 and 100),
  passed boolean,
  answers jsonb,
  pretest_late boolean not null default false,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  check ((status='open' and score_percent is null and passed is null and submitted_at is null and answers is null)
    or (status='submitted' and score_percent is not null and passed is not null and submitted_at is not null and answers is not null))
);
create unique index assessor_exam_one_open on public.assessor_exam_attempts(assessor_user_id,chapter_id,curriculum_version,phase)
  where status='open';
create index assessor_exam_history on public.assessor_exam_attempts(assessor_user_id,chapter_id,started_at desc);
alter table public.assessor_exam_attempts enable row level security;
create policy assessor_exam_own_read on public.assessor_exam_attempts for select to authenticated using (
  assessor_user_id=(select u.id from public.current_app_user() u where u.role='assessor' and u.status='active')
);
revoke all on public.assessor_exam_attempts from public,anon,authenticated;
grant select on public.assessor_exam_attempts to authenticated;

-- The scored question snapshot is never exposed through PostgREST.
create table assessor_private.exam_snapshots (
  attempt_id uuid primary key references public.assessor_exam_attempts(id),
  questions jsonb not null check (jsonb_typeof(questions)='array' and jsonb_array_length(questions)>0)
);
revoke all on assessor_private.exam_snapshots from public,anon,authenticated;

create function assessor_private.exam_context(p_chapter_id uuid)
returns table(actor_id uuid,course_id uuid,chapter_key text,curriculum_version text,required_lessons jsonb,minimum_questions integer,passing_percent numeric)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role<>'assessor' or v_actor.status<>'active' then raise exception 'not authorized'; end if;
  return query
    select v_actor.id,ch.course_id,ch.chapter_key,r.curriculum_version,r.required_lessons,r.minimum_questions,r.passing_percent
    from public.training_program_chapters ch
    join public.training_programs p on p.id=ch.program_id
    join public.courses c on c.id=ch.course_id
    join assessor_private.exam_requirements r on r.chapter_key=ch.chapter_key
    where ch.id=p_chapter_id and ch.availability='available' and p.content_key='bhw-reference-manual'
      and p.status='published' and c.status='published'
      and (public.current_org_path() like public.org_unit_path(c.org_unit_id) || '%'
        or public.org_unit_path(c.org_unit_id) like public.current_org_path() || '%');
  if not found then raise exception 'qualifying exam unavailable for this chapter'; end if;
end;
$$;
revoke execute on function assessor_private.exam_context(uuid) from public,anon,authenticated;

create function assessor_private.chapter_lessons_complete(p_actor uuid,p_chapter uuid,p_course uuid,p_requirements jsonb)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_req jsonb;
begin
  for v_req in select value from jsonb_array_elements(p_requirements) loop
    if not exists (
      select 1 from public.course_modules m
      join public.course_lessons l on l.module_id=m.id
      join public.assessor_lesson_progress lp on lp.lesson_id=l.id and lp.revision_id=l.published_revision_id
      where m.course_id=p_course and m.position=(v_req->>'position')::integer
        and l.lesson_key=v_req->>'key' and l.required and l.published_revision_id is not null
        and lp.assessor_user_id=p_actor and lp.chapter_id=p_chapter
        and public.training_lesson_visible(l.id)
    ) then return false; end if;
  end loop;
  return true;
end;
$$;
revoke execute on function assessor_private.chapter_lessons_complete(uuid,uuid,uuid,jsonb) from public,anon,authenticated;

create function public.rpc_assessor_exam_open(p_chapter_id uuid,p_phase text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_ctx record; v_attempt public.assessor_exam_attempts; v_questions jsonb; v_public_questions jsonb;
  v_count integer; v_late boolean; v_exam_id text;
begin
  if p_phase is null or p_phase not in ('pretest','posttest') then raise exception 'invalid exam phase'; end if;
  select * into v_ctx from assessor_private.exam_context(p_chapter_id);
  -- Serialize starts and retakes for this actor, including concurrent tabs.
  perform 1 from public.users where id=v_ctx.actor_id for update;
  v_exam_id:=v_ctx.chapter_key || ':' || p_phase;
  if p_phase='pretest' then
    if exists(select 1 from public.assessor_exam_attempts a where a.assessor_user_id=v_ctx.actor_id
      and a.chapter_id=p_chapter_id and a.curriculum_version=v_ctx.curriculum_version
      and a.phase='pretest' and a.status='submitted') then raise exception 'diagnostic pretest already submitted'; end if;
  else
    if not exists(select 1 from public.assessor_exam_attempts a where a.assessor_user_id=v_ctx.actor_id
      and a.chapter_id=p_chapter_id and a.curriculum_version=v_ctx.curriculum_version
      and a.phase='pretest' and a.status='submitted') then raise exception 'take the diagnostic pretest first'; end if;
    if not assessor_private.chapter_lessons_complete(v_ctx.actor_id,p_chapter_id,v_ctx.course_id,v_ctx.required_lessons) then
      raise exception 'complete the full chapter before the posttest'; end if;
    if exists(select 1 from public.assessor_exam_attempts a where a.assessor_user_id=v_ctx.actor_id
      and a.chapter_id=p_chapter_id and a.curriculum_version=v_ctx.curriculum_version
      and a.phase='posttest' and a.passed) then raise exception 'qualifying exam already passed'; end if;
  end if;
  select * into v_attempt from public.assessor_exam_attempts a where a.assessor_user_id=v_ctx.actor_id
    and a.chapter_id=p_chapter_id and a.curriculum_version=v_ctx.curriculum_version and a.phase=p_phase and a.status='open';
  if v_attempt.id is null then
    select count(*),jsonb_agg(jsonb_build_object('id',q.id,'prompt_fil',q.prompt_fil,'prompt_en',q.prompt_en,
      'options',q.options,'correct_option_index',q.correct_option_index) order by q.position)
      into v_count,v_questions from public.course_test_questions_current q where q.course_id=v_ctx.course_id;
    if v_count<v_ctx.minimum_questions then raise exception 'reviewed chapter exam bank unavailable'; end if;
    if exists(select 1 from jsonb_array_elements(v_questions) q where jsonb_array_length(q->'options')<2
      or (q->>'correct_option_index')::integer not between 0 and jsonb_array_length(q->'options')-1) then
      raise exception 'invalid chapter exam bank'; end if;
    v_late:=p_phase='pretest' and exists(select 1 from public.assessor_lesson_progress lp
      where lp.assessor_user_id=v_ctx.actor_id and lp.chapter_id=p_chapter_id);
    insert into public.assessor_exam_attempts(assessor_user_id,chapter_id,curriculum_version,exam_id,phase,
      question_set_hash,question_count,passing_percent,pretest_late)
      values(v_ctx.actor_id,p_chapter_id,v_ctx.curriculum_version,v_exam_id,p_phase,md5(v_questions::text),v_count,
        case when p_phase='posttest' then v_ctx.passing_percent else null end,v_late)
      returning * into v_attempt;
    insert into assessor_private.exam_snapshots(attempt_id,questions) values(v_attempt.id,v_questions);
  else
    select s.questions into v_questions from assessor_private.exam_snapshots s where s.attempt_id=v_attempt.id;
  end if;
  select jsonb_agg(q.value - 'correct_option_index' order by q.ordinality) into v_public_questions
    from jsonb_array_elements(v_questions) with ordinality q(value,ordinality);
  return jsonb_build_object('attempt_id',v_attempt.id,'phase',p_phase,'questions',v_public_questions,
    'passing_percent',v_attempt.passing_percent,'pretest_late',v_attempt.pretest_late);
end;
$$;

create function public.rpc_assessor_exam_submit(p_attempt_id uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_attempt public.assessor_exam_attempts; v_ctx record; v_questions jsonb; v_answer jsonb;
  v_question jsonb; v_seen uuid[]:='{}'; v_id uuid; v_selected integer; v_correct integer:=0;
  v_score numeric; v_passed boolean;
begin
  if p_answers is null or jsonb_typeof(p_answers)<>'array' then raise exception 'invalid answers'; end if;
  select * into v_attempt from public.assessor_exam_attempts where id=p_attempt_id for update;
  if v_attempt.id is null or v_attempt.status<>'open' then raise exception 'exam attempt unavailable'; end if;
  select * into v_ctx from assessor_private.exam_context(v_attempt.chapter_id);
  if v_attempt.assessor_user_id<>v_ctx.actor_id or v_attempt.curriculum_version<>v_ctx.curriculum_version then
    raise exception 'exam attempt unavailable'; end if;
  if v_attempt.phase='posttest' and not assessor_private.chapter_lessons_complete(v_ctx.actor_id,v_attempt.chapter_id,v_ctx.course_id,v_ctx.required_lessons) then
    raise exception 'complete the full chapter before the posttest'; end if;
  select questions into v_questions from assessor_private.exam_snapshots where attempt_id=p_attempt_id;
  if v_questions is null or jsonb_array_length(p_answers)<>v_attempt.question_count then raise exception 'answer every question once'; end if;
  for v_answer in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(v_answer)<>'object' or (v_answer->>'question_id') is null
      or (v_answer->>'selected_option_index') is null then raise exception 'invalid answer'; end if;
    v_id:=(v_answer->>'question_id')::uuid;
    if v_id=any(v_seen) then raise exception 'duplicate question'; end if;
    v_seen:=v_seen||v_id;
    select q.value into v_question from jsonb_array_elements(v_questions) q(value) where q.value->>'id'=v_id::text;
    if v_question is null then raise exception 'question not in this attempt'; end if;
    v_selected:=(v_answer->>'selected_option_index')::integer;
    if v_selected<0 or v_selected>=jsonb_array_length(v_question->'options') then raise exception 'invalid option'; end if;
    if v_selected=(v_question->>'correct_option_index')::integer then v_correct:=v_correct+1; end if;
  end loop;
  v_score:=round(100.0*v_correct/v_attempt.question_count,1);
  v_passed:=v_attempt.phase='posttest' and v_score>=v_attempt.passing_percent;
  update public.assessor_exam_attempts set status='submitted',score_percent=v_score,passed=v_passed,
    answers=p_answers,submitted_at=now() where id=p_attempt_id;
  return jsonb_build_object('attempt_id',p_attempt_id,'score_percent',v_score,'passed',v_passed,
    'phase',v_attempt.phase,'pretest_late',v_attempt.pretest_late);
end;
$$;

-- AF-04 may call this contract to unlock orientation. Browser state is never
-- sufficient: each read rechecks the current authored lesson revisions.
create function public.rpc_assessor_candidate_exam_state(p_chapter_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_ctx record; v_pretest boolean; v_chapter boolean; v_passed boolean;
begin
  select * into v_ctx from assessor_private.exam_context(p_chapter_id);
  select exists(select 1 from public.assessor_exam_attempts a where a.assessor_user_id=v_ctx.actor_id
    and a.chapter_id=p_chapter_id and a.curriculum_version=v_ctx.curriculum_version and a.phase='pretest' and a.status='submitted') into v_pretest;
  v_chapter:=assessor_private.chapter_lessons_complete(v_ctx.actor_id,p_chapter_id,v_ctx.course_id,v_ctx.required_lessons);
  select exists(select 1 from public.assessor_exam_attempts a where a.assessor_user_id=v_ctx.actor_id
    and a.chapter_id=p_chapter_id and a.curriculum_version=v_ctx.curriculum_version and a.phase='posttest' and a.passed) into v_passed;
  return jsonb_build_object('curriculum_version',v_ctx.curriculum_version,'pretest_recorded',v_pretest,
    'chapter_complete',v_chapter,'posttest_passed',v_passed,'orientation_ready',v_pretest and v_chapter and v_passed);
end;
$$;
revoke execute on function public.rpc_assessor_exam_open(uuid,text),public.rpc_assessor_exam_submit(uuid,jsonb),public.rpc_assessor_candidate_exam_state(uuid) from public,anon;
grant execute on function public.rpc_assessor_exam_open(uuid,text),public.rpc_assessor_exam_submit(uuid,jsonb),public.rpc_assessor_candidate_exam_state(uuid) to authenticated;

-- AF-02 already has progress for early candidates. Their diagnostic is marked
-- late, while all new completions require a submitted diagnostic first.
create or replace function public.rpc_assessor_lesson_complete(p_chapter_id uuid,p_lesson_id uuid,p_revision_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid; v_key text; v_version text;
begin
  v_actor:=assessor_private.study_context(p_chapter_id,p_lesson_id,p_revision_id);
  select ch.chapter_key,r.curriculum_version into v_key,v_version from public.training_program_chapters ch
    left join assessor_private.exam_requirements r on r.chapter_key=ch.chapter_key where ch.id=p_chapter_id;
  if v_version is not null and not exists(select 1 from public.assessor_exam_attempts a where
    a.assessor_user_id=v_actor and a.chapter_id=p_chapter_id and a.curriculum_version=v_version
    and a.phase='pretest' and a.status='submitted') then raise exception 'take the diagnostic pretest before learning'; end if;
  perform 1 from public.course_modules m join public.course_lessons l on l.module_id=m.id
    where l.id=p_lesson_id for share of m;
  perform 1 from public.course_lessons where id=p_lesson_id for share;
  v_actor:=assessor_private.study_context(p_chapter_id,p_lesson_id,p_revision_id);
  insert into public.assessor_lesson_progress(assessor_user_id,chapter_id,lesson_id,revision_id)
    values(v_actor,p_chapter_id,p_lesson_id,p_revision_id) on conflict do nothing;
end;
$$;
commit;
