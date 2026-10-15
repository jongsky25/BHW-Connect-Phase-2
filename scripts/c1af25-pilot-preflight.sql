-- C1AF-25 read-only release inventory. Run through the Supabase SQL tool against
-- the pilot immediately before deciding on a limited cohort. It does not
-- approve a rubric, select a cohort, or change a release control.
with chapter as (
  select c.id, c.program_id, c.course_id
  from public.training_program_chapters c
  join public.training_programs p on p.id = c.program_id
  where p.content_key = 'bhw-reference-manual'
    and p.status = 'published' and c.chapter_key = 'chapter-1'
),
pending_legacy as (
  select a.id, a.created_at, a.bhw_user_id, ch.program_id
  from public.assessments a
  join chapter ch on ch.course_id = a.course_id
  where a.status in ('pending', 'assigned')
)
select jsonb_build_object(
  'captured_at_utc', now(),
  'chapter_programs', (select count(distinct program_id) from chapter),
  'flags', (select coalesce(jsonb_object_agg(key, enabled), '{}'::jsonb)
    from public.feature_flags
    where key in ('assessor_flow_ui', 'assessor_flow_writes', 'assessor_flow_awards')),
  'cohorts', (select coalesce(jsonb_agg(jsonb_build_object(
    'program_id', c.program_id, 'cohort_key', c.cohort_key,
    'requirements_version', c.requirements_version,
    'ui_enabled', c.ui_enabled, 'writes_enabled', c.writes_enabled,
    'awards_enabled', c.awards_enabled,
    'cutover_set', c.authority_cutover_at is not null,
    'assessors', (select count(*) from public.assessor_flow_cohort_members m
      join public.users u on u.id = m.user_id
      where m.cohort_id = c.id and u.role = 'assessor'),
    'bhws', (select count(*) from public.assessor_flow_cohort_members m
      join public.users u on u.id = m.user_id
      where m.cohort_id = c.id and u.role = 'bhw')
  ) order by c.cohort_key), '[]'::jsonb)
    from public.assessor_flow_cohorts c
    where c.chapter_key = 'chapter-1'
      and exists (select 1 from chapter ch where ch.program_id = c.program_id)),
  'reviewed_registry', jsonb_build_object(
    'award_contracts', (select count(*) from assessor_rollout_private.award_contracts),
    'enabled_award_contracts', (select count(*) from assessor_rollout_private.award_contracts where enabled),
    'practice_criteria', (select count(*) from assessor_rollout_private.practice_criteria),
    'enabled_practice_criteria', (select count(*) from assessor_rollout_private.practice_criteria where enabled),
    'component_requirements', (select count(*) from assessor_rollout_private.component_requirements),
    'enabled_component_requirements', (select count(*) from assessor_rollout_private.component_requirements where enabled)),
  'new_records', jsonb_build_object(
    'staff_chapter_awards', (select count(*) from assessor_rollout_private.chapter_awards),
    'component_requests', (select count(*) from assessor_rollout_private.component_requests),
    'formal_attempts', (select count(*) from assessor_rollout_private.formal_attempts),
    'bhw_chapter_reviews', (select count(*) from assessor_rollout_private.bhw_chapter_reviews)),
  'legacy_staff_chapter1_qualifications', (select count(*)
    from public.assessor_chapter_qualifications q join chapter ch on ch.id = q.chapter_id
    where q.status = 'active'),
  'pending_legacy', (select coalesce(jsonb_agg(jsonb_build_object(
    'assessment_id', a.id, 'created_at', a.created_at,
    'in_chapter1_cohort', exists (select 1 from public.assessor_flow_cohort_members m
      where m.program_id = a.program_id and m.chapter_key = 'chapter-1'
        and m.user_id = a.bhw_user_id)
  ) order by a.created_at, a.id), '[]'::jsonb) from pending_legacy a)
) as pilot_preflight;
