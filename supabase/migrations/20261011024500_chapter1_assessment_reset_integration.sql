-- The existing scoped admin reset owns authorization and deletes final
-- compatibility rows. Remove v2 drafts/assignments in the same transaction.
alter function public.rpc_course_progress_reset(uuid, uuid)
  rename to rpc_course_progress_reset_legacy_impl;
revoke execute on function public.rpc_course_progress_reset_legacy_impl(uuid, uuid)
  from public, anon, authenticated;

create function public.rpc_course_progress_reset(p_course_id uuid, p_bhw_user_id uuid)
returns table(had_progress boolean, modules_cleared integer, test_attempts_cleared integer)
language plpgsql security definer set search_path = '' as $$
declare v_v2_attempts integer;
begin
  select r.had_progress, r.modules_cleared, r.test_attempts_cleared
    into had_progress, modules_cleared, test_attempts_cleared
    from public.rpc_course_progress_reset_legacy_impl(p_course_id, p_bhw_user_id) r;
  delete from learner_assessment_private.attempts
    where course_id = p_course_id and learner_id = p_bhw_user_id;
  get diagnostics v_v2_attempts = row_count;
  delete from learner_assessment_private.enrollments
    where course_id = p_course_id and learner_id = p_bhw_user_id;
  if v_v2_attempts > 0 then had_progress := true; end if;
  return next;
end;
$$;
revoke execute on function public.rpc_course_progress_reset(uuid, uuid) from public, anon;
grant execute on function public.rpc_course_progress_reset(uuid, uuid) to authenticated;
