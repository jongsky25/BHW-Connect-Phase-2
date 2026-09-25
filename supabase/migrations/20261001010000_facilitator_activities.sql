-- Generated with `supabase migration new facilitator_activities`; ordered after
-- the existing October migrations because session/observation tables are required.
alter table public.course_module_facilitator_notes
  add column activities jsonb not null default '[]' check (jsonb_typeof(activities) = 'array');
alter table public.competency_observations
  add column activity_snapshot jsonb check (jsonb_typeof(activity_snapshot) = 'object');

create table public.course_session_activities (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.course_sessions(id) on delete cascade,
  module_id uuid not null references public.course_modules(id),
  activity_id text not null,
  activity_snapshot jsonb not null check (jsonb_typeof(activity_snapshot) = 'object'),
  status text not null check (status in ('planned','run','adapted','skipped')),
  duration_minutes integer check (duration_minutes between 1 and 600),
  note text not null default '' check (char_length(note) <= 1000),
  recorded_by uuid not null references public.users(id),
  recorded_at timestamptz not null default now(),
  unique(session_id,module_id,activity_id)
);
create index course_session_activities_module_idx on public.course_session_activities(module_id);
create index course_session_activities_recorder_idx on public.course_session_activities(recorded_by);
alter table public.course_session_activities enable row level security;
create policy course_session_activities_read on public.course_session_activities for select to authenticated
using (
  (select public.current_app_user()).status = 'active'
  and (
    public.course_session_facilitator_id(session_id) = (select public.current_app_user()).id
    or ((select public.current_app_user()).role in ('assessor','admin')
      and public.org_unit_path(public.course_session_org_unit_id(session_id)) like (select public.current_org_path()) || '%')
  )
);
revoke all on public.course_session_activities from public,anon,authenticated;
grant select on public.course_session_activities to authenticated;

create function public.rpc_course_session_activity_record(
  p_session_id uuid, p_module_id uuid, p_activity_id text, p_activity_version integer,
  p_status text, p_duration_minutes integer default null, p_note text default ''
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_session public.course_sessions;
  v_actor public.users := public.current_app_user();
  v_activity jsonb;
  v_id uuid;
  v_note text := btrim(coalesce(p_note,''));
begin
  -- Check identity before locking, then check open status again under the lock.
  v_session := public.course_session_facilitator_guard(p_session_id);
  perform 1 from public.course_sessions where id=p_session_id for update;
  v_session := public.course_session_facilitator_guard(p_session_id);
  if not exists (select 1 from public.course_modules where id=p_module_id and course_id=v_session.course_id and type != 'quiz') then
    raise exception 'module not found';
  end if;
  select a.value into v_activity from public.course_module_facilitator_notes n
    cross join lateral jsonb_array_elements(n.activities) a(value)
    where n.module_id=p_module_id and a.value->>'id'=p_activity_id
      and a.value->'version'=to_jsonb(p_activity_version);
  if v_activity is null then raise exception 'activity changed or not found'; end if;
  if p_status is null or p_status not in ('planned','run','adapted','skipped') then raise exception 'invalid status'; end if;
  if p_duration_minutes is not null and (p_duration_minutes < 1 or p_duration_minutes > 600) then raise exception 'invalid duration'; end if;
  if char_length(v_note)>1000 then raise exception 'note too long'; end if;
  insert into public.course_session_activities(session_id,module_id,activity_id,activity_snapshot,status,duration_minutes,note,recorded_by)
    values(p_session_id,p_module_id,p_activity_id,v_activity,p_status,p_duration_minutes,v_note,v_actor.id)
    on conflict(session_id,module_id,activity_id) do update set
      activity_snapshot=excluded.activity_snapshot,status=excluded.status,duration_minutes=excluded.duration_minutes,
      note=excluded.note,recorded_by=excluded.recorded_by,recorded_at=now()
    returning id into v_id;
  insert into public.audit_events(actor_user_id,event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
    values(v_actor.id,'course_session.activity_recorded','course_session',p_session_id,
      jsonb_build_object('module_id',p_module_id,'activity_id',p_activity_id,'version',p_activity_version,'status',p_status),
      'Naitala ang gawain sa training session.','Recorded a training session activity.');
  return v_id;
end;
$$;
revoke all on function public.rpc_course_session_activity_record(uuid,uuid,text,integer,text,integer,text) from public,anon,authenticated;
grant execute on function public.rpc_course_session_activity_record(uuid,uuid,text,integer,text,integer,text) to authenticated;

-- Optional evidence link: the existing RPC still enforces actor, BHW, course,
-- indicator and rating rules. Failed activity validation rolls back its write.
create function public.rpc_competency_observation_record_activity(
  p_bhw_user_id uuid,p_module_id uuid,p_objective_index integer,p_level text,
  p_activity_id text,p_activity_version integer,p_note text default ''
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_activity jsonb;
begin
  v_id := public.rpc_competency_observation_record(p_bhw_user_id,p_module_id,p_objective_index,p_level,p_note);
  select a.value into v_activity from public.course_module_facilitator_notes n
    cross join lateral jsonb_array_elements(n.activities) a(value)
    where n.module_id=p_module_id and a.value->>'id'=p_activity_id
      and a.value->'version'=to_jsonb(p_activity_version)
      and a.value->>'kind' != 'game'
      and a.value->'objective_indices' @> jsonb_build_array(p_objective_index);
  if v_activity is null then raise exception 'activity changed or unsuitable for this indicator'; end if;
  update public.competency_observations set activity_snapshot=v_activity where id=v_id;
  -- The existing audit event points to v_id, whose immutable snapshot carries
  -- the activity evidence. No broad scan/update of historical audit rows.
  return v_id;
end;
$$;
revoke all on function public.rpc_competency_observation_record_activity(uuid,uuid,integer,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.rpc_competency_observation_record_activity(uuid,uuid,integer,text,text,integer,text) to authenticated;
