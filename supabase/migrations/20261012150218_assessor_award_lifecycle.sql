-- C1AF-09: separate combined-award lifecycle. Policy activation is deliberately absent.
begin;
create table assessor_rollout_private.award_lifecycle_control (
 singleton boolean primary key default true check(singleton),
 mutations_enabled boolean not null default false,
 policy_reference text,
 check(not mutations_enabled or nullif(btrim(policy_reference),'') is not null)
);
insert into assessor_rollout_private.award_lifecycle_control(singleton) values(true);
alter table assessor_rollout_private.award_lifecycle_control enable row level security;
revoke all on assessor_rollout_private.award_lifecycle_control from public,anon,authenticated;

-- A separate immutable history avoids exposing private reasons through the broad
-- legacy audit_events table. Only the RPC below can return a scoped projection.
create table assessor_rollout_private.award_lifecycle_events (
 id uuid primary key default gen_random_uuid(),
 award_id uuid not null references assessor_rollout_private.chapter_awards(id),
 operator_id uuid not null references public.users(id),
 actor_id uuid not null references public.users(id),
 program_id uuid not null references public.training_programs(id),
 chapter_id uuid not null references public.training_program_chapters(id),
 previous_status text not null check(previous_status in ('active','suspended','revoked')),
 next_status text not null check(next_status in ('active','suspended','revoked')),
 reason text not null check(length(btrim(reason)) between 10 and 1000),
 policy_reference text not null,
 created_at timestamptz not null default clock_timestamp()
);
create index award_lifecycle_events_award_idx on assessor_rollout_private.award_lifecycle_events(award_id,created_at desc);
alter table assessor_rollout_private.award_lifecycle_events enable row level security;
revoke all on assessor_rollout_private.award_lifecycle_events from public,anon,authenticated;
create function assessor_rollout_private.preserve_award_lifecycle_event() returns trigger
language plpgsql set search_path='' as $$ begin raise exception 'award lifecycle history is immutable'; end; $$;
create trigger preserve_award_lifecycle_event before update or delete on assessor_rollout_private.award_lifecycle_events
 for each row execute function assessor_rollout_private.preserve_award_lifecycle_event();

create function assessor_rollout_private.require_award_admin() returns public.users
language plpgsql stable security definer set search_path='' as $$
declare a public.users;
begin
 a:=public.current_app_user();
 if a.id is null or a.role<>'admin' or a.status<>'active'
  or exists(select 1 from public.super_admin_personas where persona_user_id=a.id) then raise exception 'not authorized'; end if;
 return a;
end; $$;

-- Actor first, then award: the same lock order as the single issuer. The expected
-- state protects a stale form from overwriting another administrator's decision.
create function assessor_rollout_private.set_award_status(p_award_id uuid,p_expected_status text,p_expected_changed_at timestamptz,p_status text,p_reason text)
returns boolean language plpgsql security definer set search_path='' as $$
declare a public.users; w assessor_rollout_private.chapter_awards; target public.users;
 target_id uuid; policy text;
begin
 a:=assessor_rollout_private.require_award_admin();
 if p_status not in ('active','suspended','revoked') or p_expected_status not in ('active','suspended','revoked')
  or p_status is null or p_expected_status is null then raise exception 'invalid status'; end if;
 if p_reason is null or length(btrim(p_reason))<10 or length(p_reason)>1000 then raise exception 'reason must be 10 to 1000 characters'; end if;
 select policy_reference into policy from assessor_rollout_private.award_lifecycle_control
  where singleton and mutations_enabled for share;
 if policy is null then raise exception 'award lifecycle policy is not enabled'; end if;
 -- Read only the immutable actor ID before locking; recheck all scope after locks.
 select actor_id into target_id from assessor_rollout_private.chapter_awards where id=p_award_id;
 if target_id is null then raise exception 'award not found'; end if;
 perform 1 from public.users where id=target_id for update;
 select * into w from assessor_rollout_private.chapter_awards where id=p_award_id for update;
 select * into target from public.users where id=w.actor_id;
 a:=assessor_rollout_private.require_award_admin();
 if target.role<>'assessor' or target.status<>'active' or not exists(
  select 1 from public.org_units ou where ou.id=target.org_unit_id and ou.path like public.current_org_path()||'%')
  or not exists(select 1 from public.training_program_chapters ch
   join public.training_programs p on p.id=ch.program_id
   where ch.id=w.chapter_id and ch.program_id=w.program_id and ch.chapter_key='chapter-1'
    and p.content_key='bhw-reference-manual' and
    (public.current_org_path() like public.org_unit_path(p.org_unit_id)||'%' or public.org_unit_path(p.org_unit_id) like public.current_org_path()||'%'))
 then raise exception 'award out of scope'; end if;
 if w.status<>p_expected_status or w.status_changed_at is distinct from p_expected_changed_at then raise exception 'stale award status'; end if;
 if w.status=p_status then return false; end if;
 if not ((w.status='active' and p_status in ('suspended','revoked'))
   or (w.status='suspended' and p_status in ('active','revoked'))) then raise exception 'transition not permitted'; end if;
 update assessor_rollout_private.chapter_awards set status=p_status,status_changed_at=now() where id=w.id;
 insert into assessor_rollout_private.award_lifecycle_events
 (award_id,operator_id,actor_id,program_id,chapter_id,previous_status,next_status,reason,policy_reference)
 values(w.id,a.id,w.actor_id,w.program_id,w.chapter_id,w.status,p_status,btrim(p_reason),policy);
 return true;
end; $$;
create function public.rpc_admin_assessor_award_set_status(p_award_id uuid,p_expected_status text,p_expected_changed_at timestamptz,p_status text,p_reason text)
returns boolean language sql security invoker set search_path='' as $$
 select assessor_rollout_private.set_award_status(p_award_id,p_expected_status,p_expected_changed_at,p_status,p_reason) $$;

-- Bounded reads expose identifiers, status and only the admin's own area. No
-- evidence blobs, issuer approvals, private notes or certificate display data.
create function assessor_rollout_private.admin_awards(p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a public.users; result jsonb;
begin
 a:=assessor_rollout_private.require_award_admin();
 if p_page is null or p_page<1 or p_page>10000 then raise exception 'invalid page'; end if;
 select jsonb_build_object('mutationEnabled',exists(select 1 from assessor_rollout_private.award_lifecycle_control
   where singleton and mutations_enabled),'rows',coalesce(jsonb_agg(jsonb_build_object(
   'id',s.id,'certificateId',s.certificate_id,'actorId',s.actor_id,'name',s.full_name,
   'programId',s.program_id,'chapterId',s.chapter_id,'status',s.status,'issuedAt',s.issued_at,
   'statusChangedAt',s.status_changed_at,'history',s.history) order by s.issued_at desc,s.id desc),'[]'::jsonb)) into result
 from (select w.id,w.certificate_id,w.actor_id,u.full_name,w.program_id,w.chapter_id,w.status,w.issued_at,w.status_changed_at,
  coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'operatorId',e.operator_id,
   'previousStatus',e.previous_status,'nextStatus',e.next_status,'reason',e.reason,
   'at',e.created_at) order by e.created_at desc,e.id desc)
   from (select * from assessor_rollout_private.award_lifecycle_events where award_id=w.id
    order by created_at desc,id desc limit 20) e),'[]'::jsonb) history
  from assessor_rollout_private.chapter_awards w join public.users u on u.id=w.actor_id
  join public.org_units ou on ou.id=u.org_unit_id
  join public.training_program_chapters ch on ch.id=w.chapter_id
  join public.training_programs p on p.id=w.program_id
  where u.role='assessor' and ou.path like public.current_org_path()||'%'
   and ch.program_id=w.program_id and ch.chapter_key='chapter-1' and p.content_key='bhw-reference-manual'
   and (public.current_org_path() like public.org_unit_path(p.org_unit_id)||'%' or public.org_unit_path(p.org_unit_id) like public.current_org_path()||'%')
  order by w.issued_at desc,w.id desc limit 30 offset (p_page-1)*30) s;
 return result;
end; $$;
create function public.rpc_admin_assessor_awards(p_page integer default 1) returns jsonb
language sql stable security invoker set search_path='' as $$select assessor_rollout_private.admin_awards(p_page)$$;

-- History is independently paginated so the first 20 events never hide an
-- older reason. Scope is checked again on every page.
create function assessor_rollout_private.admin_award_history(p_award_id uuid,p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a public.users; result jsonb;
begin
 a:=assessor_rollout_private.require_award_admin();
 if p_page is null or p_page<1 or p_page>10000 then raise exception 'invalid page'; end if;
 if not exists(select 1 from assessor_rollout_private.chapter_awards w
  join public.users u on u.id=w.actor_id join public.org_units ou on ou.id=u.org_unit_id
  join public.training_program_chapters ch on ch.id=w.chapter_id
  join public.training_programs p on p.id=w.program_id
  where w.id=p_award_id and u.role='assessor' and ou.path like public.current_org_path()||'%'
   and ch.program_id=w.program_id and ch.chapter_key='chapter-1' and p.content_key='bhw-reference-manual'
   and (public.current_org_path() like public.org_unit_path(p.org_unit_id)||'%'
    or public.org_unit_path(p.org_unit_id) like public.current_org_path()||'%')) then raise exception 'award out of scope'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'operatorId',e.operator_id,
  'previousStatus',e.previous_status,'nextStatus',e.next_status,'reason',e.reason,
  'at',e.created_at) order by e.created_at desc,e.id desc),'[]'::jsonb) into result
 from (select * from assessor_rollout_private.award_lifecycle_events where award_id=p_award_id
  order by created_at desc,id desc limit 20 offset (p_page-1)*20) e;
 return result;
end; $$;
create function public.rpc_admin_assessor_award_history(p_award_id uuid,p_page integer default 1) returns jsonb
language sql stable security invoker set search_path='' as $$select assessor_rollout_private.admin_award_history(p_award_id,p_page)$$;

-- This report deliberately has no write path. 'Evidence complete' means the
-- observed records match the current contract; the issuer still performs its
-- complete transactional check before any future explicit conversion.
create function assessor_rollout_private.transition_report(p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a public.users; result jsonb;
begin
 a:=assessor_rollout_private.require_award_admin();
 if p_page is null or p_page<1 or p_page>10000 then raise exception 'invalid page'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('legacyId',s.id,'actorId',s.assessor_user_id,
  'name',s.full_name,'chapterKey',s.chapter_key,'programId',s.program_id,'status',s.status,
  'curriculumVersion',s.curriculum_version,'orientationVersion',s.orientation_version,
  'requirementsVersion',s.requirements_version,'category',s.category,'blockers',s.blockers,
  'nextStep',s.next_step,'combinedAwardId',s.award_id) order by s.issued_at desc,s.id desc),'[]'::jsonb) into result
 from (select q.id,q.assessor_user_id,u.full_name,q.status,q.curriculum_version,q.orientation_version,
  q.issued_at,ch.chapter_key,ch.program_id,c.requirements_version,w.id award_id,
  case when q.status<>'active' then 'restricted'
   when ch.chapter_key<>'chapter-1' then 'legacy_only'
   when ch.availability<>'available' or p.status<>'published' or course.status<>'published' then 'publication_unavailable'
   when w.id is not null then 'already_awarded'
   when c.requirements_version is null or not c.allow_prior_evidence then 'policy_unavailable'
   when q.curriculum_version<>c.curriculum_version or q.orientation_version<>c.orientation_version then 'version_conflict'
   when er.chapter_key is null or not assessor_private.chapter_lessons_complete(q.assessor_user_id,q.chapter_id,ch.course_id,er.required_lessons)
    or not exists(select 1 from public.assessor_briefing_acknowledgements b where b.assessor_user_id=q.assessor_user_id
     and b.program_id=ch.program_id and b.chapter_key=ch.chapter_key and b.requirements_version=c.requirements_version
     and b.briefing_version='chapter-1:briefing.v1')
    or orient.chapter_key is null or exists(select 1 from jsonb_array_elements(orient.lessons) l where not exists(
     select 1 from public.assessor_orientation_lesson_progress lp where lp.assessor_user_id=q.assessor_user_id
      and lp.chapter_id=q.chapter_id and lp.curriculum_version=c.curriculum_version
      and lp.orientation_version=c.orientation_version and lp.lesson_id=l->>'id'))
    or not exists(select 1 from public.assessor_exam_attempts x where x.assessor_user_id=q.assessor_user_id
    and x.chapter_id=q.chapter_id and x.curriculum_version=c.curriculum_version and x.phase='pretest' and x.status='submitted')
    or not exists(select 1 from public.assessor_exam_attempts x where x.assessor_user_id=q.assessor_user_id
    and x.chapter_id=q.chapter_id and x.curriculum_version=c.curriculum_version and x.phase='posttest' and x.status='submitted'
    and x.passed and x.score_percent>=x.passing_percent)
    or not exists(select 1 from public.assessor_orientation_attempts x where x.assessor_user_id=q.assessor_user_id
    and x.chapter_id=q.chapter_id and x.curriculum_version=c.curriculum_version and x.orientation_version=c.orientation_version and x.passed)
    or not exists(select 1 from assessor_rollout_private.simulation_runs r where r.actor_id=q.assessor_user_id
     and r.program_id=ch.program_id and r.state->'receipt'->>'requirementsVersion'=c.requirements_version
     and r.state->'receipt'->>'actorId'=q.assessor_user_id::text
     and r.state->'receipt'->>'programInstanceId'=ch.program_id::text
     and r.state->'receipt'->'serverValidated'='true'::jsonb
     and r.state->'receipt'->>'id' is not null and r.state->'receipt'->>'completedAt' is not null
     and r.state->'receipt'->>'programKey'='bhw-reference-manual'
     and r.state->'receipt'->>'chapterKey'=ch.chapter_key
     and r.state->'receipt'->>'scenarioId'=c.scenario_id and r.state->'receipt'->>'version'=c.scenario_version
     and r.state->'receipt'->'checkpointIds'=c.checkpoint_ids
     and r.state->'receipt'->'checkpointVersions'=c.checkpoint_versions)
    then 'missing_evidence' else 'evidence_complete' end category,
  array_remove(array[
   case when q.status<>'active' then 'legacy_status_'||q.status end,
   case when ch.chapter_key<>'chapter-1' then 'combined_path_unavailable' end,
   case when ch.chapter_key='chapter-1' and (ch.availability<>'available' or p.status<>'published' or course.status<>'published') then 'publication_unavailable' end,
   case when c.requirements_version is null and ch.chapter_key='chapter-1' then 'accepted_contract_unavailable' end,
   case when c.requirements_version is not null and not c.allow_prior_evidence then 'prior_evidence_reuse_unapproved' end,
   case when c.requirements_version is not null and (q.curriculum_version<>c.curriculum_version or q.orientation_version<>c.orientation_version) then 'version_mismatch' end,
   case when c.requirements_version is not null and (er.chapter_key is null or not assessor_private.chapter_lessons_complete(q.assessor_user_id,q.chapter_id,ch.course_id,er.required_lessons)) then 'study_missing' end,
   case when c.requirements_version is not null and not exists(select 1 from public.assessor_briefing_acknowledgements b where b.assessor_user_id=q.assessor_user_id and b.program_id=ch.program_id and b.chapter_key=ch.chapter_key and b.requirements_version=c.requirements_version and b.briefing_version='chapter-1:briefing.v1') then 'briefing_missing' end,
   case when c.requirements_version is not null and (orient.chapter_key is null or exists(select 1 from jsonb_array_elements(orient.lessons) l where not exists(select 1 from public.assessor_orientation_lesson_progress lp where lp.assessor_user_id=q.assessor_user_id and lp.chapter_id=q.chapter_id and lp.curriculum_version=c.curriculum_version and lp.orientation_version=c.orientation_version and lp.lesson_id=l->>'id'))) then 'orientation_lessons_missing' end,
   case when c.requirements_version is not null and not exists(select 1 from public.assessor_exam_attempts x where x.assessor_user_id=q.assessor_user_id and x.chapter_id=q.chapter_id and x.curriculum_version=c.curriculum_version and x.phase='pretest' and x.status='submitted') then 'pretest_missing' end,
   case when c.requirements_version is not null and not exists(select 1 from public.assessor_exam_attempts x where x.assessor_user_id=q.assessor_user_id and x.chapter_id=q.chapter_id and x.curriculum_version=c.curriculum_version and x.phase='posttest' and x.status='submitted' and x.passed and x.score_percent>=x.passing_percent) then 'posttest_missing' end,
   case when c.requirements_version is not null and not exists(select 1 from public.assessor_orientation_attempts x where x.assessor_user_id=q.assessor_user_id and x.chapter_id=q.chapter_id and x.curriculum_version=c.curriculum_version and x.orientation_version=c.orientation_version and x.passed) then 'orientation_missing' end,
   case when c.requirements_version is not null and not exists(select 1 from assessor_rollout_private.simulation_runs r where r.actor_id=q.assessor_user_id and r.program_id=ch.program_id and r.state->'receipt'->>'requirementsVersion'=c.requirements_version and r.state->'receipt'->>'actorId'=q.assessor_user_id::text and r.state->'receipt'->>'programInstanceId'=ch.program_id::text and r.state->'receipt'->'serverValidated'='true'::jsonb
     and r.state->'receipt'->>'id' is not null and r.state->'receipt'->>'completedAt' is not null
     and r.state->'receipt'->>'programKey'='bhw-reference-manual'
     and r.state->'receipt'->>'chapterKey'=ch.chapter_key
     and r.state->'receipt'->>'scenarioId'=c.scenario_id and r.state->'receipt'->>'version'=c.scenario_version
     and r.state->'receipt'->'checkpointIds'=c.checkpoint_ids
     and r.state->'receipt'->'checkpointVersions'=c.checkpoint_versions) then 'simulation_missing' end
  ],null) blockers,
  case when q.status<>'active' then 'contact_admin' when ch.chapter_key<>'chapter-1' then 'await_combined_chapter_path'
   when ch.availability<>'available' or p.status<>'published' or course.status<>'published' then 'await_publication'
   when w.id is not null then 'view_combined_award' when c.requirements_version is null or not c.allow_prior_evidence then 'await_approved_contract'
   else 'open_my_certifications' end next_step
  from public.assessor_chapter_qualifications q join public.users u on u.id=q.assessor_user_id
  join public.org_units ou on ou.id=u.org_unit_id
  join public.training_program_chapters ch on ch.id=q.chapter_id
  join public.training_programs p on p.id=ch.program_id
  join public.courses course on course.id=ch.course_id
  left join public.assessor_flow_cohort_members m on m.user_id=q.assessor_user_id and m.program_id=ch.program_id and m.chapter_key=ch.chapter_key
  left join public.assessor_flow_cohorts co on co.id=m.cohort_id
  left join assessor_rollout_private.award_contracts c on c.requirements_version=co.requirements_version and c.enabled
  left join assessor_private.exam_requirements er on er.chapter_key=ch.chapter_key and er.curriculum_version=c.curriculum_version
  left join assessor_private.orientation_units orient on orient.chapter_key=ch.chapter_key and orient.curriculum_version=c.curriculum_version and orient.orientation_version=c.orientation_version
  left join assessor_rollout_private.chapter_awards w on w.legacy_qualification_id=q.id
  where u.role='assessor' and ou.path like public.current_org_path()||'%'
   and p.content_key='bhw-reference-manual' and
   (public.current_org_path() like public.org_unit_path(p.org_unit_id)||'%' or public.org_unit_path(p.org_unit_id) like public.current_org_path()||'%')
  order by q.issued_at desc,q.id desc limit 30 offset (p_page-1)*30) s;
 return result;
end; $$;
create function public.rpc_admin_assessor_transition_report(p_page integer default 1) returns jsonb
language sql stable security invoker set search_path='' as $$select assessor_rollout_private.transition_report(p_page)$$;

revoke all on function assessor_rollout_private.preserve_award_lifecycle_event(),assessor_rollout_private.require_award_admin(),
 assessor_rollout_private.set_award_status(uuid,text,timestamptz,text,text),assessor_rollout_private.admin_awards(integer),
 assessor_rollout_private.transition_report(integer),assessor_rollout_private.admin_award_history(uuid,integer),
 public.rpc_admin_assessor_award_history(uuid,integer),public.rpc_admin_assessor_award_set_status(uuid,text,timestamptz,text,text),
 public.rpc_admin_assessor_awards(integer),public.rpc_admin_assessor_transition_report(integer) from public,anon,authenticated;
grant execute on function assessor_rollout_private.set_award_status(uuid,text,timestamptz,text,text),assessor_rollout_private.admin_awards(integer),
 assessor_rollout_private.transition_report(integer),assessor_rollout_private.admin_award_history(uuid,integer),
 public.rpc_admin_assessor_award_history(uuid,integer),public.rpc_admin_assessor_award_set_status(uuid,text,timestamptz,text,text),
 public.rpc_admin_assessor_awards(integer),public.rpc_admin_assessor_transition_report(integer) to authenticated;
commit;
