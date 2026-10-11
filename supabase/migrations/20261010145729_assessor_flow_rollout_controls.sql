-- C1AF-03b. Dormant controls only: no cohort, enrollment or cutover is seeded.
begin;
insert into public.feature_flags(key,enabled,description) values
 ('assessor_flow_ui',false,'Revised assessor preparation screens; also requires scoped cohort enablement.'),
 ('assessor_flow_writes',false,'Revised official facilitation/assessment writes; never a qualification grant.'),
 ('assessor_flow_awards',false,'Revised assessor/facilitator award issuance; requires approved chapter evidence.')
on conflict(key) do nothing;

create or replace function public.flag_role_scope(p_key text) returns text[]
language sql immutable set search_path=public as $$
  select case p_key
    when 'kb_articles' then array['bhw', 'assessor', 'designer']
    when 'announcements' then array['bhw', 'assessor', 'designer']
    when 'surveys' then array['bhw', 'assessor', 'designer']
    when 'forum' then array['bhw', 'assessor', 'designer']
    when 'notifications' then array['bhw', 'assessor', 'designer']
    when 'offline_pwa' then array['bhw', 'assessor', 'designer']
    when 'chat_conversation' then array['bhw', 'assessor', 'designer']
    when 'elearning' then array['bhw', 'assessor']
    when 'course_sessions' then array['bhw', 'assessor']
    when 'flipcharts' then array['bhw', 'designer']
    when 'assessor_flow_ui' then array['assessor']
    when 'assessor_flow_writes' then array['assessor']
    when 'assessor_flow_awards' then array['assessor']
    else '{}'::text[]
  end;
$$;

create schema assessor_rollout_private;
revoke all on schema assessor_rollout_private from public,anon,authenticated;
grant usage on schema assessor_rollout_private to authenticated;

create table public.assessor_flow_cohorts(
 id uuid primary key default gen_random_uuid(),
 program_id uuid not null,
 chapter_key text not null check(chapter_key in ('chapter-1','chapter-2','chapter-3')),
 cohort_key text not null check(cohort_key ~ '^[a-z0-9][a-z0-9-]*$'),
 requirements_version text not null check(btrim(requirements_version)<>''),
 ui_enabled boolean not null default false,
 writes_enabled boolean not null default false,
 awards_enabled boolean not null default false,
 authority_cutover_at timestamptz,
 authority_cutover_by uuid references public.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(program_id,chapter_key) references public.training_program_chapters(program_id,chapter_key),
 unique(program_id,chapter_key,cohort_key), unique(id,program_id,chapter_key),
 check((authority_cutover_at is null)=(authority_cutover_by is null))
);
create table public.assessor_flow_cohort_members(
 program_id uuid not null, chapter_key text not null,
 user_id uuid not null references public.users(id),
 cohort_id uuid not null,
 enrolled_at timestamptz not null default now(),
 primary key(program_id,chapter_key,user_id),
 foreign key(cohort_id,program_id,chapter_key) references public.assessor_flow_cohorts(id,program_id,chapter_key)
);
create index assessor_flow_members_cohort_idx on public.assessor_flow_cohort_members(cohort_id);
create index assessor_flow_cutover_idx on public.assessor_flow_cohorts(id) where authority_cutover_at is not null;
alter table public.assessor_flow_cohorts enable row level security;
alter table public.assessor_flow_cohort_members enable row level security;
revoke all on public.assessor_flow_cohorts,public.assessor_flow_cohort_members from public,anon,authenticated;
-- No direct API access/policies; scoped reads and audited changes use RPCs.

create function assessor_rollout_private.preserve_cutover() returns trigger
language plpgsql set search_path='' as $$
begin
 if old.authority_cutover_at is not null then
  if tg_op='DELETE' then raise exception 'authority cutover is permanent'; end if;
  if new.authority_cutover_at is distinct from old.authority_cutover_at
    or new.authority_cutover_by is distinct from old.authority_cutover_by
    or new.program_id<>old.program_id or new.chapter_key<>old.chapter_key
    or new.requirements_version<>old.requirements_version then
   raise exception 'authority cutover is permanent';
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;
create trigger preserve_assessor_flow_cutover before update or delete on public.assessor_flow_cohorts
 for each row execute function assessor_rollout_private.preserve_cutover();
create function assessor_rollout_private.preserve_membership() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.assessor_flow_cohorts c where c.id=old.cohort_id and c.authority_cutover_at is not null) then
  raise exception 'cutover membership cannot be removed or reassigned';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;
create trigger preserve_assessor_flow_membership before update or delete on public.assessor_flow_cohort_members
 for each row execute function assessor_rollout_private.preserve_membership();

create function assessor_rollout_private.preserve_chapter_binding() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.assessor_flow_cohorts c where c.program_id=old.program_id
   and c.chapter_key=old.chapter_key and c.authority_cutover_at is not null) then
  if tg_op='DELETE' then raise exception 'cutover chapter binding is permanent'; end if;
  if new.program_id<>old.program_id or new.chapter_key<>old.chapter_key or new.course_id is distinct from old.course_id then
   raise exception 'cutover chapter binding is permanent';
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;
create trigger preserve_assessor_flow_chapter_binding before update or delete on public.training_program_chapters
 for each row execute function assessor_rollout_private.preserve_chapter_binding();

create function assessor_rollout_private.configure_cohort(p_program_id uuid,p_chapter_key text,p_cohort_key text,
 p_requirements_version text,p_ui boolean,p_writes boolean,p_awards boolean,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_actor public.users; v_id uuid;
begin
 v_actor:=public.current_super_admin();
 if v_actor.id is null or v_actor.role<>'admin' then raise exception 'not authorized'; end if;
 if nullif(btrim(p_reason),'') is null or p_ui is null or p_writes is null or p_awards is null then raise exception 'reason and controls required'; end if;
 if not exists(select 1 from public.training_programs p join public.training_program_chapters ch on ch.program_id=p.id
   where p.id=p_program_id and p.content_key='bhw-reference-manual' and ch.chapter_key=p_chapter_key) then raise exception 'program chapter unavailable'; end if;
 insert into public.assessor_flow_cohorts(program_id,chapter_key,cohort_key,requirements_version,ui_enabled,writes_enabled,awards_enabled)
 values(p_program_id,p_chapter_key,p_cohort_key,p_requirements_version,p_ui,p_writes,p_awards)
 on conflict(program_id,chapter_key,cohort_key) do update set requirements_version=excluded.requirements_version,
   ui_enabled=excluded.ui_enabled,writes_enabled=excluded.writes_enabled,awards_enabled=excluded.awards_enabled,updated_at=now()
 returning id into v_id;
 insert into public.audit_events(actor_user_id,event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
 values(v_actor.id,'assessor_flow.configured','assessor_flow_cohort',v_id,
 jsonb_build_object('reason',p_reason,'ui',p_ui,'writes',p_writes,'awards',p_awards,'requirements_version',p_requirements_version),
 'Binago ang mga kontrol ng assessor cohort.','Assessor cohort controls changed.');
 return v_id;
end;
$$;
create function assessor_rollout_private.enroll_member(p_cohort_id uuid,p_user_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare v_actor public.users; v_cohort public.assessor_flow_cohorts;
begin
 v_actor:=public.current_super_admin();
 if v_actor.id is null or v_actor.role<>'admin' then raise exception 'not authorized'; end if;
 if nullif(btrim(p_reason),'') is null then raise exception 'reason required'; end if;
 select * into v_cohort from public.assessor_flow_cohorts where id=p_cohort_id for update;
 if v_cohort.id is null then raise exception 'cohort not found'; end if;
 if not exists(select 1 from public.users where id=p_user_id and role in ('assessor','bhw') and status='active') then raise exception 'active assessor or BHW required'; end if;
 if exists(select 1 from public.assessor_flow_cohort_members where program_id=v_cohort.program_id and chapter_key=v_cohort.chapter_key and user_id=p_user_id and cohort_id<>p_cohort_id) then
  raise exception 'member already assigned';
 end if;
 insert into public.assessor_flow_cohort_members(program_id,chapter_key,user_id,cohort_id)
 values(v_cohort.program_id,v_cohort.chapter_key,p_user_id,p_cohort_id) on conflict do nothing;
 insert into public.audit_events(actor_user_id,event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
 values(v_actor.id,'assessor_flow.enrolled','assessor_flow_cohort',p_cohort_id,jsonb_build_object('user_id',p_user_id,'reason',p_reason),
 'Itinalaga ang miyembro sa assessor cohort.','Member assigned to assessor cohort.');
end;
$$;

-- Cutover is intentionally NOT exposed as an RPC in this preparatory increment.
-- Reviewed release SQL can set it only after guards, migration/reconciliation
-- and the new award path are ready. Hiding UI does not clear it.
create function assessor_rollout_private.policy(p_program_id uuid,p_chapter_key text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_actor public.users; v_cohort public.assessor_flow_cohorts;
begin
 v_actor:=public.current_app_user();
 if v_actor.id is null or v_actor.role<>'assessor' or v_actor.status<>'active'
   or exists(select 1 from public.super_admin_personas where persona_user_id=v_actor.id) then raise exception 'not authorized'; end if;
 select c.* into v_cohort from public.assessor_flow_cohorts c
 join public.assessor_flow_cohort_members m on m.cohort_id=c.id
 join public.training_programs p on p.id=c.program_id
 where c.program_id=p_program_id and c.chapter_key=p_chapter_key and m.program_id=p_program_id
   and m.chapter_key=p_chapter_key and m.user_id=v_actor.id and p.content_key='bhw-reference-manual';
 if v_cohort.id is null then return null; end if;
 return jsonb_build_object('cohortId',v_cohort.id,'actorId',v_actor.id,'programInstanceId',v_cohort.program_id,
 'programKey','bhw-reference-manual','chapterKey',v_cohort.chapter_key,'requirementsVersion',v_cohort.requirements_version,
 'uiEnabled',v_cohort.ui_enabled,'writesEnabled',v_cohort.writes_enabled,'awardsEnabled',v_cohort.awards_enabled,
 'authorityCutoverAt',v_cohort.authority_cutover_at);
end;
$$;

create function public.rpc_assessor_flow_policy(p_program_id uuid,p_chapter_key text) returns jsonb
language sql security invoker set search_path='' as $$ select assessor_rollout_private.policy(p_program_id,p_chapter_key) $$;
create function public.rpc_admin_assessor_flow_cohort_configure(p_program_id uuid,p_chapter_key text,p_cohort_key text,
 p_requirements_version text,p_ui boolean,p_writes boolean,p_awards boolean,p_reason text) returns uuid
language sql security invoker set search_path='' as $$ select assessor_rollout_private.configure_cohort(p_program_id,p_chapter_key,p_cohort_key,p_requirements_version,p_ui,p_writes,p_awards,p_reason) $$;
create function public.rpc_admin_assessor_flow_cohort_enroll(p_cohort_id uuid,p_user_id uuid,p_reason text) returns void
language sql security invoker set search_path='' as $$ select assessor_rollout_private.enroll_member(p_cohort_id,p_user_id,p_reason) $$;

-- Backstop for existing table/RPC writes. After cutover, these legacy records
-- cannot mint revised authority. Revised write paths are later increments;
-- this backstop stays closed rather than inventing a qualification check.
create function assessor_rollout_private.assert_legacy_allowed(p_course_id uuid,p_subjects uuid[]) returns void
language plpgsql security definer set search_path='' as $$
declare v_cohort public.assessor_flow_cohorts;
begin
 -- Serialize existing cohort writes with cutover/configuration changes.
 for v_cohort in select c.* from public.training_program_chapters ch
   join public.assessor_flow_cohorts c on c.program_id=ch.program_id and c.chapter_key=ch.chapter_key
   join public.assessor_flow_cohort_members m on m.cohort_id=c.id
   where ch.course_id=p_course_id and m.user_id=any(p_subjects) order by c.id for share of c loop
  if v_cohort.authority_cutover_at is not null then raise exception 'revised assessor authority required'; end if;
 end loop;
end;
$$;
create function assessor_rollout_private.legacy_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_rows jsonb[]; v_row jsonb; v_course uuid; v_row_course uuid; v_module_course uuid; v_session uuid;
 v_subjects uuid[]; v_actor uuid;
begin
 if not exists(select 1 from public.assessor_flow_cohorts) then
  if tg_op='DELETE' then return old; end if;
  return new;
 end if;
 -- Preserve lifecycle administration of an existing historical qualification.
 if tg_table_name='assessor_chapter_qualifications' and tg_op='UPDATE'
  and (to_jsonb(old)-'status'-'status_changed_at')=(to_jsonb(new)-'status'-'status_changed_at') then return new; end if;
 v_actor:=(public.current_app_user()).id;
 if tg_op='INSERT' then v_rows:=array[to_jsonb(new)];
 elsif tg_op='DELETE' then v_rows:=array[to_jsonb(old)];
 else v_rows:=array[to_jsonb(old),to_jsonb(new)]; end if;
 foreach v_row in array v_rows loop
  v_course:=null; v_row_course:=null; v_module_course:=null; v_session:=null;
  v_subjects:=array_remove(array[v_actor,(v_row->>'bhw_user_id')::uuid,(v_row->>'observer_user_id')::uuid,
    (v_row->>'assessor_user_id')::uuid,(v_row->>'facilitator_user_id')::uuid,(v_row->>'recorded_by')::uuid],null);
  if v_row ? 'course_id' then v_row_course:=(v_row->>'course_id')::uuid; v_course:=v_row_course; end if;
  if v_row ? 'module_id' then select course_id into v_module_course from public.course_modules where id=(v_row->>'module_id')::uuid; end if;
  if tg_table_name='course_sessions' then v_session:=(v_row->>'id')::uuid;
  elsif v_row ? 'session_id' then v_session:=(v_row->>'session_id')::uuid; end if;
  if v_session is not null then
   select s.course_id,array_append(v_subjects,s.facilitator_user_id) into v_course,v_subjects from public.course_sessions s where s.id=v_session;
   -- New sessions are not in the table yet; keep their explicit course/actor.
   if v_course is null then v_course:=(v_row->>'course_id')::uuid; end if;
   v_subjects:=coalesce(v_subjects,'{}')||coalesce((select array_agg(e.bhw_user_id) from public.course_session_enrollments e where e.session_id=v_session),'{}');
   v_subjects:=v_subjects||array_remove(array[v_actor,(v_row->>'facilitator_user_id')::uuid],null);
  end if;
  if v_row ? 'chapter_id' then select course_id into v_course from public.training_program_chapters where id=(v_row->>'chapter_id')::uuid; end if;
  perform assessor_rollout_private.assert_legacy_allowed(v_course,v_subjects);
  if v_row_course is distinct from v_course then perform assessor_rollout_private.assert_legacy_allowed(v_row_course,v_subjects); end if;
  perform assessor_rollout_private.assert_legacy_allowed(v_module_course,v_subjects);
 end loop;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;
create trigger assessor_flow_legacy_guard before insert or update or delete on public.competency_observations for each row execute function assessor_rollout_private.legacy_guard();
create trigger assessor_flow_legacy_guard before insert or update or delete on public.assessments for each row execute function assessor_rollout_private.legacy_guard();
create trigger assessor_flow_legacy_guard before insert or update or delete on public.certificates for each row execute function assessor_rollout_private.legacy_guard();
create trigger assessor_flow_legacy_guard before insert or update or delete on public.course_sessions for each row execute function assessor_rollout_private.legacy_guard();
create trigger assessor_flow_legacy_guard before insert or update or delete on public.course_session_enrollments for each row execute function assessor_rollout_private.legacy_guard();
create trigger assessor_flow_legacy_guard before insert or update or delete on public.course_session_deliveries for each row execute function assessor_rollout_private.legacy_guard();
create trigger assessor_flow_legacy_guard before insert or update or delete on public.course_session_activities for each row execute function assessor_rollout_private.legacy_guard();
create trigger assessor_flow_legacy_guard before insert or update or delete on public.assessor_chapter_qualifications for each row execute function assessor_rollout_private.legacy_guard();

revoke execute on all functions in schema assessor_rollout_private from public,anon,authenticated;
grant execute on function assessor_rollout_private.policy(uuid,text),assessor_rollout_private.configure_cohort(uuid,text,text,text,boolean,boolean,boolean,text),assessor_rollout_private.enroll_member(uuid,uuid,text) to authenticated;
revoke execute on function public.rpc_assessor_flow_policy(uuid,text),public.rpc_admin_assessor_flow_cohort_configure(uuid,text,text,text,boolean,boolean,boolean,text),public.rpc_admin_assessor_flow_cohort_enroll(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.rpc_assessor_flow_policy(uuid,text),public.rpc_admin_assessor_flow_cohort_configure(uuid,text,text,text,boolean,boolean,boolean,text),public.rpc_admin_assessor_flow_cohort_enroll(uuid,uuid,text) to authenticated;
commit;
