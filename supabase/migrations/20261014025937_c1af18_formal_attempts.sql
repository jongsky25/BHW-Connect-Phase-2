-- C1AF-18: one formal attempt per arranged request. No registry or rollout activation.
begin;

alter table assessor_rollout_private.component_requests
  drop constraint component_requests_status_check;
alter table assessor_rollout_private.component_requests
  add constraint component_requests_status_check
  check (status in ('pending','assigned','arranged','assessed','cancelled','released'));
drop index assessor_rollout_private.component_request_one_open;
create unique index component_request_one_open
  on assessor_rollout_private.component_requests(module_id,bhw_user_id)
  where status in ('pending','assigned','arranged','assessed');

create table assessor_rollout_private.formal_attempts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references assessor_rollout_private.component_requests(id),
  assignment_id uuid not null references assessor_rollout_private.component_assignments(id),
  start_key uuid not null,
  program_id uuid not null references public.training_programs(id),
  chapter_id uuid not null references public.training_program_chapters(id),
  module_id uuid not null references public.course_modules(id),
  bhw_user_id uuid not null references public.users(id),
  assessor_user_id uuid not null references public.users(id),
  requirements_version text not null,
  rubric_version text not null,
  criteria_snapshot jsonb not null check (jsonb_typeof(criteria_snapshot)='array' and jsonb_array_length(criteria_snapshot)>0),
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence)='array'),
  revision integer not null default 0 check (revision>=0),
  status text not null default 'draft' check (status in ('draft','submitted')),
  outcome text check (outcome in ('complete','needs_practice','insufficient_evidence')),
  started_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  submitted_at timestamptz,
  submit_key uuid,
  unique (assessor_user_id,start_key),
  check ((status='draft' and outcome is null and submitted_at is null and submit_key is null)
    or (status='submitted' and outcome is not null and submitted_at is not null and submit_key is not null))
);
create index formal_attempts_assessor_idx on assessor_rollout_private.formal_attempts
  (assessor_user_id,started_at desc);
alter table assessor_rollout_private.formal_attempts enable row level security;
revoke all on assessor_rollout_private.formal_attempts from public,anon,authenticated;

-- An attempted release/cancellation cannot silently transfer an open formal record.
create function assessor_rollout_private.formal_guard_assignment() returns trigger
language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' then
    if exists(select 1 from assessor_rollout_private.formal_attempts a
      where a.assignment_id=old.id and a.status='draft')
      then raise exception 'formal assessment already started'; end if;
    return old;
  end if;
  if exists(select 1 from assessor_rollout_private.formal_attempts a
    where a.assignment_id=old.id and a.status='draft')
    and (new.status<>'active' or new.assessor_user_id<>old.assessor_user_id
      or new.request_id<>old.request_id) then raise exception 'formal assessment already started'; end if;
  return new;
end;
$$;
create trigger formal_guard_assignment before update or delete
  on assessor_rollout_private.component_assignments for each row
  execute function assessor_rollout_private.formal_guard_assignment();

create function assessor_rollout_private.formal_contract(p_request_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.criterion_id,'version',c.criterion_version,
    'fil',c.description_fil,'en',c.description_en,
    'lessonId',p.lesson_id,'lessonRevisionId',p.lesson_revision_id,
    'rubric',p.rubric_snapshot,'sourceFingerprint',p.source_fingerprint)
    order by c.criterion_id),'[]'::jsonb)
  from assessor_rollout_private.component_requests r
  join assessor_rollout_private.component_required_criteria c on c.module_id=r.module_id
  join assessor_rollout_private.practice_criteria p on p.chapter_id=c.chapter_id
    and p.criterion_id=c.criterion_id and p.criterion_version=c.criterion_version
  where r.id=p_request_id and p.enabled and p.requirements_version=r.requirements_version
    and p.rubric_version=r.rubric_version
    and nullif(btrim(p.rubric_snapshot #>> '{observable,fil}'),'') is not null
    and nullif(btrim(p.rubric_snapshot #>> '{observable,en}'),'') is not null
    and nullif(btrim(p.rubric_snapshot #>> '{levels,kaya_na,fil}'),'') is not null
    and nullif(btrim(p.rubric_snapshot #>> '{levels,kaya_na,en}'),'') is not null
    and nullif(btrim(p.rubric_snapshot #>> '{levels,kailangan_practice,fil}'),'') is not null
    and nullif(btrim(p.rubric_snapshot #>> '{levels,kailangan_practice,en}'),'') is not null
    and nullif(btrim(p.rubric_snapshot #>> '{levels,hindi_pa,fil}'),'') is not null
    and nullif(btrim(p.rubric_snapshot #>> '{levels,hindi_pa,en}'),'') is not null
    and exists(select 1 from public.course_lessons l where l.id=p.lesson_id
      and l.module_id=r.module_id and l.published_revision_id=p.lesson_revision_id)
$$;

create function assessor_rollout_private.formal_authorized(p_request_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare r assessor_rollout_private.component_requests;
  a assessor_rollout_private.component_assignments; actor public.users;
  current_criteria jsonb; expected_count integer;
begin
  actor:=public.current_app_user();
  select * into r from assessor_rollout_private.component_requests where id=p_request_id;
  select * into a from assessor_rollout_private.component_assignments
    where request_id=p_request_id and status='active';
  if r.id is null or r.status<>'arranged' or a.id is null
    or a.assessor_user_id is distinct from actor.id or a.agreed_at is null
    or not assessor_rollout_private.component_request_scope(r.program_id,r.bhw_user_id,actor.id)
    or not assessor_rollout_private.component_request_ready(r.program_id,r.bhw_user_id,r.module_id)
    or not exists(select 1 from assessor_rollout_private.component_requirements c
      where c.module_id=r.module_id and c.chapter_id=r.chapter_id and c.enabled
        and c.requirements_version=r.requirements_version and c.rubric_version=r.rubric_version)
    then return false; end if;
  current_criteria:=assessor_rollout_private.formal_contract(r.id);
  select count(*) into expected_count from assessor_rollout_private.component_required_criteria c
    where c.module_id=r.module_id;
  return expected_count>0 and jsonb_array_length(current_criteria)=expected_count;
end;
$$;

create function assessor_rollout_private.formal_state(p_request_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r assessor_rollout_private.component_requests;
  a assessor_rollout_private.component_assignments;
  attempt assessor_rollout_private.formal_attempts; actor public.users;
begin
  actor:=public.current_app_user();
  select * into r from assessor_rollout_private.component_requests where id=p_request_id;
  select * into a from assessor_rollout_private.component_assignments
    where request_id=p_request_id and status='active';
  if r.id is null or a.id is null or a.assessor_user_id is distinct from actor.id
    or actor.role<>'assessor' or actor.status<>'active'
    or exists(select 1 from public.super_admin_personas s where s.persona_user_id=actor.id)
    or not exists(select 1 from public.assessor_flow_cohorts c
      join public.assessor_flow_cohort_members m on m.cohort_id=c.id and m.user_id=actor.id
      where c.program_id=r.program_id and c.chapter_key='chapter-1' and c.ui_enabled)
    or not exists(select 1 from public.feature_flags f where f.key='assessor_flow_ui'
      and f.enabled and not ('assessor'=any(coalesce(f.disabled_roles,'{}'::text[]))))
    or not exists(select 1 from public.feature_flags f where f.key='elearning'
      and f.enabled and not ('assessor'=any(coalesce(f.disabled_roles,'{}'::text[]))))
    or not exists(select 1 from public.training_programs p where p.id=r.program_id
      and p.content_key='bhw-reference-manual' and p.status='published')
    or not exists(select 1 from public.users u where u.id=r.bhw_user_id and u.status='active'
      and public.org_unit_path(u.org_unit_id) like public.org_unit_path(actor.org_unit_id)||'%')
    then raise exception 'formal assessment unavailable'; end if;
  select * into attempt from assessor_rollout_private.formal_attempts where request_id=r.id;
  return jsonb_build_object('requestId',r.id,'programId',r.program_id,'moduleId',r.module_id,
    'learnerName',(select full_name from public.users where id=r.bhw_user_id),
    'moduleTitleFil',(select title_fil from public.course_modules where id=r.module_id),
    'moduleTitleEn',(select title_en from public.course_modules where id=r.module_id),
    'purposeFil',r.purpose_fil,'purposeEn',r.purpose_en,
    'canStart',attempt.id is null and assessor_rollout_private.formal_authorized(r.id),
    'attempt',case when attempt.id is null then null else jsonb_build_object(
      'id',attempt.id,'status',attempt.status,'revision',attempt.revision,
      'criteria',attempt.criteria_snapshot,'evidence',attempt.evidence,
      'outcome',attempt.outcome,'startedAt',attempt.started_at,
      'submittedAt',attempt.submitted_at) end);
end;
$$;

create function assessor_rollout_private.formal_start(p_key uuid,p_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare r assessor_rollout_private.component_requests;
  a assessor_rollout_private.component_assignments;
  previous assessor_rollout_private.formal_attempts; actor public.users; result_id uuid;
begin
  actor:=public.current_app_user();
  if p_key is null or p_request_id is null then raise exception 'start unavailable'; end if;
  select * into r from assessor_rollout_private.component_requests where id=p_request_id for update;
  select * into previous from assessor_rollout_private.formal_attempts where request_id=p_request_id;
  if previous.id is not null then
    if previous.assessor_user_id=actor.id and previous.status='draft' and
      assessor_rollout_private.formal_authorized(p_request_id) then return previous.id; end if;
    raise exception 'start unavailable';
  end if;
  if not assessor_rollout_private.formal_authorized(p_request_id) then raise exception 'start unavailable'; end if;
  select * into a from assessor_rollout_private.component_assignments
    where request_id=p_request_id and status='active';
  insert into assessor_rollout_private.formal_attempts
    (request_id,assignment_id,start_key,program_id,chapter_id,module_id,bhw_user_id,
      assessor_user_id,requirements_version,rubric_version,criteria_snapshot)
    values(r.id,a.id,p_key,r.program_id,r.chapter_id,r.module_id,r.bhw_user_id,actor.id,
      r.requirements_version,r.rubric_version,assessor_rollout_private.formal_contract(r.id))
    returning id into result_id;
  return result_id;
end;
$$;

create function assessor_rollout_private.formal_save(
  p_attempt_id uuid,p_expected_revision integer,p_evidence jsonb
) returns integer language plpgsql security definer set search_path='' as $$
declare attempt assessor_rollout_private.formal_attempts; actor public.users;
  entry jsonb; criterion jsonb;
begin
  actor:=public.current_app_user();
  select * into attempt from assessor_rollout_private.formal_attempts where id=p_attempt_id for update;
  if attempt.id is null or attempt.assessor_user_id is distinct from actor.id
    or attempt.status<>'draft' or attempt.revision<>p_expected_revision
    or not assessor_rollout_private.formal_authorized(attempt.request_id)
    or attempt.criteria_snapshot<>assessor_rollout_private.formal_contract(attempt.request_id)
    or jsonb_typeof(p_evidence)<>'array'
    or jsonb_array_length(p_evidence)>jsonb_array_length(attempt.criteria_snapshot)
    then raise exception 'draft changed or unavailable'; end if;
  for entry in select value from jsonb_array_elements(p_evidence) loop
    if jsonb_typeof(entry) is distinct from 'object'
      or not (entry ?& array['id','sufficiency','rating','facts','nextStep'])
      or (entry-'id'-'sufficiency'-'rating'-'facts'-'nextStep')<>'{}'::jsonb
      or jsonb_typeof(entry->'id')<>'string'
      or not exists(select 1 from jsonb_array_elements(attempt.criteria_snapshot) c
        where c->>'id'=entry->>'id')
      or coalesce(entry->>'sufficiency','') not in ('not_observed','insufficient','sufficient')
      or ((entry->>'sufficiency'='sufficient')
        is distinct from (coalesce(entry->>'rating','') in ('kaya_na','kailangan_practice','hindi_pa')))
      or (entry->>'sufficiency'<>'sufficient' and entry->'rating'<>'null'::jsonb)
      or jsonb_typeof(entry->'facts')<>'string' or length(btrim(entry->>'facts'))>4000
      or jsonb_typeof(entry->'nextStep')<>'string' or length(btrim(entry->>'nextStep'))>1000
      then raise exception 'invalid evidence'; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(p_evidence) e group by e->>'id' having count(*)>1)
    then raise exception 'duplicate criterion'; end if;
  update assessor_rollout_private.formal_attempts set evidence=p_evidence,
    revision=revision+1,updated_at=clock_timestamp() where id=attempt.id;
  return attempt.revision+1;
end;
$$;

create function assessor_rollout_private.formal_submit(
  p_key uuid,p_attempt_id uuid,p_expected_revision integer
) returns text language plpgsql security definer set search_path='' as $$
declare attempt assessor_rollout_private.formal_attempts; actor public.users;
  entry jsonb; outcome_value text := 'complete';
begin
  actor:=public.current_app_user();
  if p_key is null then raise exception 'submission unavailable'; end if;
  select * into attempt from assessor_rollout_private.formal_attempts where id=p_attempt_id for update;
  if attempt.id is null or attempt.assessor_user_id is distinct from actor.id
    then raise exception 'submission unavailable'; end if;
  if attempt.status='submitted' and attempt.submit_key=p_key then return attempt.outcome; end if;
  if attempt.status<>'draft' or attempt.revision<>p_expected_revision
    or not assessor_rollout_private.formal_authorized(attempt.request_id)
    or attempt.criteria_snapshot<>assessor_rollout_private.formal_contract(attempt.request_id)
    or jsonb_array_length(attempt.evidence)<>jsonb_array_length(attempt.criteria_snapshot)
    then raise exception 'submission unavailable'; end if;
  for entry in select value from jsonb_array_elements(attempt.evidence) loop
    if length(btrim(coalesce(entry->>'facts','')))<10
      or length(btrim(coalesce(entry->>'nextStep','')))<3
      then raise exception 'required evidence missing'; end if;
    if entry->>'sufficiency'<>'sufficient' then
      outcome_value:='insufficient_evidence';
    elsif outcome_value='complete' and entry->>'rating'<>'kaya_na' then
      outcome_value:='needs_practice';
    end if;
  end loop;
  update assessor_rollout_private.formal_attempts set status='submitted',
    outcome=outcome_value,submit_key=p_key,submitted_at=clock_timestamp(),
    revision=revision+1,updated_at=clock_timestamp() where id=attempt.id;
  update assessor_rollout_private.component_requests set status='assessed',
    updated_at=clock_timestamp() where id=attempt.request_id;
  return outcome_value;
end;
$$;

create function public.rpc_assessor_formal_state(p_request_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
  select assessor_rollout_private.formal_state(p_request_id)
$$;
create function public.rpc_assessor_formal_start(p_key uuid,p_request_id uuid) returns uuid
language sql security invoker set search_path='' as $$
  select assessor_rollout_private.formal_start(p_key,p_request_id)
$$;
create function public.rpc_assessor_formal_save(p_attempt_id uuid,p_expected_revision integer,p_evidence jsonb)
returns integer language sql security invoker set search_path='' as $$
  select assessor_rollout_private.formal_save(p_attempt_id,p_expected_revision,p_evidence)
$$;
create function public.rpc_assessor_formal_submit(p_key uuid,p_attempt_id uuid,p_expected_revision integer)
returns text language sql security invoker set search_path='' as $$
  select assessor_rollout_private.formal_submit(p_key,p_attempt_id,p_expected_revision)
$$;
revoke execute on function
  assessor_rollout_private.formal_guard_assignment(),
  assessor_rollout_private.formal_contract(uuid),
  assessor_rollout_private.formal_authorized(uuid),
  assessor_rollout_private.formal_state(uuid),
  assessor_rollout_private.formal_start(uuid,uuid),
  assessor_rollout_private.formal_save(uuid,integer,jsonb),
  assessor_rollout_private.formal_submit(uuid,uuid,integer),
  public.rpc_assessor_formal_state(uuid),
  public.rpc_assessor_formal_start(uuid,uuid),
  public.rpc_assessor_formal_save(uuid,integer,jsonb),
  public.rpc_assessor_formal_submit(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function
  assessor_rollout_private.formal_state(uuid),
  assessor_rollout_private.formal_start(uuid,uuid),
  assessor_rollout_private.formal_save(uuid,integer,jsonb),
  assessor_rollout_private.formal_submit(uuid,uuid,integer),
  public.rpc_assessor_formal_state(uuid),
  public.rpc_assessor_formal_start(uuid,uuid),
  public.rpc_assessor_formal_save(uuid,integer,jsonb),
  public.rpc_assessor_formal_submit(uuid,uuid,integer) to authenticated;
commit;
