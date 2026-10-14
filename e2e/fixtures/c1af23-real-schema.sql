-- Runs after the complete migration chain on disposable local Supabase.
-- All program, qualification, rule and Chapter 3 adapter rows roll back.
begin;
select set_config('request.jwt.claim.sub', auth_user_id::text, false)
 from public.users where id='__ACTOR_ID__';

do $$
declare
 fixture_actor uuid := '__ACTOR_ID__';
 author_id uuid;
 fixture_program uuid := gen_random_uuid();
 chapter1 uuid := gen_random_uuid();
 chapter2 uuid := gen_random_uuid();
 chapter3 uuid := gen_random_uuid();
 course1 uuid := gen_random_uuid();
 course2 uuid := gen_random_uuid();
 course3 uuid := gen_random_uuid();
 receipt_id uuid;
 progress jsonb;
 state jsonb;
begin
 select id into author_id from public.users where username='admin.city.stable';
 if author_id is null then raise exception 'missing local admin fixture'; end if;
 if not exists(select 1 from assessor_private.exam_requirements where chapter_key='chapter-2' and curriculum_version='2026-09-28.1')
  or not exists(select 1 from assessor_private.orientation_units where chapter_key='chapter-2'
    and curriculum_version='2026-09-28.1' and orientation_version='2026-09-29.2') then
  raise exception 'Chapter 2 migrated prerequisite definitions missing';
 end if;
 if exists(select 1 from assessor_private.exam_requirements where chapter_key='chapter-3')
  or exists(select 1 from assessor_private.orientation_units where chapter_key='chapter-3') then
  raise exception 'Chapter 3 requirements were unexpectedly activated';
 end if;

 insert into public.courses(id,org_unit_id,author_user_id,title_fil,title_en,status)
 values(course1,'00000000-0000-0000-0000-000000000006',author_id,'Local C1','Local C1','published'),
  (course2,'00000000-0000-0000-0000-000000000006',author_id,'Local C2','Local C2','published'),
  (course3,'00000000-0000-0000-0000-000000000006',author_id,'Local C3','Local C3','published');
 insert into public.training_programs(id,content_key,org_unit_id,author_user_id,title_fil,title_en,status)
 values(fixture_program,'bhw-reference-manual','00000000-0000-0000-0000-000000000006',author_id,'Local program','Local program','published');
 insert into public.training_program_chapters(id,program_id,chapter_key,position,title_fil,title_en,course_id,availability)
 values(chapter1,fixture_program,'chapter-1',0,'Local C1','Local C1',course1,'available'),
  (chapter2,fixture_program,'chapter-2',1,'Local C2','Local C2',course2,'available'),
  (chapter3,fixture_program,'chapter-3',2,'Local C3','Local C3',course3,'unavailable');

 -- Recreate a preexisting Chapter 2 receipt with its real passed orientation
 -- FK and versions. Only the fixture insert bypasses today's automatic issuer.
 alter table public.assessor_orientation_attempts disable trigger issue_assessor_qualification_after_pass;
 insert into public.assessor_orientation_attempts(assessor_user_id,chapter_id,curriculum_version,
  orientation_version,answers,correct_count,question_count,passed)
 values(fixture_actor,chapter2,'2026-09-28.1','2026-09-29.2','[]',8,8,true) returning id into receipt_id;
 alter table public.assessor_orientation_attempts enable trigger issue_assessor_qualification_after_pass;
 insert into public.assessor_chapter_qualifications(assessor_user_id,chapter_id,curriculum_version,
  rubric_version,orientation_version,orientation_attempt_id)
 values(fixture_actor,chapter2,'2026-09-28.1','2026-09-28.1','2026-09-29.2',receipt_id);
 state := public.rpc_assessor_qualification_state(chapter2);
 if state->>'status'<>'active' or state->>'qualification_id' is null then
  raise exception 'Chapter 2 legacy receipt was not retained: %',state;
 end if;
 if exists(select 1 from assessor_rollout_private.chapter_awards where actor_id=fixture_actor and chapter_id=chapter2) then
  raise exception 'legacy Chapter 2 receipt was relabeled as a combined award';
 end if;

 -- Published learner content alone cannot make the Chapter 3 staff path ready.
 update public.training_program_chapters set availability='available' where id=chapter3;
 state := public.rpc_assessor_qualification_state(chapter3);
 if state->>'status'<>'unavailable' or state->>'next_step'<>'await_chapter_requirements' then
  raise exception 'Chapter 3 staff path should await its own requirements: %',state;
 end if;
 update public.training_program_chapters set availability='unavailable' where id=chapter3;
 insert into assessor_rollout_private.overall_award_contracts(program_id,rule_version,chapter_requirements,review_reference,enabled)
 values(fixture_program,'local-c1af23',jsonb_build_object(
  'chapter-1',jsonb_build_object('kind','combined','requirementsVersion','local-c1','awardRuleVersion','local-c1'),
  'chapter-2',jsonb_build_object('kind','legacy','curriculumVersion','2026-09-28.1','rubricVersion','2026-09-28.1','orientationVersion','2026-09-29.2'),
  'chapter-3',jsonb_build_object('kind','legacy','curriculumVersion','local-c3','rubricVersion','local-c3','orientationVersion','local-c3')),
  'LOCAL C1AF-23 TEST ONLY',true);
 progress := public.rpc_assessor_overall_progress(fixture_program);
 if (progress->>'qualifiedCount')::int<>1 or progress->'chapters'->1->>'status'<>'qualified'
  or progress->'chapters'->2->>'status'<>'unavailable' or progress->>'nextStep'<>'complete_chapter-1' then
  raise exception 'Chapter 2 compatibility or Chapter 3 blocking failed: %',progress;
 end if;
 if exists(select 1 from assessor_rollout_private.overall_awards where actor_id=fixture_actor and program_id=fixture_program) then
  raise exception 'overall award issued before three compatible chapters';
 end if;

 update public.assessor_chapter_qualifications set status='suspended',status_changed_at=now()
 where assessor_user_id=fixture_actor and chapter_id=chapter2;
 progress := public.rpc_assessor_overall_progress(fixture_program);
 if progress->'chapters'->1->>'status'<>'update_or_resolve' or (progress->>'qualifiedCount')::int<>0 then
  raise exception 'Chapter 2 suspension did not propagate independently: %',progress;
 end if;
 if exists(select 1 from assessor_rollout_private.chapter_awards where actor_id=fixture_actor) then
  raise exception 'Chapter 2 status change mutated a combined chapter award';
 end if;
 update public.assessor_chapter_qualifications set status='active',status_changed_at=now()
 where assessor_user_id=fixture_actor and chapter_id=chapter2;
 update assessor_rollout_private.overall_award_contracts
 set chapter_requirements=jsonb_set(chapter_requirements,'{chapter-2,curriculumVersion}','"wrong-version"'::jsonb)
 where program_id=fixture_program;
 progress := public.rpc_assessor_overall_progress(fixture_program);
 if progress->'chapters'->1->>'status'<>'update_or_resolve' then
  raise exception 'Chapter 2 version mismatch was accepted: %',progress;
 end if;
 update assessor_rollout_private.overall_award_contracts
 set chapter_requirements=jsonb_set(chapter_requirements,'{chapter-2,curriculumVersion}','"2026-09-28.1"'::jsonb)
 where program_id=fixture_program;

 -- Local adapter fixture: Chapter 3 definitions can be installed without
 -- changing either the legacy qualification state RPC or overall rule shape.
 insert into assessor_private.exam_requirements(chapter_key,curriculum_version,required_lessons,minimum_questions,passing_percent)
 select 'chapter-3','local-c3',required_lessons,minimum_questions,passing_percent
 from assessor_private.exam_requirements where chapter_key='chapter-2';
 insert into assessor_private.orientation_units(chapter_key,curriculum_version,orientation_version,title,guide,lessons,cases,passing_count)
 select 'chapter-3','local-c3','local-c3',title,guide,lessons,cases,passing_count
 from assessor_private.orientation_units where chapter_key='chapter-2';
 update public.training_program_chapters set availability='available' where id=chapter3;
 state := public.rpc_assessor_qualification_state(chapter3);
 if state->>'status'<>'in_progress' or state->>'next_step'<>'pretest' then
  raise exception 'Chapter 3 adapter did not expose chapter-specific next step: %',state;
 end if;
 progress := public.rpc_assessor_overall_progress(fixture_program);
 if progress->'chapters'->2->>'status'<>'missing' or (progress->>'qualifiedCount')::int<>1 then
  raise exception 'Chapter 3 activation changed Chapter 2 compatibility: %',progress;
 end if;
end $$;
select 'C1AF-23 real schema rehearsal passed';
rollback;
