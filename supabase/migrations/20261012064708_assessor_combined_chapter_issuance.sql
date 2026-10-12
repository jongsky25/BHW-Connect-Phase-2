-- C1AF-07. Additive earned evidence; no approvals, flags, cohorts or cutovers seeded.
begin;

-- Only reviewed release SQL can install a contract. Story acceptance is not approval.
create table assessor_rollout_private.award_contracts (
 requirements_version text primary key check(btrim(requirements_version)<>''),
 curriculum_version text not null check(btrim(curriculum_version)<>''),
 rubric_version text not null check(btrim(rubric_version)<>''),
 orientation_version text not null check(btrim(orientation_version)<>''),
 award_rule_version text not null check(btrim(award_rule_version)<>''),
 scenario_id text not null check(btrim(scenario_id)<>''),
 scenario_version text not null check(btrim(scenario_version)<>''),
 checkpoint_ids jsonb not null check(jsonb_typeof(checkpoint_ids)='array' and jsonb_array_length(checkpoint_ids)=11),
 checkpoint_versions jsonb not null check(jsonb_typeof(checkpoint_versions)='array' and jsonb_array_length(checkpoint_versions)=11),
 approvals jsonb not null check(jsonb_typeof(approvals)='object'),
 issuer_snapshot jsonb not null check(jsonb_typeof(issuer_snapshot)='object'),
 allow_prior_evidence boolean not null default false,
 enabled boolean not null default false
);
alter table assessor_rollout_private.award_contracts enable row level security;
revoke all on assessor_rollout_private.award_contracts from public,anon,authenticated;

-- Separate award identity leaves AF-05 IDs, evidence and lifecycle untouched.
-- No renderer participates in this transaction; a later output failure cannot erase it.
create table assessor_rollout_private.chapter_awards (
 id uuid primary key default gen_random_uuid(),
 certificate_id uuid not null unique default gen_random_uuid(),
 actor_id uuid not null references public.users(id),
 chapter_id uuid not null references public.training_program_chapters(id),
 program_id uuid not null references public.training_programs(id),
 requirements_version text not null references assessor_rollout_private.award_contracts(requirements_version),
 legacy_qualification_id uuid references public.assessor_chapter_qualifications(id),
 orientation_attempt_id uuid not null references public.assessor_orientation_attempts(id),
 pretest_attempt_id uuid not null references public.assessor_exam_attempts(id),
 posttest_attempt_id uuid not null references public.assessor_exam_attempts(id),
 simulation_receipt_id uuid not null unique,
 simulation_receipt jsonb not null,
 evidence_snapshot jsonb not null,
 contract_snapshot jsonb not null,
 issuer_snapshot jsonb not null,
 issued_at timestamptz not null default now(),
 status text not null default 'active' check(status in ('active','suspended','revoked')),
 status_changed_at timestamptz,
 unique(actor_id,chapter_id,requirements_version),
 foreign key(actor_id,program_id) references assessor_rollout_private.simulation_runs(actor_id,program_id)
);
create index chapter_awards_chapter_idx on assessor_rollout_private.chapter_awards(chapter_id);
create index chapter_awards_program_idx on assessor_rollout_private.chapter_awards(program_id);
create index chapter_awards_requirements_idx on assessor_rollout_private.chapter_awards(requirements_version);
create index chapter_awards_legacy_idx on assessor_rollout_private.chapter_awards(legacy_qualification_id);
alter table assessor_rollout_private.chapter_awards enable row level security;
revoke all on assessor_rollout_private.chapter_awards from public,anon,authenticated;

create function assessor_rollout_private.preserve_award() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'earned award evidence is immutable'; end if;
 if (to_jsonb(new)-'status'-'status_changed_at') is distinct from (to_jsonb(old)-'status'-'status_changed_at') then
  raise exception 'earned award evidence is immutable';
 end if;
 return new;
end; $$;
create trigger preserve_chapter_award before update or delete on assessor_rollout_private.chapter_awards
 for each row execute function assessor_rollout_private.preserve_award();

-- A requirement version already used by an award cannot acquire a different
-- meaning. Disabling issuance remains possible without rewriting its reviews.
create function assessor_rollout_private.preserve_award_contract() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from assessor_rollout_private.chapter_awards where requirements_version=old.requirements_version) then
  if tg_op='DELETE' then raise exception 'issued award contract is immutable'; end if;
  if (to_jsonb(new)-'enabled') is distinct from (to_jsonb(old)-'enabled') then
   raise exception 'issued award contract is immutable';
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end; $$;
create trigger preserve_issued_award_contract before update or delete on assessor_rollout_private.award_contracts
 for each row execute function assessor_rollout_private.preserve_award_contract();

-- Shared by both completion paths and explicit recovery. A closed gate returns
-- NULL so saving a valid orientation pass/rehearsal never depends on approval.
create function assessor_rollout_private.issue_chapter_award(p_chapter_id uuid,p_recover boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.users; ch public.training_program_chapters; co public.assessor_flow_cohorts;
 c assessor_rollout_private.award_contracts; u assessor_private.orientation_units;
 o public.assessor_orientation_attempts; pre public.assessor_exam_attempts; post public.assessor_exam_attempts;
 oldq public.assessor_chapter_qualifications; earned assessor_rollout_private.chapter_awards;
 gate jsonb; receipt jsonb; study jsonb; lessons jsonb; award_id uuid;
begin
 a:=public.current_app_user();
 if a.id is null or a.role<>'assessor' or a.status<>'active'
  or exists(select 1 from public.super_admin_personas where persona_user_id=a.id) then raise exception 'not authorized'; end if;
 -- Every entry point locks actor before simulation/cohort rows. Serializes final
 -- prerequisites, retries, and lifecycle changes to the actor record.
 select * into a from public.users where id=a.id for update;
 if a.role<>'assessor' or a.status<>'active' then raise exception 'not authorized'; end if;
 select t.* into ch from public.training_program_chapters t join public.training_programs p on p.id=t.program_id
  join public.courses course on course.id=t.course_id
  where t.id=p_chapter_id and t.chapter_key='chapter-1' and t.availability='available'
   and p.content_key='bhw-reference-manual' and p.status='published' and course.status='published'
   and (public.current_org_path() like public.org_unit_path(course.org_unit_id)||'%'
    or public.org_unit_path(course.org_unit_id) like public.current_org_path()||'%');
 if ch.id is null then raise exception 'chapter unavailable'; end if;
 select cohort.* into co from public.assessor_flow_cohorts cohort
  join public.assessor_flow_cohort_members m on m.cohort_id=cohort.id
  where m.user_id=a.id and m.program_id=ch.program_id and m.chapter_key=ch.chapter_key
  for share of cohort,m;
 if co.id is null or not co.awards_enabled or co.authority_cutover_at is null then return null; end if;
 perform 1 from public.feature_flags where key in ('elearning','assessor_flow_awards') for share;
 if (select count(*) from public.feature_flags where key in ('elearning','assessor_flow_awards')
  and enabled and not ('assessor'=any(coalesce(disabled_roles,'{}'::text[]))))<>2 then return null; end if;
 select * into c from assessor_rollout_private.award_contracts where requirements_version=co.requirements_version for share;
 if c.requirements_version is null or not c.enabled then return null; end if;
 -- Each decision must be a nonblank review reference, never a browser boolean.
 if exists(select 1 from unnest(array['requirements','mapping','evidence','orientation','simulation','issuer','award']) k
  where jsonb_typeof(c.approvals->k) is distinct from 'string' or nullif(btrim(c.approvals->>k),'') is null)
  or exists(select 1 from unnest(array['organization','signatory','title']) k
   where jsonb_typeof(c.issuer_snapshot->k) is distinct from 'string' or nullif(btrim(c.issuer_snapshot->>k),'') is null)
 then return null; end if;
 -- Never circumvent an existing suspension/revocation with a new version.
 perform 1 from public.assessor_chapter_qualifications where assessor_user_id=a.id and chapter_id=ch.id for share;
 perform 1 from assessor_rollout_private.chapter_awards where actor_id=a.id and chapter_id=ch.id for update;
 if exists(select 1 from public.assessor_chapter_qualifications where assessor_user_id=a.id and chapter_id=ch.id and status<>'active')
  or exists(select 1 from assessor_rollout_private.chapter_awards where actor_id=a.id and chapter_id=ch.id and status<>'active') then return null; end if;
 select * into earned from assessor_rollout_private.chapter_awards
  where actor_id=a.id and chapter_id=ch.id and requirements_version=c.requirements_version;
 if earned.id is not null then return earned.id; end if;
 select * into oldq from public.assessor_chapter_qualifications where assessor_user_id=a.id and chapter_id=ch.id
  order by issued_at desc,id desc limit 1;
 if oldq.id is not null and (not p_recover or not c.allow_prior_evidence) then return null; end if;
 if not exists(select 1 from public.assessor_briefing_acknowledgements where assessor_user_id=a.id
  and program_id=ch.program_id and chapter_key=ch.chapter_key and requirements_version=c.requirements_version
  and briefing_version='chapter-1:briefing.v1') then return null; end if;
 gate:=public.rpc_assessor_candidate_exam_state(ch.id);
 if (gate->>'orientation_ready')::boolean is distinct from true
  or gate->>'curriculum_version' is distinct from c.curriculum_version then return null; end if;
 select * into u from assessor_private.orientation_units where chapter_key=ch.chapter_key
  and curriculum_version=c.curriculum_version and orientation_version=c.orientation_version;
 if u.chapter_key is null then return null; end if;
 if exists(select 1 from jsonb_array_elements(u.lessons) l where not exists(
  select 1 from public.assessor_orientation_lesson_progress p where p.assessor_user_id=a.id and p.chapter_id=ch.id
   and p.curriculum_version=c.curriculum_version and p.orientation_version=c.orientation_version and p.lesson_id=l->>'id')) then return null; end if;
 select * into o from public.assessor_orientation_attempts where assessor_user_id=a.id and chapter_id=ch.id
  and curriculum_version=c.curriculum_version and orientation_version=c.orientation_version and passed
  order by submitted_at desc,id desc limit 1;
 select * into pre from public.assessor_exam_attempts where assessor_user_id=a.id and chapter_id=ch.id
  and curriculum_version=c.curriculum_version and phase='pretest' and status='submitted'
  order by submitted_at desc,id desc limit 1;
 select * into post from public.assessor_exam_attempts where assessor_user_id=a.id and chapter_id=ch.id
  and curriculum_version=c.curriculum_version and phase='posttest' and status='submitted' and passed
  and score_percent>=passing_percent order by submitted_at desc,id desc limit 1;
 if o.id is null or pre.id is null or post.id is null then return null; end if;
 select state->'receipt' into receipt from assessor_rollout_private.simulation_runs where actor_id=a.id and program_id=ch.program_id for share;
 if receipt is null or receipt='null'::jsonb or receipt->>'id' is null or receipt->>'completedAt' is null
  or receipt->'serverValidated' is distinct from 'true'::jsonb
  or receipt->>'actorId' is distinct from a.id::text or receipt->>'programInstanceId' is distinct from ch.program_id::text
  or receipt->>'programKey' is distinct from 'bhw-reference-manual' or receipt->>'chapterKey' is distinct from ch.chapter_key
  or receipt->>'requirementsVersion' is distinct from c.requirements_version
  or receipt->>'scenarioId' is distinct from c.scenario_id or receipt->>'version' is distinct from c.scenario_version
  or receipt->'checkpointIds' is distinct from c.checkpoint_ids or receipt->'checkpointVersions' is distinct from c.checkpoint_versions
 then return null; end if;
 select jsonb_agg(to_jsonb(p) order by p.lesson_id) into study from public.assessor_lesson_progress p where p.assessor_user_id=a.id and p.chapter_id=ch.id;
 select jsonb_agg(to_jsonb(p) order by p.lesson_id) into lessons from public.assessor_orientation_lesson_progress p
  where p.assessor_user_id=a.id and p.chapter_id=ch.id and p.curriculum_version=c.curriculum_version and p.orientation_version=c.orientation_version;
 insert into assessor_rollout_private.chapter_awards(actor_id,chapter_id,program_id,requirements_version,legacy_qualification_id,
  orientation_attempt_id,pretest_attempt_id,posttest_attempt_id,simulation_receipt_id,simulation_receipt,evidence_snapshot,contract_snapshot,issuer_snapshot)
 values(a.id,ch.id,ch.program_id,c.requirements_version,oldq.id,o.id,pre.id,post.id,(receipt->>'id')::uuid,receipt,
  jsonb_build_object('study',study,'pretest',to_jsonb(pre)-'answers','posttest',to_jsonb(post)-'answers',
   'orientation',to_jsonb(o)-'answers','orientationLessons',lessons),to_jsonb(c),c.issuer_snapshot)
 returning id into award_id;
 insert into public.audit_events(actor_user_id,event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
 values(a.id,'assessor.chapter_award.issued','assessor_chapter_award',award_id,
  jsonb_build_object('chapter_id',ch.id,'requirements_version',c.requirements_version,'recovery',p_recover),
  'Naitala ang sertipikasyon para sa kabanata.','Chapter certification recorded.');
 return award_id;
end; $$;

-- Preserve the old path until the explicit, permanent authority cutover.
alter function assessor_private.issue_chapter_qualification(uuid) rename to issue_legacy_chapter_qualification;
create function assessor_private.issue_chapter_qualification(p_chapter_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.training_program_chapters ch join public.assessor_flow_cohort_members m
  on m.program_id=ch.program_id and m.chapter_key=ch.chapter_key join public.assessor_flow_cohorts c on c.id=m.cohort_id
  where ch.id=p_chapter_id and ch.chapter_key='chapter-1' and m.user_id=(public.current_app_user()).id
   and c.authority_cutover_at is not null) then
  return assessor_rollout_private.issue_chapter_award(p_chapter_id,false);
 end if;
 return assessor_private.issue_legacy_chapter_qualification(p_chapter_id);
end; $$;
create or replace function public.rpc_assessor_qualification_ensure(p_chapter_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if exists(select 1 from public.training_program_chapters ch join public.assessor_flow_cohort_members m
  on m.program_id=ch.program_id and m.chapter_key=ch.chapter_key join public.assessor_flow_cohorts c on c.id=m.cohort_id
  where ch.id=p_chapter_id and ch.chapter_key='chapter-1' and m.user_id=(public.current_app_user()).id
   and c.authority_cutover_at is not null) then
  result:=assessor_rollout_private.issue_chapter_award(p_chapter_id,true);
  if result is null then raise exception 'chapter award unavailable or prerequisites incomplete'; end if;
  return result;
 end if;
 return assessor_private.issue_legacy_chapter_qualification(p_chapter_id);
end; $$;

-- Rebind the trigger after preserving the legacy helper under its new name.
create or replace function assessor_private.issue_after_orientation_pass() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.passed then
  if new.assessor_user_id is distinct from (public.current_app_user()).id then raise exception 'not authorized'; end if;
  perform assessor_private.issue_chapter_qualification(new.chapter_id);
 end if;
 return new;
end; $$;

-- Dedicated recovery has no supplied actor, score or receipt identifiers.
create function assessor_rollout_private.recover_chapter_award(p_chapter_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 result:=assessor_rollout_private.issue_chapter_award(p_chapter_id,true);
 if result is null then raise exception 'chapter award unavailable or prerequisites incomplete'; end if;
 return result;
end; $$;
create function public.rpc_assessor_chapter_award_ensure(p_chapter_id uuid) returns uuid
language sql security invoker set search_path='' as $$select assessor_rollout_private.recover_chapter_award(p_chapter_id)$$;

-- Wrap, do not change the validated rehearsal/scoring algorithm or receipt shape.
alter function assessor_rollout_private.simulation_act(uuid,uuid,text,text,text,text,integer,text,integer,uuid,jsonb) rename to simulation_rehearsal_act;
create function assessor_rollout_private.simulation_act(p_program_id uuid,p_actor_id uuid,p_version text,p_requirements text,
 p_chapter text,p_scenario text,p_revision integer,p_checkpoint text,p_checkpoint_version integer,p_request_id uuid,p_action jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s jsonb; ch uuid; a public.users;
begin
 a:=public.current_app_user();
 if a.id is null or a.id is distinct from p_actor_id then raise exception 'not authorized'; end if;
 perform 1 from public.users where id=a.id for update;
 s:=assessor_rollout_private.simulation_rehearsal_act(p_program_id,p_actor_id,p_version,p_requirements,
  p_chapter,p_scenario,p_revision,p_checkpoint,p_checkpoint_version,p_request_id,p_action);
 if p_action='{"type":"finish"}'::jsonb then
  select id into ch from public.training_program_chapters where program_id=p_program_id and chapter_key='chapter-1';
  perform assessor_rollout_private.issue_chapter_award(ch,false);
 end if;
 return s;
end; $$;

create or replace function public.rpc_assessor_simulation_act(p_program_id uuid,p_actor_id uuid,p_version text,p_requirements text,
 p_chapter text,p_scenario text,p_revision integer,p_checkpoint text,p_checkpoint_version integer,p_request_id uuid,p_action jsonb) returns jsonb
language sql security invoker set search_path='' as $$
 select assessor_rollout_private.simulation_act(p_program_id,p_actor_id,p_version,p_requirements,
 p_chapter,p_scenario,p_revision,p_checkpoint,p_checkpoint_version,p_request_id,p_action) $$;

-- Historic identity remains visible when rollout is off; never implies permission.
create function assessor_rollout_private.chapter_award_state(p_chapter_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a public.users; rows jsonb;
begin
 a:=public.current_app_user();
 if a.id is null or a.role<>'assessor' or a.status<>'active'
  or exists(select 1 from public.super_admin_personas where persona_user_id=a.id) then raise exception 'not authorized'; end if;
 select jsonb_agg(jsonb_build_object('awardId',w.id,'certificateId',w.certificate_id,'issuedAt',w.issued_at,
  'status',w.status,'requirementsVersion',w.requirements_version,'legacyQualificationId',w.legacy_qualification_id,
  'issuer',w.issuer_snapshot,'currentPermission',false) order by w.issued_at desc,w.id desc) into rows
 from (select id,certificate_id,issued_at,status,requirements_version,legacy_qualification_id,issuer_snapshot
  from assessor_rollout_private.chapter_awards where actor_id=a.id and chapter_id=p_chapter_id
  order by issued_at desc,id desc limit 50) w;
 return jsonb_build_object('awards',coalesce(rows,'[]'::jsonb),'currentPermission',false);
end; $$;
create function public.rpc_assessor_chapter_award_state(p_chapter_id uuid) returns jsonb
language sql security invoker set search_path='' as $$select assessor_rollout_private.chapter_award_state(p_chapter_id)$$;

revoke all on function assessor_rollout_private.preserve_award(),assessor_rollout_private.preserve_award_contract(),
 assessor_rollout_private.issue_chapter_award(uuid,boolean),assessor_private.issue_chapter_qualification(uuid),
 assessor_private.issue_legacy_chapter_qualification(uuid),
 assessor_rollout_private.simulation_rehearsal_act(uuid,uuid,text,text,text,text,integer,text,integer,uuid,jsonb)
 from public,anon,authenticated;
revoke all on function assessor_rollout_private.recover_chapter_award(uuid),public.rpc_assessor_chapter_award_ensure(uuid),
 assessor_rollout_private.chapter_award_state(uuid),public.rpc_assessor_chapter_award_state(uuid),
 assessor_rollout_private.simulation_act(uuid,uuid,text,text,text,text,integer,text,integer,uuid,jsonb) from public,anon,authenticated;
grant execute on function assessor_rollout_private.recover_chapter_award(uuid),public.rpc_assessor_chapter_award_ensure(uuid),
 assessor_rollout_private.chapter_award_state(uuid),public.rpc_assessor_chapter_award_state(uuid),
 assessor_rollout_private.simulation_act(uuid,uuid,text,text,text,text,integer,text,integer,uuid,jsonb) to authenticated;
commit;
