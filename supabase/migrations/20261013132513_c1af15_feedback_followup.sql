-- C1AF-15: separate, scoped follow-up lifecycle for Chapter 1 practice.
-- No criterion, award, cohort, cutover, or rollout flag is changed here.
begin;

create table assessor_rollout_private.practice_followups (
  id uuid primary key default gen_random_uuid(),
  source_attempt_id uuid not null unique references assessor_rollout_private.practice_attempts(id),
  program_id uuid not null references public.training_programs(id),
  chapter_id uuid not null references public.training_program_chapters(id),
  lesson_id uuid not null references public.course_lessons(id),
  criterion_id text not null,
  bhw_user_id uuid not null references public.users(id),
  created_by uuid not null references public.users(id),
  assigned_to uuid not null references public.users(id),
  action text not null check (action in ('practice','observation')),
  agreed_at timestamptz,
  status text not null default 'open' check (status in ('open','completed','cancelled')),
  completion_note text,
  retry_attempt_id uuid unique references assessor_rollout_private.practice_attempts(id),
  completed_at timestamptz,
  cancelled_at timestamptz,
  request_id uuid not null,
  request_payload jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(created_by,request_id),
  check ((status='completed') = (completed_at is not null)),
  check ((status='cancelled') = (cancelled_at is not null)),
  check (status='completed' or (retry_attempt_id is null and completion_note is null))
);
create index practice_followups_assigned_idx on assessor_rollout_private.practice_followups
  (assigned_to,status,agreed_at,created_at);
create index practice_followups_bhw_idx on assessor_rollout_private.practice_followups
  (bhw_user_id,created_at desc);
alter table assessor_rollout_private.practice_followups enable row level security;
revoke all on assessor_rollout_private.practice_followups from public,anon,authenticated;

create table assessor_rollout_private.practice_followup_events (
  id uuid primary key default gen_random_uuid(),
  followup_id uuid not null references assessor_rollout_private.practice_followups(id),
  actor_id uuid not null references public.users(id),
  request_id uuid not null,
  request_payload jsonb not null,
  event_type text not null check (event_type in ('created','changed','completed','cancelled')),
  created_at timestamptz not null default clock_timestamp(),
  unique(actor_id,request_id)
);
alter table assessor_rollout_private.practice_followup_events enable row level security;
revoke all on assessor_rollout_private.practice_followup_events from public,anon,authenticated;

create function assessor_rollout_private.practice_followup_staff_allowed(
  p_source_attempt_id uuid,p_staff_id uuid
) returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from assessor_rollout_private.practice_attempts source
    join public.users staff on staff.id=p_staff_id
    join public.users learner on learner.id=source.bhw_user_id
    join public.assessor_flow_cohorts cohort on cohort.program_id=source.program_id
      and cohort.chapter_key='chapter-1' and cohort.writes_enabled
      and cohort.authority_cutover_at is not null
    join public.assessor_flow_cohort_members member on member.cohort_id=cohort.id
      and member.user_id=learner.id
    join public.assessor_flow_cohort_members assignment on assignment.cohort_id=cohort.id
      and assignment.user_id=staff.id
    join assessor_rollout_private.chapter_awards award on award.actor_id=staff.id
      and award.chapter_id=source.chapter_id and award.status='active'
      and award.requirements_version=source.requirements_version
    join assessor_rollout_private.award_contracts contract
      on contract.requirements_version=award.requirements_version and contract.enabled
      and contract.rubric_version=source.rubric_version
    where source.id=p_source_attempt_id and staff.role='assessor' and staff.status='active'
      and learner.role='bhw' and learner.status='active'
      and public.org_unit_path(learner.org_unit_id)
        like public.org_unit_path(staff.org_unit_id)||'%'
  )
$$;

create function assessor_rollout_private.practice_followup_actor_allowed(
  p_source_attempt_id uuid,p_actor_id uuid
) returns boolean language sql stable security definer set search_path='' as $$
  select assessor_rollout_private.practice_followup_staff_allowed(
    p_source_attempt_id,p_actor_id)
    and exists (select 1 from public.feature_flags f where f.key='elearning'
      and f.enabled and not ('assessor'=any(coalesce(f.disabled_roles,'{}'::text[]))))
    and exists (select 1 from public.feature_flags f where f.key='assessor_flow_writes'
      and f.enabled and not ('assessor'=any(coalesce(f.disabled_roles,'{}'::text[]))))
    and not exists (select 1 from public.super_admin_personas p where p.persona_user_id=p_actor_id)
$$;

create function assessor_rollout_private.practice_followup_create(
  p_request_id uuid,p_source_attempt_id uuid,p_action text,p_assigned_to uuid,p_agreed_at timestamptz default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.users; attempt assessor_rollout_private.practice_attempts;
  existing assessor_rollout_private.practice_followups; payload jsonb; result_id uuid;
begin
  actor:=public.current_app_user();
  if actor.id is null or actor.role<>'assessor' or actor.status<>'active'
    or p_request_id is null or p_source_attempt_id is null or p_assigned_to is null
    or p_action not in ('practice','observation')
    then raise exception 'invalid follow-up request'; end if;
  select * into attempt from assessor_rollout_private.practice_attempts
    where id=p_source_attempt_id;
  if attempt.id is null or attempt.observer_user_id<>actor.id
    or not exists (select 1 from public.training_program_chapters ch
      join public.training_programs program on program.id=ch.program_id
      join public.course_lessons lesson on lesson.id=attempt.lesson_id
      where ch.id=attempt.chapter_id and ch.chapter_key='chapter-1'
        and program.id=attempt.program_id and program.content_key='bhw-reference-manual'
        and program.status='published' and lesson.lesson_key='communication-clarify')
    or not assessor_rollout_private.practice_followup_actor_allowed(attempt.id,actor.id)
    or not assessor_rollout_private.practice_followup_staff_allowed(attempt.id,p_assigned_to)
    then raise exception 'follow-up unavailable'; end if;
  payload:=jsonb_build_object('source',p_source_attempt_id,'action',p_action,
    'assignee',p_assigned_to,'agreedAt',p_agreed_at);
  select * into existing from assessor_rollout_private.practice_followups
    where created_by=actor.id and request_id=p_request_id;
  if existing.id is not null then
    if existing.request_payload<>payload then raise exception 'request ID reused'; end if;
    return existing.id;
  end if;
  if p_agreed_at is not null and p_agreed_at<=now()
    then raise exception 'agreed date must be in the future'; end if;
  insert into assessor_rollout_private.practice_followups
    (source_attempt_id,program_id,chapter_id,lesson_id,criterion_id,bhw_user_id,
     created_by,assigned_to,action,agreed_at,request_id,request_payload)
  values (attempt.id,attempt.program_id,attempt.chapter_id,attempt.lesson_id,
    attempt.criterion_id,attempt.bhw_user_id,actor.id,p_assigned_to,p_action,
    p_agreed_at,p_request_id,payload) returning id into result_id;
  insert into assessor_rollout_private.practice_followup_events
    (followup_id,actor_id,request_id,request_payload,event_type)
  values (result_id,actor.id,p_request_id,payload,'created');
  return result_id;
end;
$$;

create function assessor_rollout_private.practice_followup_update(
  p_request_id uuid,p_followup_id uuid,p_status text,p_assigned_to uuid,
  p_agreed_at timestamptz,p_retry_attempt_id uuid default null,p_completion_note text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.users; followup assessor_rollout_private.practice_followups;
  retry assessor_rollout_private.practice_attempts;
  previous assessor_rollout_private.practice_followup_events; payload jsonb;
begin
  actor:=public.current_app_user();
  if actor.id is null or actor.role<>'assessor' or actor.status<>'active'
    or p_request_id is null or p_followup_id is null or p_assigned_to is null
    or p_status not in ('open','completed','cancelled')
    then raise exception 'invalid follow-up change'; end if;
  select * into followup from assessor_rollout_private.practice_followups
    where id=p_followup_id for update;
  if followup.id is null or actor.id not in (followup.created_by,followup.assigned_to)
    or not assessor_rollout_private.practice_followup_actor_allowed(
      followup.source_attempt_id,actor.id)
    then raise exception 'follow-up unavailable'; end if;
  payload:=jsonb_build_object('followup',p_followup_id,'status',p_status,
    'assignee',p_assigned_to,'agreedAt',p_agreed_at,
    'retry',p_retry_attempt_id,'note',nullif(btrim(coalesce(p_completion_note,'')),''));
  select * into previous from assessor_rollout_private.practice_followup_events
    where actor_id=actor.id and request_id=p_request_id;
  if previous.id is not null then
    if previous.followup_id<>followup.id or previous.request_payload<>payload
      then raise exception 'request ID reused'; end if;
    return followup.id;
  end if;
  if followup.status<>'open' then raise exception 'follow-up already closed'; end if;
  if p_status='cancelled' then
    if p_assigned_to<>followup.assigned_to
      then raise exception 'cannot reassign a cancelled follow-up'; end if;
  elsif not assessor_rollout_private.practice_followup_staff_allowed(
    followup.source_attempt_id,p_assigned_to)
    then raise exception 'assignee unavailable'; end if;
  if p_status='open' and (p_retry_attempt_id is not null or p_completion_note is not null
    or (p_agreed_at is not null and p_agreed_at<=now()))
    then raise exception 'invalid open follow-up'; end if;
  if p_status='completed' then
    if actor.id<>followup.assigned_to then raise exception 'responsible assessor required'; end if;
    if p_assigned_to<>followup.assigned_to then raise exception 'complete before reassignment'; end if;
    if p_retry_attempt_id is not null then
      select * into retry from assessor_rollout_private.practice_attempts
        where id=p_retry_attempt_id;
      if retry.id is null or retry.id=followup.source_attempt_id
        or retry.bhw_user_id<>followup.bhw_user_id
        or retry.chapter_id<>followup.chapter_id or retry.lesson_id<>followup.lesson_id
        or retry.criterion_id<>followup.criterion_id
        or retry.observer_user_id<>followup.assigned_to
        or retry.recorded_at<followup.created_at
        then raise exception 'retry evidence unavailable'; end if;
    elsif length(btrim(coalesce(p_completion_note,''))) not between 5 and 1000
      then raise exception 'completion note required'; end if;
  elsif p_retry_attempt_id is not null or p_completion_note is not null
    then raise exception 'completion details unavailable'; end if;
  update assessor_rollout_private.practice_followups set
    assigned_to=p_assigned_to,agreed_at=p_agreed_at,status=p_status,
    retry_attempt_id=p_retry_attempt_id,
    completion_note=case when p_status='completed' then nullif(btrim(p_completion_note),'') else null end,
    completed_at=case when p_status='completed' then clock_timestamp() else null end,
    cancelled_at=case when p_status='cancelled' then clock_timestamp() else null end,
    updated_at=clock_timestamp()
    where id=followup.id;
  insert into assessor_rollout_private.practice_followup_events
    (followup_id,actor_id,request_id,request_payload,event_type)
  values (followup.id,actor.id,p_request_id,payload,
    case when p_status='completed' then 'completed'
      when p_status='cancelled' then 'cancelled' else 'changed' end);
  return followup.id;
end;
$$;

create function assessor_rollout_private.practice_followup_state(
  p_program_id uuid,p_bhw_user_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor public.users; staff jsonb; plans jsonb;
begin
  actor:=public.current_app_user();
  if actor.id is null or actor.role<>'assessor' or actor.status<>'active'
    or exists(select 1 from public.super_admin_personas p where p.persona_user_id=actor.id)
    or not exists(select 1 from public.feature_flags f where f.key='assessor_flow_ui'
      and f.enabled and not ('assessor'=any(coalesce(f.disabled_roles,'{}'::text[]))))
    or not exists(select 1 from public.assessor_flow_cohorts cohort
      join public.assessor_flow_cohort_members member on member.cohort_id=cohort.id
      where cohort.program_id=p_program_id and cohort.chapter_key='chapter-1'
        and cohort.ui_enabled and member.user_id=actor.id)
    then raise exception 'not authorized'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.full_name)
    order by s.full_name),'[]'::jsonb) into staff from (
      select distinct u.id,u.full_name from public.users u
      join public.assessor_flow_cohort_members member on member.user_id=u.id
      join public.assessor_flow_cohorts cohort on cohort.id=member.cohort_id
      join public.training_program_chapters chapter on chapter.program_id=cohort.program_id
        and chapter.chapter_key='chapter-1'
      join assessor_rollout_private.chapter_awards award on award.actor_id=u.id
        and award.chapter_id=chapter.id and award.status='active'
      join assessor_rollout_private.award_contracts contract
        on contract.requirements_version=award.requirements_version and contract.enabled
      where cohort.program_id=p_program_id and cohort.chapter_key='chapter-1'
        and u.role='assessor' and u.status='active'
        and (p_bhw_user_id is null or exists (
          select 1 from public.users learner
          join public.assessor_flow_cohort_members learner_member
            on learner_member.user_id=learner.id and learner_member.cohort_id=cohort.id
          where learner.id=p_bhw_user_id and learner.role='bhw' and learner.status='active'
            and public.org_unit_path(learner.org_unit_id)
              like public.org_unit_path(u.org_unit_id)||'%'))
      order by u.full_name limit 100
    ) s;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'sourceAttemptId',p.source_attempt_id,
    'learnerId',p.bhw_user_id,'learnerName',learner.full_name,'lessonId',p.lesson_id,
    'criterionId',p.criterion_id,'action',p.action,'assignedTo',p.assigned_to,
    'assignedName',staff_user.full_name,'agreedAt',p.agreed_at,'status',p.status,
    'retryAttemptId',p.retry_attempt_id,'completionNote',p.completion_note,
    'createdAt',p.created_at,'updatedAt',p.updated_at)
    order by p.created_at desc),'[]'::jsonb) into plans
  from (select * from assessor_rollout_private.practice_followups p
    where p.program_id=p_program_id and (p.created_by=actor.id or p.assigned_to=actor.id)
      and (p_bhw_user_id is null or p.bhw_user_id=p_bhw_user_id)
      and public.org_unit_path((select u.org_unit_id from public.users u where u.id=p.bhw_user_id))
        like public.current_org_path()||'%'
    order by p.created_at desc limit 50) p
  join public.users learner on learner.id=p.bhw_user_id
  join public.users staff_user on staff_user.id=p.assigned_to;
  return jsonb_build_object('staff',staff,'followups',plans);
end;
$$;

create function assessor_rollout_private.practice_feedback_summary(p_program_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor public.users; result jsonb;
begin
  actor:=public.current_app_user();
  if actor.id is null or actor.role<>'bhw' or actor.status<>'active'
    or not exists(select 1 from public.training_programs program
      join public.training_program_chapters chapter on chapter.program_id=program.id
      where program.id=p_program_id and program.content_key='bhw-reference-manual'
        and program.status='published' and chapter.chapter_key='chapter-1'
        and chapter.availability='available')
    then raise exception 'not authorized'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'lessonId',a.lesson_id,
    'criterionId',a.criterion_id,'feedback',a.feedback,'nextStep',a.next_step,
    'releasedAt',a.feedback_released_at,'sufficiency',a.sufficiency,
    'followup',case when f.id is null then null else jsonb_build_object(
      'action',f.action,'assignedName',staff.full_name,'agreedAt',f.agreed_at,
      'status',f.status,'completedAt',f.completed_at) end)
    order by a.feedback_released_at desc,a.id desc),'[]'::jsonb) into result
  from (select * from assessor_rollout_private.practice_attempts a
    where a.bhw_user_id=actor.id and a.program_id=p_program_id
      and a.feedback_released_at is not null
    order by a.feedback_released_at desc,a.id desc limit 20) a
  left join assessor_rollout_private.practice_followups f on f.source_attempt_id=a.id
  left join public.users staff on staff.id=f.assigned_to;
  return result;
end;
$$;

-- A released attempt produces one personal notification. The existing bell
-- respects its feature flag; the learner's feedback page remains available.
alter table public.notifications drop constraint notifications_notification_type_check;
alter table public.notifications add constraint notifications_notification_type_check check
  (notification_type in ('announcement.created','survey.published','course.published',
    'assessment.decided','forum.reply','flipchart.reviewed','user.transferred',
    'course_session.enrolled','feedback.reply','practice.feedback_released'));
create unique index practice_feedback_notification_once on public.notifications
  (recipient_user_id,subject_id) where notification_type='practice.feedback_released';
create function assessor_rollout_private.notify_released_practice() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.feedback_released_at is not null then
    insert into public.notifications (recipient_user_id,notification_type,subject_type,subject_id,
      title_fil,title_en,body_fil,body_en,link_path)
    values (new.bhw_user_id,'practice.feedback_released','practice_attempt',new.id,
      'Bagong feedback sa pagsasanay','New practice feedback',
      'May ibinahaging feedback at susunod na hakbang para sa iyong pagsasanay.',
      'Feedback and a next step were shared for your practice.',
      '/training/'||new.program_id::text||'/practice-feedback')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger notify_released_practice after insert on assessor_rollout_private.practice_attempts
  for each row execute function assessor_rollout_private.notify_released_practice();

create function public.rpc_assessor_practice_followup_create(
  p_request_id uuid,p_source_attempt_id uuid,p_action text,p_assigned_to uuid,p_agreed_at timestamptz default null
) returns uuid language sql security invoker set search_path='' as $$
  select assessor_rollout_private.practice_followup_create(
    p_request_id,p_source_attempt_id,p_action,p_assigned_to,p_agreed_at)
$$;
create function public.rpc_assessor_practice_followup_update(
  p_request_id uuid,p_followup_id uuid,p_status text,p_assigned_to uuid,
  p_agreed_at timestamptz,p_retry_attempt_id uuid default null,p_completion_note text default null
) returns uuid language sql security invoker set search_path='' as $$
  select assessor_rollout_private.practice_followup_update(
    p_request_id,p_followup_id,p_status,p_assigned_to,p_agreed_at,
    p_retry_attempt_id,p_completion_note)
$$;
create function public.rpc_assessor_practice_followup_state(
  p_program_id uuid,p_bhw_user_id uuid default null
) returns jsonb language sql stable security invoker set search_path='' as $$
  select assessor_rollout_private.practice_followup_state(p_program_id,p_bhw_user_id)
$$;
create function public.rpc_bhw_practice_feedback(p_program_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select assessor_rollout_private.practice_feedback_summary(p_program_id)
$$;

revoke execute on function
  assessor_rollout_private.practice_followup_staff_allowed(uuid,uuid),
  assessor_rollout_private.practice_followup_actor_allowed(uuid,uuid),
  assessor_rollout_private.practice_followup_create(uuid,uuid,text,uuid,timestamptz),
  assessor_rollout_private.practice_followup_update(uuid,uuid,text,uuid,timestamptz,uuid,text),
  assessor_rollout_private.practice_followup_state(uuid,uuid),
  assessor_rollout_private.practice_feedback_summary(uuid),
  assessor_rollout_private.notify_released_practice(),
  public.rpc_assessor_practice_followup_create(uuid,uuid,text,uuid,timestamptz),
  public.rpc_assessor_practice_followup_update(uuid,uuid,text,uuid,timestamptz,uuid,text),
  public.rpc_assessor_practice_followup_state(uuid,uuid),
  public.rpc_bhw_practice_feedback(uuid)
  from public,anon,authenticated;
grant execute on function
  assessor_rollout_private.practice_followup_create(uuid,uuid,text,uuid,timestamptz),
  assessor_rollout_private.practice_followup_update(uuid,uuid,text,uuid,timestamptz,uuid,text),
  assessor_rollout_private.practice_followup_state(uuid,uuid),
  assessor_rollout_private.practice_feedback_summary(uuid),
  public.rpc_assessor_practice_followup_create(uuid,uuid,text,uuid,timestamptz),
  public.rpc_assessor_practice_followup_update(uuid,uuid,text,uuid,timestamptz,uuid,text),
  public.rpc_assessor_practice_followup_state(uuid,uuid),
  public.rpc_bhw_practice_feedback(uuid)
  to authenticated;
commit;
