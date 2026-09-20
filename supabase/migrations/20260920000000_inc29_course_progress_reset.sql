-- INC-29: an admin path to reset a BHW's course progress.
--
-- The gap this closes (docs/session-handoff.md, "Owed"): once a BHW has any
-- course_module_progress row, rpc_course_test_submit correctly refuses a
-- pretest for that course — a pretest after content starts makes the
-- pre/post delta meaningless. But course_progress/course_module_progress
-- have only SELECT policies (INC-6/INC-12), so nothing short of dashboard
-- SQL could clear a BHW out of that state. That will recur for every pilot
-- BHW who opens a course before a session/pretest gate exists, so it
-- belongs in an admin-guarded RPC rather than a runbook line, per this
-- project's own working agreement (docs/session-handoff.md §1: "prefer a
-- committed script/RPC over a manual runbook step").
--
-- Scope: one BHW, one course. Deletes that BHW's course_progress row
-- (course_module_progress cascades via its FK) and any pretest/posttest
-- attempts for the pair, so they can start the course over from a clean
-- pretest gate. Refuses when an assessment for the pair is pending,
-- assigned, or passed — those are the BHW's official record for the
-- course, and resetting progress out from under one would leave the
-- assessor queue, or an issued certificate, pointing at progress that no
-- longer exists. A 'failed' assessment does not block: that is exactly the
-- retry case this exists for.

create or replace function public.rpc_course_progress_reset(p_course_id uuid, p_bhw_user_id uuid)
returns table (had_progress boolean, modules_cleared integer, test_attempts_cleared integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_target public.users;
  v_course public.courses;
  v_progress public.course_progress;
  v_blocking_assessment public.assessments;
  v_modules_cleared integer := 0;
  v_test_attempts_cleared integer := 0;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_target from public.users where id = p_bhw_user_id;
  if v_target is null then
    raise exception 'user not found';
  end if;
  if v_target.role != 'bhw' then
    raise exception 'target user is not a BHW';
  end if;

  if not exists (
    select 1 from public.org_units
    where id = v_target.org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'user out of scope';
  end if;

  select * into v_course from public.courses where id = p_course_id;
  if v_course is null then
    raise exception 'course not found';
  end if;

  if not exists (
    select 1 from public.org_units
    where id = v_course.org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'course out of scope';
  end if;

  select * into v_blocking_assessment from public.assessments
    where course_id = p_course_id and bhw_user_id = p_bhw_user_id
      and status in ('pending', 'assigned', 'passed')
    order by created_at desc
    limit 1;
  -- `.id is not null`, not `v_blocking_assessment is not null` — found by
  -- actually running this against a pending assessment (assessor_user_id
  -- and decided_at are still null on one) and watching the guard silently
  -- fail to fire. Same ROW IS NOT NULL pitfall rpc_course_test_submit's own
  -- comment already documents below: a composite's IS NOT NULL is true
  -- only when EVERY field is non-null, so a genuinely-found row with any
  -- null column reads as "not found". A scalar column sidesteps it.
  if v_blocking_assessment.id is not null then
    raise exception 'cannot reset: an assessment for this BHW and course is %; resolve it first', v_blocking_assessment.status;
  end if;

  select * into v_progress from public.course_progress
    where course_id = p_course_id and bhw_user_id = p_bhw_user_id;

  -- Scalar field, not the whole row — see rpc_course_test_submit's own
  -- comment on why `v_progress.id is not null` is the reliable form of
  -- this check and `v_progress is not null` is not.
  if v_progress.id is not null then
    select count(*) into v_modules_cleared from public.course_module_progress
      where course_progress_id = v_progress.id;
    delete from public.course_progress where id = v_progress.id; -- cascades to course_module_progress
  end if;

  delete from public.course_test_attempts
    where course_id = p_course_id and bhw_user_id = p_bhw_user_id;
  get diagnostics v_test_attempts_cleared = row_count;

  if v_progress.id is null and v_test_attempts_cleared = 0 then
    return query select false, 0, 0;
    return;
  end if;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, metadata, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'course_progress.reset', 'course_progress', v_target.id,
    jsonb_build_object(
      'course_id', p_course_id,
      'bhw_user_id', p_bhw_user_id,
      'modules_cleared', v_modules_cleared,
      'test_attempts_cleared', v_test_attempts_cleared
    ),
    format('Nireset ni %s ang progress ni %s sa kursong "%s".', v_actor.username, v_target.username, v_course.title_fil),
    format('%s reset %s''s progress in "%s".', v_actor.username, v_target.username, v_course.title_en));

  return query select true, v_modules_cleared, v_test_attempts_cleared;
end;
$$;

grant execute on function public.rpc_course_progress_reset(uuid, uuid) to authenticated;
