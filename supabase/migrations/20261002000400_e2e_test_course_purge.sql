-- ---------------------------------------------------------------------
-- Courses cleanup: every E2E spec that provisions a course via
-- rpc_course_create (elearning.spec.ts's first test, slide-mode.spec.ts,
-- slide-mode-a11y.spec.ts, lesson-narration.spec.ts's narrated/scene
-- fixtures, training-sessions.spec.ts) publishes it and drives a BHW
-- through it, but only elearning.spec.ts's *second* test calls
-- rpc_course_delete at the end. The rest never clean up, so every CI run
-- against the shared pilot project (docs/deploy-runbook.md's "One
-- database") leaves several published courses behind. They're real rows
-- with real learner progress, so rpc_course_create's own guard rails
-- ("course has learner progress" / "recorded test attempts") on
-- rpc_course_delete refuse to remove them — the same shape as the
-- e2e.* throwaway users this project already has a purge for
-- (20260920020000_e2e_test_user_purge.sql). This is that purge's
-- counterpart for courses.
--
-- Every one of these specs embeds a marker in both title columns:
-- `e2e.<spec-tag>.<epoch-ms>.<random>`, e.g. "Course en
-- e2e.course.1790484407959.zhq26e" or "Training Course
-- e2e.training.1790484971565.eab7". No real course title produced by
-- /admin/courses looks like that, so the regex below is a safe,
-- narrow match — verified against the pilot project's live `courses`
-- table (42 matches, 0 false positives against the two real chapters
-- of the BHW Reference Manual program) before this migration was
-- written. The `training_program_chapters` exclusion is defense in
-- depth: a real course a program chapter points at is never purged,
-- even if some future course title happened to collide with the regex.
--
-- Unlike the user purge (a single `delete from auth.users` cascades
-- everything), a course drags in ~10 tables across three chains —
-- assessments/certificates, course_progress and its children, and
-- course_sessions and its children — several of them NO ACTION FKs, so
-- the delete order below matters: certificates and assessments before
-- course_progress before course_test_attempts before course_sessions
-- (attempts reference sessions), then the handful of course_modules
-- children that aren't ON DELETE CASCADE (competency_observations,
-- course_lesson_equivalences, course_lessons — all empty for these
-- fixtures today, handled anyway so a future spec that populates them
-- doesn't turn this into a silent FK violation), and only then the
-- `courses` row itself, which cascades course_modules and everything
-- that *is* ON DELETE CASCADE from it (course_test_questions,
-- course_quiz_questions, course_module_audio/visuals/facilitator_notes,
-- course_module_progress).
--
-- `p_min_age_hours` (default 24, matching the user purge) guards
-- against deleting a course an in-flight CI run is still mid-test with.
-- The scheduled workflow always uses the default; a one-off manual
-- cleanup of already-accumulated junk can pass a smaller value once a
-- human has confirmed no E2E run is in flight.
-- ---------------------------------------------------------------------

create or replace function public.rpc_e2e_purge_test_courses(
  p_dry_run boolean default true,
  p_min_age_hours int default 24
)
returns table (courses_purged bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_cutoff timestamptz := now() - make_interval(hours => greatest(p_min_age_hours, 0));
  v_target_ids uuid[];
  v_module_ids uuid[];
begin
  select * into v_actor from public.current_app_user();
  if (v_actor is null or v_actor.role != 'admin') and auth.role() != 'service_role' then
    raise exception 'not authorized';
  end if;

  select array_agg(id) into v_target_ids
    from public.courses
    where created_at < v_cutoff
      and (title_en ~ 'e2e\.[a-z0-9-]+\.[0-9]{10,}\.[a-z0-9]+$'
        or title_fil ~ 'e2e\.[a-z0-9-]+\.[0-9]{10,}\.[a-z0-9]+$')
      and id not in (
        select course_id from public.training_program_chapters where course_id is not null
      );

  if not p_dry_run and v_target_ids is not null then
    select array_agg(id) into v_module_ids
      from public.course_modules where course_id = any(v_target_ids);

    -- certificates before assessments: certificates.assessment_id has no
    -- cascade, so a certificate would otherwise block the assessment delete.
    delete from public.certificates
      where course_id = any(v_target_ids)
         or assessment_id in (select id from public.assessments where course_id = any(v_target_ids));
    delete from public.assessments where course_id = any(v_target_ids);

    delete from public.course_lesson_progress
      where course_progress_id in (select id from public.course_progress where course_id = any(v_target_ids))
         or legacy_module_id = any(v_module_ids);
    delete from public.course_lesson_resume
      where course_progress_id in (select id from public.course_progress where course_id = any(v_target_ids));
    -- cascades course_module_progress via course_progress_id.
    delete from public.course_progress where course_id = any(v_target_ids);

    -- before course_sessions: course_test_attempts.session_id has no cascade.
    delete from public.course_test_attempts where course_id = any(v_target_ids);
    -- cascades course_session_activities/deliveries/enrollments via session_id.
    delete from public.course_sessions where course_id = any(v_target_ids);

    -- the handful of course_modules children that aren't ON DELETE CASCADE;
    -- empty today for these fixtures, handled so a future spec that
    -- populates them can't turn this into a silent FK violation.
    delete from public.competency_observations where module_id = any(v_module_ids);
    delete from public.course_lesson_equivalences where legacy_module_id = any(v_module_ids);
    delete from public.course_lessons where module_id = any(v_module_ids);

    -- cascades course_modules and everything ON DELETE CASCADE from it
    -- (course_test_questions, course_quiz_questions, course_module_audio/
    -- visuals/facilitator_notes, course_module_progress).
    delete from public.courses where id = any(v_target_ids);
  end if;

  return query select coalesce(array_length(v_target_ids, 1), 0)::bigint;
end;
$$;

revoke execute on function public.rpc_e2e_purge_test_courses(boolean, int) from public, anon;
grant execute on function public.rpc_e2e_purge_test_courses(boolean, int) to authenticated, service_role;
