-- ---------------------------------------------------------------------
-- INC-10: Announcement Page (delivery-plan.md §6.4)
--
-- Facebook-feed style posts, hierarchy-scoped: a post's org_unit_id is
-- the org unit it was published at (defaults to the author's own org
-- unit, but an admin may target any org unit within their own scope —
-- same "self-or-descendant" rule rpc_admin_create_user already uses for
-- org unit selection). Visibility cascades *downward*: a viewer sees a
-- post if the post's org unit is an ancestor of (or equal to) the
-- viewer's own org unit — so a national post reaches everyone, a
-- barangay post reaches only that barangay. This is the mirror image of
-- the "self-or-descendant" org_units_read_own_scope policy, which scopes
-- upward-privileged reads (an admin seeing their own subtree); this one
-- scopes a BHW/admin's downward-facing feed.
--
-- Attachments: image (via a new storage bucket, same pattern as
-- kb-images) and a plain link_url field. The requirements doc also asks
-- for native video attachments; building real video upload/hosting is
-- out of scope for this pass (heavy infra — transcoding, storage cost —
-- inconsistent with the "lean" build stance in §3), so a pasted video
-- link (YouTube, Facebook, etc.) covers that case via link_url instead.
--
-- Ships behind the `announcements` feature flag, defaulted to false
-- (dark launch) since this is a brand-new feature with no prior
-- unconditional behavior to preserve — unlike kb_articles/reports_export,
-- which defaulted to true because they were already live before the
-- flags table existed.
-- ---------------------------------------------------------------------

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  org_unit_id uuid not null references public.org_units (id),
  author_user_id uuid not null references public.users (id),
  body_fil text not null,
  body_en text not null,
  link_url text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_org_unit_id_idx on public.announcements using btree (org_unit_id);
create index if not exists announcements_created_at_idx on public.announcements using btree (created_at desc);

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

alter table public.announcements enable row level security;

drop policy if exists announcements_read_scope on public.announcements;
create policy announcements_read_scope on public.announcements for select
  using (
    exists (
      select 1 from public.org_units o
      where o.id = announcements.org_unit_id
        and (select public.current_org_path()) like o.path || '%'
    )
  );

drop policy if exists announcements_admin_write on public.announcements;
create policy announcements_admin_write on public.announcements for all
  using (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.org_units o
      where o.id = announcements.org_unit_id
        and o.path like (select public.current_org_path()) || '%'
    )
  )
  with check (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.org_units o
      where o.id = announcements.org_unit_id
        and o.path like (select public.current_org_path()) || '%'
    )
  );

insert into storage.buckets (id, name, public)
values ('announcement-attachments', 'announcement-attachments', true)
on conflict (id) do nothing;

drop policy if exists announcement_attachments_public_read on storage.objects;
create policy announcement_attachments_public_read on storage.objects for select
  using (bucket_id = 'announcement-attachments');

drop policy if exists announcement_attachments_admin_insert on storage.objects;
create policy announcement_attachments_admin_insert on storage.objects for insert
  with check (bucket_id = 'announcement-attachments' and (select public.current_app_user()).role = 'admin');

drop policy if exists announcement_attachments_admin_update on storage.objects;
create policy announcement_attachments_admin_update on storage.objects for update
  using (bucket_id = 'announcement-attachments' and (select public.current_app_user()).role = 'admin');

drop policy if exists announcement_attachments_admin_delete on storage.objects;
create policy announcement_attachments_admin_delete on storage.objects for delete
  using (bucket_id = 'announcement-attachments' and (select public.current_app_user()).role = 'admin');

insert into public.feature_flags (key, enabled, description)
values ('announcements', false, 'Announcement feed: hierarchy-scoped posts with image/link attachments.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------

create or replace function public.rpc_announcement_create(
  p_org_unit_id uuid,
  p_body_fil text,
  p_body_en text,
  p_link_url text default null,
  p_image_url text default null
)
returns table (id uuid)
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

  return query select v_id;
end;
$$;

create or replace function public.rpc_announcement_delete(p_announcement_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_announcement public.announcements;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_announcement from public.announcements where id = p_announcement_id;
  if v_announcement is null then
    raise exception 'announcement not found';
  end if;

  if not exists (
    select 1 from public.org_units
    where id = v_announcement.org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'not authorized';
  end if;

  delete from public.announcements where id = p_announcement_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'announcement.deleted', 'announcement', p_announcement_id,
    format('Nagtanggal si %s ng isang anunsyo.', v_actor.username),
    format('%s deleted an announcement.', v_actor.username));
end;
$$;

revoke execute on function public.rpc_announcement_create(uuid, text, text, text, text) from public, anon;
revoke execute on function public.rpc_announcement_delete(uuid) from public, anon;
grant execute on function public.rpc_announcement_create(uuid, text, text, text, text) to authenticated;
grant execute on function public.rpc_announcement_delete(uuid) to authenticated;
