-- ---------------------------------------------------------------------
-- INC-23: facilitator read access to course_progress/course_module_progress
-- (docs/training-modules-plan.md INC-23 — "the roster reflects live
-- progress and both scores").
--
-- Found while building the roster, not assumed from a read-through: INC-12
-- (20260729000000_inc12_elearning.sql) only ever granted course_progress/
-- course_module_progress a `_own_read` (the bhw themselves) and an
-- `_admin_read` (org-cascade admin) policy. Neither covers `assessor` —
-- INC-12 predates the facilitator role even existing for training sessions
-- (INC-19), so there was nothing to scope it to yet. Without this, the
-- facilitator UI's roster query for enrolled BHWs' module progress comes
-- back empty under RLS, not merely restricted, for every facilitator.
--
-- Scope is OWNERSHIP via the session's enrollment, not org-cascade — the
-- same distinction INC-19's header note draws for course_test_attempts'
-- course_test_attempts_facilitator_via_session policy (a facilitator sees
-- progress for the cohorts they actually run a session for, not every BHW
-- in their org subtree; that's the admin policy's job). A plain `exists`
-- against course_sessions/course_session_enrollments is safe here (not a
-- security definer helper): neither of those two tables' own policies
-- reference course_progress/course_module_progress back, so this can't
-- re-enter the recursion INC-19's header note warns about — and the
-- facilitator's own ownership policies on course_sessions/
-- course_session_enrollments (course_sessions_facilitator_own,
-- course_session_enrollments_facilitator_own) already let them see exactly
-- the rows this subquery needs.
-- ---------------------------------------------------------------------

drop policy if exists course_progress_facilitator_via_session on public.course_progress;
create policy course_progress_facilitator_via_session on public.course_progress for select
  using (
    (select public.current_app_user()).role = 'assessor'
    and exists (
      select 1
      from public.course_sessions s
      join public.course_session_enrollments e on e.session_id = s.id
      where s.facilitator_user_id = (select public.current_app_user()).id
        and s.course_id = course_progress.course_id
        and e.bhw_user_id = course_progress.bhw_user_id
    )
  );

drop policy if exists course_module_progress_facilitator_via_session on public.course_module_progress;
create policy course_module_progress_facilitator_via_session on public.course_module_progress for select
  using (
    (select public.current_app_user()).role = 'assessor'
    and exists (
      select 1
      from public.course_progress p
      join public.course_sessions s on s.course_id = p.course_id
      join public.course_session_enrollments e
        on e.session_id = s.id and e.bhw_user_id = p.bhw_user_id
      where p.id = course_module_progress.course_progress_id
        and s.facilitator_user_id = (select public.current_app_user()).id
    )
  );
