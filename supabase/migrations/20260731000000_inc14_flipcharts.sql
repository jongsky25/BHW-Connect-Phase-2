-- ---------------------------------------------------------------------
-- INC-14: Health Teaching / Health Promotion Materials Builder ("Flip
-- Chart") — requirements-and-vision.md §6.7, built as a later-phase
-- module the same way as INC-10/11/12/13.
--
-- A flip chart is a sequence of pages; each page carries two synchronized
-- views per the spec — a client-facing image (shown to the community
-- member) and a BHW-facing script/talking points (bilingual, read by the
-- BHW while presenting). Adds a new `designer` role, provisioned the same
-- way as bhw/admin/assessor via rpc_admin_create_user.
--
-- Approval workflow, per spec ("Designer drafts, Admin approves before
-- publish"): status is draft -> in_review -> published. A designer
-- creates in draft and submits for review; an admin then approves
-- (-> published) or rejects (-> back to draft, with a review_note the
-- designer can see on their own row). Content authored directly by an
-- admin skips the gate and publishes immediately — the spec's approval
-- step exists to gate *designer* output, and an admin is already the
-- approver. Mutation is create-once (no in-place page editing), matching
-- the established convention for admin-authored content in this codebase
-- (announcements/surveys/courses have no update RPC either, only status
-- transitions and delete) — a rejected or draft chart must be deleted and
-- recreated to revise. A published chart cannot be deleted (avoids
-- breaking a chart already in use in the field); disclosed v1 limits, not
-- silently accepted ones.
--
-- Same author-snapshot approach INC-13 (Forum) introduced: author_full_name
-- /author_username are written onto flip_charts at create time rather than
-- read via a `users` embed. Reviewing admins need to see who authored a
-- chart regardless of the designer's org branch, and users_read_self_or_
-- admin_scope only grants a viewer their own row or an admin's own-scope
-- descendants — an embed would silently null out designers outside the
-- reviewing admin's subtree.
--
-- Visibility is global once published (like kb_entries: status='published'
-- or admin), not hierarchy-scoped — flip charts are official health
-- education material meant for every BHW, not one branch's feed.
--
-- Ships behind the `flipcharts` feature flag, defaulted to false (dark
-- launch), same convention as announcements/surveys/elearning/forum.
-- ---------------------------------------------------------------------

alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check check (role in ('bhw', 'admin', 'assessor', 'designer'));

create table if not exists public.flip_charts (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references public.users (id),
  author_full_name text not null,
  author_username text not null,
  title_fil text not null,
  title_en text not null,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'published')),
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flip_charts_status_idx on public.flip_charts using btree (status);
create index if not exists flip_charts_author_user_id_idx on public.flip_charts using btree (author_user_id);

drop trigger if exists flip_charts_set_updated_at on public.flip_charts;
create trigger flip_charts_set_updated_at
  before update on public.flip_charts
  for each row execute function public.set_updated_at();

alter table public.flip_charts enable row level security;

create table if not exists public.flip_chart_pages (
  id uuid primary key default gen_random_uuid(),
  flip_chart_id uuid not null references public.flip_charts (id) on delete cascade,
  position integer not null default 0,
  client_image_url text not null,
  client_caption_fil text not null default '',
  client_caption_en text not null default '',
  script_fil text not null,
  script_en text not null,
  created_at timestamptz not null default now()
);

create index if not exists flip_chart_pages_flip_chart_id_idx on public.flip_chart_pages using btree (flip_chart_id);

alter table public.flip_chart_pages enable row level security;

-- ---------------------------------------------------------------------
-- RLS — read-only policies. All writes go through the RPCs below.
-- ---------------------------------------------------------------------

drop policy if exists flip_charts_read on public.flip_charts;
create policy flip_charts_read on public.flip_charts for select
  using (
    status = 'published'
    or author_user_id = (select public.current_app_user()).id
    or (select public.current_app_user()).role = 'admin'
  );

drop policy if exists flip_chart_pages_read on public.flip_chart_pages;
create policy flip_chart_pages_read on public.flip_chart_pages for select
  using (
    exists (
      select 1 from public.flip_charts c
      where c.id = flip_chart_pages.flip_chart_id
        and (
          c.status = 'published'
          or c.author_user_id = (select public.current_app_user()).id
          or (select public.current_app_user()).role = 'admin'
        )
    )
  );

insert into storage.buckets (id, name, public)
values ('flipchart-images', 'flipchart-images', true)
on conflict (id) do nothing;

drop policy if exists flipchart_images_public_read on storage.objects;
create policy flipchart_images_public_read on storage.objects for select
  using (bucket_id = 'flipchart-images');

drop policy if exists flipchart_images_author_insert on storage.objects;
create policy flipchart_images_author_insert on storage.objects for insert
  with check (
    bucket_id = 'flipchart-images'
    and (select public.current_app_user()).role in ('admin', 'designer')
  );

insert into public.feature_flags (key, enabled, description)
values ('flipcharts', false, 'Flip-chart health teaching materials: designer-authored, admin-approved before publish.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------

create or replace function public.rpc_flipchart_create(
  p_title_fil text,
  p_title_en text,
  p_pages jsonb
)
returns table (flip_chart_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_id uuid;
  v_page jsonb;
  v_position integer := 0;
  v_status text;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role not in ('admin', 'designer') then
    raise exception 'not authorized';
  end if;

  if trim(coalesce(p_title_fil, '')) = '' or trim(coalesce(p_title_en, '')) = '' then
    raise exception 'title is required';
  end if;

  if p_pages is null or jsonb_array_length(p_pages) = 0 then
    raise exception 'at least one page is required';
  end if;

  for v_page in select * from jsonb_array_elements(p_pages)
  loop
    if trim(coalesce(v_page->>'client_image_url', '')) = '' then
      raise exception 'each page requires a client-facing image';
    end if;
    if trim(coalesce(v_page->>'script_fil', '')) = '' or trim(coalesce(v_page->>'script_en', '')) = '' then
      raise exception 'each page requires a script in both languages';
    end if;
  end loop;

  v_status := case when v_actor.role = 'admin' then 'published' else 'draft' end;

  insert into public.flip_charts (author_user_id, author_full_name, author_username, title_fil, title_en, status)
  values (v_actor.id, v_actor.full_name, v_actor.username, p_title_fil, p_title_en, v_status)
  returning id into v_id;

  for v_page in select * from jsonb_array_elements(p_pages)
  loop
    insert into public.flip_chart_pages (
      flip_chart_id, position, client_image_url, client_caption_fil, client_caption_en, script_fil, script_en
    )
    values (
      v_id, v_position, v_page->>'client_image_url',
      coalesce(v_page->>'client_caption_fil', ''), coalesce(v_page->>'client_caption_en', ''),
      v_page->>'script_fil', v_page->>'script_en'
    );
    v_position := v_position + 1;
  end loop;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'flipchart.created', 'flip_chart', v_id,
    format('Gumawa si %s ng bagong flip chart.', v_actor.username),
    format('%s created a new flip chart.', v_actor.username));

  return query select v_id;
end;
$$;

create or replace function public.rpc_flipchart_submit(p_flip_chart_id uuid)
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
  if v_actor is null then
    raise exception 'not authorized';
  end if;

  select * into v_chart from public.flip_charts where id = p_flip_chart_id;
  if v_chart is null then
    raise exception 'flip chart not found';
  end if;

  if v_chart.author_user_id != v_actor.id and v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if v_chart.status != 'draft' then
    raise exception 'only a draft can be submitted for review';
  end if;

  update public.flip_charts set status = 'in_review', review_note = null where id = p_flip_chart_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'flipchart.submitted', 'flip_chart', p_flip_chart_id,
    format('Isinumite ni %s ang isang flip chart para sa pagsusuri.', v_actor.username),
    format('%s submitted a flip chart for review.', v_actor.username));
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
end;
$$;

create or replace function public.rpc_flipchart_delete(p_flip_chart_id uuid)
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
  if v_actor is null then
    raise exception 'not authorized';
  end if;

  select * into v_chart from public.flip_charts where id = p_flip_chart_id;
  if v_chart is null then
    raise exception 'flip chart not found';
  end if;

  if v_chart.author_user_id != v_actor.id and v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if v_chart.status = 'published' then
    raise exception 'a published flip chart cannot be deleted';
  end if;

  delete from public.flip_charts where id = p_flip_chart_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'flipchart.deleted', 'flip_chart', p_flip_chart_id,
    format('Nagtanggal si %s ng isang flip chart.', v_actor.username),
    format('%s deleted a flip chart.', v_actor.username));
end;
$$;

revoke execute on function public.rpc_flipchart_create(text, text, jsonb) from public, anon;
revoke execute on function public.rpc_flipchart_submit(uuid) from public, anon;
revoke execute on function public.rpc_flipchart_review(uuid, boolean, text) from public, anon;
revoke execute on function public.rpc_flipchart_delete(uuid) from public, anon;

grant execute on function public.rpc_flipchart_create(text, text, jsonb) to authenticated;
grant execute on function public.rpc_flipchart_submit(uuid) to authenticated;
grant execute on function public.rpc_flipchart_review(uuid, boolean, text) to authenticated;
grant execute on function public.rpc_flipchart_delete(uuid) to authenticated;
