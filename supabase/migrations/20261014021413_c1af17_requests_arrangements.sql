-- C1AF-17: explicit requests and arrangements. No rollout control or reviewed
-- contract is seeded or enabled by this migration.
begin;

alter table assessor_rollout_private.component_requirements
  add column purpose_fil text not null check (length(btrim(purpose_fil)) between 10 and 1000),
  add column purpose_en text not null check (length(btrim(purpose_en)) between 10 and 1000);
alter table assessor_rollout_private.component_required_criteria
  add column description_fil text not null check (length(btrim(description_fil)) between 5 and 1000),
  add column description_en text not null check (length(btrim(description_en)) between 5 and 1000);

create table assessor_rollout_private.component_requests (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id),
  chapter_id uuid not null references public.training_program_chapters(id),
  module_id uuid not null references public.course_modules(id),
  bhw_user_id uuid not null references public.users(id),
  requested_by uuid not null references public.users(id),
  request_key uuid not null,
  request_payload jsonb not null,
  requirements_version text not null,
  rubric_version text not null,
  purpose_fil text not null,
  purpose_en text not null,
  criteria_snapshot jsonb not null check (jsonb_typeof(criteria_snapshot)='array'),
  status text not null default 'pending'
    check (status in ('pending','assigned','arranged','cancelled','released')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(requested_by,request_key)
);
create unique index component_request_one_open
  on assessor_rollout_private.component_requests(module_id,bhw_user_id)
  where status in ('pending','assigned','arranged');
create index component_requests_queue on assessor_rollout_private.component_requests
  (program_id,status,created_at desc);
create index component_requests_bhw on assessor_rollout_private.component_requests
  (bhw_user_id,created_at desc);
alter table assessor_rollout_private.component_requests enable row level security;
revoke all on assessor_rollout_private.component_requests from public,anon,authenticated;

alter table assessor_rollout_private.component_assignments
  add column request_id uuid references assessor_rollout_private.component_requests(id),
  add column agreed_at timestamptz,
  add column location text check (location is null or length(btrim(location)) between 3 and 200),
  add column arrangement_note text check (arrangement_note is null or length(btrim(arrangement_note)) between 3 and 1000),
  add column updated_at timestamptz not null default clock_timestamp();
create index component_assignments_request_idx on assessor_rollout_private.component_assignments
  (request_id,status);

create table assessor_rollout_private.component_request_events (
  id uuid primary key default gen_random_uuid(),
  component_request_id uuid not null references assessor_rollout_private.component_requests(id),
  actor_id uuid not null references public.users(id),
  request_key uuid not null,
  request_payload jsonb not null,
  event_type text not null check (event_type in ('claimed','arranged','rescheduled','cancelled','released')),
  created_at timestamptz not null default clock_timestamp(),
  unique(actor_id,request_key)
);
alter table assessor_rollout_private.component_request_events enable row level security;
revoke all on assessor_rollout_private.component_request_events from public,anon,authenticated;

create function assessor_rollout_private.component_request_scope(
  p_program_id uuid,p_bhw_user_id uuid,p_actor_id uuid
) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.users actor
    join public.users learner on learner.id=p_bhw_user_id
    join public.assessor_flow_cohorts cohort on cohort.program_id=p_program_id
      and cohort.chapter_key='chapter-1' and cohort.ui_enabled and cohort.writes_enabled
      and cohort.authority_cutover_at is not null
    join public.assessor_flow_cohort_members am on am.cohort_id=cohort.id and am.user_id=actor.id
    join public.assessor_flow_cohort_members lm on lm.cohort_id=cohort.id and lm.user_id=learner.id
    join public.training_programs program on program.id=p_program_id
      and program.content_key='bhw-reference-manual' and program.status='published'
    where actor.id=p_actor_id and actor.role='assessor' and actor.status='active'
      and learner.role='bhw' and learner.status='active'
      and public.org_unit_path(learner.org_unit_id)
        like public.org_unit_path(actor.org_unit_id)||'%'
      and not exists(select 1 from public.super_admin_personas s where s.persona_user_id=actor.id)
      and exists(select 1 from public.feature_flags f where f.key='elearning'
        and f.enabled and not ('assessor'=any(coalesce(f.disabled_roles,'{}'::text[]))))
      and exists(select 1 from public.feature_flags f where f.key='assessor_flow_ui'
        and f.enabled and not ('assessor'=any(coalesce(f.disabled_roles,'{}'::text[]))))
      and exists(select 1 from public.feature_flags f where f.key='assessor_flow_writes'
        and f.enabled and not ('assessor'=any(coalesce(f.disabled_roles,'{}'::text[])))))
$$;

create function assessor_rollout_private.component_request_ready(
  p_program_id uuid,p_bhw_user_id uuid,p_module_id uuid
) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from jsonb_array_elements(
    assessor_rollout_private.component_readiness(p_program_id,p_bhw_user_id)) item
    where (item->>'moduleId')::uuid=p_module_id and (item->>'canArrange')::boolean)
$$;

create function assessor_rollout_private.component_request_create(
  p_key uuid,p_program_id uuid,p_bhw_user_id uuid,p_module_id uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.users; previous assessor_rollout_private.component_requests;
  requirement assessor_rollout_private.component_requirements; v_chapter_id uuid;
  payload jsonb; result_id uuid; criteria jsonb;
begin
  actor:=public.current_app_user();
  if actor.id is null or p_key is null or p_program_id is null
    or p_bhw_user_id is null or p_module_id is null
    or not assessor_rollout_private.component_request_ready(p_program_id,p_bhw_user_id,p_module_id)
    then raise exception 'request unavailable'; end if;
  select ch.id into v_chapter_id from public.training_program_chapters ch
    where ch.program_id=p_program_id and ch.chapter_key='chapter-1' and ch.availability='available';
  select * into requirement from assessor_rollout_private.component_requirements r
    where r.module_id=p_module_id and r.chapter_id=v_chapter_id and r.enabled;
  if requirement.module_id is null then raise exception 'contract unavailable'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('fil',c.description_fil,'en',c.description_en)
    order by c.criterion_id),'[]'::jsonb) into criteria
    from assessor_rollout_private.component_required_criteria c where c.module_id=p_module_id;
  payload:=jsonb_build_object('program',p_program_id,'learner',p_bhw_user_id,'module',p_module_id);
  select * into previous from assessor_rollout_private.component_requests
    where requested_by=actor.id and request_key=p_key;
  if previous.id is not null then
    if previous.request_payload<>payload then raise exception 'request key reused'; end if;
    return previous.id;
  end if;
  insert into assessor_rollout_private.component_requests
    (program_id,chapter_id,module_id,bhw_user_id,requested_by,request_key,request_payload,
      requirements_version,rubric_version,purpose_fil,purpose_en,criteria_snapshot)
  values (p_program_id,v_chapter_id,p_module_id,p_bhw_user_id,actor.id,p_key,payload,
    requirement.requirements_version,requirement.rubric_version,
    requirement.purpose_fil,requirement.purpose_en,criteria)
  on conflict do nothing returning id into result_id;
  if result_id is not null then return result_id; end if;
  select * into previous from assessor_rollout_private.component_requests
    where requested_by=actor.id and request_key=p_key;
  if previous.id is not null then
    if previous.request_payload<>payload then raise exception 'request key reused'; end if;
    return previous.id;
  end if;
  select id into result_id from assessor_rollout_private.component_requests
    where module_id=p_module_id and bhw_user_id=p_bhw_user_id
      and status in ('pending','assigned','arranged');
  if result_id is null then raise exception 'request unavailable'; end if;
  return result_id;
end;
$$;

create function assessor_rollout_private.component_request_claim(p_key uuid,p_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.users; request assessor_rollout_private.component_requests;
  previous assessor_rollout_private.component_request_events; payload jsonb;
begin
  actor:=public.current_app_user();
  if actor.id is null or p_key is null or p_request_id is null
    then raise exception 'claim unavailable'; end if;
  select * into request from assessor_rollout_private.component_requests where id=p_request_id for update;
  if request.id is null or not assessor_rollout_private.component_request_scope(
    request.program_id,request.bhw_user_id,actor.id)
    then raise exception 'claim unavailable'; end if;
  payload:=jsonb_build_object('request',p_request_id,'action','claim');
  select * into previous from assessor_rollout_private.component_request_events
    where actor_id=actor.id and request_key=p_key;
  if previous.id is not null then
    if previous.component_request_id<>request.id or previous.request_payload<>payload
      then raise exception 'request key reused'; end if;
    return request.id;
  end if;
  if request.status<>'pending' or not exists(
    select 1 from assessor_rollout_private.component_requirements c
      where c.module_id=request.module_id and c.enabled
        and c.requirements_version=request.requirements_version
        and c.rubric_version=request.rubric_version)
    or not assessor_rollout_private.component_request_ready(
    request.program_id,request.bhw_user_id,request.module_id)
    then raise exception 'claim unavailable'; end if;
  insert into assessor_rollout_private.component_assignments
    (module_id,bhw_user_id,assessor_user_id,status,request_id)
    values (request.module_id,request.bhw_user_id,actor.id,'active',request.id);
  update assessor_rollout_private.component_requests set status='assigned',updated_at=clock_timestamp()
    where id=request.id;
  insert into assessor_rollout_private.component_request_events
    (component_request_id,actor_id,request_key,request_payload,event_type)
    values(request.id,actor.id,p_key,payload,'claimed');
  return request.id;
end;
$$;

create function assessor_rollout_private.component_arrangement_set(
  p_key uuid,p_request_id uuid,p_agreed_at timestamptz,p_location text,p_note text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.users; request assessor_rollout_private.component_requests;
  assignment assessor_rollout_private.component_assignments;
  previous assessor_rollout_private.component_request_events; payload jsonb; event_kind text;
begin
  actor:=public.current_app_user();
  if actor.id is null or p_key is null or p_request_id is null
    or p_agreed_at is null or p_agreed_at<=now()
    or length(btrim(coalesce(p_location,''))) not between 3 and 200
    or (p_note is not null and length(btrim(p_note)) not between 3 and 1000)
    then raise exception 'arrangement unavailable'; end if;
  select * into request from assessor_rollout_private.component_requests where id=p_request_id for update;
  select * into assignment from assessor_rollout_private.component_assignments
    where request_id=request.id and status='active' for update;
  if request.id is null or assignment.id is null or assignment.assessor_user_id<>actor.id
    or not assessor_rollout_private.component_request_scope(request.program_id,request.bhw_user_id,actor.id)
    then raise exception 'arrangement unavailable'; end if;
  payload:=jsonb_build_object('request',p_request_id,'agreedAt',p_agreed_at,
    'location',btrim(p_location),'note',nullif(btrim(coalesce(p_note,'')),''));
  select * into previous from assessor_rollout_private.component_request_events
    where actor_id=actor.id and request_key=p_key;
  if previous.id is not null then
    if previous.component_request_id<>request.id or previous.request_payload<>payload
      then raise exception 'request key reused'; end if;
    return request.id;
  end if;
  if request.status not in ('assigned','arranged')
    or not exists(select 1 from assessor_rollout_private.component_requirements c
      where c.module_id=request.module_id and c.enabled
        and c.requirements_version=request.requirements_version
        and c.rubric_version=request.rubric_version)
    or not assessor_rollout_private.component_request_ready(
      request.program_id,request.bhw_user_id,request.module_id)
    then raise exception 'arrangement unavailable'; end if;
  event_kind:=case when request.status='arranged' then 'rescheduled' else 'arranged' end;
  update assessor_rollout_private.component_assignments set
    agreed_at=p_agreed_at,location=btrim(p_location),
    arrangement_note=nullif(btrim(coalesce(p_note,'')),''),updated_at=clock_timestamp()
    where id=assignment.id;
  update assessor_rollout_private.component_requests set status='arranged',updated_at=clock_timestamp()
    where id=request.id;
  insert into assessor_rollout_private.component_request_events
    (component_request_id,actor_id,request_key,request_payload,event_type)
    values(request.id,actor.id,p_key,payload,event_kind);
  return request.id;
end;
$$;

create function assessor_rollout_private.component_request_close(
  p_key uuid,p_request_id uuid,p_action text
) returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.users; request assessor_rollout_private.component_requests;
  assignment assessor_rollout_private.component_assignments;
  previous assessor_rollout_private.component_request_events; payload jsonb;
begin
  actor:=public.current_app_user();
  if actor.id is null or p_key is null or p_request_id is null or p_action not in ('cancel','release')
    then raise exception 'close unavailable'; end if;
  select * into request from assessor_rollout_private.component_requests where id=p_request_id for update;
  if request.id is null or not assessor_rollout_private.component_request_scope(
    request.program_id,request.bhw_user_id,actor.id)
    then raise exception 'close unavailable'; end if;
  payload:=jsonb_build_object('request',p_request_id,'action',p_action);
  select * into previous from assessor_rollout_private.component_request_events
    where actor_id=actor.id and request_key=p_key;
  if previous.id is not null then
    if previous.component_request_id<>request.id or previous.request_payload<>payload
      then raise exception 'request key reused'; end if;
    return request.id;
  end if;
  select * into assignment from assessor_rollout_private.component_assignments
    where request_id=request.id and status='active' for update;
  if request.status='pending' then
    if p_action<>'cancel' or request.requested_by<>actor.id then raise exception 'close unavailable'; end if;
  elsif request.status in ('assigned','arranged') and assignment.id is not null then
    if actor.id<>assignment.assessor_user_id and not (p_action='release'
      and exists(select 1 from public.users assigned
        where assigned.id=assignment.assessor_user_id and assigned.status<>'active')
      and exists(select 1 from assessor_rollout_private.chapter_awards award
        join assessor_rollout_private.award_contracts contract
          on contract.requirements_version=award.requirements_version and contract.enabled
        where award.actor_id=actor.id and award.chapter_id=request.chapter_id
          and award.status='active' and award.requirements_version=request.requirements_version
          and contract.rubric_version=request.rubric_version))
      then raise exception 'close unavailable'; end if;
    update assessor_rollout_private.component_assignments set
      status=case when p_action='cancel' then 'cancelled' else 'released' end,
      updated_at=clock_timestamp() where id=assignment.id;
  else raise exception 'close unavailable'; end if;
  update assessor_rollout_private.component_requests set
    status=case when p_action='cancel' then 'cancelled' else 'pending' end,
    updated_at=clock_timestamp() where id=request.id;
  insert into assessor_rollout_private.component_request_events
    (component_request_id,actor_id,request_key,request_payload,event_type)
    values(request.id,actor.id,p_key,payload,
      case when p_action='cancel' then 'cancelled' else 'released' end);
  return request.id;
end;
$$;

create function assessor_rollout_private.component_request_queue(p_program_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor public.users; result jsonb;
begin
  actor:=public.current_app_user();
  if actor.id is null or actor.role<>'assessor' or actor.status<>'active'
    or exists(select 1 from public.super_admin_personas s where s.persona_user_id=actor.id)
    or not exists(select 1 from public.feature_flags f where f.key='elearning'
      and f.enabled and not ('assessor'=any(coalesce(f.disabled_roles,'{}'::text[]))))
    or not exists(select 1 from public.feature_flags f where f.key='assessor_flow_ui'
      and f.enabled and not ('assessor'=any(coalesce(f.disabled_roles,'{}'::text[]))))
    or not exists(select 1 from public.assessor_flow_cohorts c
      join public.assessor_flow_cohort_members m on m.cohort_id=c.id and m.user_id=actor.id
      where c.program_id=p_program_id and c.chapter_key='chapter-1' and c.ui_enabled)
    or not exists(select 1 from public.training_programs p where p.id=p_program_id
      and p.content_key='bhw-reference-manual' and p.status='published')
    then raise exception 'not authorized'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'moduleId',q.module_id,
    'moduleTitleFil',q.title_fil,'moduleTitleEn',q.title_en,
    'learnerName',q.full_name,'status',q.status,'agreedAt',q.agreed_at,
    'location',q.location,'assignedToMe',q.assessor_user_id=actor.id,
    'requestedByMe',q.requested_by=actor.id,
    'assignedUnavailable',q.assessor_user_id is not null and q.assessor_status<>'active')
    order by q.created_at desc),'[]'::jsonb) into result from (
    select r.*,module.title_fil,module.title_en,learner.full_name,
      a.agreed_at,a.location,a.assessor_user_id,assigned.status assessor_status
    from assessor_rollout_private.component_requests r
    join public.course_modules module on module.id=r.module_id
    join public.users learner on learner.id=r.bhw_user_id and learner.role='bhw'
    left join assessor_rollout_private.component_assignments a on a.request_id=r.id and a.status='active'
    left join public.users assigned on assigned.id=a.assessor_user_id
    where r.program_id=p_program_id and r.status in ('pending','assigned','arranged')
      and learner.status='active'
      and exists(select 1 from public.assessor_flow_cohorts c
        join public.assessor_flow_cohort_members m on m.cohort_id=c.id
        where c.program_id=r.program_id and c.chapter_key='chapter-1'
          and c.ui_enabled and m.user_id=learner.id)
      and public.org_unit_path(learner.org_unit_id)
        like public.org_unit_path(actor.org_unit_id)||'%'
      and (r.status='pending' or a.assessor_user_id=actor.id or assigned.status<>'active')
    order by r.created_at desc limit 50
  ) q;
  return result;
end;
$$;

create function assessor_rollout_private.bhw_component_requests(p_program_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor public.users; result jsonb;
begin
  actor:=public.current_app_user();
  if actor.id is null or actor.role<>'bhw' or actor.status<>'active'
    or exists(select 1 from public.super_admin_personas s where s.persona_user_id=actor.id)
    or not exists(select 1 from public.feature_flags f where f.key='elearning'
      and f.enabled and not ('bhw'=any(coalesce(f.disabled_roles,'{}'::text[]))))
    or not exists(select 1 from public.training_programs p where p.id=p_program_id
      and p.content_key='bhw-reference-manual' and p.status='published')
    then raise exception 'not authorized'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'moduleTitleFil',q.title_fil,
    'moduleTitleEn',q.title_en,'status',q.status,'purposeFil',q.purpose_fil,
    'purposeEn',q.purpose_en,'criteria',q.criteria,'assessorName',q.assessor_name,
    'agreedAt',q.agreed_at,'location',q.location,'note',q.arrangement_note)
    order by q.created_at desc),'[]'::jsonb) into result from (
    select r.*,module.title_fil,module.title_en,
      a.agreed_at,a.location,a.arrangement_note,staff.full_name assessor_name,
      r.criteria_snapshot criteria
    from assessor_rollout_private.component_requests r
    join public.course_modules module on module.id=r.module_id
    left join assessor_rollout_private.component_assignments a on a.request_id=r.id and a.status='active'
    left join public.users staff on staff.id=a.assessor_user_id
    where r.program_id=p_program_id and r.bhw_user_id=actor.id
    order by r.created_at desc limit 20
  ) q;
  return result;
end;
$$;

alter table public.notifications drop constraint notifications_notification_type_check;
alter table public.notifications add constraint notifications_notification_type_check check
  (notification_type in ('announcement.created','survey.published','course.published',
    'assessment.decided','forum.reply','flipchart.reviewed','user.transferred',
    'course_session.enrolled','feedback.reply','practice.feedback_released',
    'assessment.arrangement'));
create unique index component_arrangement_notification_once on public.notifications
  (recipient_user_id,subject_id) where notification_type='assessment.arrangement';
create function assessor_rollout_private.notify_component_arrangement() returns trigger
language plpgsql security definer set search_path='' as $$
declare request assessor_rollout_private.component_requests;
begin
  if new.event_type in ('arranged','rescheduled','cancelled','released') then
    select * into request from assessor_rollout_private.component_requests where id=new.component_request_id;
    insert into public.notifications (recipient_user_id,notification_type,subject_type,subject_id,
      title_fil,title_en,body_fil,body_en,link_path)
    values (request.bhw_user_id,'assessment.arrangement','component_request_event',new.id,
      'Update sa pormal na pagtatasa','Formal assessment update',
      case when new.event_type in ('arranged','rescheduled') then
        'May napagkasunduang oras o lugar para sa iyong pagtatasa.'
      else 'Nabago ang plano para sa iyong pagtatasa.' end,
      case when new.event_type in ('arranged','rescheduled') then
        'A time or place was agreed for your assessment.'
      else 'Your assessment plan changed.' end,
      '/training/'||request.program_id::text||'/assessment-requests')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger notify_component_arrangement after insert
  on assessor_rollout_private.component_request_events for each row
  execute function assessor_rollout_private.notify_component_arrangement();

create function public.rpc_assessor_component_request_create(
  p_key uuid,p_program_id uuid,p_bhw_user_id uuid,p_module_id uuid
) returns uuid language sql security invoker set search_path='' as $$
  select assessor_rollout_private.component_request_create(p_key,p_program_id,p_bhw_user_id,p_module_id)
$$;
create function public.rpc_assessor_component_request_claim(p_key uuid,p_request_id uuid)
returns uuid language sql security invoker set search_path='' as $$
  select assessor_rollout_private.component_request_claim(p_key,p_request_id)
$$;
create function public.rpc_assessor_component_arrangement_set(
  p_key uuid,p_request_id uuid,p_agreed_at timestamptz,p_location text,p_note text default null
) returns uuid language sql security invoker set search_path='' as $$
  select assessor_rollout_private.component_arrangement_set(p_key,p_request_id,p_agreed_at,p_location,p_note)
$$;
create function public.rpc_assessor_component_request_close(p_key uuid,p_request_id uuid,p_action text)
returns uuid language sql security invoker set search_path='' as $$
  select assessor_rollout_private.component_request_close(p_key,p_request_id,p_action)
$$;
create function public.rpc_assessor_component_request_queue(p_program_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select assessor_rollout_private.component_request_queue(p_program_id)
$$;
create function public.rpc_bhw_component_requests(p_program_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select assessor_rollout_private.bhw_component_requests(p_program_id)
$$;
revoke execute on function
  assessor_rollout_private.component_request_scope(uuid,uuid,uuid),
  assessor_rollout_private.component_request_ready(uuid,uuid,uuid),
  assessor_rollout_private.component_request_create(uuid,uuid,uuid,uuid),
  assessor_rollout_private.component_request_claim(uuid,uuid),
  assessor_rollout_private.component_arrangement_set(uuid,uuid,timestamptz,text,text),
  assessor_rollout_private.component_request_close(uuid,uuid,text),
  assessor_rollout_private.component_request_queue(uuid),
  assessor_rollout_private.bhw_component_requests(uuid),
  assessor_rollout_private.notify_component_arrangement(),
  public.rpc_assessor_component_request_create(uuid,uuid,uuid,uuid),
  public.rpc_assessor_component_request_claim(uuid,uuid),
  public.rpc_assessor_component_arrangement_set(uuid,uuid,timestamptz,text,text),
  public.rpc_assessor_component_request_close(uuid,uuid,text),
  public.rpc_assessor_component_request_queue(uuid),
  public.rpc_bhw_component_requests(uuid)
  from public,anon,authenticated;
grant execute on function
  assessor_rollout_private.component_request_create(uuid,uuid,uuid,uuid),
  assessor_rollout_private.component_request_claim(uuid,uuid),
  assessor_rollout_private.component_arrangement_set(uuid,uuid,timestamptz,text,text),
  assessor_rollout_private.component_request_close(uuid,uuid,text),
  assessor_rollout_private.component_request_queue(uuid),
  assessor_rollout_private.bhw_component_requests(uuid),
  public.rpc_assessor_component_request_create(uuid,uuid,uuid,uuid),
  public.rpc_assessor_component_request_claim(uuid,uuid),
  public.rpc_assessor_component_arrangement_set(uuid,uuid,timestamptz,text,text),
  public.rpc_assessor_component_request_close(uuid,uuid,text),
  public.rpc_assessor_component_request_queue(uuid),
  public.rpc_bhw_component_requests(uuid)
  to authenticated;
commit;
