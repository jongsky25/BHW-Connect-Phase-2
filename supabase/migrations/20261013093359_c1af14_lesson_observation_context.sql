-- C1AF-14: bounded, read-only context for the first lesson observation form.
-- Reviewed criteria remain empty and rollout controls remain unchanged.
begin;
create function assessor_rollout_private.lesson_practice_context(
  p_program_id uuid, p_lesson_id uuid, p_bhw_user_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  actor public.users; learner public.users; chapter public.training_program_chapters;
  lesson public.course_lessons; module_id uuid; criteria jsonb; can_record boolean := false;
begin
  actor := public.current_app_user();
  if actor.id is null or actor.role <> 'assessor' or actor.status <> 'active'
    or exists (select 1 from public.super_admin_personas where persona_user_id = actor.id)
    then raise exception 'not authorized'; end if;
  if not exists (select 1 from public.feature_flags
    where key = 'assessor_flow_ui' and enabled
      and not ('assessor' = any(coalesce(disabled_roles, '{}'::text[]))))
    then raise exception 'observation interface unavailable'; end if;
  select ch.* into chapter
    from public.training_program_chapters ch
    join public.training_programs program on program.id = ch.program_id
    join public.courses course on course.id = ch.course_id
    join public.course_modules m on m.course_id = course.id
    join public.course_lessons l on l.module_id = m.id
    where ch.program_id = p_program_id and ch.chapter_key = 'chapter-1'
      and ch.availability = 'available' and program.content_key = 'bhw-reference-manual'
      and program.status = 'published' and course.status = 'published'
      and l.id = p_lesson_id and l.lesson_key = 'communication-clarify'
      and l.published_revision_id is not null
      and (public.org_unit_path(course.org_unit_id) like public.current_org_path() || '%'
        or public.current_org_path() like public.org_unit_path(course.org_unit_id) || '%');
  if chapter.id is null then raise exception 'lesson unavailable'; end if;
  select l.* into lesson from public.course_lessons l where l.id = p_lesson_id;
  module_id := lesson.module_id;
  if not exists (select 1 from public.assessor_flow_cohorts cohort
    join public.assessor_flow_cohort_members staff on staff.cohort_id = cohort.id
    where cohort.program_id = p_program_id and cohort.chapter_key = 'chapter-1'
      and cohort.ui_enabled and staff.user_id = actor.id)
    then raise exception 'observation interface unavailable'; end if;
  if p_bhw_user_id is not null then
    select * into learner from public.users where id = p_bhw_user_id;
    if learner.id is null or learner.role <> 'bhw' or learner.status <> 'active'
      or not (public.org_unit_path(learner.org_unit_id) like public.current_org_path() || '%')
      then raise exception 'learner unavailable in catchment'; end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.criterion_id, 'version', r.criterion_version,
    'requirementsVersion', r.requirements_version, 'rubricVersion', r.rubric_version,
    'rubric', r.rubric_snapshot,
    'recordable', learner.id is not null and exists (
      select 1 from assessor_rollout_private.chapter_awards award
      join assessor_rollout_private.award_contracts contract
        on contract.requirements_version = award.requirements_version
        and contract.rubric_version = r.rubric_version
      join public.assessor_flow_cohorts cohort
        on cohort.program_id = p_program_id and cohort.chapter_key = 'chapter-1'
      join public.assessor_flow_cohort_members staff
        on staff.cohort_id = cohort.id and staff.user_id = actor.id
      join public.assessor_flow_cohort_members member
        on member.cohort_id = cohort.id and member.user_id = learner.id
      where award.chapter_id = r.chapter_id and award.requirements_version = r.requirements_version
        and award.actor_id = actor.id and award.status = 'active' and contract.enabled
        and cohort.writes_enabled and cohort.authority_cutover_at is not null
        and exists (select 1 from public.feature_flags f where f.key = 'elearning'
          and f.enabled and not ('assessor' = any(coalesce(f.disabled_roles, '{}'::text[]))))
        and exists (select 1 from public.feature_flags f where f.key = 'assessor_flow_writes'
          and f.enabled and not ('assessor' = any(coalesce(f.disabled_roles, '{}'::text[]))))
    )) order by r.criterion_id, r.criterion_version), '[]'::jsonb)
    into criteria from (
      select * from assessor_rollout_private.practice_criteria r
      where r.chapter_id = chapter.id and r.lesson_id = lesson.id
        and r.lesson_revision_id = lesson.published_revision_id and r.enabled
        and nullif(btrim(r.rubric_snapshot #>> '{observable,fil}'), '') is not null
        and nullif(btrim(r.rubric_snapshot #>> '{observable,en}'), '') is not null
        and nullif(btrim(r.rubric_snapshot #>> '{levels,kaya_na,fil}'), '') is not null
        and nullif(btrim(r.rubric_snapshot #>> '{levels,kaya_na,en}'), '') is not null
        and nullif(btrim(r.rubric_snapshot #>> '{levels,kailangan_practice,fil}'), '') is not null
        and nullif(btrim(r.rubric_snapshot #>> '{levels,kailangan_practice,en}'), '') is not null
        and nullif(btrim(r.rubric_snapshot #>> '{levels,hindi_pa,fil}'), '') is not null
        and nullif(btrim(r.rubric_snapshot #>> '{levels,hindi_pa,en}'), '') is not null
      order by r.criterion_id, r.criterion_version limit 20
    ) r;
  select exists (select 1 from jsonb_array_elements(criteria) item
    where item->>'recordable' = 'true') into can_record;
  return jsonb_build_object('programId', p_program_id, 'chapterId', chapter.id,
    'moduleId', module_id, 'lessonId', lesson.id,
    'learner', case when learner.id is null then null else jsonb_build_object(
      'id', learner.id, 'name', learner.full_name,
      'barangay', (select name from public.org_units where id = learner.org_unit_id)) end,
    'criteria', criteria, 'canRecord', can_record);
end;
$$;

create function public.rpc_assessor_lesson_practice_context(
  p_program_id uuid, p_lesson_id uuid, p_bhw_user_id uuid default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select assessor_rollout_private.lesson_practice_context(p_program_id, p_lesson_id, p_bhw_user_id)
$$;
revoke execute on function assessor_rollout_private.lesson_practice_context(uuid,uuid,uuid),
  public.rpc_assessor_lesson_practice_context(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function assessor_rollout_private.lesson_practice_context(uuid,uuid,uuid),
  public.rpc_assessor_lesson_practice_context(uuid,uuid,uuid) to authenticated;
commit;
