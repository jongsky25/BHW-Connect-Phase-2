-- Gabay's observed role-play is opt-in. Existing course assessments keep their
-- original decision flow. Each retry is a new assessment row, preserving history.
alter table public.courses
  add column assessment_kind text not null default 'standard'
  check (assessment_kind in ('standard', 'gabay_roleplay'));
alter table public.courses add column opening_diagnostic jsonb;
alter table public.course_quiz_questions
  add column rationale_fil text not null default '',
  add column rationale_en text not null default '';

-- Learners receive answer choices, never the answer key. The scoring RPC
-- still reads the base table under its own authorization checks.
drop policy if exists course_quiz_questions_read on public.course_quiz_questions;
create policy course_quiz_questions_read on public.course_quiz_questions for select using (
  (select public.current_app_user()).role = 'admin' and exists (
    select 1 from public.course_modules m join public.courses c on c.id = m.course_id
    where m.id = course_quiz_questions.module_id
      and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%'
  )
);
create view public.course_quiz_questions_public with (security_barrier = true) as
  select q.id,q.module_id,q.position,q.prompt_fil,q.prompt_en,q.options
  from public.course_quiz_questions q
  join public.course_modules m on m.id = q.module_id
  join public.courses c on c.id = m.course_id
  where c.status = 'published'
    and (
      ((select public.current_app_user()).role = 'bhw'
        and (select public.current_org_path()) like (select public.org_unit_path(c.org_unit_id)) || '%')
      or ((select public.current_app_user()).role = 'admin'
        and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%')
    );
revoke all on public.course_quiz_questions_public from public, anon;
grant select on public.course_quiz_questions_public to authenticated;

create view public.course_quiz_review with (security_barrier = true) as
  select q.id,q.module_id,q.position,q.prompt_fil,q.prompt_en,q.options,
    q.correct_option_index,q.rationale_fil,q.rationale_en
  from public.course_quiz_questions q
  join public.course_modules m on m.id = q.module_id
  join public.courses c on c.id = m.course_id
  join public.course_progress cp on cp.course_id = c.id
  join public.course_module_progress mp on mp.course_progress_id = cp.id and mp.module_id = m.id
  where c.assessment_kind = 'gabay_roleplay' and c.status = 'published'
    and cp.bhw_user_id = (select public.current_app_user()).id
    and (mp.completed_at is not null or mp.quiz_attempts >= c.quiz_max_attempts);
revoke all on public.course_quiz_review from public, anon;
grant select on public.course_quiz_review to authenticated;

-- The original scoring RPC counted repeated question IDs as repeated correct
-- answers. Require one answer for every question before an attempt is spent.
alter function public.rpc_course_quiz_submit(uuid,uuid,jsonb) rename to rpc_course_quiz_submit_unchecked;
revoke execute on function public.rpc_course_quiz_submit_unchecked(uuid,uuid,jsonb) from public,anon,authenticated;
create function public.rpc_course_quiz_submit(p_course_id uuid,p_module_id uuid,p_answers jsonb)
returns table (passed boolean, score_percent integer, attempts_used integer, max_attempts integer)
language plpgsql security definer set search_path = public as $$
declare v_expected integer; v_matched integer; v_distinct integer;
begin
  if jsonb_typeof(p_answers) <> 'array' or p_answers is null then raise exception 'invalid question'; end if;
  select count(*) into v_expected from public.course_quiz_questions where module_id = p_module_id;
  if jsonb_array_length(p_answers) <> v_expected then raise exception 'invalid question'; end if;
  select count(q.id),count(distinct q.id) into v_matched,v_distinct
    from jsonb_array_elements(p_answers) a
    left join public.course_quiz_questions q on q.id = (a ->> 'question_id')::uuid and q.module_id = p_module_id;
  if v_matched <> v_expected or v_distinct <> v_expected then raise exception 'invalid question'; end if;
  return query select * from public.rpc_course_quiz_submit_unchecked(p_course_id,p_module_id,p_answers);
end;
$$;
revoke execute on function public.rpc_course_quiz_submit(uuid,uuid,jsonb) from public,anon;
grant execute on function public.rpc_course_quiz_submit(uuid,uuid,jsonb) to authenticated;

alter table public.assessments
  add column scenario_id text,
  add column scenario_version text,
  add column attempt_number integer not null default 1 check (attempt_number >= 1),
  add column observation jsonb,
  add column prompt_used boolean,
  add column practice_advice text;

alter table public.assessments
  add constraint gabay_observation_shape check (
    observation is null or
    (jsonb_typeof(observation) = 'object' and
     observation ?& array['ask_sort','explain','stay_in_role','direct','flipchart','teach_back'])
  );

-- This also closes the legacy decision RPC for Gabay: it cannot mark a
-- role-play passed or failed unless the observation was saved first.
create or replace function public.gabay_assessment_guard()
returns trigger language plpgsql set search_path = public as $$
declare v_key text; v_all_observed boolean := true;
begin
  if new.status not in ('passed','failed') or old.status = new.status then return new; end if;
  if not exists (select 1 from public.courses where id = new.course_id and assessment_kind = 'gabay_roleplay') then return new; end if;
  if new.scenario_id not in ('R1','R2','R3','R4') or new.scenario_id is null
    or new.observation is null or nullif(trim(new.notes),'') is null then
    raise exception 'Gabay observation required';
  end if;
  foreach v_key in array array['ask_sort','explain','stay_in_role','direct','flipchart','teach_back'] loop
    if new.observation ->> v_key not in ('observed','needs_practice','not_seen')
      or new.observation ->> v_key is null then raise exception 'all six indicators required'; end if;
    if new.observation ->> v_key <> 'observed' then v_all_observed := false; end if;
  end loop;
  if (new.status = 'passed') <> v_all_observed then raise exception 'rubric does not match decision'; end if;
  if not v_all_observed and nullif(trim(coalesce(new.practice_advice,'')),'') is null then
    raise exception 'practice advice required';
  end if;
  return new;
end;
$$;
create trigger gabay_assessment_guard before update of status on public.assessments
  for each row execute function public.gabay_assessment_guard();

create or replace function public.rpc_gabay_assessment_decide(
  p_assessment_id uuid, p_scenario_id text, p_observation jsonb,
  p_prompt_used boolean, p_evidence text, p_practice_advice text
)
returns table (certificate_id uuid, verification_code text)
language plpgsql security definer set search_path = public as $$
declare
  v_actor public.users;
  v_assessment public.assessments;
  v_key text;
  v_rating text;
  v_passed boolean := true;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role <> 'assessor' then raise exception 'not authorized'; end if;
  select * into v_assessment from public.assessments where id = p_assessment_id for update;
  if v_assessment is null then raise exception 'assessment not found'; end if;
  if v_assessment.status <> 'assigned' or v_assessment.assessor_user_id <> v_actor.id then
    raise exception 'not authorized';
  end if;
  if not exists (select 1 from public.courses where id = v_assessment.course_id and assessment_kind = 'gabay_roleplay') then
    raise exception 'wrong assessment kind';
  end if;
  if p_scenario_id not in ('R1','R2','R3','R4') then raise exception 'invalid scenario'; end if;
  if p_scenario_id = (
    select scenario_id from public.assessments
    where course_id = v_assessment.course_id and bhw_user_id = v_assessment.bhw_user_id
      and id <> p_assessment_id and status = 'failed'
    order by decided_at desc limit 1
  ) then raise exception 'use a different scenario for retry'; end if;
  if jsonb_typeof(p_observation) <> 'object' then
    raise exception 'all six indicators required';
  end if;
  foreach v_key in array array['ask_sort','explain','stay_in_role','direct','flipchart','teach_back'] loop
    v_rating := p_observation ->> v_key;
    if v_rating not in ('observed','needs_practice','not_seen') or v_rating is null then
      raise exception 'all six indicators required';
    end if;
    if v_rating <> 'observed' then v_passed := false; end if;
  end loop;
  if nullif(trim(coalesce(p_evidence,'')),'') is null then raise exception 'observed evidence required'; end if;
  if not v_passed and nullif(trim(coalesce(p_practice_advice,'')),'') is null then
    raise exception 'practice advice required';
  end if;

  update public.assessments set scenario_id = p_scenario_id,
    scenario_version = 'p1-2026-09-29',
    observation = p_observation, prompt_used = coalesce(p_prompt_used,false),
    practice_advice = coalesce(p_practice_advice,'') where id = p_assessment_id;
  -- The existing RPC enforces assessor ownership, issues the certificate,
  -- updates progress, and writes the audit and notification in this transaction.
  return query select * from public.rpc_assessment_decide(p_assessment_id, v_passed, p_evidence);
end;
$$;

create or replace function public.rpc_gabay_assessment_retry(p_course_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_actor public.users;
  v_progress public.course_progress;
  v_new_id uuid;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role <> 'bhw' then raise exception 'not authorized'; end if;
  if not exists (select 1 from public.courses where id = p_course_id and assessment_kind = 'gabay_roleplay' and status = 'published') then
    raise exception 'wrong assessment kind';
  end if;
  select * into v_progress from public.course_progress
    where course_id = p_course_id and bhw_user_id = v_actor.id for update;
  if v_progress is null or v_progress.status <> 'failed_assessment' then
    raise exception 'no failed assessment to retry';
  end if;
  if exists (select 1 from public.assessments where course_id = p_course_id
    and bhw_user_id = v_actor.id and status in ('pending','assigned','passed')) then
    raise exception 'assessment already active';
  end if;
  insert into public.assessments (course_id,bhw_user_id,org_unit_id,attempt_number)
    select p_course_id,v_actor.id,v_actor.org_unit_id,coalesce(max(a.attempt_number),0)+1
    from public.assessments a where a.course_id = p_course_id and a.bhw_user_id = v_actor.id
    returning id into v_new_id;
  update public.course_progress set status = 'content_completed' where id = v_progress.id;
  insert into public.audit_events (actor_user_id,event_type,subject_type,subject_id,plain_summary_fil,plain_summary_en)
    values (v_actor.id,'assessment.retry_requested','assessment',v_new_id,
      'Humiling ang BHW ng muling pagtatasa sa Gabay sa PhilHealth.',
      'BHW requested a Gabay sa PhilHealth reassessment.');
  return v_new_id;
end;
$$;

revoke execute on function public.rpc_gabay_assessment_decide(uuid,text,jsonb,boolean,text,text) from public,anon;
revoke execute on function public.rpc_gabay_assessment_retry(uuid) from public,anon;
grant execute on function public.rpc_gabay_assessment_decide(uuid,text,jsonb,boolean,text,text) to authenticated;
grant execute on function public.rpc_gabay_assessment_retry(uuid) to authenticated;
