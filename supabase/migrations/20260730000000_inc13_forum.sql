-- ---------------------------------------------------------------------
-- INC-13: Interactive Forum / Sharing Platform (requirements-and-vision.md
-- §6.5), built as a later-phase module ahead of the pilot launch gate —
-- see the INC-10 note in delivery-plan.md §7 for why.
--
-- Unlike announcements/surveys/courses, forum content is NOT hierarchy-
-- scoped: the requirements doc frames this as a cross-cutting space "for
-- LGUs/regional health offices to share best practices and experiences",
-- so a thread posted by a barangay BHW is visible to the whole org, not
-- just their own subtree. Any authenticated user (bhw/admin/assessor) may
-- start a thread or reply; categories are an admin-managed global
-- taxonomy (mirrors kb_categories), and threads carry a free-form text[]
-- of tags for cross-cutting discovery on top of the category structure.
--
-- Moderation follows the spec's explicit "post-first, moderate-after"
-- model: content is visible the instant it's created (no pre-approval
-- queue), and any admin can subsequently hide a thread or post. Hiding is
-- a status flip (not a delete) so the moderation action itself is
-- reversible and auditable; the author can still see their own hidden
-- content (so they know it was moderated) but no one else can, other than
-- admins.
--
-- All mutations go through security-definer RPCs (no direct-insert RLS
-- policies) so every create/moderate action gets a validated shape and an
-- audit_events row, the same discipline INC-10/11/12 used for admin-authored
-- content — here it also covers ordinary BHW-authored posts, since forum
-- content, unlike a survey response, is public within the app and worth
-- tracing back to an actor.
--
-- Author display name/username are snapshotted onto the thread/post row at
-- create time (author_full_name/author_username) rather than left to a
-- PostgREST embed of `users`. Because forum visibility is intentionally
-- global (not org-scoped), embedding `users` would hit the same RLS gap
-- INC-12 hit for the assessor queue: users_read_self_or_admin_scope only
-- grants a viewer their own row or an admin's own-scope descendants, so a
-- BHW reading a thread from an unrelated branch would see a null author.
-- Snapshotting sidesteps that without widening `users` read access app-wide
-- (which would also expose contact_number/email/address to any embed that
-- asks); the trade-off is a post shows the name as of posting time if the
-- author later renames, same acceptable trade-off certificates made.
--
-- Ships behind the `forum` feature flag, defaulted to false (dark
-- launch), same convention as announcements/surveys/elearning.
-- ---------------------------------------------------------------------

create table if not exists public.forum_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_fil text not null,
  name_en text not null,
  description_fil text not null default '',
  description_en text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists forum_categories_set_updated_at on public.forum_categories;
create trigger forum_categories_set_updated_at
  before update on public.forum_categories
  for each row execute function public.set_updated_at();

alter table public.forum_categories enable row level security;

create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.forum_categories (id),
  author_user_id uuid not null references public.users (id),
  author_full_name text not null,
  author_username text not null,
  title text not null,
  body text not null,
  tags text[] not null default '{}'::text[],
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  hidden_by_user_id uuid references public.users (id),
  hidden_reason text,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forum_threads_category_id_idx on public.forum_threads using btree (category_id);
create index if not exists forum_threads_tags_idx on public.forum_threads using gin (tags);
create index if not exists forum_threads_created_at_idx on public.forum_threads using btree (created_at desc);

drop trigger if exists forum_threads_set_updated_at on public.forum_threads;
create trigger forum_threads_set_updated_at
  before update on public.forum_threads
  for each row execute function public.set_updated_at();

alter table public.forum_threads enable row level security;

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  author_user_id uuid not null references public.users (id),
  author_full_name text not null,
  author_username text not null,
  body text not null,
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  hidden_by_user_id uuid references public.users (id),
  hidden_reason text,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forum_posts_thread_id_idx on public.forum_posts using btree (thread_id);
create index if not exists forum_posts_created_at_idx on public.forum_posts using btree (created_at);

drop trigger if exists forum_posts_set_updated_at on public.forum_posts;
create trigger forum_posts_set_updated_at
  before update on public.forum_posts
  for each row execute function public.set_updated_at();

alter table public.forum_posts enable row level security;

-- ---------------------------------------------------------------------
-- RLS — read-only policies. All writes go through the RPCs below, which
-- run security definer and so are not subject to (and don't need) a
-- matching insert/update policy here.
-- ---------------------------------------------------------------------

drop policy if exists forum_categories_read on public.forum_categories;
create policy forum_categories_read on public.forum_categories for select using (true);

drop policy if exists forum_threads_read on public.forum_threads;
create policy forum_threads_read on public.forum_threads for select
  using (
    status = 'visible'
    or author_user_id = (select public.current_app_user()).id
    or (select public.current_app_user()).role = 'admin'
  );

drop policy if exists forum_posts_read on public.forum_posts;
create policy forum_posts_read on public.forum_posts for select
  using (
    (select public.current_app_user()).role = 'admin'
    or author_user_id = (select public.current_app_user()).id
    or (
      status = 'visible'
      and exists (
        select 1 from public.forum_threads t
        where t.id = forum_posts.thread_id and t.status = 'visible'
      )
    )
  );

insert into public.feature_flags (key, enabled, description)
values ('forum', false, 'Interactive forum: categorized + tagged discussion, post-first/moderate-after.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------

create or replace function public.rpc_forum_category_create(
  p_slug text,
  p_name_fil text,
  p_name_en text,
  p_description_fil text default '',
  p_description_en text default '',
  p_sort_order integer default 0
)
returns table (category_id uuid)
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

  if trim(coalesce(p_slug, '')) = '' or trim(coalesce(p_name_fil, '')) = '' or trim(coalesce(p_name_en, '')) = '' then
    raise exception 'slug and name are required';
  end if;

  insert into public.forum_categories (slug, name_fil, name_en, description_fil, description_en, sort_order)
  values (trim(p_slug), p_name_fil, p_name_en, coalesce(p_description_fil, ''), coalesce(p_description_en, ''), coalesce(p_sort_order, 0))
  returning id into v_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'forum.category_created', 'forum_category', v_id,
    format('Gumawa si %s ng bagong kategorya ng forum.', v_actor.username),
    format('%s created a new forum category.', v_actor.username));

  return query select v_id;
end;
$$;

create or replace function public.rpc_forum_category_delete(p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from public.forum_categories where id = p_category_id) then
    raise exception 'category not found';
  end if;

  if exists (select 1 from public.forum_threads where category_id = p_category_id) then
    raise exception 'category has threads';
  end if;

  delete from public.forum_categories where id = p_category_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'forum.category_deleted', 'forum_category', p_category_id,
    format('Nagtanggal si %s ng kategorya ng forum.', v_actor.username),
    format('%s deleted a forum category.', v_actor.username));
end;
$$;

create or replace function public.rpc_forum_thread_create(
  p_category_id uuid,
  p_title text,
  p_body text,
  p_tags text[] default '{}'::text[]
)
returns table (thread_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_id uuid;
  v_tags text[];
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null then
    raise exception 'not authorized';
  end if;

  if trim(coalesce(p_title, '')) = '' or trim(coalesce(p_body, '')) = '' then
    raise exception 'title and body are required';
  end if;

  if not exists (select 1 from public.forum_categories where id = p_category_id) then
    raise exception 'category not found';
  end if;

  select coalesce(array_agg(distinct lower(trim(tag))), '{}'::text[])
    into v_tags
    from unnest(coalesce(p_tags, '{}'::text[])) as tag
    where trim(tag) != '';

  insert into public.forum_threads (category_id, author_user_id, author_full_name, author_username, title, body, tags)
  values (p_category_id, v_actor.id, v_actor.full_name, v_actor.username, trim(p_title), p_body, v_tags)
  returning id into v_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'forum.thread_created', 'forum_thread', v_id,
    format('Gumawa si %s ng bagong thread sa forum.', v_actor.username),
    format('%s started a new forum thread.', v_actor.username));

  return query select v_id;
end;
$$;

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

  return query select v_id;
end;
$$;

create or replace function public.rpc_forum_thread_moderate(
  p_thread_id uuid,
  p_hidden boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from public.forum_threads where id = p_thread_id) then
    raise exception 'thread not found';
  end if;

  update public.forum_threads
  set status = case when p_hidden then 'hidden' else 'visible' end,
      hidden_by_user_id = case when p_hidden then v_actor.id else null end,
      hidden_reason = case when p_hidden then nullif(trim(p_reason), '') else null end,
      hidden_at = case when p_hidden then now() else null end
  where id = p_thread_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (
    v_actor.id,
    case when p_hidden then 'forum.thread_hidden' else 'forum.thread_unhidden' end,
    'forum_thread', p_thread_id,
    case when p_hidden then format('Itinago ni %s ang isang thread sa forum.', v_actor.username)
         else format('Ipinakita muli ni %s ang isang thread sa forum.', v_actor.username) end,
    case when p_hidden then format('%s hid a forum thread.', v_actor.username)
         else format('%s unhid a forum thread.', v_actor.username) end
  );
end;
$$;

create or replace function public.rpc_forum_post_moderate(
  p_post_id uuid,
  p_hidden boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from public.forum_posts where id = p_post_id) then
    raise exception 'post not found';
  end if;

  update public.forum_posts
  set status = case when p_hidden then 'hidden' else 'visible' end,
      hidden_by_user_id = case when p_hidden then v_actor.id else null end,
      hidden_reason = case when p_hidden then nullif(trim(p_reason), '') else null end,
      hidden_at = case when p_hidden then now() else null end
  where id = p_post_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (
    v_actor.id,
    case when p_hidden then 'forum.post_hidden' else 'forum.post_unhidden' end,
    'forum_post', p_post_id,
    case when p_hidden then format('Itinago ni %s ang isang sagot sa forum.', v_actor.username)
         else format('Ipinakita muli ni %s ang isang sagot sa forum.', v_actor.username) end,
    case when p_hidden then format('%s hid a forum post.', v_actor.username)
         else format('%s unhid a forum post.', v_actor.username) end
  );
end;
$$;

revoke execute on function public.rpc_forum_category_create(text, text, text, text, text, integer) from public, anon;
revoke execute on function public.rpc_forum_category_delete(uuid) from public, anon;
revoke execute on function public.rpc_forum_thread_create(uuid, text, text, text[]) from public, anon;
revoke execute on function public.rpc_forum_post_create(uuid, text) from public, anon;
revoke execute on function public.rpc_forum_thread_moderate(uuid, boolean, text) from public, anon;
revoke execute on function public.rpc_forum_post_moderate(uuid, boolean, text) from public, anon;

grant execute on function public.rpc_forum_category_create(text, text, text, text, text, integer) to authenticated;
grant execute on function public.rpc_forum_category_delete(uuid) to authenticated;
grant execute on function public.rpc_forum_thread_create(uuid, text, text, text[]) to authenticated;
grant execute on function public.rpc_forum_post_create(uuid, text) to authenticated;
grant execute on function public.rpc_forum_thread_moderate(uuid, boolean, text) to authenticated;
grant execute on function public.rpc_forum_post_moderate(uuid, boolean, text) to authenticated;
