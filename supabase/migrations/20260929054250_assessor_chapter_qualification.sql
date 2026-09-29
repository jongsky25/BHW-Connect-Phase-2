-- AF-05: server-issued, chapter-scoped assessor qualification.
begin;

create table public.assessor_chapter_qualifications (
  id uuid primary key default gen_random_uuid(),
  assessor_user_id uuid not null references public.users(id),
  chapter_id uuid not null references public.training_program_chapters(id),
  curriculum_version text not null,
  rubric_version text not null,
  orientation_version text not null,
  orientation_attempt_id uuid not null references public.assessor_orientation_attempts(id),
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  issued_at timestamptz not null default now(),
  status_changed_at timestamptz,
  unique (assessor_user_id,chapter_id,curriculum_version,orientation_version),
  unique (orientation_attempt_id)
);
create index assessor_qualification_chapter_idx on public.assessor_chapter_qualifications(chapter_id,status);
alter table public.assessor_chapter_qualifications enable row level security;
revoke all on public.assessor_chapter_qualifications from public,anon,authenticated;
grant select on public.assessor_chapter_qualifications to authenticated;
create policy assessor_qualification_own_read on public.assessor_chapter_qualifications
  for select to authenticated using (
    assessor_user_id=(select current_app_user()).id
    and (select current_app_user()).role='assessor'
    and (select current_app_user()).status='active'
  );
create policy assessor_qualification_admin_read on public.assessor_chapter_qualifications
  for select to authenticated using (
    (select current_app_user()).role='admin'
    and (select current_app_user()).status='active'
    and exists(select 1 from public.users target join public.org_units ou on ou.id=target.org_unit_id
      where target.id=assessor_user_id and ou.path like (select public.current_org_path()) || '%')
  );

-- The orientation submission is the only automatic issuance path. This helper
-- rechecks the current exam and lesson records inside the same transaction.
create function assessor_private.issue_chapter_qualification(p_chapter_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.users; v_gate jsonb; v_unit assessor_private.orientation_units;
  v_attempt public.assessor_orientation_attempts; v_existing public.assessor_chapter_qualifications;
  v_id uuid;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role<>'assessor' or v_actor.status<>'active' then raise exception 'not authorized'; end if;
  perform 1 from public.users where id=v_actor.id for update;
  v_gate:=public.rpc_assessor_candidate_exam_state(p_chapter_id);
  if not coalesce((v_gate->>'orientation_ready')::boolean,false) then raise exception 'chapter qualification prerequisites incomplete'; end if;
  select * into v_unit from assessor_private.orientation_units
    where chapter_key=(select chapter_key from public.training_program_chapters where id=p_chapter_id)
      and curriculum_version=v_gate->>'curriculum_version';
  if v_unit.chapter_key is null then raise exception 'orientation unavailable for this chapter'; end if;
  if exists(select 1 from jsonb_array_elements(v_unit.lessons) l where not exists(
    select 1 from public.assessor_orientation_lesson_progress p where p.assessor_user_id=v_actor.id
      and p.chapter_id=p_chapter_id and p.curriculum_version=v_unit.curriculum_version
      and p.orientation_version=v_unit.orientation_version and p.lesson_id=l->>'id')) then
    raise exception 'complete every orientation lesson first'; end if;
  select * into v_attempt from public.assessor_orientation_attempts a
    where a.assessor_user_id=v_actor.id and a.chapter_id=p_chapter_id
      and a.curriculum_version=v_unit.curriculum_version and a.orientation_version=v_unit.orientation_version
      and a.passed order by a.submitted_at desc,a.id desc limit 1;
  if v_attempt.id is null then raise exception 'pass the scoring exercise first'; end if;
  select * into v_existing from public.assessor_chapter_qualifications q
    where q.assessor_user_id=v_actor.id and q.chapter_id=p_chapter_id
      and q.curriculum_version=v_unit.curriculum_version and q.orientation_version=v_unit.orientation_version;
  if v_existing.id is not null then return v_existing.id; end if;
  insert into public.assessor_chapter_qualifications
    (assessor_user_id,chapter_id,curriculum_version,rubric_version,orientation_version,orientation_attempt_id)
    values(v_actor.id,p_chapter_id,v_unit.curriculum_version,v_unit.curriculum_version,v_unit.orientation_version,v_attempt.id)
    on conflict (assessor_user_id,chapter_id,curriculum_version,orientation_version) do nothing
    returning id into v_id;
  if v_id is null then
    select id into v_id from public.assessor_chapter_qualifications
      where assessor_user_id=v_actor.id and chapter_id=p_chapter_id
        and curriculum_version=v_unit.curriculum_version and orientation_version=v_unit.orientation_version;
  else
    insert into public.audit_events(actor_user_id,event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
      values(v_actor.id,'assessor.qualification.issued','assessor_chapter_qualification',v_id,
        jsonb_build_object('assessor_user_id',v_actor.id,'chapter_id',p_chapter_id,'curriculum_version',v_unit.curriculum_version,
          'orientation_version',v_unit.orientation_version,'orientation_attempt_id',v_attempt.id),
        'Naibigay ang kwalipikasyon ng assessor para sa kabanata.','Assessor chapter qualification issued.');
  end if;
  return v_id;
end;
$$;
revoke execute on function assessor_private.issue_chapter_qualification(uuid) from public,anon,authenticated;

create function assessor_private.issue_after_orientation_pass()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.passed then
    if new.assessor_user_id is distinct from (select id from public.current_app_user()) then raise exception 'not authorized'; end if;
    perform assessor_private.issue_chapter_qualification(new.chapter_id);
  end if;
  return new;
end;
$$;
revoke execute on function assessor_private.issue_after_orientation_pass() from public,anon,authenticated;
create trigger issue_assessor_qualification_after_pass after insert on public.assessor_orientation_attempts
  for each row execute function assessor_private.issue_after_orientation_pass();

-- Explicit recovery for an orientation pass recorded before AF-05 deployment.
-- It is also idempotent; it never reactivates a suspended or revoked grant.
create function public.rpc_assessor_qualification_ensure(p_chapter_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
begin
  return assessor_private.issue_chapter_qualification(p_chapter_id);
end;
$$;
revoke execute on function public.rpc_assessor_qualification_ensure(uuid) from public,anon;
grant execute on function public.rpc_assessor_qualification_ensure(uuid) to authenticated;

create function public.rpc_assessor_qualification_state(p_chapter_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.users; v_chapter public.training_program_chapters;
  v_unit assessor_private.orientation_units; v_qualification public.assessor_chapter_qualifications;
  v_gate jsonb; v_orientation jsonb;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role<>'assessor' or v_actor.status<>'active' then raise exception 'not authorized'; end if;
  select ch.* into v_chapter from public.training_program_chapters ch
    join public.training_programs p on p.id=ch.program_id
    join public.courses c on c.id=ch.course_id
    where ch.id=p_chapter_id and ch.availability='available' and p.status='published'
      and p.content_key='bhw-reference-manual' and c.status='published'
      and (public.current_org_path() like public.org_unit_path(c.org_unit_id) || '%'
        or public.org_unit_path(c.org_unit_id) like public.current_org_path() || '%');
  if v_chapter.id is null then raise exception 'chapter unavailable'; end if;
  select * into v_unit from assessor_private.orientation_units where chapter_key=v_chapter.chapter_key;
  if v_unit.chapter_key is null or not exists(select 1 from assessor_private.exam_requirements r
    where r.chapter_key=v_chapter.chapter_key and r.curriculum_version=v_unit.curriculum_version) then
    return jsonb_build_object('status','unavailable','next_step','await_chapter_requirements');
  end if;
  select * into v_qualification from public.assessor_chapter_qualifications
    where assessor_user_id=v_actor.id and chapter_id=p_chapter_id
      and curriculum_version=v_unit.curriculum_version and orientation_version=v_unit.orientation_version;
  if v_qualification.id is not null then
    return jsonb_build_object('status',v_qualification.status,'issued_at',v_qualification.issued_at,
      'curriculum_version',v_qualification.curriculum_version,'rubric_version',v_qualification.rubric_version,
      'orientation_version',v_qualification.orientation_version,'qualification_id',v_qualification.id,
      'next_step',case when v_qualification.status='active' then 'qualified' else 'contact_admin' end);
  end if;
  v_gate:=public.rpc_assessor_candidate_exam_state(p_chapter_id);
  if not coalesce((v_gate->>'orientation_ready')::boolean,false) then
    return jsonb_build_object('status','in_progress','curriculum_version',v_unit.curriculum_version,
      'rubric_version',v_unit.curriculum_version,'next_step',
      case when not coalesce((v_gate->>'pretest_recorded')::boolean,false) then 'pretest'
        when not coalesce((v_gate->>'chapter_complete')::boolean,false) then 'study'
        else 'posttest' end);
  end if;
  v_orientation:=public.rpc_assessor_orientation_state(p_chapter_id);
  return jsonb_build_object('status','in_progress','curriculum_version',v_unit.curriculum_version,
    'rubric_version',v_unit.curriculum_version,'orientation_version',v_unit.orientation_version,
    'next_step',case when coalesce((v_orientation->>'passed')::boolean,false) then 'issue'
      when jsonb_array_length(v_orientation->'completed_lessons')<jsonb_array_length(v_orientation->'lessons')
        then 'orientation_lessons' else 'scoring_exercise' end);
end;
$$;
revoke execute on function public.rpc_assessor_qualification_state(uuid) from public,anon;
grant execute on function public.rpc_assessor_qualification_state(uuid) to authenticated;

-- AF-06 onward can use this predicate; live assessment gates are activated in AF-10.
create function public.rpc_assessor_chapter_qualified(p_chapter_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.users; v_unit assessor_private.orientation_units;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role<>'assessor' or v_actor.status<>'active' then return false; end if;
  select u.* into v_unit from assessor_private.orientation_units u
    join public.training_program_chapters ch on ch.chapter_key=u.chapter_key
    join public.training_programs p on p.id=ch.program_id
    join public.courses c on c.id=ch.course_id
    where ch.id=p_chapter_id and ch.availability='available' and p.status='published'
      and p.content_key='bhw-reference-manual' and c.status='published'
      and (public.current_org_path() like public.org_unit_path(c.org_unit_id) || '%'
        or public.org_unit_path(c.org_unit_id) like public.current_org_path() || '%');
  if v_unit.chapter_key is null then return false; end if;
  if not exists(select 1 from assessor_private.exam_requirements r where r.chapter_key=v_unit.chapter_key
    and r.curriculum_version=v_unit.curriculum_version) then return false; end if;
  return exists(select 1 from public.assessor_chapter_qualifications q
    where q.assessor_user_id=v_actor.id and q.chapter_id=p_chapter_id
      and q.curriculum_version=v_unit.curriculum_version and q.orientation_version=v_unit.orientation_version
      and q.status='active');
end;
$$;
revoke execute on function public.rpc_assessor_chapter_qualified(uuid) from public,anon;
grant execute on function public.rpc_assessor_chapter_qualified(uuid) to authenticated;

create function public.rpc_admin_assessor_qualification_set_status(p_qualification_id uuid,p_status text,p_reason text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.users; v_grant public.assessor_chapter_qualifications; v_target public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role<>'admin' or v_actor.status<>'active' then raise exception 'not authorized'; end if;
  if p_status not in ('active','suspended','revoked') or p_status is null then raise exception 'invalid status'; end if;
  if p_reason is null or length(trim(p_reason))<10 or length(p_reason)>1000 then raise exception 'reason must be 10 to 1000 characters'; end if;
  select * into v_grant from public.assessor_chapter_qualifications where id=p_qualification_id for update;
  if v_grant.id is null then raise exception 'qualification not found'; end if;
  select * into v_target from public.users where id=v_grant.assessor_user_id;
  if v_target.role<>'assessor' or not exists(select 1 from public.org_units ou
    where ou.id=v_target.org_unit_id and ou.path like public.current_org_path() || '%') then
    raise exception 'qualification out of scope'; end if;
  if v_grant.status=p_status then return; end if;
  update public.assessor_chapter_qualifications set status=p_status,status_changed_at=now() where id=v_grant.id;
  insert into public.audit_events(actor_user_id,event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
    values(v_actor.id,'assessor.qualification.'||p_status,'assessor_chapter_qualification',v_grant.id,
      jsonb_build_object('previous_status',v_grant.status,'status',p_status,'reason',trim(p_reason),
        'assessor_user_id',v_target.id,'chapter_id',v_grant.chapter_id),
      'Binago ang katayuan ng kwalipikasyon ng assessor.','Assessor qualification status changed.');
end;
$$;
revoke execute on function public.rpc_admin_assessor_qualification_set_status(uuid,text,text) from public,anon;
grant execute on function public.rpc_admin_assessor_qualification_set_status(uuid,text,text) to authenticated;
create policy assessor_qualification_audit_admin_read on public.audit_events for select to authenticated using (
  subject_type='assessor_chapter_qualification'
  and (select public.current_app_user()).role='admin'
  and (select public.current_app_user()).status='active'
  and exists(select 1 from public.users target join public.org_units ou on ou.id=target.org_unit_id
    where target.id=(metadata->>'assessor_user_id')::uuid
      and ou.path like (select public.current_org_path()) || '%')
);
commit;
