-- INC-1: org hierarchy, app-profile users, and audit log tables.
-- Backfilled from the live project schema (applied directly during INC-1 buildout)
-- so the portability guardrail (delivery-plan.md §3) holds: schema lives in the repo.

create table if not exists public.org_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level text not null check (level = any (array['national', 'regional', 'provincial', 'city_municipal', 'barangay'])),
  parent_id uuid references public.org_units(id),
  path text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(username)),
  full_name text not null,
  contact_number text,
  email text,
  address text,
  role text not null check (role = any (array['bhw', 'admin'])),
  org_unit_id uuid not null references public.org_units(id),
  status text not null default 'invited' check (status = any (array['invited', 'active', 'deactivated'])),
  must_change_password boolean not null default true,
  consented_at timestamptz,
  language text not null default 'fil' check (language = any (array['fil', 'en'])),
  a11y_settings jsonb not null default '{}'::jsonb,
  failed_login_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id),
  event_type text not null,
  subject_type text not null,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  plain_summary_fil text not null,
  plain_summary_en text not null,
  created_at timestamptz not null default now()
);

-- Maintains org_units.path as a materialized dot-separated ancestor chain and
-- enforces that each level's parent is exactly the level above it.
create or replace function public.org_units_validate_hierarchy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_level text;
  expected_child_level text;
begin
  if new.level = 'national' then
    if new.parent_id is not null then
      raise exception 'national org units cannot have a parent';
    end if;
    new.path := new.id::text || '.';
    return new;
  end if;

  if new.parent_id is null then
    raise exception '% org units require a parent', new.level;
  end if;

  select level, path into parent_level, new.path
    from public.org_units where id = new.parent_id;

  if parent_level is null then
    raise exception 'parent org unit % not found', new.parent_id;
  end if;

  expected_child_level := case parent_level
    when 'national' then 'regional'
    when 'regional' then 'provincial'
    when 'provincial' then 'city_municipal'
    when 'city_municipal' then 'barangay'
    else null
  end;

  if new.level != expected_child_level then
    raise exception 'a % cannot be the parent of a %', parent_level, new.level;
  end if;

  new.path := new.path || new.id::text || '.';
  return new;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists org_units_set_path on public.org_units;
create trigger org_units_set_path
  before insert on public.org_units
  for each row execute function public.org_units_validate_hierarchy();

drop trigger if exists org_units_set_updated_at on public.org_units;
create trigger org_units_set_updated_at
  before update on public.org_units
  for each row execute function public.set_updated_at();

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Last-admin guard support (delivery-plan.md G12): used by the admin console
-- in INC-2 to block deactivating a barangay's only active admin.
create or replace function public.org_unit_has_active_admin(p_org_unit_id uuid, p_excluding_user_id uuid default null)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where org_unit_id = p_org_unit_id
      and role = 'admin'
      and status = 'active'
      and (p_excluding_user_id is null or id != p_excluding_user_id)
  );
$$;
