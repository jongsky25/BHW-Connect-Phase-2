-- C1AF-12: planning is a distinct lifecycle state with no scheduled date.
alter table public.course_sessions alter column scheduled_at drop not null;
alter table public.course_sessions drop constraint course_sessions_status_check;
alter table public.course_sessions add constraint course_sessions_status_check
  check (status in ('draft','scheduled','completed','cancelled'));
alter table public.course_sessions add column plan_lesson_id uuid references public.course_lessons(id);
alter table public.course_sessions add constraint course_sessions_schedule_shape
  check ((status = 'draft' and scheduled_at is null and plan_lesson_id is not null)
    or (status <> 'draft' and scheduled_at is not null));
create unique index course_sessions_one_draft_per_lesson
  on public.course_sessions(facilitator_user_id,plan_lesson_id) where status='draft';

create function public.c1af12_session_lifecycle() returns trigger
language plpgsql set search_path=public as $$
begin
  if old.status in ('completed','cancelled') then raise exception 'closed session is immutable'; end if;
  if old.status='draft' and new.status not in ('draft','scheduled') then raise exception 'draft must be scheduled first'; end if;
  if old.status='scheduled' and new.status not in ('scheduled','completed','cancelled') then raise exception 'invalid session transition'; end if;
  if new.course_id<>old.course_id or new.facilitator_user_id<>old.facilitator_user_id
    or new.org_unit_id<>old.org_unit_id or new.plan_lesson_id is distinct from old.plan_lesson_id
    then raise exception 'session identity is immutable'; end if;
  return new;
end $$;
create trigger c1af12_session_lifecycle before update on public.course_sessions
  for each row execute function public.c1af12_session_lifecycle();
revoke all on function public.c1af12_session_lifecycle() from public,anon,authenticated;

-- An existing scheduled session can be linked to a lesson, but only the owner
-- can save a lesson plan. The row lock makes retries serialize.
create function public.rpc_course_lesson_plan_create(p_lesson_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor public.users:=public.current_app_user(); v_course public.courses;
  v_course_id uuid; v_id uuid;
begin
  if v_actor.id is null or v_actor.role<>'assessor' or v_actor.status<>'active' then raise exception 'not authorized'; end if;
  select m.course_id into v_course_id from public.course_lessons l
    join public.course_modules m on m.id=l.module_id
    where l.id=p_lesson_id and l.lesson_key='communication-clarify' and l.published_revision_id is not null
      and exists(select 1 from public.training_program_chapters c
        join public.training_programs p on p.id=c.program_id
        where c.course_id=m.course_id and c.chapter_key='chapter-1' and p.content_key='bhw-reference-manual');
  select * into v_course from public.courses where id=v_course_id and status='published';
  if v_course.id is null or not exists(select 1 from public.org_units o where o.id=v_course.org_unit_id
    and (select public.current_org_path()) like o.path||'%') then raise exception 'lesson not available in your scope'; end if;
  insert into public.course_sessions(course_id,org_unit_id,facilitator_user_id,scheduled_at,status,plan_lesson_id)
    values(v_course_id,v_actor.org_unit_id,v_actor.id,null,'draft',p_lesson_id)
    on conflict(facilitator_user_id,plan_lesson_id) where status='draft' do nothing
    returning id into v_id;
  if v_id is null then
    select id into v_id from public.course_sessions where facilitator_user_id=v_actor.id
      and plan_lesson_id=p_lesson_id and status='draft';
  end if;
  return v_id;
end $$;
revoke all on function public.rpc_course_lesson_plan_create(uuid) from public,anon,authenticated;
grant execute on function public.rpc_course_lesson_plan_create(uuid) to authenticated;

create function public.rpc_course_lesson_plan_schedule(p_session_id uuid,p_scheduled_at timestamptz,p_location_note text default '')
returns void language plpgsql security definer set search_path=public as $$
declare v_actor public.users:=public.current_app_user(); v_session public.course_sessions;
begin
  if v_actor.id is null or v_actor.role<>'assessor' or v_actor.status<>'active' then raise exception 'not authorized'; end if;
  select * into v_session from public.course_sessions where id=p_session_id for update;
  if v_session.id is null or v_session.facilitator_user_id<>v_actor.id or v_session.status<>'draft' then raise exception 'draft not available'; end if;
  if not exists(select 1 from public.courses c join public.org_units o on o.id=c.org_unit_id
    where c.id=v_session.course_id and c.status='published' and (select public.current_org_path()) like o.path||'%')
    then raise exception 'course not available in your scope'; end if;
  if p_scheduled_at is null or p_scheduled_at<=now() or char_length(coalesce(p_location_note,''))>500 then raise exception 'invalid schedule'; end if;
  update public.course_sessions set status='scheduled',scheduled_at=p_scheduled_at,location_note=coalesce(p_location_note,'') where id=p_session_id;
end $$;
revoke all on function public.rpc_course_lesson_plan_schedule(uuid,timestamptz,text) from public,anon,authenticated;
grant execute on function public.rpc_course_lesson_plan_schedule(uuid,timestamptz,text) to authenticated;

-- The plan endpoint accepts only the exact published lesson activity. Existing
-- snapshots win on retry and on later content publication. No run is recorded.
create function public.rpc_course_lesson_plan_activity_save(
  p_session_id uuid,p_lesson_id uuid,p_activity_id text,p_activity_version integer,p_replace boolean default false)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor public.users:=public.current_app_user(); v_session public.course_sessions;
  v_module_id uuid; v_lesson_key text; v_activity jsonb; v_id uuid;
begin
  if v_actor.id is null or v_actor.role<>'assessor' or v_actor.status<>'active' then raise exception 'not authorized'; end if;
  select * into v_session from public.course_sessions where id=p_session_id for update;
  if v_session.id is null or v_session.facilitator_user_id<>v_actor.id or v_session.status not in ('draft','scheduled') then raise exception 'session not available'; end if;
  if not exists(select 1 from public.courses c join public.org_units o on o.id=c.org_unit_id
    where c.id=v_session.course_id and c.status='published' and (select public.current_org_path()) like o.path||'%')
    then raise exception 'course not available in your scope'; end if;
  select m.id,l.lesson_key into v_module_id,v_lesson_key from public.course_lessons l
    join public.course_modules m on m.id=l.module_id
    where l.id=p_lesson_id and l.lesson_key='communication-clarify' and m.course_id=v_session.course_id and l.published_revision_id is not null
      and exists(select 1 from public.training_program_chapters c join public.training_programs p on p.id=c.program_id
        where c.course_id=m.course_id and c.chapter_key='chapter-1' and p.content_key='bhw-reference-manual');
  if v_module_id is null or (v_session.status='draft' and v_session.plan_lesson_id<>p_lesson_id) then raise exception 'lesson not in session course'; end if;
  select a.value into v_activity from public.course_module_facilitator_notes n
    cross join lateral jsonb_array_elements(n.activities) a(value)
    where n.module_id=v_module_id and a.value->>'id'=p_activity_id
      and a.value->'version'=to_jsonb(p_activity_version)
      and a.value->'lesson_keys' ? v_lesson_key;
  if v_activity is null then raise exception 'activity changed or not suitable for lesson'; end if;
  insert into public.course_session_activities(session_id,module_id,activity_id,activity_snapshot,status,recorded_by)
    values(p_session_id,v_module_id,p_activity_id,v_activity,'planned',v_actor.id)
    on conflict(session_id,module_id,activity_id) do update
      set activity_snapshot=excluded.activity_snapshot,recorded_by=excluded.recorded_by,recorded_at=now()
      where p_replace and course_session_activities.status='planned'
    returning id into v_id;
  if v_id is null then select id into v_id from public.course_session_activities
    where session_id=p_session_id and module_id=v_module_id and activity_id=p_activity_id; end if;
  return v_id;
end $$;
revoke all on function public.rpc_course_lesson_plan_activity_save(uuid,uuid,text,integer,boolean) from public,anon,authenticated;
grant execute on function public.rpc_course_lesson_plan_activity_save(uuid,uuid,text,integer,boolean) to authenticated;

-- Guard the older enrollment RPC too: it used to allow any owned session.
create function public.c1af12_enrollment_requires_schedule() returns trigger
language plpgsql set search_path=public as $$
begin
  if (select status from public.course_sessions where id=new.session_id)<>'scheduled' then raise exception 'session must be scheduled'; end if;
  return new;
end $$;
create trigger c1af12_enrollment_requires_schedule before insert or update on public.course_session_enrollments
  for each row execute function public.c1af12_enrollment_requires_schedule();
revoke all on function public.c1af12_enrollment_requires_schedule() from public,anon,authenticated;

-- Preserve planned snapshots through the older session activity entry point too.
create or replace function public.rpc_course_session_activity_record(
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
      activity_snapshot=case when course_session_activities.status='planned' and excluded.status='planned' then course_session_activities.activity_snapshot else excluded.activity_snapshot end,status=excluded.status,duration_minutes=excluded.duration_minutes,
      note=excluded.note,recorded_by=excluded.recorded_by,recorded_at=now()
    returning id into v_id;
  insert into public.audit_events(actor_user_id,event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
    values(v_actor.id,'course_session.activity_recorded','course_session',p_session_id,
      jsonb_build_object('module_id',p_module_id,'activity_id',p_activity_id,'version',p_activity_version,'status',p_status),
      'Naitala ang gawain sa training session.','Recorded a training session activity.');
  return v_id;
end;
$$;
