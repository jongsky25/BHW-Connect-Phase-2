-- C1AF-28: owner-authorized Chapter 1 pilot release, all eligible accounts.
begin;
insert into assessor_rollout_private.owner_policy_decisions(id,package) values
 ('c1af28-all-pilot-2026-10-16',jsonb_build_object(
 'reference','docs/chapter-1-assessor-c1af-28-release-handoff.md',
 'authorization','override this. i am still in pilot phase so show everything to all users now. release this feature',
 'scope','All active actual assessors and BHWs in the published program organization, including future eligible accounts.',
 'overrides',jsonb_build_array('named limited cohort','uncoached walkthrough'),
 'qualification_checks_preserved',true));

-- External owner authorization is recorded as itself, never a fixture identity.
alter table public.assessor_flow_cohorts add column authority_cutover_decision_id text
 references assessor_rollout_private.owner_policy_decisions(id);
do $$ declare n text; begin
 select conname into strict n from pg_constraint where conrelid='public.assessor_flow_cohorts'::regclass
 and contype='c' and pg_get_constraintdef(oid) like '%authority_cutover_at%';
 execute format('alter table public.assessor_flow_cohorts drop constraint %I',n);
end $$;
alter table public.assessor_flow_cohorts add constraint cutover_authorization check(
 (authority_cutover_at is null and authority_cutover_by is null and authority_cutover_decision_id is null)
 or (authority_cutover_at is not null and
 ((authority_cutover_by is not null and authority_cutover_decision_id is null)
 or (authority_cutover_by is null and authority_cutover_decision_id is not null))));
create or replace function assessor_rollout_private.preserve_cutover() returns trigger
language plpgsql set search_path='' as $$ begin
 if old.authority_cutover_at is not null then
  if tg_op='DELETE' then raise exception 'authority cutover is permanent'; end if;
  if new.authority_cutover_at is distinct from old.authority_cutover_at
   or new.authority_cutover_by is distinct from old.authority_cutover_by
   or new.authority_cutover_decision_id is distinct from old.authority_cutover_decision_id
   or new.program_id<>old.program_id or new.chapter_key<>old.chapter_key
   or new.requirements_version<>old.requirements_version then raise exception 'authority cutover is permanent'; end if;
 end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;

-- Privileged migration-only activation; validate the installed publication first.
create function assessor_rollout_private.release_chapter1_pilot(p_chapter uuid) returns void
language plpgsql set search_path='' as $$
declare ch public.training_program_chapters; p jsonb; x jsonb; co public.assessor_flow_cohorts; r record;
 v_req constant text:='chapter-1:c1af25.pilot-1'; v_cohort uuid; v_org uuid;
begin
 select c.* into strict ch from public.training_program_chapters c join public.training_programs t on t.id=c.program_id
 join public.courses course on course.id=c.course_id where c.id=p_chapter and c.chapter_key='chapter-1'
 and c.availability='available' and t.content_key='bhw-reference-manual' and t.status='published' and course.status='published'
 for update of c;
 select org_unit_id into strict v_org from public.training_programs where id=ch.program_id;
 select package into strict p from assessor_rollout_private.owner_policy_decisions where id='c1af27-owner-2026-10-15';
 perform 1 from public.course_lessons l join public.course_modules m on m.id=l.module_id where m.course_id=ch.course_id for share of l;
 if (select count(*) from public.course_lessons l join public.course_modules m on m.id=l.module_id
 where m.course_id=ch.course_id and l.required)<>42 then raise exception 'expected exactly 42 required lessons'; end if;
 if (select count(*) from assessor_rollout_private.practice_criteria where chapter_id=ch.id and requirements_version=v_req)<>42
 or (select count(*) from assessor_rollout_private.component_requirements where chapter_id=ch.id and requirements_version=v_req)<>9
 or (select count(*) from assessor_rollout_private.component_required_lessons a join assessor_rollout_private.component_requirements b using(module_id) where b.chapter_id=ch.id)<>42
 or (select count(*) from assessor_rollout_private.component_required_criteria where chapter_id=ch.id)<>42
 then raise exception 'reviewed registry incomplete'; end if;
 for x in select value from jsonb_array_elements(p->'lessons') loop
  if not exists(select 1 from public.course_lessons l join public.course_modules m on m.id=l.module_id
   join public.course_lesson_revisions rev on rev.id=l.published_revision_id and rev.lesson_id=l.id
   join assessor_rollout_private.practice_criteria pc on pc.lesson_id=l.id and pc.lesson_revision_id=rev.id
   where m.course_id=ch.course_id and l.required and l.lesson_key=x->>'lesson_key'
   and rev.content_hash=x->>'content_hash' and pc.chapter_id=ch.id and pc.requirements_version=v_req
   and pc.owner_decision_id='c1af27-owner-2026-10-15') then raise exception 'published registry drift: %',x->>'lesson_key'; end if;
 end loop;
 if not exists(select 1 from assessor_rollout_private.award_contracts where requirements_version=v_req
 and issuer_snapshot=p->'issuer' and rubric_version=p->>'rubric_version'
 and award_rule_version=p->>'award_rule_version') then raise exception 'approved award contract missing'; end if;
 -- A transition can only happen while the old preparation controls are closed.
 for co in select * from public.assessor_flow_cohorts where program_id=ch.program_id and chapter_key='chapter-1' for update loop
  if co.authority_cutover_at is not null or co.writes_enabled or co.awards_enabled then raise exception 'release already started'; end if;
 end loop;
 for r in select actor_id from assessor_rollout_private.simulation_runs where program_id=ch.program_id loop
  perform assessor_rollout_private.archive_preparation_simulation(r.actor_id,ch.program_id);
 end loop;
 -- Reuse the existing preparation cohort so membership never forks.
 if (select count(*) from public.assessor_flow_cohorts where program_id=ch.program_id and chapter_key='chapter-1')>1
 then raise exception 'multiple preparation cohorts require explicit reconciliation'; end if;
 select id into v_cohort from public.assessor_flow_cohorts where program_id=ch.program_id and chapter_key='chapter-1';
 if v_cohort is null then
  insert into public.assessor_flow_cohorts(program_id,chapter_key,cohort_key,requirements_version)
  values(ch.program_id,'chapter-1','chapter1-all-pilot',v_req) returning id into v_cohort;
 end if;
 insert into public.assessor_flow_cohort_members(program_id,chapter_key,user_id,cohort_id)
 select ch.program_id,'chapter-1',u.id,v_cohort from public.users u
 where u.status='active' and u.role in ('assessor','bhw')
 and public.org_unit_path(u.org_unit_id) like public.org_unit_path(v_org)||'%'
 and not exists(select 1 from public.super_admin_personas s where s.persona_user_id=u.id)
 on conflict(program_id,chapter_key,user_id) do nothing;
 update assessor_rollout_private.practice_criteria set enabled=true where chapter_id=ch.id and requirements_version=v_req;
 update assessor_rollout_private.component_requirements set enabled=true where chapter_id=ch.id and requirements_version=v_req;
 update assessor_rollout_private.award_contracts set enabled=true where requirements_version=v_req;
 update assessor_rollout_private.simulation_control set enabled=true;
 update public.feature_flags set enabled=true,disabled_roles=array_remove(array_remove(coalesce(disabled_roles,'{}'::text[]),'assessor'),'bhw')
 where key in ('elearning','course_sessions','assessor_flow_ui','assessor_flow_writes','assessor_flow_awards');
 update public.assessor_flow_cohorts set requirements_version=v_req,ui_enabled=true,writes_enabled=true,awards_enabled=true,
 authority_cutover_at=now(),authority_cutover_by=null,authority_cutover_decision_id='c1af28-all-pilot-2026-10-16',updated_at=now()
 where id=v_cohort;
 insert into public.audit_events(event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
 values('assessor_flow.pilot_released','assessor_flow_cohort',v_cohort,
 jsonb_build_object('owner_decision','c1af28-all-pilot-2026-10-16','requirements_version',v_req,'all_eligible_accounts',true),
 'Binuksan ang Chapter 1 pilot para sa lahat ng kwalipikadong account.','Chapter 1 pilot released to all eligible accounts.');
end $$;
revoke all on function assessor_rollout_private.release_chapter1_pilot(uuid) from public,anon,authenticated;

-- Enrollment happens at account activation/change, never during page reads.
create function assessor_rollout_private.enroll_all_pilot_user() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 if new.status='active' and new.role in ('assessor','bhw')
 and not exists(select 1 from public.super_admin_personas s where s.persona_user_id=new.id) then
  insert into public.assessor_flow_cohort_members(program_id,chapter_key,user_id,cohort_id)
  select c.program_id,c.chapter_key,new.id,c.id from public.assessor_flow_cohorts c
  join public.training_programs p on p.id=c.program_id
  where c.authority_cutover_decision_id='c1af28-all-pilot-2026-10-16'
  and c.chapter_key='chapter-1' and p.content_key='bhw-reference-manual'
  and public.org_unit_path(new.org_unit_id) like public.org_unit_path(p.org_unit_id)||'%'
  on conflict(program_id,chapter_key,user_id) do nothing;
 end if; return new;
end $$;
revoke all on function assessor_rollout_private.enroll_all_pilot_user() from public,anon,authenticated;
create trigger enroll_all_chapter1_pilot after insert or update of status,role,org_unit_id on public.users
 for each row execute function assessor_rollout_private.enroll_all_pilot_user();
-- No published manual exists in an empty replay; local rehearsals load content first.
do $$ declare ch uuid; begin
 for ch in select c.id from public.training_program_chapters c join public.training_programs p on p.id=c.program_id
 where p.content_key='bhw-reference-manual' and p.status='published' and c.chapter_key='chapter-1' loop
  perform assessor_rollout_private.release_chapter1_pilot(ch);
 end loop;
end $$;
commit;
