-- ---------------------------------------------------------------------
-- rpc_e2e_purge_test_users gains p_min_age_hours (default 24, so the
-- scheduled e2e-test-users-purge.yml and ops-hardening.spec.ts's dry-run
-- calls behave exactly as before), matching rpc_e2e_purge_test_courses and
-- rpc_e2e_purge_test_content.
--
-- The hard-coded 24h cutoff meant the throwaway `e2e.%` users every CI run
-- provisions were only ever eligible a day later, and the scheduled purge
-- only dry-runs, so 513 of them had piled up on the pilot by 27 Sep 2026
-- (all but 9 under a day old; the pilot is busy enough to add hundreds a
-- day). e2e/global-teardown.ts now calls this with p_min_age_hours => 0
-- after every CI run, after rpc_e2e_purge_test_content — safe for the same
-- reason that one is: ci.yml's e2e-wait lets only one E2E job run against
-- the pilot at a time. The body is otherwise unchanged from
-- 20261003000000_e2e_purge_forum_categories.sql.
-- ---------------------------------------------------------------------

drop function if exists public.rpc_e2e_purge_test_users(boolean);

create or replace function public.rpc_e2e_purge_test_users(
  p_dry_run boolean default true,
  p_min_age_hours int default 24
)
returns table (users_purged bigint, forum_categories_purged bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_cutoff timestamptz := now() - make_interval(hours => greatest(p_min_age_hours, 0));
  v_target_ids uuid[];
  v_category_ids uuid[];
begin
  select * into v_actor from public.current_app_user();
  if (v_actor is null or v_actor.role != 'admin') and auth.role() != 'service_role' then
    raise exception 'not authorized';
  end if;

  select array_agg(id) into v_target_ids
    from public.users
    where username like 'e2e.%' and created_at < v_cutoff;

  select array_agg(id) into v_category_ids
    from public.forum_categories
    where slug like 'e2e.%' and created_at < v_cutoff;

  if not p_dry_run then
    if v_target_ids is not null then
      delete from public.course_test_attempts where bhw_user_id = any(v_target_ids);
      delete from public.course_session_enrollments where bhw_user_id = any(v_target_ids);

      -- certificates before assessments: certificates.assessment_id has no
      -- cascade, so a certificate for a real BHW graded by a throwaway
      -- assessor would otherwise block the assessment delete below.
      delete from public.certificates
        where bhw_user_id = any(v_target_ids)
           or assessment_id in (
             select id from public.assessments
             where bhw_user_id = any(v_target_ids) or assessor_user_id = any(v_target_ids)
           );
      delete from public.assessments
        where bhw_user_id = any(v_target_ids) or assessor_user_id = any(v_target_ids);

      -- cascades course_module_progress via course_progress_id.
      delete from public.course_progress where bhw_user_id = any(v_target_ids);

      delete from public.flip_charts where author_user_id = any(v_target_ids);

      -- a throwaway user is never an admin, so it can never be a
      -- hidden_by_user_id in practice; nulled defensively anyway so a
      -- future role change can't turn this into a silent FK failure.
      update public.forum_posts set hidden_by_user_id = null where hidden_by_user_id = any(v_target_ids);
      delete from public.forum_posts where author_user_id = any(v_target_ids);
      update public.forum_threads set hidden_by_user_id = null where hidden_by_user_id = any(v_target_ids);
      -- cascades the thread's own forum_posts via thread_id.
      delete from public.forum_threads where author_user_id = any(v_target_ids);

      delete from public.survey_responses where respondent_user_id = any(v_target_ids);
      -- cascades the survey's own survey_responses via survey_id.
      delete from public.surveys where author_user_id = any(v_target_ids);

      delete from public.announcements where author_user_id = any(v_target_ids);

      -- individually-addressed notifications only; org-broadcast rows have
      -- recipient_user_id null (the table's own XOR check enforces that),
      -- so this can never touch one.
      delete from public.notifications where recipient_user_id = any(v_target_ids);

      delete from public.audit_events
        where actor_user_id = any(v_target_ids)
           or (subject_type = 'user' and subject_id = any(v_target_ids));

      -- deletes the matching public.users row too, via its existing
      -- auth_user_id ... on delete cascade FK.
      delete from auth.users where id in (
        select auth_user_id from public.users where id = any(v_target_ids)
      );
    end if;

    if v_category_ids is not null then
      delete from public.forum_posts
        where thread_id in (select id from public.forum_threads where category_id = any(v_category_ids));
      delete from public.forum_threads where category_id = any(v_category_ids);
      delete from public.forum_categories where id = any(v_category_ids);
    end if;
  end if;

  return query select
    coalesce(array_length(v_target_ids, 1), 0)::bigint,
    coalesce(array_length(v_category_ids, 1), 0)::bigint;
end;
$$;

revoke execute on function public.rpc_e2e_purge_test_users(boolean, int) from public, anon;
grant execute on function public.rpc_e2e_purge_test_users(boolean, int) to authenticated, service_role;
