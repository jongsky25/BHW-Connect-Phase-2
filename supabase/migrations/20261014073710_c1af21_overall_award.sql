-- C1AF-21: dormant, versioned overall award. Reviewed rules are installed separately.
begin;

create table assessor_rollout_private.overall_award_contracts (
 program_id uuid not null references public.training_programs(id),
 rule_version text not null check (btrim(rule_version)<>''),
 chapter_requirements jsonb not null,
 review_reference text not null check (btrim(review_reference)<>''),
 enabled boolean not null default false,
 primary key(program_id,rule_version)
);
create unique index one_enabled_overall_rule_per_program
 on assessor_rollout_private.overall_award_contracts(program_id) where enabled;
alter table assessor_rollout_private.overall_award_contracts enable row level security;
revoke all on assessor_rollout_private.overall_award_contracts from public,anon,authenticated;

create table assessor_rollout_private.overall_awards (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null references public.users(id),
 program_id uuid not null references public.training_programs(id),
 rule_version text not null,
 issued_at timestamptz not null default now(),
 status text not null default 'active' check(status in ('active','suspended','revoked')),
 status_changed_at timestamptz,
 unique(actor_id,program_id,rule_version),
 foreign key(program_id,rule_version) references assessor_rollout_private.overall_award_contracts(program_id,rule_version)
);
create index overall_awards_actor_idx on assessor_rollout_private.overall_awards(actor_id,program_id,issued_at desc);
alter table assessor_rollout_private.overall_awards enable row level security;
revoke all on assessor_rollout_private.overall_awards from public,anon,authenticated;

create table assessor_rollout_private.overall_award_sources (
 overall_award_id uuid not null references assessor_rollout_private.overall_awards(id),
 chapter_key text not null check(chapter_key in ('chapter-1','chapter-2','chapter-3')),
 chapter_award_id uuid references assessor_rollout_private.chapter_awards(id),
 legacy_qualification_id uuid references public.assessor_chapter_qualifications(id),
 primary key(overall_award_id,chapter_key),
 check((chapter_award_id is null)<>(legacy_qualification_id is null))
);
create index overall_award_sources_chapter_idx on assessor_rollout_private.overall_award_sources(chapter_award_id) where chapter_award_id is not null;
create index overall_award_sources_legacy_idx on assessor_rollout_private.overall_award_sources(legacy_qualification_id) where legacy_qualification_id is not null;
alter table assessor_rollout_private.overall_award_sources enable row level security;
revoke all on assessor_rollout_private.overall_award_sources from public,anon,authenticated;

-- A rule names exactly three source types and exact version identifiers. A
-- combined Chapter 1 rule is independent of the legacy Chapter 2/3 versions.
create function assessor_rollout_private.validate_overall_rule() returns trigger
language plpgsql set search_path='' as $$
declare item record; value jsonb;
begin
 if jsonb_typeof(new.chapter_requirements)<>'object'
  or (select count(*) from jsonb_object_keys(new.chapter_requirements))<>3
  or not (new.chapter_requirements ?& array['chapter-1','chapter-2','chapter-3'])
 then raise exception 'overall rule requires exactly three chapters'; end if;
 for item in select e.key,e.value from jsonb_each(new.chapter_requirements) e loop
  value:=item.value;
  if jsonb_typeof(value)<>'object' then raise exception 'invalid chapter requirement'; end if;
  if value->>'kind'='combined' then
   if (select count(*) from jsonb_object_keys(value))<>3
    or jsonb_typeof(value->'requirementsVersion')<>'string'
    or jsonb_typeof(value->'awardRuleVersion')<>'string'
    or nullif(btrim(value->>'requirementsVersion'),'') is null
    or nullif(btrim(value->>'awardRuleVersion'),'') is null
   then raise exception 'invalid combined chapter requirement'; end if;
  elsif value->>'kind'='legacy' then
   if (select count(*) from jsonb_object_keys(value))<>4
    or jsonb_typeof(value->'curriculumVersion')<>'string'
    or jsonb_typeof(value->'rubricVersion')<>'string'
    or jsonb_typeof(value->'orientationVersion')<>'string'
    or nullif(btrim(value->>'curriculumVersion'),'') is null
    or nullif(btrim(value->>'rubricVersion'),'') is null
    or nullif(btrim(value->>'orientationVersion'),'') is null
   then raise exception 'invalid legacy chapter requirement'; end if;
  else raise exception 'unknown chapter award type'; end if;
 end loop;
 if tg_op='UPDATE' and exists(select 1 from assessor_rollout_private.overall_awards
   where program_id=old.program_id and rule_version=old.rule_version)
  and (to_jsonb(new)-'enabled') is distinct from (to_jsonb(old)-'enabled')
 then raise exception 'issued overall rule is immutable'; end if;
 return new;
end; $$;
create trigger validate_overall_rule before insert or update on assessor_rollout_private.overall_award_contracts
 for each row execute function assessor_rollout_private.validate_overall_rule();
create function assessor_rollout_private.preserve_overall_rule() returns trigger
language plpgsql set search_path='' as $$
begin
 if exists(select 1 from assessor_rollout_private.overall_awards
  where program_id=old.program_id and rule_version=old.rule_version) then
  raise exception 'issued overall rule is immutable'; end if;
 return old;
end; $$;
create trigger preserve_overall_rule before delete on assessor_rollout_private.overall_award_contracts
 for each row execute function assessor_rollout_private.preserve_overall_rule();
create function assessor_rollout_private.preserve_overall_award() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'overall award is immutable'; end if;
 if (to_jsonb(new)-'status'-'status_changed_at') is distinct from (to_jsonb(old)-'status'-'status_changed_at')
 then raise exception 'overall award evidence is immutable'; end if;
 return new;
end; $$;
create trigger preserve_overall_award before update or delete on assessor_rollout_private.overall_awards
 for each row execute function assessor_rollout_private.preserve_overall_award();
create function assessor_rollout_private.preserve_overall_source() returns trigger
language plpgsql set search_path='' as $$begin raise exception 'overall award source is immutable'; end; $$;
create trigger preserve_overall_source before update or delete on assessor_rollout_private.overall_award_sources
 for each row execute function assessor_rollout_private.preserve_overall_source();

-- Used by a final qualifying insert and by explicit recovery. Every path locks
-- the actor first; chapter source rows are shared-locked against status edits.
create function assessor_rollout_private.issue_overall_award(p_actor_id uuid,p_program_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.users; program public.training_programs;
 rule assessor_rollout_private.overall_award_contracts; requirement record;
 chapter public.training_program_chapters; combined assessor_rollout_private.chapter_awards;
 legacy public.assessor_chapter_qualifications; selected jsonb:='{}'::jsonb; award_id uuid;
begin
 actor:=public.current_app_user();
 if actor.id is null or actor.id is distinct from p_actor_id or actor.role<>'assessor' or actor.status<>'active'
  or exists(select 1 from public.super_admin_personas where persona_user_id=actor.id) then return null; end if;
 select * into actor from public.users where id=p_actor_id for update;
 if actor.role<>'assessor' or actor.status<>'active' then return null; end if;
 select * into program from public.training_programs where id=p_program_id and status='published';
 if program.id is null then return null; end if;
 select * into rule from assessor_rollout_private.overall_award_contracts
  where program_id=p_program_id and enabled for share;
 if rule.program_id is null then return null; end if;
 -- A published program with three available, published chapter courses is a
 -- prerequisite. Missing Chapter 3 never changes the denominator.
 for requirement in select key,value from jsonb_each(rule.chapter_requirements) order by key loop
  select ch.* into chapter from public.training_program_chapters ch
   join public.courses course on course.id=ch.course_id
   where ch.program_id=p_program_id and ch.chapter_key=requirement.key
    and ch.availability='available' and course.status='published';
  if chapter.id is null then return null; end if;
  if requirement.value->>'kind'='combined' then
   if exists(select 1 from assessor_rollout_private.chapter_awards w
    where w.actor_id=p_actor_id and w.chapter_id=chapter.id and w.status<>'active') then return null; end if;
   select w.* into combined from assessor_rollout_private.chapter_awards w
    join assessor_rollout_private.award_contracts c on c.requirements_version=w.requirements_version
    where w.actor_id=p_actor_id and w.chapter_id=chapter.id and w.program_id=p_program_id
     and w.status='active' and assessor_rollout_private.certificate_current_status(w.id)='active'
     and w.requirements_version=requirement.value->>'requirementsVersion'
     and c.award_rule_version=requirement.value->>'awardRuleVersion'
    order by w.issued_at desc,w.id desc limit 1 for share of w;
   if combined.id is null then return null; end if;
   selected:=selected||jsonb_build_object(requirement.key,jsonb_build_object('kind','combined','id',combined.id));
  else
   if exists(select 1 from public.assessor_chapter_qualifications q
    where q.assessor_user_id=p_actor_id and q.chapter_id=chapter.id and q.status<>'active') then return null; end if;
   select * into legacy from public.assessor_chapter_qualifications q
    where q.assessor_user_id=p_actor_id and q.chapter_id=chapter.id and q.status='active'
     and q.curriculum_version=requirement.value->>'curriculumVersion'
     and q.rubric_version=requirement.value->>'rubricVersion'
     and q.orientation_version=requirement.value->>'orientationVersion'
    order by q.issued_at desc,q.id desc limit 1 for share;
   if legacy.id is null then return null; end if;
   selected:=selected||jsonb_build_object(requirement.key,jsonb_build_object('kind','legacy','id',legacy.id));
  end if;
 end loop;
 -- Existing awards are returned only after rechecking all source status and
 -- current compatibility. Recovery never reactivates a suspended award.
 select id into award_id from assessor_rollout_private.overall_awards
  where actor_id=p_actor_id and program_id=p_program_id and rule_version=rule.rule_version;
 if award_id is not null then return award_id; end if;
 insert into assessor_rollout_private.overall_awards(actor_id,program_id,rule_version)
 values(p_actor_id,p_program_id,rule.rule_version) returning id into award_id;
 insert into assessor_rollout_private.overall_award_sources(overall_award_id,chapter_key,chapter_award_id,legacy_qualification_id)
 select award_id,key,case when value->>'kind'='combined' then (value->>'id')::uuid end,
  case when value->>'kind'='legacy' then (value->>'id')::uuid end
 from jsonb_each(selected);
 insert into public.audit_events(actor_user_id,event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
 values(p_actor_id,'assessor.overall_award.issued','assessor_overall_award',award_id,
  jsonb_build_object('program_id',p_program_id,'rule_version',rule.rule_version),
  'Naitala ang kabuuang sertipikasyon.','Overall certification recorded.');
 return award_id;
end; $$;

create function assessor_rollout_private.overall_award_after_chapter() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor_id uuid; program_id uuid;
begin
 if tg_table_name='chapter_awards' then actor_id:=new.actor_id;program_id:=new.program_id;
 else
  actor_id:=new.assessor_user_id;
  select ch.program_id into program_id from public.training_program_chapters ch where ch.id=new.chapter_id;
 end if;
 if program_id is not null then perform assessor_rollout_private.issue_overall_award(actor_id,program_id); end if;
 return new;
end; $$;
create trigger overall_after_combined_chapter after insert on assessor_rollout_private.chapter_awards
 for each row execute function assessor_rollout_private.overall_award_after_chapter();
create trigger overall_after_legacy_chapter after insert on public.assessor_chapter_qualifications
 for each row execute function assessor_rollout_private.overall_award_after_chapter();

create function public.rpc_assessor_overall_award_ensure(p_program_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor public.users; result uuid;
begin
 actor:=public.current_app_user();
 if actor.id is null or actor.role<>'assessor' or actor.status<>'active' then raise exception 'not authorized'; end if;
 result:=assessor_rollout_private.issue_overall_award(actor.id,p_program_id);
 if result is null then raise exception 'overall award unavailable or prerequisites incomplete'; end if;
 return result;
end; $$;

-- A read only reports status. It cannot issue, recover or change an award.
create function assessor_rollout_private.overall_award_current_status(p_award_id uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare award assessor_rollout_private.overall_awards; source record; requirement jsonb;
 current_rule assessor_rollout_private.overall_award_contracts; source_status text;
begin
 select * into award from assessor_rollout_private.overall_awards where id=p_award_id;
 if award.id is null then return null; end if;
 if award.status<>'active' then return award.status; end if;
 if (select count(*) from assessor_rollout_private.overall_award_sources where overall_award_id=award.id)<>3 then return 'incomplete'; end if;
 if not exists(select 1 from public.training_programs where id=award.program_id and status='published') then return 'unavailable'; end if;
 select * into current_rule from assessor_rollout_private.overall_award_contracts
  where program_id=award.program_id and enabled;
 for source in select s.*,ch.id chapter_id,ch.availability,course.status course_status
  from assessor_rollout_private.overall_award_sources s
  left join public.training_program_chapters ch on ch.program_id=award.program_id and ch.chapter_key=s.chapter_key
  left join public.courses course on course.id=ch.course_id where s.overall_award_id=award.id loop
  requirement:=current_rule.chapter_requirements->source.chapter_key;
  if source.chapter_id is null or source.availability<>'available' or source.course_status<>'published' then return 'unavailable'; end if;
  if source.chapter_award_id is not null then
   select case when assessor_rollout_private.certificate_current_status(w.id)<>'active'
    then assessor_rollout_private.certificate_current_status(w.id)
    when w.actor_id<>award.actor_id or w.program_id<>award.program_id or w.chapter_id<>source.chapter_id
     or requirement->>'kind'<>'combined' or w.requirements_version<>requirement->>'requirementsVersion'
     or c.award_rule_version<>requirement->>'awardRuleVersion' then 'update_required' else 'active' end
    into source_status from assessor_rollout_private.chapter_awards w
    join assessor_rollout_private.award_contracts c on c.requirements_version=w.requirements_version
    where w.id=source.chapter_award_id;
  else
   select case when q.status<>'active' then q.status
    when q.assessor_user_id<>award.actor_id or q.chapter_id<>source.chapter_id
     or requirement->>'kind'<>'legacy' or q.curriculum_version<>requirement->>'curriculumVersion'
     or q.rubric_version<>requirement->>'rubricVersion'
     or q.orientation_version<>requirement->>'orientationVersion' then 'update_required' else 'active' end
    into source_status from public.assessor_chapter_qualifications q where q.id=source.legacy_qualification_id;
  end if;
  if source_status is distinct from 'active' then return coalesce(source_status,'incomplete'); end if;
 end loop;
 if current_rule.program_id is null or current_rule.rule_version<>award.rule_version then return 'update_required'; end if;
 return 'active';
end; $$;
create function public.rpc_assessor_overall_award_state(p_program_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor public.users; awards jsonb;
begin
 actor:=public.current_app_user();
 if actor.id is null or actor.role<>'assessor' or actor.status<>'active'
  or exists(select 1 from public.super_admin_personas where persona_user_id=actor.id)
 then raise exception 'not authorized'; end if;
 select jsonb_agg(jsonb_build_object('id',a.id,'ruleVersion',a.rule_version,'issuedAt',a.issued_at,
  'status',assessor_rollout_private.overall_award_current_status(a.id)) order by a.issued_at desc,a.id desc)
 into awards from (select * from assessor_rollout_private.overall_awards
  where actor_id=actor.id and program_id=p_program_id order by issued_at desc,id desc limit 20) a;
 return jsonb_build_object('awards',coalesce(awards,'[]'::jsonb));
end; $$;

revoke all on function assessor_rollout_private.validate_overall_rule(),assessor_rollout_private.preserve_overall_rule(),
 assessor_rollout_private.preserve_overall_award(),assessor_rollout_private.preserve_overall_source(),
 assessor_rollout_private.issue_overall_award(uuid,uuid),assessor_rollout_private.overall_award_after_chapter(),
 assessor_rollout_private.overall_award_current_status(uuid),public.rpc_assessor_overall_award_ensure(uuid),
 public.rpc_assessor_overall_award_state(uuid) from public,anon,authenticated;
grant execute on function public.rpc_assessor_overall_award_ensure(uuid),public.rpc_assessor_overall_award_state(uuid) to authenticated;
commit;
