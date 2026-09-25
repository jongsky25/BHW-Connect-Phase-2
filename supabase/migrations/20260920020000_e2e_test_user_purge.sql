-- ---------------------------------------------------------------------
-- Issue #58 follow-up: purge the e2e.* throwaway users that
-- e2e/fixtures/auth.ts's createThrowawayUser mints on every CI run
-- (username `e2e.<timestamp>.<random>`) and never cleans up. PR #73
-- found 1,055 of them on the shared `bhw-connect-e2e` project and
-- explicitly declined to purge them unilaterally ("destructive on
-- shared infrastructure ... flagging it for a decision"). This
-- migration is that decision, made safe to ship everywhere:
--
-- - The `e2e.%` username pattern can only ever match a throwaway CI
--   fixture (see the comment above createThrowawayUser) — no real
--   account, pilot or production, is ever named that way — so this
--   function is a no-op by construction outside the CI project.
-- - `anonymized-*` rows (ops-hardening.spec.ts's anonymize test leaves
--   one per run, per issue #58's "also noted while here") are
--   deliberately NOT in scope: `rpc_admin_anonymize_user` is a real
--   DPA data-subject-rights action, so an `anonymized-*` row can be a
--   genuine anonymized production account, not just test noise. Purging
--   those needs its own, separately-reviewed decision.
-- - A 24h age cutoff means a run still in flight (or one that just
--   finished) is never touched, regardless of when this runs.
-- - `public.users` is referenced (no cascade) by ~11 other tables —
--   audit_events, notifications, forum_threads/forum_posts, surveys/
--   survey_responses, announcements, flipcharts, and the elearning/
--   training-session tables that hang off a BHW or assessor. Each is
--   cleaned explicitly, in dependency order, before the user row itself
--   goes; deleting `auth.users` last is what actually removes the
--   matching `public.users` row, via its existing `on delete cascade`
--   FK. Tables a throwaway user
--   cannot currently reach (courses.author_user_id, kb_entries/
--   kb_articles.owner_user_id, course_sessions.facilitator_user_id —
--   see e2e/fixtures/auth.ts's role list and grep for which specs
--   actually use createThrowawayDesigner/Assessor) are deliberately
--   left alone: if that ever changes, the final delete raises a
--   foreign-key violation and rolls back rather than silently
--   cascading away another user's real content.
--
-- Same dry-run/live shape as `rpc_retention_purge`: callable by an
-- admin (an on-demand dry run) or the scheduled purge workflow
-- authenticating as admin.stable (see .github/workflows/
-- e2e-test-users-purge.yml — the shared e2e project has no
-- service-role secret wired into CI, unlike the pilot's
-- retention-purge.yml, so this widens to `admin` rather than
-- `service_role`).
-- ---------------------------------------------------------------------

create or replace function public.rpc_e2e_purge_test_users(p_dry_run boolean default true)
returns table (users_purged bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_cutoff timestamptz := now() - interval '24 hours';
  v_target_ids uuid[];
begin
  select * into v_actor from public.current_app_user();
  if (v_actor is null or v_actor.role != 'admin') and auth.role() != 'service_role' then
    raise exception 'not authorized';
  end if;

  select array_agg(id) into v_target_ids
    from public.users
    where username like 'e2e.%' and created_at < v_cutoff;

  if not p_dry_run and v_target_ids is not null then
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

  return query select coalesce(array_length(v_target_ids, 1), 0)::bigint;
end;
$$;

revoke execute on function public.rpc_e2e_purge_test_users(boolean) from public, anon;
grant execute on function public.rpc_e2e_purge_test_users(boolean) to authenticated, service_role;
