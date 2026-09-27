-- RFT C1 (docs/role-feature-toggles-plan.md §4.5, §7): hide, show, archive
-- and restore for content, on top of the existing draft/published/etc.
-- status columns, which are untouched.
--
-- visible_to_users(row) = <existing publish rule> AND hidden_at IS NULL
--                          AND archived_at IS NULL
--
-- - Hide sets hidden_at; Show clears it.
-- - Archive sets archived_at (and clears hidden_at); Restore clears
--   archived_at. An archived row is read-only: its existing edit/set-status
--   RPC raises 'content archived'.
-- - Enforced twice: a restrictive RLS policy per table (admins and each
--   table's author, where it has one, bypass it — nothing is ever hidden
--   from admins, plan §2 D2), and explicit query filters added in RFT C2
--   (RLS alone can't help there, since admin/admin-preview reads bypass it
--   on purpose).
--
-- forum_threads already has hidden_at/hidden_by_user_id from INC-13's
-- moderation feature (status 'visible'/'hidden') — this only adds
-- archived_at/archived_by there. Every other in-scope table gets all four
-- columns. courses.status already has an unused 'archived' value; this
-- backfills any existing archived courses onto the new column and closes
-- that door in rpc_course_set_status, so there's exactly one way to
-- archive a course from now on.
-- ---------------------------------------------------------------------

-- 1. Columns and indexes ------------------------------------------------

alter table public.kb_entries
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.users (id),
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.users (id);

alter table public.kb_articles
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.users (id),
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.users (id);

alter table public.announcements
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.users (id),
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.users (id);

alter table public.surveys
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.users (id),
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.users (id);

alter table public.courses
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.users (id),
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.users (id);

alter table public.flip_charts
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.users (id),
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.users (id);

-- forum_threads already has hidden_at/hidden_by_user_id (INC-13 moderation).
alter table public.forum_threads
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.users (id);

create index if not exists kb_entries_visible_idx on public.kb_entries (created_at desc)
  where hidden_at is null and archived_at is null;
create index if not exists kb_articles_visible_idx on public.kb_articles (created_at desc)
  where hidden_at is null and archived_at is null;
create index if not exists announcements_visible_idx on public.announcements (created_at desc)
  where hidden_at is null and archived_at is null;
create index if not exists surveys_visible_idx on public.surveys (created_at desc)
  where hidden_at is null and archived_at is null;
create index if not exists courses_visible_idx on public.courses (created_at desc)
  where hidden_at is null and archived_at is null;
create index if not exists flip_charts_visible_idx on public.flip_charts (created_at desc)
  where hidden_at is null and archived_at is null;
create index if not exists forum_threads_visible_idx on public.forum_threads (created_at desc)
  where hidden_at is null and archived_at is null;

-- 2. Backfill courses.status = 'archived' onto archived_at -------------
--
-- Reported separately (this migration's PR description) so the actual
-- pilot count is on record: any row here silently changes what
-- /admin/courses shows (an 'archived' course is invisible to today's UI,
-- and will start appearing as an active, published course otherwise).

update public.courses
set archived_at = updated_at, archived_by = null, status = 'published'
where status = 'archived' and archived_at is null;

-- 3. Restrictive visibility policies -------------------------------------
--
-- Restrictive policies AND with the existing permissive ones rather than
-- replacing them, so none of those need to change. Every admin bypasses
-- (nothing hidden from admins); a table with an author column lets that
-- author keep seeing their own hidden/archived item.

drop policy if exists kb_entries_visibility on public.kb_entries;
create policy kb_entries_visibility on public.kb_entries as restrictive for select to authenticated
  using (
    (hidden_at is null and archived_at is null)
    or (select public.current_app_user()).role = 'admin'
  );

drop policy if exists kb_articles_visibility on public.kb_articles;
create policy kb_articles_visibility on public.kb_articles as restrictive for select to authenticated
  using (
    (hidden_at is null and archived_at is null)
    or (select public.current_app_user()).role = 'admin'
  );

drop policy if exists announcements_visibility on public.announcements;
create policy announcements_visibility on public.announcements as restrictive for select to authenticated
  using (
    (hidden_at is null and archived_at is null)
    or (select public.current_app_user()).role = 'admin'
  );

drop policy if exists surveys_visibility on public.surveys;
create policy surveys_visibility on public.surveys as restrictive for select to authenticated
  using (
    (hidden_at is null and archived_at is null)
    or (select public.current_app_user()).role = 'admin'
  );

drop policy if exists courses_visibility on public.courses;
create policy courses_visibility on public.courses as restrictive for select to authenticated
  using (
    (hidden_at is null and archived_at is null)
    or (select public.current_app_user()).role = 'admin'
  );

drop policy if exists flip_charts_visibility on public.flip_charts;
create policy flip_charts_visibility on public.flip_charts as restrictive for select to authenticated
  using (
    (hidden_at is null and archived_at is null)
    or (select public.current_app_user()).role = 'admin'
    or author_user_id = (select public.current_app_user()).id
  );

drop policy if exists forum_threads_visibility on public.forum_threads;
create policy forum_threads_visibility on public.forum_threads as restrictive for select to authenticated
  using (
    (hidden_at is null and archived_at is null)
    or (select public.current_app_user()).role = 'admin'
    or author_user_id = (select public.current_app_user()).id
  );

-- 4. Guard the existing edit / set-status RPCs ---------------------------
--
-- Bodies are otherwise byte-identical to their latest prior redefinition
-- (kb_entry_update: 20260806000000_inc18b_ai_gap_draft.sql; kb_article_update:
-- 20260720090000_inc3_kb_rpcs.sql, never redefined since; survey/course
-- set_status, flipchart_review: 20260802000000_inc16_notifications.sql) —
-- the only addition in each is the archived-row guard, and for
-- rpc_course_set_status, closing off 'archived' as a status value.

create or replace function public.rpc_kb_entry_update(
  p_id uuid,
  p_category_id uuid,
  p_question_fil text,
  p_question_en text,
  p_answer_fil text,
  p_answer_en text,
  p_keywords text[],
  p_image_url text,
  p_owner_user_id uuid,
  p_review_due_on date,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_before public.kb_entries;
  v_gap public.unmatched_questions;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_before from public.kb_entries where id = p_id for update;
  if v_before is null then
    raise exception 'entry not found';
  end if;

  if v_before.archived_at is not null then
    raise exception 'content archived';
  end if;

  if p_status not in ('draft', 'published') then
    raise exception 'invalid status';
  end if;

  if p_status = 'published' and p_owner_user_id is null then
    raise exception 'an owner is required to publish';
  end if;

  if p_status = 'published'
     and v_before.ai_drafted_at is not null
     and v_before.ai_draft_confirmed_at is null then
    raise exception 'ai draft must be reviewed before publishing';
  end if;

  update public.kb_entries set
    category_id = p_category_id,
    question_fil = p_question_fil,
    question_en = p_question_en,
    answer_fil = p_answer_fil,
    answer_en = p_answer_en,
    keywords = coalesce(p_keywords, '{}'::text[]),
    image_url = p_image_url,
    owner_user_id = p_owner_user_id,
    review_due_on = p_review_due_on,
    status = p_status
  where id = p_id;

  if v_before.status != 'published' and p_status = 'published' then
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_published', 'kb_entry', p_id,
      format('Inilathala ni %s ang tanong-sagot na "%s".', v_actor.username, p_question_fil),
      format('%s published the Q&A entry "%s".', v_actor.username, p_question_en));

    update public.unmatched_questions
      set status = 'resolved'
      where resolved_entry_id = p_id and status != 'resolved'
      returning * into v_gap;

    if v_gap.id is not null then
      insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
      values (v_actor.id, 'gap.resolved', 'unmatched_question', v_gap.id,
        format('Nalutas ni %s ang tanong na "%s" gamit ang na-publish na entry.', v_actor.username, v_gap.text),
        format('%s resolved the question "%s" with the published entry.', v_actor.username, v_gap.text));

      insert into public.analytics_events (user_id, event_name, properties)
      values (v_actor.id, 'gap.resolved', jsonb_build_object('unmatched_question_id', v_gap.id, 'entry_id', p_id));
    end if;
  elsif v_before.status = 'published' and p_status = 'draft' then
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_archived', 'kb_entry', p_id,
      format('Inalis ni %s sa publikasyon ang tanong-sagot na "%s".', v_actor.username, p_question_fil),
      format('%s unpublished the Q&A entry "%s".', v_actor.username, p_question_en));
  else
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_updated', 'kb_entry', p_id,
      format('Na-update ni %s ang tanong-sagot na "%s".', v_actor.username, p_question_fil),
      format('%s updated the Q&A entry "%s".', v_actor.username, p_question_en));
  end if;
end;
$$;

create or replace function public.rpc_kb_article_update(
  p_id uuid,
  p_category_id uuid,
  p_title_fil text,
  p_title_en text,
  p_body_fil jsonb,
  p_body_en jsonb,
  p_owner_user_id uuid,
  p_review_due_on date,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_before public.kb_articles;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_before from public.kb_articles where id = p_id for update;
  if v_before is null then
    raise exception 'article not found';
  end if;

  if v_before.archived_at is not null then
    raise exception 'content archived';
  end if;

  if p_status not in ('draft', 'published') then
    raise exception 'invalid status';
  end if;

  if p_status = 'published' and p_owner_user_id is null then
    raise exception 'an owner is required to publish';
  end if;

  update public.kb_articles set
    category_id = p_category_id,
    title_fil = p_title_fil,
    title_en = p_title_en,
    body_fil = coalesce(p_body_fil, '{}'::jsonb),
    body_en = coalesce(p_body_en, '{}'::jsonb),
    owner_user_id = p_owner_user_id,
    review_due_on = p_review_due_on,
    status = p_status
  where id = p_id;

  if v_before.status != 'published' and p_status = 'published' then
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_published', 'kb_article', p_id,
      format('Inilathala ni %s ang artikulong "%s".', v_actor.username, p_title_fil),
      format('%s published the article "%s".', v_actor.username, p_title_en));
  elsif v_before.status = 'published' and p_status = 'draft' then
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_archived', 'kb_article', p_id,
      format('Inalis ni %s sa publikasyon ang artikulong "%s".', v_actor.username, p_title_fil),
      format('%s unpublished the article "%s".', v_actor.username, p_title_en));
  else
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_updated', 'kb_article', p_id,
      format('Na-update ni %s ang artikulong "%s".', v_actor.username, p_title_fil),
      format('%s updated the article "%s".', v_actor.username, p_title_en));
  end if;
end;
$$;

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

  select * into v_survey from public.surveys where id = p_survey_id for update;
  if v_survey is null then
    raise exception 'survey not found';
  end if;

  if v_survey.archived_at is not null then
    raise exception 'content archived';
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
  -- 'archived' used to be a status value nothing in the UI set; archiving
  -- now happens only through rpc_content_set_visibility, which also clears
  -- the row from user-facing reads (a bare status flip didn't).
  if p_status = 'archived' then
    raise exception 'use archive action';
  end if;

  if p_status not in ('draft', 'published') then
    raise exception 'invalid status';
  end if;

  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_course from public.courses where id = p_course_id for update;
  if v_course is null then
    raise exception 'course not found';
  end if;

  if v_course.archived_at is not null then
    raise exception 'content archived';
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

  select * into v_chart from public.flip_charts where id = p_flip_chart_id for update;
  if v_chart is null then
    raise exception 'flip chart not found';
  end if;

  if v_chart.archived_at is not null then
    raise exception 'content archived';
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

-- 5. rpc_content_set_visibility ------------------------------------------
--
-- One RPC for every in-scope content type (plan §4.5). The tables don't
-- share a shape (different column names, some org-scoped, some global,
-- forum_threads has one title column instead of _fil/_en), so this is
-- written as one explicit branch per type rather than dynamic SQL —
-- consistent with how this codebase already keeps kb_entry/kb_article,
-- survey/course, etc. as separate, explicit RPCs rather than a shared
-- generic one.

create or replace function public.rpc_content_set_visibility(p_type text, p_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_hidden_at timestamptz;
  v_archived_at timestamptz;
  v_title_fil text;
  v_title_en text;
  v_org_unit_id uuid;
  v_type_label_fil text;
  v_type_label_en text;
  v_event_type text;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if p_type not in ('kb_entry', 'kb_article', 'announcement', 'survey', 'course', 'flipchart', 'forum_thread') then
    raise exception 'invalid content type';
  end if;

  if p_action not in ('hide', 'show', 'archive', 'restore') then
    raise exception 'invalid action';
  end if;

  -- forum_threads' hide/show is INC-13 moderation (its own reason field,
  -- its own rpc_forum_thread_moderate) — this RPC only archives/restores it.
  if p_type = 'forum_thread' and p_action in ('hide', 'show') then
    raise exception 'invalid action';
  end if;

  v_type_label_fil := case p_type
    when 'kb_entry' then 'tanong-sagot ng KB'
    when 'kb_article' then 'artikulo ng KB'
    when 'announcement' then 'anunsyo'
    when 'survey' then 'survey'
    when 'course' then 'kurso'
    when 'flipchart' then 'flip chart'
    when 'forum_thread' then 'thread sa forum'
  end;
  v_type_label_en := case p_type
    when 'kb_entry' then 'KB Q&A entry'
    when 'kb_article' then 'KB article'
    when 'announcement' then 'announcement'
    when 'survey' then 'survey'
    when 'course' then 'course'
    when 'flipchart' then 'flip chart'
    when 'forum_thread' then 'forum thread'
  end;

  -- Fetch + lock the row, and capture what the shared validation and audit
  -- summary below need from it. The tables don't share a shape, so this is
  -- one branch per type rather than one polymorphic query.
  if p_type = 'kb_entry' then
    select hidden_at, archived_at, question_fil, question_en, null::uuid
      into v_hidden_at, v_archived_at, v_title_fil, v_title_en, v_org_unit_id
      from public.kb_entries where id = p_id for update;
  elsif p_type = 'kb_article' then
    select hidden_at, archived_at, title_fil, title_en, null::uuid
      into v_hidden_at, v_archived_at, v_title_fil, v_title_en, v_org_unit_id
      from public.kb_articles where id = p_id for update;
  elsif p_type = 'announcement' then
    select hidden_at, archived_at, left(body_fil, 60), left(body_en, 60), org_unit_id
      into v_hidden_at, v_archived_at, v_title_fil, v_title_en, v_org_unit_id
      from public.announcements where id = p_id for update;
  elsif p_type = 'survey' then
    select hidden_at, archived_at, title_fil, title_en, org_unit_id
      into v_hidden_at, v_archived_at, v_title_fil, v_title_en, v_org_unit_id
      from public.surveys where id = p_id for update;
  elsif p_type = 'course' then
    select hidden_at, archived_at, title_fil, title_en, org_unit_id
      into v_hidden_at, v_archived_at, v_title_fil, v_title_en, v_org_unit_id
      from public.courses where id = p_id for update;
  elsif p_type = 'flipchart' then
    select hidden_at, archived_at, title_fil, title_en, null::uuid
      into v_hidden_at, v_archived_at, v_title_fil, v_title_en, v_org_unit_id
      from public.flip_charts where id = p_id for update;
  elsif p_type = 'forum_thread' then
    select hidden_at, archived_at, title, title, null::uuid
      into v_hidden_at, v_archived_at, v_title_fil, v_title_en, v_org_unit_id
      from public.forum_threads where id = p_id for update;
  end if;

  if not found then
    raise exception 'content not found';
  end if;

  -- Org-scoped types (announcement/survey/course) reuse the same scope
  -- check their own admin RPCs use. KB, flipcharts and forum are global —
  -- v_org_unit_id stays null, so any admin may act on them.
  if v_org_unit_id is not null and not exists (
    select 1 from public.org_units
    where id = v_org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'not authorized';
  end if;

  if p_action = 'hide' then
    if v_archived_at is not null then raise exception 'already archived'; end if;
    if v_hidden_at is not null then raise exception 'already hidden'; end if;
  elsif p_action = 'show' then
    if v_archived_at is not null then raise exception 'already archived'; end if;
    if v_hidden_at is null then raise exception 'not hidden'; end if;
  elsif p_action = 'archive' then
    if v_archived_at is not null then raise exception 'already archived'; end if;
  elsif p_action = 'restore' then
    if v_archived_at is null then raise exception 'not archived'; end if;
  end if;

  if p_type = 'kb_entry' then
    update public.kb_entries set
      hidden_at = case when p_action = 'hide' then now() when p_action in ('show', 'archive') then null else hidden_at end,
      hidden_by = case when p_action = 'hide' then v_actor.id when p_action in ('show', 'archive') then null else hidden_by end,
      archived_at = case when p_action = 'archive' then now() when p_action = 'restore' then null else archived_at end,
      archived_by = case when p_action = 'archive' then v_actor.id when p_action = 'restore' then null else archived_by end
    where id = p_id;
  elsif p_type = 'kb_article' then
    update public.kb_articles set
      hidden_at = case when p_action = 'hide' then now() when p_action in ('show', 'archive') then null else hidden_at end,
      hidden_by = case when p_action = 'hide' then v_actor.id when p_action in ('show', 'archive') then null else hidden_by end,
      archived_at = case when p_action = 'archive' then now() when p_action = 'restore' then null else archived_at end,
      archived_by = case when p_action = 'archive' then v_actor.id when p_action = 'restore' then null else archived_by end
    where id = p_id;
  elsif p_type = 'announcement' then
    update public.announcements set
      hidden_at = case when p_action = 'hide' then now() when p_action in ('show', 'archive') then null else hidden_at end,
      hidden_by = case when p_action = 'hide' then v_actor.id when p_action in ('show', 'archive') then null else hidden_by end,
      archived_at = case when p_action = 'archive' then now() when p_action = 'restore' then null else archived_at end,
      archived_by = case when p_action = 'archive' then v_actor.id when p_action = 'restore' then null else archived_by end
    where id = p_id;
  elsif p_type = 'survey' then
    update public.surveys set
      hidden_at = case when p_action = 'hide' then now() when p_action in ('show', 'archive') then null else hidden_at end,
      hidden_by = case when p_action = 'hide' then v_actor.id when p_action in ('show', 'archive') then null else hidden_by end,
      archived_at = case when p_action = 'archive' then now() when p_action = 'restore' then null else archived_at end,
      archived_by = case when p_action = 'archive' then v_actor.id when p_action = 'restore' then null else archived_by end
    where id = p_id;
  elsif p_type = 'course' then
    update public.courses set
      hidden_at = case when p_action = 'hide' then now() when p_action in ('show', 'archive') then null else hidden_at end,
      hidden_by = case when p_action = 'hide' then v_actor.id when p_action in ('show', 'archive') then null else hidden_by end,
      archived_at = case when p_action = 'archive' then now() when p_action = 'restore' then null else archived_at end,
      archived_by = case when p_action = 'archive' then v_actor.id when p_action = 'restore' then null else archived_by end
    where id = p_id;
  elsif p_type = 'flipchart' then
    update public.flip_charts set
      hidden_at = case when p_action = 'hide' then now() when p_action in ('show', 'archive') then null else hidden_at end,
      hidden_by = case when p_action = 'hide' then v_actor.id when p_action in ('show', 'archive') then null else hidden_by end,
      archived_at = case when p_action = 'archive' then now() when p_action = 'restore' then null else archived_at end,
      archived_by = case when p_action = 'archive' then v_actor.id when p_action = 'restore' then null else archived_by end
    where id = p_id;
  elsif p_type = 'forum_thread' then
    -- hidden_at/hidden_by_user_id are moderation columns (unaffected by
    -- archive/restore); only archived_at/archived_by move here.
    update public.forum_threads set
      archived_at = case when p_action = 'archive' then now() when p_action = 'restore' then null else archived_at end,
      archived_by = case when p_action = 'archive' then v_actor.id when p_action = 'restore' then null else archived_by end
    where id = p_id;
  end if;

  v_event_type := 'content.' || case p_action
    when 'hide' then 'hidden'
    when 'show' then 'shown'
    when 'archive' then 'archived'
    else 'restored'
  end;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, metadata, plain_summary_fil, plain_summary_en)
  values (
    v_actor.id, v_event_type, p_type, p_id,
    jsonb_build_object('action', p_action),
    case p_action
      when 'hide' then format('Itinago ni %s ang %s na "%s".', v_actor.username, v_type_label_fil, v_title_fil)
      when 'show' then format('Ipinakita muli ni %s ang %s na "%s".', v_actor.username, v_type_label_fil, v_title_fil)
      when 'archive' then format('Ini-archive ni %s ang %s na "%s".', v_actor.username, v_type_label_fil, v_title_fil)
      else format('Ibinalik ni %s mula sa archive ang %s na "%s".', v_actor.username, v_type_label_fil, v_title_fil)
    end,
    case p_action
      when 'hide' then format('%s hid the %s "%s".', v_actor.username, v_type_label_en, v_title_en)
      when 'show' then format('%s made the %s "%s" visible again.', v_actor.username, v_type_label_en, v_title_en)
      when 'archive' then format('%s archived the %s "%s".', v_actor.username, v_type_label_en, v_title_en)
      else format('%s restored the %s "%s" from the archive.', v_actor.username, v_type_label_en, v_title_en)
    end
  );
end;
$$;

revoke execute on function public.rpc_content_set_visibility(text, uuid, text) from public, anon;
grant execute on function public.rpc_content_set_visibility(text, uuid, text) to authenticated;
