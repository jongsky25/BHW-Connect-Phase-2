-- C1AF-16: read-only Chapter 1 component readiness. No policy, criterion,
-- assignment, cohort, cutover or flag is activated by this migration.
begin;

create table assessor_rollout_private.component_requirements (
  module_id uuid primary key references public.course_modules(id),
  chapter_id uuid not null references public.training_program_chapters(id),
  requirements_version text not null references assessor_rollout_private.award_contracts(requirements_version),
  rubric_version text not null check (btrim(rubric_version) <> ''),
  required_test_phases text[] not null default '{}'::text[]
    check (required_test_phases <@ array['pretest','posttest']::text[]
      and cardinality(required_test_phases) <= 2
      and (cardinality(required_test_phases)<2
        or required_test_phases[1]<>required_test_phases[2])),
  review_reference text not null check (btrim(review_reference) <> ''),
  approved_by uuid not null references public.users(id),
  enabled boolean not null default false
);
create table assessor_rollout_private.component_required_lessons (
  module_id uuid not null references assessor_rollout_private.component_requirements(module_id),
  lesson_id uuid not null references public.course_lessons(id),
  primary key (module_id,lesson_id)
);
create table assessor_rollout_private.component_required_criteria (
  module_id uuid not null references assessor_rollout_private.component_requirements(module_id),
  chapter_id uuid not null,
  criterion_id text not null,
  criterion_version text not null,
  primary key (module_id,criterion_id),
  foreign key (chapter_id,criterion_id,criterion_version)
    references assessor_rollout_private.practice_criteria(chapter_id,criterion_id,criterion_version)
);
-- C1AF-17 will own claim and release mutations. This private table lets the
-- readiness read expose competing ownership without using legacy chapter-wide
-- assessments as a false component assignment.
create table assessor_rollout_private.component_assignments (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id),
  bhw_user_id uuid not null references public.users(id),
  assessor_user_id uuid not null references public.users(id),
  status text not null check (status in ('active','released','cancelled')),
  created_at timestamptz not null default clock_timestamp()
);
create unique index component_one_active_assignment
  on assessor_rollout_private.component_assignments(module_id,bhw_user_id)
  where status='active';
create index component_assignments_assessor_idx
  on assessor_rollout_private.component_assignments(assessor_user_id,status);
alter table assessor_rollout_private.component_requirements enable row level security;
alter table assessor_rollout_private.component_required_lessons enable row level security;
alter table assessor_rollout_private.component_required_criteria enable row level security;
alter table assessor_rollout_private.component_assignments enable row level security;
revoke all on assessor_rollout_private.component_requirements,
  assessor_rollout_private.component_required_lessons,
  assessor_rollout_private.component_required_criteria,
  assessor_rollout_private.component_assignments from public,anon,authenticated;

create function assessor_rollout_private.component_readiness(
  p_program_id uuid,p_bhw_user_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  actor public.users; learner public.users; chapter public.training_program_chapters;
  cohort public.assessor_flow_cohorts; component public.course_modules;
  requirement assessor_rollout_private.component_requirements;
  progress_id uuid; current_release_id text; blockers text[]; learner_blockers text[];
  authority_blockers text[]; missing_lessons uuid[]; stale_lessons uuid[];
  missing_tests text[]; invalid_criteria integer; lesson_count integer;
  criterion_count integer; test_phase text; result jsonb := '[]'::jsonb;
  assignment_user_id uuid; has_award boolean; writes_open boolean;
begin
  actor:=public.current_app_user();
  if actor.id is null or actor.role<>'assessor' or actor.status<>'active'
    or exists(select 1 from public.super_admin_personas p where p.persona_user_id=actor.id)
    or not exists(select 1 from public.feature_flags f where f.key='elearning'
      and f.enabled and not ('assessor'=any(coalesce(f.disabled_roles,'{}'::text[]))))
    or not exists(select 1 from public.feature_flags f where f.key='assessor_flow_ui'
      and f.enabled and not ('assessor'=any(coalesce(f.disabled_roles,'{}'::text[]))))
    then raise exception 'not authorized'; end if;
  select * into learner from public.users where id=p_bhw_user_id;
  if learner.id is null or learner.role<>'bhw' or learner.status<>'active'
    or learner.id=actor.id or public.org_unit_path(learner.org_unit_id)
      not like public.org_unit_path(actor.org_unit_id)||'%'
    then raise exception 'learner unavailable'; end if;
  select ch.* into chapter from public.training_programs program
    join public.training_program_chapters ch on ch.program_id=program.id
    join public.courses course on course.id=ch.course_id
    where program.id=p_program_id and program.content_key='bhw-reference-manual'
      and program.status='published' and ch.chapter_key='chapter-1'
      and ch.availability='available' and course.status='published';
  if chapter.id is null then raise exception 'chapter unavailable'; end if;
  select c.* into cohort from public.assessor_flow_cohorts c
    join public.assessor_flow_cohort_members m on m.cohort_id=c.id
    where c.program_id=p_program_id and c.chapter_key='chapter-1'
      and c.ui_enabled and m.user_id=actor.id;
  if cohort.id is null then raise exception 'not authorized'; end if;
  select cp.id into progress_id from public.course_progress cp
    where cp.course_id=chapter.course_id and cp.bhw_user_id=learner.id;
  select r.id into current_release_id from learner_assessment_private.releases r
    join learner_assessment_private.enrollments e on e.release_id=r.id
    where e.learner_id=learner.id and e.course_id=chapter.course_id
      and r.status='active' and r.comparability_status='validated'
      and r.program_key='bhw-reference-manual' and r.chapter_key='chapter-1';
  writes_open:=cohort.writes_enabled and cohort.authority_cutover_at is not null
    and exists(select 1 from public.feature_flags f where f.key='assessor_flow_writes'
      and f.enabled and not ('assessor'=any(coalesce(f.disabled_roles,'{}'::text[]))))
    and exists(select 1 from public.assessor_flow_cohort_members m
      where m.cohort_id=cohort.id and m.user_id=learner.id);
  for component in select * from public.course_modules m
    where m.course_id=chapter.course_id order by m.position,m.id limit 20 loop
    blockers:='{}';learner_blockers:='{}';authority_blockers:='{}';
    missing_lessons:='{}';stale_lessons:='{}';missing_tests:='{}';
    select * into requirement from assessor_rollout_private.component_requirements r
      where r.module_id=component.id and r.chapter_id=chapter.id
        and r.requirements_version=cohort.requirements_version;
    if requirement.module_id is null or not requirement.enabled then
      learner_blockers:=array_append(learner_blockers,'component_contract_unavailable');
    else
      select count(*) into lesson_count from assessor_rollout_private.component_required_lessons l
        where l.module_id=component.id;
      select count(*) into criterion_count from assessor_rollout_private.component_required_criteria c
        where c.module_id=component.id;
      if lesson_count=0 or criterion_count=0 then
        learner_blockers:=array_append(learner_blockers,'component_mapping_incomplete');
      end if;
      select coalesce(array_agg(l.lesson_id order by l.lesson_id),'{}'::uuid[])
        into missing_lessons from assessor_rollout_private.component_required_lessons l
        left join public.course_lessons lesson on lesson.id=l.lesson_id
        where l.module_id=component.id
          and (lesson.module_id is distinct from component.id
            or lesson.published_revision_id is null);
      if cardinality(missing_lessons)>0 then
        learner_blockers:=array_append(learner_blockers,'required_content_unavailable');
      end if;
      select coalesce(array_agg(l.lesson_id order by l.lesson_id),'{}'::uuid[])
        into stale_lessons from assessor_rollout_private.component_required_lessons l
        join public.course_lessons lesson on lesson.id=l.lesson_id
        join public.course_lesson_progress lp on lp.lesson_id=lesson.id
          and lp.course_progress_id=progress_id
        where l.module_id=component.id and lesson.published_revision_id is not null
          and lp.revision_id<>lesson.published_revision_id;
      if cardinality(stale_lessons)>0 then
        learner_blockers:=array_append(learner_blockers,'stale_learning_evidence');
      end if;
      if exists(select 1 from assessor_rollout_private.component_required_lessons l
        join public.course_lessons lesson on lesson.id=l.lesson_id
        where l.module_id=component.id and lesson.published_revision_id is not null
          and not exists(select 1 from public.course_lesson_progress lp
            where lp.course_progress_id=progress_id and lp.lesson_id=lesson.id
              and lp.revision_id=lesson.published_revision_id)) then
        learner_blockers:=array_append(learner_blockers,'required_lessons_incomplete');
      end if;
      select count(*) into invalid_criteria from assessor_rollout_private.component_required_criteria c
        left join assessor_rollout_private.practice_criteria criterion
          on criterion.chapter_id=c.chapter_id and criterion.criterion_id=c.criterion_id
            and criterion.criterion_version=c.criterion_version
        left join public.course_lessons lesson on lesson.id=criterion.lesson_id
        where c.module_id=component.id and (c.chapter_id<>chapter.id
          or criterion.enabled is distinct from true
          or criterion.requirements_version is distinct from requirement.requirements_version
          or criterion.rubric_version is distinct from requirement.rubric_version
          or lesson.module_id is distinct from component.id
          or lesson.published_revision_id is distinct from criterion.lesson_revision_id
          or not exists(select 1 from assessor_rollout_private.component_required_lessons l
            where l.module_id=component.id and l.lesson_id=criterion.lesson_id));
      if invalid_criteria>0 or not exists(select 1 from assessor_rollout_private.award_contracts c
        where c.requirements_version=requirement.requirements_version
          and c.rubric_version=requirement.rubric_version and c.enabled) then
        learner_blockers:=array_append(learner_blockers,'approved_rubric_unavailable');
      end if;
      if cardinality(requirement.required_test_phases)>0 then
        if current_release_id is null then
          learner_blockers:=array_append(learner_blockers,'test_release_unavailable');
        else
          foreach test_phase in array requirement.required_test_phases loop
            if not exists(select 1 from learner_assessment_private.attempts a
              where a.learner_id=learner.id and a.course_id=chapter.course_id
                and a.release_id=current_release_id and a.phase=test_phase
                and a.state='submitted') then
              missing_tests:=array_append(missing_tests,test_phase);
            end if;
          end loop;
          if cardinality(missing_tests)>0 then
            learner_blockers:=array_append(learner_blockers,'required_tests_incomplete');
          end if;
        end if;
      end if;
    end if;
    has_award:=exists(select 1 from assessor_rollout_private.chapter_awards a
      join assessor_rollout_private.award_contracts c
        on c.requirements_version=a.requirements_version
      where a.actor_id=actor.id and a.chapter_id=chapter.id and a.status='active'
        and c.enabled and a.requirements_version=cohort.requirements_version
        and (requirement.module_id is null or c.rubric_version=requirement.rubric_version));
    if not has_award then
      authority_blockers:=array_append(authority_blockers,'chapter_award_required');
    end if;
    if not writes_open then
      authority_blockers:=array_append(authority_blockers,'rollout_writes_closed');
    end if;
    select a.assessor_user_id into assignment_user_id
      from assessor_rollout_private.component_assignments a
      where a.module_id=component.id and a.bhw_user_id=learner.id and a.status='active';
    if assignment_user_id is not null and assignment_user_id<>actor.id then
      authority_blockers:=array_append(authority_blockers,'assigned_to_other');
    end if;
    blockers:=learner_blockers||authority_blockers;
    result:=result||jsonb_build_array(jsonb_build_object(
      'moduleId',component.id,'titleFil',component.title_fil,'titleEn',component.title_en,
      'learnerReady',cardinality(learner_blockers)=0,
      'actorAuthorized',cardinality(authority_blockers)=0,
      'canArrange',cardinality(blockers)=0,
      'learnerBlockers',to_jsonb(learner_blockers),
      'authorityBlockers',to_jsonb(authority_blockers),
      'missingLessonIds',to_jsonb(missing_lessons),
      'staleLessonIds',to_jsonb(stale_lessons),
      'missingTestPhases',to_jsonb(missing_tests)));
  end loop;
  return result;
end;
$$;
create function public.rpc_assessor_component_readiness(p_program_id uuid,p_bhw_user_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select assessor_rollout_private.component_readiness(p_program_id,p_bhw_user_id)
$$;
revoke execute on function assessor_rollout_private.component_readiness(uuid,uuid),
  public.rpc_assessor_component_readiness(uuid,uuid) from public,anon,authenticated;
grant execute on function assessor_rollout_private.component_readiness(uuid,uuid),
  public.rpc_assessor_component_readiness(uuid,uuid) to authenticated;
commit;
