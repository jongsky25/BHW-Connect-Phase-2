-- ---------------------------------------------------------------------
-- E2E content purge: announcements, surveys, flip charts, forum threads and
-- posts, courses, and the notifications they fanned out.
--
-- Every E2E run shares the pilot project (docs/deploy-runbook.md's "One
-- database"), and the specs that create content clean up only on their last
-- line, if at all: announcements.spec.ts and surveys.spec.ts delete their
-- city-level fixture only after every assertion passes, flipcharts.spec.ts
-- never deletes its chart, forum.spec.ts never deletes its category, and the
-- course specs never delete their course (see 20261002000400). A failed or
-- retried test leaves published content behind, and it's all authored by the
-- stable fixture accounts, so rpc_e2e_purge_test_users (which keys off
-- `username like 'e2e.%'`) can't reach it. On 4 Oct 2026 every announcement,
-- survey, flip chart and forum thread on the pilot, 6 of its 8 courses and
-- ~290 notifications were E2E leftovers, all visible to real users.
--
-- Every spec embeds a marker `e2e.<tag>[.<subtag>].<epoch-ms>.<random>` in
-- the content's title/body (e.g. "Chart en e2e.flipchart.1790494493087.vuky82",
-- "Note from the city. e2e.announce.city.1790478180259.s4ifop") and slugs its
-- forum categories `e2e.<marker>`. No real content looks like that, so these
-- matches are narrow. Courses go through rpc_e2e_purge_test_courses, which
-- never touches a course a training program chapter (the BHW Reference
-- Manual) points at.
--
-- Notifications are deleted when their subject no longer exists (after the
-- deletes above) or when their text carries a marker, so the bell doesn't
-- keep "New Announcement" / "course published" rows for purged content.
--
-- playwright's global teardown (e2e/global-teardown.ts) calls this after
-- every CI run with p_min_age_hours => 0. That is safe only because CI runs
-- one E2E job at a time against the pilot (ci.yml's e2e-wait), so nothing
-- else is mid-test.
-- ---------------------------------------------------------------------

create or replace function public.rpc_e2e_purge_test_content(
  p_dry_run boolean default true,
  p_min_age_hours int default 24
)
returns table (
  announcements_purged bigint,
  surveys_purged bigint,
  flip_charts_purged bigint,
  forum_categories_purged bigint,
  forum_threads_purged bigint,
  forum_posts_purged bigint,
  courses_purged bigint,
  notifications_purged bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_cutoff timestamptz := now() - make_interval(hours => greatest(p_min_age_hours, 0));
  v_marker constant text := 'e2e\.[a-z0-9-]+(\.[a-z0-9-]+)*\.[0-9]{10,}\.[a-z0-9]+';
  v_announcement_ids uuid[];
  v_survey_ids uuid[];
  v_flip_chart_ids uuid[];
  v_category_ids uuid[];
  v_thread_ids uuid[];
  v_post_ids uuid[];
  v_courses bigint;
  v_notifications bigint := 0;
begin
  select * into v_actor from public.current_app_user();
  if (v_actor is null or v_actor.role != 'admin') and auth.role() != 'service_role' then
    raise exception 'not authorized';
  end if;

  select array_agg(id) into v_announcement_ids from public.announcements
    where created_at < v_cutoff and (body_en ~ v_marker or body_fil ~ v_marker);

  select array_agg(id) into v_survey_ids from public.surveys
    where created_at < v_cutoff and (title_en ~ v_marker or title_fil ~ v_marker);

  select array_agg(id) into v_flip_chart_ids from public.flip_charts
    where created_at < v_cutoff and (title_en ~ v_marker or title_fil ~ v_marker);

  select array_agg(id) into v_category_ids from public.forum_categories
    where created_at < v_cutoff and slug like 'e2e.%';

  -- threads inside a purged category, plus marked threads anywhere else.
  select array_agg(id) into v_thread_ids from public.forum_threads
    where category_id = any(coalesce(v_category_ids, '{}'))
       or (created_at < v_cutoff and (title ~ v_marker or body ~ v_marker));

  -- marked replies left in threads that are otherwise kept.
  select array_agg(id) into v_post_ids from public.forum_posts
    where created_at < v_cutoff and body ~ v_marker
      and thread_id <> all(coalesce(v_thread_ids, '{}'));

  select c.courses_purged into v_courses
    from public.rpc_e2e_purge_test_courses(p_dry_run, p_min_age_hours) c;

  if not p_dry_run then
    delete from public.announcements where id = any(v_announcement_ids);
    -- cascades survey_questions/responses/answers.
    delete from public.surveys where id = any(v_survey_ids);
    -- cascades flip_chart_pages.
    delete from public.flip_charts where id = any(v_flip_chart_ids);
    delete from public.forum_posts where id = any(v_post_ids);
    -- cascades the thread's own forum_posts; category_id has no cascade, so
    -- threads go before their categories.
    delete from public.forum_threads where id = any(v_thread_ids);
    delete from public.forum_categories where id = any(v_category_ids);

    delete from public.notifications n
      where n.created_at < v_cutoff
        and (
          n.title_en ~ v_marker or n.title_fil ~ v_marker
          or n.body_en ~ v_marker or n.body_fil ~ v_marker
          or (n.subject_type = 'announcement' and not exists (select 1 from public.announcements x where x.id = n.subject_id))
          or (n.subject_type = 'survey' and not exists (select 1 from public.surveys x where x.id = n.subject_id))
          or (n.subject_type = 'flip_chart' and not exists (select 1 from public.flip_charts x where x.id = n.subject_id))
          or (n.subject_type = 'forum_post' and not exists (select 1 from public.forum_posts x where x.id = n.subject_id))
          or (n.subject_type = 'course' and not exists (select 1 from public.courses x where x.id = n.subject_id))
          or (n.subject_type = 'course_session' and not exists (select 1 from public.course_sessions x where x.id = n.subject_id))
          or (n.subject_type = 'assessment' and not exists (select 1 from public.assessments x where x.id = n.subject_id))
        );
    get diagnostics v_notifications = row_count;
  end if;

  return query select
    coalesce(array_length(v_announcement_ids, 1), 0)::bigint,
    coalesce(array_length(v_survey_ids, 1), 0)::bigint,
    coalesce(array_length(v_flip_chart_ids, 1), 0)::bigint,
    coalesce(array_length(v_category_ids, 1), 0)::bigint,
    coalesce(array_length(v_thread_ids, 1), 0)::bigint,
    coalesce(array_length(v_post_ids, 1), 0)::bigint,
    coalesce(v_courses, 0),
    v_notifications::bigint;
end;
$$;

revoke execute on function public.rpc_e2e_purge_test_content(boolean, int) from public, anon;
grant execute on function public.rpc_e2e_purge_test_content(boolean, int) to authenticated, service_role;
