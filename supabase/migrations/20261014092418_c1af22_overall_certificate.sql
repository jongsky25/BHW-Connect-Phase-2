-- C1AF-22: overall output and disclosure remain dormant until reviewed.
begin;

alter table assessor_rollout_private.overall_award_contracts
 add column issuer_snapshot jsonb not null default '{}'::jsonb
 check (jsonb_typeof(issuer_snapshot)='object');
alter table assessor_rollout_private.overall_awards
 add column certificate_id uuid not null unique default gen_random_uuid();

create table assessor_rollout_private.overall_certificate_displays (
 award_id uuid primary key references assessor_rollout_private.overall_awards(id),
 display_version integer not null check(display_version=1),
 holder_name text not null,
 program_title_fil text not null,
 program_title_en text not null,
 issuer_organization text not null,
 issuer_signatory text not null,
 issuer_title text not null
);
alter table assessor_rollout_private.overall_certificate_displays enable row level security;
revoke all on assessor_rollout_private.overall_certificate_displays from public,anon,authenticated;
create function assessor_rollout_private.capture_overall_display() returns trigger
language plpgsql security definer set search_path='' as $$
declare holder text; program public.training_programs; issuer jsonb;
begin
 select full_name into holder from public.users where id=new.actor_id;
 select * into program from public.training_programs where id=new.program_id;
 select issuer_snapshot into issuer from assessor_rollout_private.overall_award_contracts
  where program_id=new.program_id and rule_version=new.rule_version;
 if nullif(btrim(holder),'') is not null
  and nullif(btrim(program.title_fil),'') is not null and nullif(btrim(program.title_en),'') is not null
  and jsonb_typeof(issuer->'organization')='string' and nullif(btrim(issuer->>'organization'),'') is not null
  and jsonb_typeof(issuer->'signatory')='string' and nullif(btrim(issuer->>'signatory'),'') is not null
  and jsonb_typeof(issuer->'title')='string' and nullif(btrim(issuer->>'title'),'') is not null then
  insert into assessor_rollout_private.overall_certificate_displays values(new.id,1,holder,
   program.title_fil,program.title_en,issuer->>'organization',issuer->>'signatory',issuer->>'title');
 end if;
 return new;
end; $$;
create trigger capture_overall_display after insert on assessor_rollout_private.overall_awards
 for each row execute function assessor_rollout_private.capture_overall_display();
create function assessor_rollout_private.preserve_overall_display() returns trigger
language plpgsql set search_path='' as $$begin raise exception 'overall display is immutable'; end; $$;
create trigger preserve_overall_display before update or delete on assessor_rollout_private.overall_certificate_displays
 for each row execute function assessor_rollout_private.preserve_overall_display();

create table assessor_rollout_private.overall_certificate_output_control (
 singleton boolean primary key default true check(singleton),
 public_verification_enabled boolean not null default false
);
insert into assessor_rollout_private.overall_certificate_output_control values(true,false);
alter table assessor_rollout_private.overall_certificate_output_control enable row level security;
revoke all on assessor_rollout_private.overall_certificate_output_control from public,anon,authenticated;

-- Owner output shows the pinned sources, including historical status. No read
-- issues an award or fills a missing snapshot.
create function assessor_rollout_private.overall_certificate_owner(p_certificate_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor public.users; result jsonb;
begin
 actor:=public.current_app_user();
 if actor.id is null or actor.role<>'assessor' or actor.status<>'active'
  or exists(select 1 from public.super_admin_personas where persona_user_id=actor.id)
 then raise exception 'not authorized'; end if;
 if p_certificate_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return null; end if;
 select jsonb_build_object('certificateId',w.certificate_id,'programId',w.program_id,
  'ruleVersion',w.rule_version,'issuedAt',w.issued_at,
  'status',assessor_rollout_private.overall_award_current_status(w.id),'currentPermission',false,
  'displayVersion',d.display_version,'holderName',d.holder_name,'programTitleFil',d.program_title_fil,
  'programTitleEn',d.program_title_en,'issuerOrganization',d.issuer_organization,
  'issuerSignatory',d.issuer_signatory,'issuerTitle',d.issuer_title,
  'sources',coalesce((select jsonb_agg(jsonb_build_object('chapterKey',s.chapter_key,
   'sourceType',case when s.chapter_award_id is null then 'legacy' else 'combined' end,
   'sourceId',coalesce(s.chapter_award_id,s.legacy_qualification_id),
   'chapterCertificateId',ch_award.certificate_id,
   'status',case when s.chapter_award_id is null then legacy.status
     else assessor_rollout_private.certificate_current_status(s.chapter_award_id) end)
   order by s.chapter_key) from assessor_rollout_private.overall_award_sources s
   left join assessor_rollout_private.chapter_awards ch_award on ch_award.id=s.chapter_award_id
   left join public.assessor_chapter_qualifications legacy on legacy.id=s.legacy_qualification_id
   where s.overall_award_id=w.id),'[]'::jsonb))
 into result from assessor_rollout_private.overall_awards w
 left join assessor_rollout_private.overall_certificate_displays d on d.award_id=w.id
 where w.certificate_id=p_certificate_id::uuid and w.actor_id=actor.id;
 return result;
end; $$;
create function public.rpc_assessor_overall_certificate_owner(p_certificate_id text) returns jsonb
language sql stable security invoker set search_path='' as $$
 select assessor_rollout_private.overall_certificate_owner(p_certificate_id) $$;

-- Public verification is separately gated. Never publish holder, signatory,
-- source IDs, evidence, catchment, or current chapter permissions.
create function assessor_rollout_private.overall_certificate_verify(p_certificate_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from assessor_rollout_private.overall_certificate_output_control
  where singleton and public_verification_enabled) then return jsonb_build_object('available',false); end if;
 if p_certificate_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
  return jsonb_build_object('available',true,'found',false); end if;
 select jsonb_build_object('available',true,'found',true,'certificateType','assessor_facilitator_overall',
  'certificateId',w.certificate_id,'programTitleFil',d.program_title_fil,
  'programTitleEn',d.program_title_en,'chapterKeys',array['chapter-1','chapter-2','chapter-3'],
  'issuedAt',w.issued_at,'issuerOrganization',d.issuer_organization,
  'status',assessor_rollout_private.overall_award_current_status(w.id),'currentPermission',false)
 into result from assessor_rollout_private.overall_awards w
 join assessor_rollout_private.overall_certificate_displays d on d.award_id=w.id
 where w.certificate_id=p_certificate_id::uuid;
 return coalesce(result,jsonb_build_object('available',true,'found',false));
end; $$;
create function public.rpc_assessor_overall_certificate_verify(p_certificate_id text) returns jsonb
language sql stable security invoker set search_path='' as $$
 select assessor_rollout_private.overall_certificate_verify(p_certificate_id) $$;

-- Compatibility-aware, owner-only progress. An absent rule is distinct from
-- an incomplete chapter and never silently accepts historical versions.
create function assessor_rollout_private.overall_progress(p_program_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor public.users; rule assessor_rollout_private.overall_award_contracts;
 chapter public.training_program_chapters; key text; requirement jsonb;
 chapter_status text; next_step text; qualified integer:=0; rows jsonb:='[]'::jsonb; awards jsonb;
begin
 actor:=public.current_app_user();
 if actor.id is null or actor.role<>'assessor' or actor.status<>'active'
  or exists(select 1 from public.super_admin_personas where persona_user_id=actor.id)
 then raise exception 'not authorized'; end if;
 if not exists(select 1 from public.training_programs p where p.id=p_program_id
  and p.content_key='bhw-reference-manual' and p.status='published'
  and (public.current_org_path() like public.org_unit_path(p.org_unit_id)||'%'
   or public.org_unit_path(p.org_unit_id) like public.current_org_path()||'%'))
 then raise exception 'program unavailable'; end if;
 select * into rule from assessor_rollout_private.overall_award_contracts
  where program_id=p_program_id and enabled;
 for key in select unnest(array['chapter-1','chapter-2','chapter-3']) loop
  select * into chapter from public.training_program_chapters
   where program_id=p_program_id and chapter_key=key;
  requirement:=rule.chapter_requirements->key;
  if chapter.id is null or chapter.availability<>'available'
   or not exists(select 1 from public.courses course where course.id=chapter.course_id and course.status='published')
   then chapter_status:='unavailable';
  elsif rule.program_id is null then chapter_status:='await_rule';
  elsif requirement->>'kind'='combined' then
   if exists(select 1 from assessor_rollout_private.chapter_awards w
    join assessor_rollout_private.award_contracts c on c.requirements_version=w.requirements_version
    where w.actor_id=actor.id and w.chapter_id=chapter.id and w.program_id=p_program_id
     and w.requirements_version=requirement->>'requirementsVersion'
     and c.award_rule_version=requirement->>'awardRuleVersion'
     and assessor_rollout_private.certificate_current_status(w.id)='active')
    and not exists(select 1 from assessor_rollout_private.chapter_awards w
     where w.actor_id=actor.id and w.chapter_id=chapter.id and w.status<>'active')
    then chapter_status:='qualified';
   elsif exists(select 1 from assessor_rollout_private.chapter_awards w
     where w.actor_id=actor.id and w.chapter_id=chapter.id) then chapter_status:='update_or_resolve';
   else chapter_status:='missing'; end if;
  else
   if exists(select 1 from public.assessor_chapter_qualifications q
    where q.assessor_user_id=actor.id and q.chapter_id=chapter.id and q.status='active'
     and q.curriculum_version=requirement->>'curriculumVersion'
     and q.rubric_version=requirement->>'rubricVersion'
     and q.orientation_version=requirement->>'orientationVersion')
    and not exists(select 1 from public.assessor_chapter_qualifications q
     where q.assessor_user_id=actor.id and q.chapter_id=chapter.id and q.status<>'active')
    then chapter_status:='qualified';
   elsif exists(select 1 from public.assessor_chapter_qualifications q
     where q.assessor_user_id=actor.id and q.chapter_id=chapter.id) then chapter_status:='update_or_resolve';
   else chapter_status:='missing'; end if;
  end if;
  if chapter_status='qualified' then qualified:=qualified+1;
  elsif next_step is null then next_step:=case when chapter_status='unavailable' then 'await_'||key
   when chapter_status='await_rule' then 'await_rule'
   when chapter_status='update_or_resolve' then 'review_'||key
   else 'complete_'||key end; end if;
  rows:=rows||jsonb_build_array(jsonb_build_object('chapterKey',key,'status',chapter_status));
 end loop;
 if rule.program_id is null then next_step:='await_rule'; end if;
 select jsonb_agg(jsonb_build_object('certificateId',w.certificate_id,'ruleVersion',w.rule_version,
  'issuedAt',w.issued_at,'status',assessor_rollout_private.overall_award_current_status(w.id),
  'outputAvailable',exists(select 1 from assessor_rollout_private.overall_certificate_displays d where d.award_id=w.id))
  order by w.issued_at desc,w.id desc) into awards
 from (select * from assessor_rollout_private.overall_awards where actor_id=actor.id and program_id=p_program_id
  order by issued_at desc,id desc limit 20) w;
 return jsonb_build_object('ruleAvailable',rule.program_id is not null,'qualifiedCount',qualified,
  'requiredCount',3,'nextStep',next_step,'chapters',rows,'awards',coalesce(awards,'[]'::jsonb));
end; $$;
create function public.rpc_assessor_overall_progress(p_program_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select assessor_rollout_private.overall_progress(p_program_id) $$;

-- The overall lifecycle has its own policy gate. Revocation is terminal;
-- restoring a chapter alone never clears an explicit overall suspension.
create table assessor_rollout_private.overall_lifecycle_control (
 singleton boolean primary key default true check(singleton),
 mutations_enabled boolean not null default false,
 policy_reference text,
 check(not mutations_enabled or nullif(btrim(policy_reference),'') is not null)
);
insert into assessor_rollout_private.overall_lifecycle_control(singleton) values(true);
alter table assessor_rollout_private.overall_lifecycle_control enable row level security;
revoke all on assessor_rollout_private.overall_lifecycle_control from public,anon,authenticated;
create table assessor_rollout_private.overall_lifecycle_events (
 id uuid primary key default gen_random_uuid(),
 award_id uuid not null references assessor_rollout_private.overall_awards(id),
 operator_id uuid not null references public.users(id),
 previous_status text not null,
 next_status text not null,
 reason text not null check(length(btrim(reason)) between 10 and 1000),
 policy_reference text not null,
 created_at timestamptz not null default clock_timestamp()
);
create index overall_lifecycle_events_award_idx on assessor_rollout_private.overall_lifecycle_events(award_id,created_at desc);
alter table assessor_rollout_private.overall_lifecycle_events enable row level security;
revoke all on assessor_rollout_private.overall_lifecycle_events from public,anon,authenticated;
create function assessor_rollout_private.preserve_overall_lifecycle_event() returns trigger
language plpgsql set search_path='' as $$begin raise exception 'overall lifecycle event is immutable'; end; $$;
create trigger preserve_overall_lifecycle_event before update or delete on assessor_rollout_private.overall_lifecycle_events
 for each row execute function assessor_rollout_private.preserve_overall_lifecycle_event();

create function assessor_rollout_private.set_overall_status(p_award_id uuid,p_expected_status text,
 p_expected_changed_at timestamptz,p_status text,p_reason text) returns boolean
language plpgsql security definer set search_path='' as $$
declare admin public.users; target public.users; award assessor_rollout_private.overall_awards;
 target_id uuid; policy text;
begin
 admin:=assessor_rollout_private.require_award_admin();
 if p_status not in ('active','suspended','revoked') or p_expected_status not in ('active','suspended','revoked')
  or p_status is null or p_expected_status is null then raise exception 'invalid status'; end if;
 if p_reason is null or length(btrim(p_reason))<10 or length(p_reason)>1000
  then raise exception 'reason must be 10 to 1000 characters'; end if;
 select policy_reference into policy from assessor_rollout_private.overall_lifecycle_control
  where singleton and mutations_enabled for share;
 if policy is null then raise exception 'overall lifecycle policy is not enabled'; end if;
 select actor_id into target_id from assessor_rollout_private.overall_awards where id=p_award_id;
 if target_id is null then raise exception 'overall award not found'; end if;
 perform 1 from public.users where id=target_id for update;
 select * into award from assessor_rollout_private.overall_awards where id=p_award_id for update;
 select * into target from public.users where id=award.actor_id;
 admin:=assessor_rollout_private.require_award_admin();
 if target.role<>'assessor' or not exists(select 1 from public.org_units ou
    where ou.id=target.org_unit_id and ou.path like public.current_org_path()||'%')
  or not exists(select 1 from public.training_programs p where p.id=award.program_id
    and (public.current_org_path() like public.org_unit_path(p.org_unit_id)||'%'
     or public.org_unit_path(p.org_unit_id) like public.current_org_path()||'%'))
 then raise exception 'overall award out of scope'; end if;
 if award.status<>p_expected_status or award.status_changed_at is distinct from p_expected_changed_at
  then raise exception 'stale overall status'; end if;
 if award.status=p_status then return false; end if;
 if not ((award.status='active' and p_status in ('suspended','revoked'))
  or (award.status='suspended' and p_status in ('active','revoked')))
 then raise exception 'transition not permitted'; end if;
 update assessor_rollout_private.overall_awards set status=p_status,status_changed_at=now() where id=award.id;
 insert into assessor_rollout_private.overall_lifecycle_events(award_id,operator_id,previous_status,next_status,reason,policy_reference)
 values(award.id,admin.id,award.status,p_status,btrim(p_reason),policy);
 return true;
end; $$;
create function public.rpc_admin_assessor_overall_award_set_status(p_award_id uuid,p_expected_status text,
 p_expected_changed_at timestamptz,p_status text,p_reason text) returns boolean
language sql security invoker set search_path='' as $$
 select assessor_rollout_private.set_overall_status(p_award_id,p_expected_status,p_expected_changed_at,p_status,p_reason) $$;
create function assessor_rollout_private.admin_overall_awards(p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare admin public.users; rows jsonb;
begin
 admin:=assessor_rollout_private.require_award_admin();
 if p_page is null or p_page<1 or p_page>10000 then raise exception 'invalid page'; end if;
 select jsonb_agg(jsonb_build_object('id',w.id,'certificateId',w.certificate_id,
  'actorId',w.actor_id,'name',u.full_name,'programId',w.program_id,
  'status',w.status,'currentStatus',assessor_rollout_private.overall_award_current_status(w.id),
  'statusChangedAt',w.status_changed_at,'issuedAt',w.issued_at) order by w.issued_at desc,w.id desc)
 into rows from (select award.* from assessor_rollout_private.overall_awards award
  join public.users target on target.id=award.actor_id
  join public.org_units ou on ou.id=target.org_unit_id
  join public.training_programs p on p.id=award.program_id
  where target.role='assessor' and ou.path like public.current_org_path()||'%'
   and (public.current_org_path() like public.org_unit_path(p.org_unit_id)||'%'
    or public.org_unit_path(p.org_unit_id) like public.current_org_path()||'%')
  order by award.issued_at desc,award.id desc limit 30 offset (p_page-1)*30) w
 join public.users u on u.id=w.actor_id;
 return jsonb_build_object('mutationEnabled',exists(select 1 from assessor_rollout_private.overall_lifecycle_control
  where singleton and mutations_enabled),'rows',coalesce(rows,'[]'::jsonb));
end; $$;
create function public.rpc_admin_assessor_overall_awards(p_page integer default 1) returns jsonb
language sql stable security invoker set search_path='' as $$
 select assessor_rollout_private.admin_overall_awards(p_page) $$;

revoke all on function assessor_rollout_private.capture_overall_display(),assessor_rollout_private.preserve_overall_display(),
 assessor_rollout_private.overall_certificate_owner(text),public.rpc_assessor_overall_certificate_owner(text),
 assessor_rollout_private.overall_certificate_verify(text),public.rpc_assessor_overall_certificate_verify(text),
 assessor_rollout_private.overall_progress(uuid),public.rpc_assessor_overall_progress(uuid),
 assessor_rollout_private.preserve_overall_lifecycle_event(),assessor_rollout_private.set_overall_status(uuid,text,timestamptz,text,text),
 public.rpc_admin_assessor_overall_award_set_status(uuid,text,timestamptz,text,text),
 assessor_rollout_private.admin_overall_awards(integer),public.rpc_admin_assessor_overall_awards(integer)
 from public,anon,authenticated;
grant execute on function assessor_rollout_private.overall_certificate_owner(text),public.rpc_assessor_overall_certificate_owner(text),
 assessor_rollout_private.overall_progress(uuid),public.rpc_assessor_overall_progress(uuid),
 assessor_rollout_private.set_overall_status(uuid,text,timestamptz,text,text),
 public.rpc_admin_assessor_overall_award_set_status(uuid,text,timestamptz,text,text),
 assessor_rollout_private.admin_overall_awards(integer),public.rpc_admin_assessor_overall_awards(integer) to authenticated;
grant execute on function assessor_rollout_private.overall_certificate_verify(text),
 public.rpc_assessor_overall_certificate_verify(text) to anon,authenticated;
commit;
