-- Spot feedback for the live pilot. The master flag starts off and the pilot
-- organization starts unset. Both must be configured before field users can submit.
insert into public.feature_flags (key, enabled, description)
values ('spot_feedback', false, 'Page-specific comments from live users, with optional screenshots and an admin inbox.')
on conflict (key) do nothing;

create or replace function public.flag_role_scope(p_key text)
returns text[] language sql immutable set search_path = public as $$
  select case p_key
    when 'kb_articles' then array['bhw', 'assessor', 'designer']
    when 'announcements' then array['bhw', 'assessor', 'designer']
    when 'surveys' then array['bhw', 'assessor', 'designer']
    when 'forum' then array['bhw', 'assessor', 'designer']
    when 'notifications' then array['bhw', 'assessor', 'designer']
    when 'offline_pwa' then array['bhw', 'assessor', 'designer']
    when 'chat_conversation' then array['bhw', 'assessor', 'designer']
    when 'spot_feedback' then array['bhw', 'assessor', 'designer']
    when 'elearning' then array['bhw', 'assessor']
    when 'course_sessions' then array['bhw', 'assessor']
    when 'flipcharts' then array['bhw', 'designer']
    else '{}'::text[]
  end;
$$;
revoke execute on function public.flag_role_scope(text) from public, anon;

create or replace function public.spot_feedback_access()
returns boolean language sql stable set search_path = public as $$
  select coalesce((
    select u.status = 'active' and f.enabled
      and (u.role = 'admin' or (
        f.org_unit_filter is not null
        and not (u.role = any(f.disabled_roles))
        and public.current_org_path() like public.org_unit_path(f.org_unit_filter) || '%'
      ))
    from public.current_app_user() u
    cross join public.feature_flags f
    where f.key = 'spot_feedback'
  ), false);
$$;
revoke execute on function public.spot_feedback_access() from public, anon;
grant execute on function public.spot_feedback_access() to authenticated;

create or replace function public.rpc_spot_feedback_set_pilot(p_org_unit_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor public.users; v_flag public.feature_flags;
begin
  select * into v_actor from public.current_super_admin();
  if v_actor.id is null then raise exception 'not authorized'; end if;
  if p_org_unit_id is not null and not exists
    (select 1 from public.org_units where id = p_org_unit_id) then
    raise exception 'organization not found';
  end if;
  update public.feature_flags set org_unit_filter = p_org_unit_id, updated_at = now()
    where key = 'spot_feedback' returning * into v_flag;
  if v_flag.id is null then raise exception 'flag not found'; end if;
  insert into public.audit_events
    (actor_user_id, event_type, subject_type, subject_id, metadata, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'flag.pilot_changed', 'feature_flag', v_flag.id,
    jsonb_build_object('key', 'spot_feedback', 'org_unit_id', p_org_unit_id),
    'Binago ang pilot area para sa feedback.', 'Changed the feedback pilot area.');
end;
$$;
revoke execute on function public.rpc_spot_feedback_set_pilot(uuid) from public, anon;
grant execute on function public.rpc_spot_feedback_set_pilot(uuid) to authenticated;

create table public.spot_feedback (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.users(id) on delete cascade,
  org_unit_id uuid not null references public.org_units(id),
  page_path text not null check (length(page_path) between 1 and 300 and left(page_path, 1) = '/'),
  message text not null check (length(trim(message)) between 1 and 4000),
  element_selector text check (length(element_selector) <= 500),
  element_label text check (length(element_label) <= 160),
  element_tag text check (length(element_tag) <= 30),
  anchor_x real check (anchor_x between 0 and 1),
  anchor_y real check (anchor_y between 0 and 1),
  screenshot_path text,
  status text not null default 'new'
    check (status in ('new', 'in_review', 'resolved', 'dismissed')),
  resolved_by uuid references public.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index spot_feedback_status_created_idx on public.spot_feedback(status, created_at desc);
create index spot_feedback_submitter_idx on public.spot_feedback(submitted_by, created_at desc);
create index spot_feedback_org_idx on public.spot_feedback(org_unit_id, created_at desc);
alter table public.spot_feedback enable row level security;
grant select, insert on public.spot_feedback to authenticated;
-- Keep Storage cleanup durable even when an account deletion cascades its feedback rows.
create table public.spot_feedback_screenshot_cleanup (
  path text primary key,
  queued_at timestamptz not null default now()
);
alter table public.spot_feedback_screenshot_cleanup enable row level security;
grant select, delete on public.spot_feedback_screenshot_cleanup to service_role;
create or replace function public.queue_spot_feedback_screenshot_cleanup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.screenshot_path is not null then
    insert into public.spot_feedback_screenshot_cleanup(path)
    values (old.screenshot_path) on conflict (path) do nothing;
  end if;
  return old;
end;
$$;
create trigger spot_feedback_queue_screenshot_cleanup before delete on public.spot_feedback
  for each row execute function public.queue_spot_feedback_screenshot_cleanup();
create policy spot_feedback_read on public.spot_feedback for select to authenticated using (
  submitted_by = (select public.current_app_user()).id
  or ((select public.current_app_user()).role = 'admin'
    and public.org_unit_path(org_unit_id) like (select public.current_org_path()) || '%')
);
create policy spot_feedback_insert on public.spot_feedback for insert to authenticated with check (
  (select public.spot_feedback_access())
  and submitted_by = (select public.current_app_user()).id
  and org_unit_id = (select public.current_app_user()).org_unit_id
  and status = 'new' and resolved_by is null and resolved_at is null
  and (screenshot_path is null or split_part(screenshot_path, '/', 1) = (select auth.uid())::text)
);

create table public.spot_feedback_replies (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.spot_feedback(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  message text not null check (length(trim(message)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index spot_feedback_replies_parent_idx on public.spot_feedback_replies(feedback_id, created_at);
alter table public.spot_feedback_replies enable row level security;
grant select on public.spot_feedback_replies to authenticated;
create policy spot_feedback_replies_read on public.spot_feedback_replies
  for select to authenticated using (exists (
    select 1 from public.spot_feedback f where f.id = feedback_id
  ));

create or replace function public.rpc_spot_feedback_set_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor public.users; v_feedback public.spot_feedback;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.status <> 'active' or v_actor.role <> 'admin' then
    raise exception 'not authorized'; end if;
  if p_status not in ('new', 'in_review', 'resolved', 'dismissed') then
    raise exception 'invalid status'; end if;
  select * into v_feedback from public.spot_feedback where id = p_id;
  if v_feedback.id is null or public.org_unit_path(v_feedback.org_unit_id)
      not like public.current_org_path() || '%' then raise exception 'not authorized'; end if;
  update public.spot_feedback set status = p_status,
    resolved_by = case when p_status in ('resolved', 'dismissed') then v_actor.id else null end,
    resolved_at = case when p_status in ('resolved', 'dismissed') then now() else null end
    where id = p_id;
end;
$$;
revoke execute on function public.rpc_spot_feedback_set_status(uuid, text) from public, anon;
grant execute on function public.rpc_spot_feedback_set_status(uuid, text) to authenticated;

alter table public.notifications drop constraint notifications_notification_type_check;
alter table public.notifications add constraint notifications_notification_type_check check
  (notification_type in ('announcement.created', 'survey.published', 'course.published',
    'assessment.decided', 'forum.reply', 'flipchart.reviewed', 'user.transferred',
    'course_session.enrolled', 'feedback.reply'));

create or replace function public.rpc_spot_feedback_reply(p_id uuid, p_message text)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor public.users; v_feedback public.spot_feedback;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.status <> 'active' then raise exception 'not authorized'; end if;
  if length(trim(coalesce(p_message, ''))) not between 1 and 4000 then raise exception 'invalid message'; end if;
  select * into v_feedback from public.spot_feedback where id = p_id;
  if v_feedback.id is null or not (
    v_feedback.submitted_by = v_actor.id or
    (v_actor.role = 'admin' and public.org_unit_path(v_feedback.org_unit_id)
      like public.current_org_path() || '%')) then raise exception 'not authorized'; end if;
  insert into public.spot_feedback_replies(feedback_id, author_id, message)
    values (p_id, v_actor.id, trim(p_message));
  if v_actor.id <> v_feedback.submitted_by and exists
    (select 1 from public.feature_flags where key = 'notifications' and enabled) then
    insert into public.notifications
      (recipient_user_id, notification_type, subject_type, subject_id,
       title_fil, title_en, body_fil, body_en, link_path)
    values (v_feedback.submitted_by, 'feedback.reply', 'spot_feedback', p_id,
      'May tugon sa komento mo', 'Reply to your comment',
      'May bagong tugon sa ipinadala mong komento.', 'Your comment has a new reply.', '/feedback');
  end if;
end;
$$;
revoke execute on function public.rpc_spot_feedback_reply(uuid, text) from public, anon;
grant execute on function public.rpc_spot_feedback_reply(uuid, text) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('spot-feedback', 'spot-feedback', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
create policy spot_feedback_shot_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'spot-feedback' and
    (storage.foldername(name))[1] = (select auth.uid())::text and
    (select public.spot_feedback_access()));
create policy spot_feedback_shot_read on storage.objects for select to authenticated
  using (bucket_id = 'spot-feedback' and (
    (storage.foldername(name))[1] = (select auth.uid())::text or exists (
      select 1 from public.spot_feedback f where f.screenshot_path = name
        and (select public.current_app_user()).role = 'admin'
        and public.org_unit_path(f.org_unit_id) like (select public.current_org_path()) || '%'
    )
  ));
create policy spot_feedback_shot_delete on storage.objects for delete to authenticated
  using (bucket_id = 'spot-feedback' and
    (storage.foldername(name))[1] = (select auth.uid())::text);
