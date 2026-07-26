-- ---------------------------------------------------------------------
-- INC-16: In-App Notifications (requirements-and-vision.md §5 "Notifications:
-- In-app only for the pilot" and §8 item 10) — a Phase 1 cross-cutting
-- requirement that never got its own increment in delivery-plan.md §7's
-- roadmap. This closes that gap.
--
-- A `notifications` row is delivered one of two ways, never both (see the
-- check constraint below):
--   - recipient_user_id: a single, known recipient (e.g. the specific BHW
--     whose assessment was just decided, or a forum thread's author).
--   - org_unit_id: an org-scoped broadcast, cascading downward exactly like
--     announcements/surveys/courses already do — a national announcement
--     reaching thousands of BHWs must not become thousands of rows, so one
--     row serves an entire subtree via the same org_unit_path() +
--     current_org_path() "at-or-above my scope" comparison INC-10
--     established, reusing that helper rather than redefining it.
--
-- Read state is a single per-user cursor (users.notifications_last_read_at),
-- not a per-notification join table — the same minimalist shape already
-- used for consented_at/onboarding_completed_at. Opening /notifications
-- marks everything up to now() as read in one update; there is no
-- per-item read/unread toggle.
--
-- No new audit taxonomy entries: every notification here is a side effect
-- of an action that is already audited elsewhere (or, for the mark-read
-- RPC, unaudited routine self-service state exactly like
-- rpc_update_settings/rpc_onboarding_complete_step).
--
-- Ships behind the `notifications` feature flag, defaulted to false (dark
-- launch), same as every other later-phase feature since INC-10.
-- ---------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references public.users (id),
  org_unit_id uuid references public.org_units (id),
  notification_type text not null check (notification_type in (
    'announcement.created', 'survey.published', 'course.published',
    'assessment.decided', 'forum.reply', 'flipchart.reviewed', 'user.transferred'
  )),
  subject_type text not null,
  subject_id uuid,
  title_fil text not null,
  title_en text not null,
  body_fil text not null default '',
  body_en text not null default '',
  link_path text,
  created_at timestamptz not null default now(),
  constraint notifications_exactly_one_delivery_mode
    check ((recipient_user_id is not null) <> (org_unit_id is not null))
);

create index if not exists notifications_recipient_user_id_idx on public.notifications using btree (recipient_user_id);
create index if not exists notifications_org_unit_id_idx on public.notifications using btree (org_unit_id);
create index if not exists notifications_created_at_idx on public.notifications using btree (created_at desc);

alter table public.notifications enable row level security;

-- No insert/update/delete policy — every row is written by an existing
-- RPC's security-definer side effect, same discipline as forum_posts/
-- flip_charts (delivery-plan.md's later-phase increments all avoid
-- direct-insert RLS policies in favor of RPC-only writes).
drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications for select
  using (
    recipient_user_id = (select public.current_app_user()).id
    or (
      org_unit_id is not null
      and (select public.current_org_path()) like (select public.org_unit_path(notifications.org_unit_id)) || '%'
    )
  );

alter table public.users add column if not exists notifications_last_read_at timestamptz;

create or replace function public.rpc_notifications_mark_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null then
    raise exception 'not authorized';
  end if;

  update public.users set notifications_last_read_at = now() where id = v_actor.id;
end;
$$;

revoke execute on function public.rpc_notifications_mark_read() from public, anon;
grant execute on function public.rpc_notifications_mark_read() to authenticated;

insert into public.feature_flags (key, enabled, description)
values ('notifications', false, 'Notification bell: personal + org-scoped alerts for announcements, surveys, courses, assessments, forum replies, flip charts, and transfers.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Existing RPCs, redefined to add a notification side effect. Each body
-- below is otherwise identical to its original migration — only the
-- notification insert (and, where noted, an enclosing `if`) is new.
-- ---------------------------------------------------------------------

-- INC-10: notify the whole org unit a new announcement was posted to.
create or replace function public.rpc_announcement_create(
  p_org_unit_id uuid,
  p_body_fil text,
  p_body_en text,
  p_link_url text default null,
  p_image_url text default null
)
returns table (announcement_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_id uuid;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if trim(coalesce(p_body_fil, '')) = '' or trim(coalesce(p_body_en, '')) = '' then
    raise exception 'body is required';
  end if;

  if not exists (
    select 1 from public.org_units
    where id = p_org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'org unit out of scope';
  end if;

  insert into public.announcements (org_unit_id, author_user_id, body_fil, body_en, link_url, image_url)
  values (p_org_unit_id, v_actor.id, p_body_fil, p_body_en, nullif(trim(p_link_url), ''), p_image_url)
  returning id into v_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'announcement.created', 'announcement', v_id,
    format('Nagpost si %s ng bagong anunsyo.', v_actor.username),
    format('%s posted a new announcement.', v_actor.username));

  insert into public.notifications (org_unit_id, notification_type, subject_type, subject_id, title_fil, title_en, body_fil, body_en, link_path)
  values (p_org_unit_id, 'announcement.created', 'announcement', v_id,
    'Bagong Anunsyo', 'New Announcement', p_body_fil, p_body_en, '/announcements');

  return query select v_id;
end;
$$;

-- INC-11: notify the survey's org unit only when it actually goes live
-- (not on every draft/closed transition — closing/drafting isn't news).
create or replace function public.rpc_survey_set_status(p_survey_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_survey public.surveys;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if p_status not in ('draft', 'published', 'closed') then
    raise exception 'invalid status';
  end if;

  select * into v_survey from public.surveys where id = p_survey_id;
  if v_survey is null then
    raise exception 'survey not found';
  end if;

  if not exists (
    select 1 from public.org_units
    where id = v_survey.org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'not authorized';
  end if;

  update public.surveys set status = p_status, updated_at = now() where id = p_survey_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (
    v_actor.id,
    case p_status when 'published' then 'survey.published' when 'closed' then 'survey.closed' else 'survey.updated' end,
    'survey', p_survey_id,
    format('Binago ni %s ang status ng survey tungong "%s".', v_actor.username, p_status),
    format('%s changed a survey''s status to "%s".', v_actor.username, p_status)
  );

  if p_status = 'published' then
    insert into public.notifications (org_unit_id, notification_type, subject_type, subject_id, title_fil, title_en, body_fil, body_en, link_path)
    values (v_survey.org_unit_id, 'survey.published', 'survey', p_survey_id,
      'Bagong Survey', 'New Survey', v_survey.title_fil, v_survey.title_en, '/surveys');
  end if;
end;
$$;

-- INC-12: notify the course's org unit only on publish, not on archive/draft.
create or replace function public.rpc_course_set_status(p_course_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_course public.courses;
begin
  if p_status not in ('draft', 'published', 'archived') then
    raise exception 'invalid status';
  end if;

  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_course from public.courses where id = p_course_id;
  if v_course is null then
    raise exception 'course not found';
  end if;

  if not exists (
    select 1 from public.org_units
    where id = v_course.org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'not authorized';
  end if;

  update public.courses set status = p_status where id = p_course_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'course.status_changed', 'course', p_course_id,
    format('Binago ni %s ang status ng isang kurso patungong %s.', v_actor.username, p_status),
    format('%s changed a course''s status to %s.', v_actor.username, p_status));

  if p_status = 'published' then
    insert into public.notifications (org_unit_id, notification_type, subject_type, subject_id, title_fil, title_en, body_fil, body_en, link_path)
    values (v_course.org_unit_id, 'course.published', 'course', p_course_id,
      'Bagong Kurso', 'New Course', v_course.title_fil, v_course.title_en, '/courses');
  end if;
end;
$$;

-- INC-12: notify the specific BHW whose assessment was just decided —
-- a targeted, not broadcast, notification (bhw_user_id is already a known
-- single recipient here, unlike almost everything else in this migration).
create or replace function public.rpc_assessment_decide(p_assessment_id uuid, p_passed boolean, p_notes text)
returns table (certificate_id uuid, verification_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_assessment public.assessments;
  v_bhw public.users;
  v_course public.courses;
  v_certificate_id uuid;
  v_code text;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'assessor' then
    raise exception 'not authorized';
  end if;

  select * into v_assessment from public.assessments where id = p_assessment_id;
  if v_assessment is null then
    raise exception 'assessment not found';
  end if;

  if v_assessment.status != 'assigned' or v_assessment.assessor_user_id != v_actor.id then
    raise exception 'not authorized';
  end if;

  select * into v_bhw from public.users where id = v_assessment.bhw_user_id;
  select * into v_course from public.courses where id = v_assessment.course_id;

  if p_passed then
    update public.assessments
      set status = 'passed', notes = coalesce(p_notes, ''), decided_at = now()
      where id = p_assessment_id;

    update public.course_progress
      set status = 'certified'
      where course_id = v_assessment.course_id and bhw_user_id = v_assessment.bhw_user_id;

    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

    insert into public.certificates (
      assessment_id, course_id, bhw_user_id, verification_code,
      bhw_full_name_snapshot, course_title_fil_snapshot, course_title_en_snapshot
    ) values (
      p_assessment_id, v_assessment.course_id, v_assessment.bhw_user_id, v_code,
      v_bhw.full_name, v_course.title_fil, v_course.title_en
    ) returning id into v_certificate_id;

    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'assessment.decided', 'assessment', p_assessment_id,
      format('Pinasa ni %s ang isang BHW sa pagtatasa at naglabas ng sertipiko.', v_actor.username),
      format('%s passed a BHW''s assessment and issued a certificate.', v_actor.username));

    insert into public.notifications (recipient_user_id, notification_type, subject_type, subject_id, title_fil, title_en, body_fil, body_en, link_path)
    values (v_assessment.bhw_user_id, 'assessment.decided', 'assessment', p_assessment_id,
      'Pumasa Ka!', 'You Passed!',
      format('Pumasa ka sa pagtatasa para sa "%s". Handa na ang iyong sertipiko.', v_course.title_fil),
      format('You passed the assessment for "%s". Your certificate is ready.', v_course.title_en),
      '/courses');

    return query select v_certificate_id, v_code;
  else
    update public.assessments
      set status = 'failed', notes = coalesce(p_notes, ''), decided_at = now()
      where id = p_assessment_id;

    update public.course_progress
      set status = 'failed_assessment'
      where course_id = v_assessment.course_id and bhw_user_id = v_assessment.bhw_user_id;

    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'assessment.decided', 'assessment', p_assessment_id,
      format('Hindi pinasa ni %s ang isang BHW sa pagtatasa.', v_actor.username),
      format('%s failed a BHW''s assessment.', v_actor.username));

    insert into public.notifications (recipient_user_id, notification_type, subject_type, subject_id, title_fil, title_en, body_fil, body_en, link_path)
    values (v_assessment.bhw_user_id, 'assessment.decided', 'assessment', p_assessment_id,
      'Resulta ng Pagtatasa', 'Assessment Result',
      format('Hindi ka pumasa sa pagtatasa para sa "%s".', v_course.title_fil),
      format('You did not pass the assessment for "%s".', v_course.title_en),
      '/courses');

    return query select null::uuid, null::text;
  end if;
end;
$$;

-- INC-13: notify the thread's original author of a reply — never the
-- replier notifying themselves for replying to their own thread.
create or replace function public.rpc_forum_post_create(
  p_thread_id uuid,
  p_body text
)
returns table (post_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_thread public.forum_threads;
  v_id uuid;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null then
    raise exception 'not authorized';
  end if;

  if trim(coalesce(p_body, '')) = '' then
    raise exception 'body is required';
  end if;

  select * into v_thread from public.forum_threads where id = p_thread_id;
  if v_thread is null then
    raise exception 'thread not found';
  end if;

  if v_thread.status != 'visible' and v_actor.role != 'admin' then
    raise exception 'thread not found';
  end if;

  insert into public.forum_posts (thread_id, author_user_id, author_full_name, author_username, body)
  values (p_thread_id, v_actor.id, v_actor.full_name, v_actor.username, p_body)
  returning id into v_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'forum.post_created', 'forum_post', v_id,
    format('Sumagot si %s sa isang thread sa forum.', v_actor.username),
    format('%s replied to a forum thread.', v_actor.username));

  if v_thread.author_user_id != v_actor.id then
    insert into public.notifications (recipient_user_id, notification_type, subject_type, subject_id, title_fil, title_en, body_fil, body_en, link_path)
    values (v_thread.author_user_id, 'forum.reply', 'forum_post', v_id,
      'Bagong Sagot', 'New Reply',
      format('Sumagot si %s sa iyong thread na "%s".', v_actor.username, v_thread.title),
      format('%s replied to your thread "%s".', v_actor.username, v_thread.title),
      '/forum');
  end if;

  return query select v_id;
end;
$$;

-- INC-14: notify the designer (chart author) of an admin's review decision.
create or replace function public.rpc_flipchart_review(
  p_flip_chart_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_chart public.flip_charts;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_chart from public.flip_charts where id = p_flip_chart_id;
  if v_chart is null then
    raise exception 'flip chart not found';
  end if;

  if v_chart.status != 'in_review' then
    raise exception 'only a chart in review can be approved or rejected';
  end if;

  update public.flip_charts
  set status = case when p_approve then 'published' else 'draft' end,
      review_note = case when p_approve then null else nullif(trim(p_note), '') end
  where id = p_flip_chart_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (
    v_actor.id,
    case when p_approve then 'flipchart.published' else 'flipchart.rejected' end,
    'flip_chart', p_flip_chart_id,
    case when p_approve then format('Inaprubahan ni %s ang isang flip chart.', v_actor.username)
         else format('Tinanggihan ni %s ang isang flip chart.', v_actor.username) end,
    case when p_approve then format('%s approved a flip chart.', v_actor.username)
         else format('%s rejected a flip chart.', v_actor.username) end
  );

  insert into public.notifications (recipient_user_id, notification_type, subject_type, subject_id, title_fil, title_en, body_fil, body_en, link_path)
  values (
    v_chart.author_user_id, 'flipchart.reviewed', 'flip_chart', p_flip_chart_id,
    case when p_approve then 'Naaprubahan ang Flip Chart' else 'Kailangan ng Ayos ang Flip Chart' end,
    case when p_approve then 'Flip Chart Approved' else 'Flip Chart Needs Changes' end,
    case when p_approve then format('Na-publish na ang iyong flip chart na "%s".', v_chart.title_fil)
         else format('Ibinalik sa draft ang iyong flip chart na "%s".', v_chart.title_fil) end,
    case when p_approve then format('Your flip chart "%s" has been published.', v_chart.title_en)
         else format('Your flip chart "%s" was sent back to draft.', v_chart.title_en) end,
    '/designer/flipcharts'
  );
end;
$$;

-- Baseline: notify a transferred user directly (targeted, not broadcast —
-- the notification belongs to the person who moved, not their old or new
-- org unit's whole roster).
create or replace function public.rpc_admin_transfer_user(p_user_id uuid, p_new_org_unit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_target public.users;
  v_old_org_name text;
  v_new_org_name text;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_target from public.users where id = p_user_id;
  if v_target is null then
    raise exception 'user not found';
  end if;

  if not exists (
    select 1 from public.org_units
    where id = v_target.org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'user out of scope';
  end if;

  if not exists (
    select 1 from public.org_units
    where id = p_new_org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'destination org unit out of scope';
  end if;

  if v_target.role = 'admin' and v_target.status = 'active'
     and v_target.org_unit_id != p_new_org_unit_id
     and not public.org_unit_has_active_admin(v_target.org_unit_id, v_target.id) then
    raise exception 'cannot transfer the last active admin out of this org unit';
  end if;

  select name into v_old_org_name from public.org_units where id = v_target.org_unit_id;
  select name into v_new_org_name from public.org_units where id = p_new_org_unit_id;

  update public.users set org_unit_id = p_new_org_unit_id where id = v_target.id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'user.transferred', 'user', v_target.id,
    format('Inilipat ni %s si %s mula sa %s patungong %s.', v_actor.username, v_target.username, v_old_org_name, v_new_org_name),
    format('%s transferred %s from %s to %s.', v_actor.username, v_target.username, v_old_org_name, v_new_org_name));

  insert into public.notifications (recipient_user_id, notification_type, subject_type, subject_id, title_fil, title_en, body_fil, body_en, link_path)
  values (
    v_target.id, 'user.transferred', 'user', v_target.id,
    'Nailipat ang Iyong Account', 'You Were Transferred',
    format('Inilipat ang iyong account mula sa %s patungong %s.', v_old_org_name, v_new_org_name),
    format('Your account was transferred from %s to %s.', v_old_org_name, v_new_org_name),
    '/home'
  );
end;
$$;
