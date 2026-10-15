-- Owner decisions are external to app accounts. Never impersonate a fixture admin.
create table assessor_rollout_private.owner_policy_decisions (
 id text primary key, package jsonb not null, recorded_at timestamptz not null default now()
);
alter table assessor_rollout_private.owner_policy_decisions enable row level security;
revoke all on assessor_rollout_private.owner_policy_decisions from public,anon,authenticated;
create function assessor_rollout_private.preserve_owner_decision() returns trigger
language plpgsql set search_path='' as $$ begin raise exception 'owner decision is immutable'; end; $$;
create trigger preserve_owner_decision before update or delete on assessor_rollout_private.owner_policy_decisions
 for each row execute function assessor_rollout_private.preserve_owner_decision();
insert into assessor_rollout_private.owner_policy_decisions(id,package) values('c1af27-owner-2026-10-15',__PACKAGE__::jsonb);
alter table assessor_rollout_private.practice_criteria alter column approved_by drop not null;
alter table assessor_rollout_private.practice_criteria add column owner_decision_id text
 references assessor_rollout_private.owner_policy_decisions(id),
 add constraint practice_approval_identity check(approved_by is not null or owner_decision_id is not null);
alter table assessor_rollout_private.component_requirements alter column approved_by drop not null;
alter table assessor_rollout_private.component_requirements add column owner_decision_id text
 references assessor_rollout_private.owner_policy_decisions(id),
 add constraint component_approval_identity check(approved_by is not null or owner_decision_id is not null);

-- Only privileged reviewed release SQL can call this pinned, disabled installer.
create function assessor_rollout_private.install_chapter1_policy(p_chapter uuid) returns void
language plpgsql set search_path='' as $$
declare p jsonb; ch public.training_program_chapters; x jsonb; l public.course_lessons;
 r public.course_lesson_revisions; module_ids uuid[]:='{}'; group_module uuid; approvals jsonb;
begin
 select package into strict p from assessor_rollout_private.owner_policy_decisions where id='c1af27-owner-2026-10-15';
 select c.* into strict ch from public.training_program_chapters c join public.training_programs t on t.id=c.program_id
 join public.courses course on course.id=c.course_id where c.id=p_chapter and c.chapter_key='chapter-1'
 and c.availability='available' and t.content_key='bhw-reference-manual' and t.status='published' and course.status='published';
 -- Lock every live pointer before validating; publication drift fails atomically.
 perform 1 from public.course_lessons a join public.course_modules m on m.id=a.module_id
 where m.course_id=ch.course_id for share of a;
 if (select count(*) from public.course_lessons a join public.course_modules m on m.id=a.module_id
 where m.course_id=ch.course_id and a.required)<>42 then raise exception 'expected exactly 42 required lessons'; end if;
 for x in select value from jsonb_array_elements(p->'lessons') loop
  select a.* into strict l from public.course_lessons a join public.course_modules m on m.id=a.module_id
   where m.course_id=ch.course_id and a.lesson_key=x->>'lesson_key' and a.required;
  select * into strict r from public.course_lesson_revisions where id=l.published_revision_id and lesson_id=l.id;
  if r.content_hash is distinct from x->>'content_hash' then raise exception 'published revision changed: %',l.lesson_key; end if;
  if l.module_id=any(module_ids) then null; else module_ids:=array_append(module_ids,l.module_id); end if;
 end loop;
 if cardinality(module_ids)<>9 then raise exception 'expected nine components'; end if;
 if exists(select 1 from assessor_rollout_private.award_contracts where requirements_version=p->>'requirements_version')
 or exists(select 1 from assessor_rollout_private.component_requirements where chapter_id=ch.id)
 or exists(select 1 from assessor_rollout_private.practice_criteria where chapter_id=ch.id) then
  raise exception 'registry already installed; never overwrite reviewed rows'; end if;
 select jsonb_object_agg(k,p->>'decision_reference') into approvals
 from unnest(array['requirements','mapping','evidence','orientation','simulation','issuer','award']) k;
 insert into assessor_rollout_private.award_contracts(requirements_version,curriculum_version,rubric_version,
 orientation_version,award_rule_version,scenario_id,scenario_version,checkpoint_ids,checkpoint_versions,
 approvals,issuer_snapshot,allow_prior_evidence,enabled) values(p->>'requirements_version',p->>'curriculum_version',
 p->>'rubric_version',p->>'orientation_version',p->>'award_rule_version',p->'simulation'->>'id',p->'simulation'->>'version',
 p->'simulation'->'checkpoint_ids',p->'simulation'->'checkpoint_versions',approvals,p->'issuer',true,false);
 for x in select value from jsonb_array_elements(p->'lessons') loop
  select a.* into strict l from public.course_lessons a join public.course_modules m on m.id=a.module_id
   where m.course_id=ch.course_id and a.lesson_key=x->>'lesson_key';
  -- All lessons in each authored component must resolve to one real module.
  select a.module_id into strict group_module from public.course_lessons a join public.course_modules m on m.id=a.module_id
   where m.course_id=ch.course_id and a.lesson_key=(select z->>'lesson_key' from jsonb_array_elements(p->'lessons') z
    where z->>'module_key'=x->>'module_key' limit 1);
  if group_module<>l.module_id then raise exception 'component membership changed'; end if;
  insert into assessor_rollout_private.practice_criteria(chapter_id,lesson_id,lesson_revision_id,criterion_id,criterion_version,
   requirements_version,rubric_version,source_fingerprint,rubric_snapshot,review_reference,approved_by,enabled,owner_decision_id)
  values(ch.id,l.id,l.published_revision_id,x->'criterion'->>'id',x->'criterion'->>'proposed_version',
   p->>'requirements_version',p->>'rubric_version',x->'criterion'->'source'->>'sha256_lf',x->'criterion'->'rubric',
   p->>'decision_reference',null,false,'c1af27-owner-2026-10-15');
  if not exists(select 1 from assessor_rollout_private.component_requirements where module_id=l.module_id) then
   insert into assessor_rollout_private.component_requirements(module_id,chapter_id,requirements_version,rubric_version,
   required_test_phases,review_reference,approved_by,enabled,purpose_fil,purpose_en,owner_decision_id)
   values(l.module_id,ch.id,p->>'requirements_version',p->>'rubric_version',array['pretest','posttest'],
    p->>'decision_reference',null,false,'Ipakita ang lahat ng kinakailangang pamantayan sa bahaging ito sa bagong pormal na ebidensiya.',
    'Demonstrate every required criterion in this component with fresh formal evidence.','c1af27-owner-2026-10-15');
  end if;
  insert into assessor_rollout_private.component_required_lessons values(l.module_id,l.id);
  insert into assessor_rollout_private.component_required_criteria(module_id,chapter_id,criterion_id,criterion_version,description_fil,description_en)
   values(l.module_id,ch.id,x->'criterion'->>'id',x->'criterion'->>'proposed_version',x->'title'->>'fil',x->'title'->>'en');
 end loop;
end; $$;
revoke all on function assessor_rollout_private.install_chapter1_policy(uuid),assessor_rollout_private.preserve_owner_decision() from public,anon,authenticated;
-- Empty local databases receive the pinned decision; their lesson load can call
-- the same private installer in a disposable rehearsal after content is loaded.
do $$ declare ch uuid; begin
 for ch in select c.id from public.training_program_chapters c join public.training_programs p on p.id=c.program_id
 where p.content_key='bhw-reference-manual' and p.status='published' and c.chapter_key='chapter-1' loop
  perform assessor_rollout_private.install_chapter1_policy(ch);
 end loop;
end; $$;

create table assessor_rollout_private.preparation_simulation_archive (
 actor_id uuid not null,program_id uuid not null,requirements_version text not null,
 state jsonb not null,requests jsonb not null,archived_at timestamptz not null default now(),
 primary key(actor_id,program_id,requirements_version)
);
alter table assessor_rollout_private.preparation_simulation_archive enable row level security;
revoke all on assessor_rollout_private.preparation_simulation_archive from public,anon,authenticated;
create trigger preserve_preparation_archive before update or delete on assessor_rollout_private.preparation_simulation_archive
 for each row execute function assessor_rollout_private.preserve_owner_decision();
create function assessor_rollout_private.archive_preparation_simulation(p_actor uuid,p_program uuid) returns void
language plpgsql set search_path='' as $$ declare s jsonb; requests jsonb;
begin
 perform 1 from public.users where id=p_actor for update;
 if exists(select 1 from assessor_rollout_private.chapter_awards where actor_id=p_actor and program_id=p_program)
 then raise exception 'earned simulation cannot be archived'; end if;
 if exists(select 1 from public.assessor_flow_cohorts c join public.assessor_flow_cohort_members m on m.cohort_id=c.id
  where m.user_id=p_actor and c.program_id=p_program and (c.writes_enabled or c.awards_enabled or c.authority_cutover_at is not null))
 then raise exception 'close preparation controls before archiving'; end if;
 select state into s from assessor_rollout_private.simulation_runs where actor_id=p_actor and program_id=p_program for update;
 if s is null then return; end if;
 if s->>'requirementsVersion'<>'chapter-1:c1af.draft-1' then raise exception 'only draft preparation can be archived'; end if;
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into requests from assessor_rollout_private.simulation_requests r
 where actor_id=p_actor and program_id=p_program;
 insert into assessor_rollout_private.preparation_simulation_archive values(p_actor,p_program,s->>'requirementsVersion',s,requests,now());
 delete from assessor_rollout_private.simulation_requests where actor_id=p_actor and program_id=p_program;
 delete from assessor_rollout_private.simulation_runs where actor_id=p_actor and program_id=p_program;
end; $$;
revoke all on function assessor_rollout_private.archive_preparation_simulation(uuid,uuid) from public,anon,authenticated;
