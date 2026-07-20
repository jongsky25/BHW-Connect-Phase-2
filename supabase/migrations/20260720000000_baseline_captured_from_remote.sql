-- Baseline schema for BHW Connect Phase 2 (INC-1 through INC-3).
--
-- This file was reconstructed by introspecting the already-provisioned
-- Supabase project (org_units, users, audit_events, auth RPCs, RLS, and
-- the INC-2/INC-3 admin + KB objects) rather than replayed from the
-- original incremental migration history, which was applied directly
-- against the hosted project and never checked into version control.
-- Capturing it here closes that portability gap (delivery-plan.md §3):
-- the schema must be reproducible as "a Node server + a Postgres
-- database" without depending on the hosted project's internal history.
--
-- Statements are written to be idempotent so this file can be replayed
-- against a fresh Postgres + Supabase Auth instance.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Shared trigger helper
-- ---------------------------------------------------------------------

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

-- ---------------------------------------------------------------------
-- org_units
-- ---------------------------------------------------------------------

create table if not exists public.org_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level text not null check (level in ('national', 'regional', 'provincial', 'city_municipal', 'barangay')),
  parent_id uuid references public.org_units (id),
  path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists org_units_parent_id_idx on public.org_units using btree (parent_id);
create index if not exists org_units_path_idx on public.org_units using btree (path text_pattern_ops);

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

drop trigger if exists org_units_set_path on public.org_units;
create trigger org_units_set_path
  before insert on public.org_units
  for each row execute function public.org_units_validate_hierarchy();

drop trigger if exists org_units_set_updated_at on public.org_units;
create trigger org_units_set_updated_at
  before update on public.org_units
  for each row execute function public.set_updated_at();

alter table public.org_units enable row level security;

-- ---------------------------------------------------------------------
-- users (app profile over Supabase Auth)
-- ---------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  username text not null unique check (username = lower(username)),
  full_name text not null,
  contact_number text,
  email text,
  address text,
  role text not null check (role in ('bhw', 'admin')),
  org_unit_id uuid not null references public.org_units (id),
  status text not null default 'invited' check (status in ('invited', 'active', 'deactivated')),
  must_change_password boolean not null default true,
  consented_at timestamptz,
  language text not null default 'fil' check (language in ('fil', 'en')),
  a11y_settings jsonb not null default '{}'::jsonb,
  failed_login_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_auth_user_id_idx on public.users using btree (auth_user_id);
create index if not exists users_org_unit_id_idx on public.users using btree (org_unit_id);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;

-- ---------------------------------------------------------------------
-- audit_events (laymanized audit trail, §5.6)
-- ---------------------------------------------------------------------

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users (id),
  event_type text not null,
  subject_type text not null,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  plain_summary_fil text not null,
  plain_summary_en text not null,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_actor_user_id_idx on public.audit_events using btree (actor_user_id);
create index if not exists audit_events_created_at_idx on public.audit_events using btree (created_at desc);

alter table public.audit_events enable row level security;

-- ---------------------------------------------------------------------
-- Scope helpers
-- ---------------------------------------------------------------------

create or replace function public.current_app_user()
returns public.users
language sql
stable security definer
set search_path = public
as $$
  select * from public.users where auth_user_id = auth.uid();
$$;

create or replace function public.current_org_path()
returns text
language sql
stable security definer
set search_path = public
as $$
  select o.path
    from public.users u
    join public.org_units o on o.id = u.org_unit_id
    where u.auth_user_id = auth.uid();
$$;

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

create or replace function public.generate_temp_password()
returns text
language sql
set search_path = public
as $$
  select substr(md5(random()::text || clock_timestamp()::text), 1, 10);
$$;

-- ---------------------------------------------------------------------
-- RLS policies: org_units, users, audit_events
-- ---------------------------------------------------------------------

drop policy if exists org_units_read_own_scope on public.org_units;
create policy org_units_read_own_scope on public.org_units
  for select
  using (path like (select public.current_org_path()) || '%');

drop policy if exists users_read_self_or_admin_scope on public.users;
create policy users_read_self_or_admin_scope on public.users
  for select
  using (
    auth_user_id = (select auth.uid())
    or (
      (select public.current_app_user()).role = 'admin'
      and exists (
        select 1 from public.org_units o
        where o.id = users.org_unit_id
          and o.path like (select public.current_org_path()) || '%'
      )
    )
  );

drop policy if exists audit_events_admin_read on public.audit_events;
create policy audit_events_admin_read on public.audit_events
  for select
  using (
    (select public.current_app_user()).role = 'admin'
    and (
      subject_id is null
      or exists (
        select 1 from public.users u
        join public.org_units o on o.id = u.org_unit_id
        where u.id = audit_events.subject_id
          and o.path like (select public.current_org_path()) || '%'
      )
    )
  );

-- ---------------------------------------------------------------------
-- Auth RPCs (INC-1): login precheck, throttled attempts, consent,
-- forced first-login password change.
-- ---------------------------------------------------------------------

create or replace function public.rpc_login_precheck(p_username text)
returns table (auth_email text, status text, locked boolean, locked_until timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  u public.users;
begin
  select * into u from public.users where username = lower(p_username);

  if not found then
    return;
  end if;

  return query select
    u.username || '@bhw.local',
    u.status,
    (u.locked_until is not null and u.locked_until > now()),
    u.locked_until;
end;
$$;

create or replace function public.rpc_record_login_attempt(p_username text, p_success boolean)
returns table (locked boolean, locked_until timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  u public.users;
  v_already_locked boolean;
begin
  select * into u from public.users where username = lower(p_username) for update;

  if not found then
    return;
  end if;

  v_already_locked := u.locked_until is not null and u.locked_until > now();

  if p_success then
    update public.users
      set failed_login_attempts = 0, locked_until = null
      where id = u.id;

    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (u.id, 'auth.login', 'user', u.id,
      format('Si %s ay matagumpay na naka-login.', u.username),
      format('%s logged in successfully.', u.username));

    return query select false, null::timestamptz;
    return;
  end if;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (u.id, 'auth.login_failed', 'user', u.id,
    format('Nabigong pagtatangka ng pag-login para kay %s.', u.username),
    format('Failed login attempt for %s.', u.username));

  if v_already_locked then
    return query select true, u.locked_until;
    return;
  end if;

  u.failed_login_attempts := u.failed_login_attempts + 1;

  if u.failed_login_attempts >= 5 then
    u.locked_until := now() + interval '15 minutes';

    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (u.id, 'auth.lockout', 'user', u.id,
      format('Na-lock ang account ni %s dahil sa limang magkakasunod na maling pagtatangka.', u.username),
      format('%s''s account was locked after five consecutive failed attempts.', u.username));
  end if;

  update public.users
    set failed_login_attempts = u.failed_login_attempts, locked_until = u.locked_until
    where id = u.id;

  return query select (u.locked_until is not null and u.locked_until > now()), u.locked_until;
end;
$$;

create or replace function public.rpc_give_consent()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  update public.users
    set consented_at = now()
    where auth_user_id = auth.uid() and consented_at is null
    returning id into v_user_id;

  if v_user_id is not null then
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    select v_user_id, 'user.consent_given', 'user', v_user_id,
      format('Sumang-ayon si %s sa Patakaran sa Privacy.', username),
      format('%s agreed to the Privacy Notice.', username)
    from public.users where id = v_user_id;
  end if;
end;
$$;

create or replace function public.rpc_complete_password_change()
returns void
language sql
security definer
set search_path = public
as $$
  update public.users set must_change_password = false where auth_user_id = auth.uid();
$$;

-- rpc_login_precheck / rpc_record_login_attempt must be callable before a
-- session exists; rpc_give_consent / rpc_complete_password_change act on
-- the caller's own row via auth.uid() and only make sense once signed in.
grant execute on function public.rpc_login_precheck(text) to anon, authenticated;
grant execute on function public.rpc_record_login_attempt(text, boolean) to anon, authenticated;
grant execute on function public.rpc_give_consent() to authenticated;
grant execute on function public.rpc_complete_password_change() to authenticated;
grant execute on function public.current_app_user() to anon, authenticated;
grant execute on function public.current_org_path() to anon, authenticated;
grant execute on function public.generate_temp_password() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Seed: pilot org chain (DOH -> Region IV-A -> Laguna -> Los Baños ->
-- Barangay Batong Malake / Barangay Anos)
-- ---------------------------------------------------------------------

insert into public.org_units (id, name, level, parent_id)
values ('00000000-0000-0000-0000-000000000001', 'Department of Health', 'national', null)
on conflict (id) do nothing;

insert into public.org_units (id, name, level, parent_id)
values ('00000000-0000-0000-0000-000000000002', 'Region IV-A (CALABARZON)', 'regional', '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.org_units (id, name, level, parent_id)
values ('00000000-0000-0000-0000-000000000003', 'Laguna', 'provincial', '00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into public.org_units (id, name, level, parent_id)
values ('00000000-0000-0000-0000-000000000004', 'Los Baños', 'city_municipal', '00000000-0000-0000-0000-000000000003')
on conflict (id) do nothing;

insert into public.org_units (id, name, level, parent_id)
values ('00000000-0000-0000-0000-000000000005', 'Barangay Batong Malake', 'barangay', '00000000-0000-0000-0000-000000000004')
on conflict (id) do nothing;

insert into public.org_units (id, name, level, parent_id)
values ('00000000-0000-0000-0000-000000000006', 'Barangay Anos', 'barangay', '00000000-0000-0000-0000-000000000004')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- INC-2: admin console RPCs (user CRUD within org scope, last-admin
-- guard, audit trail)
-- ---------------------------------------------------------------------

create or replace function public.rpc_admin_create_user(
  p_username text,
  p_full_name text,
  p_role text,
  p_org_unit_id uuid,
  p_contact_number text default null,
  p_email text default null,
  p_address text default null
)
returns table (user_id uuid, temp_password text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor public.users;
  v_auth_user_id uuid;
  v_user_id uuid;
  v_temp_password text;
  v_username text := lower(trim(p_username));
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if v_username = '' then
    raise exception 'username is required';
  end if;

  if not exists (
    select 1 from public.org_units
    where id = p_org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'org unit out of scope';
  end if;

  v_temp_password := public.generate_temp_password();
  v_auth_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
    created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', v_auth_user_id, 'authenticated', 'authenticated',
    v_username || '@bhw.local', crypt(v_temp_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false,
    now(), now()
  );

  insert into public.users (
    auth_user_id, username, full_name, contact_number, email, address,
    role, org_unit_id, status, must_change_password
  ) values (
    v_auth_user_id, v_username, p_full_name, p_contact_number, p_email, p_address,
    p_role, p_org_unit_id, 'active', true
  ) returning id into v_user_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'user.created', 'user', v_user_id,
    format('Nagdagdag si %s ng bagong user na si %s.', v_actor.username, v_username),
    format('%s added a new user, %s.', v_actor.username, v_username));

  return query select v_user_id, v_temp_password;
end;
$$;

create or replace function public.rpc_admin_reset_password(p_user_id uuid)
returns table (temp_password text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor public.users;
  v_target public.users;
  v_temp_password text;
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

  v_temp_password := public.generate_temp_password();

  update auth.users
    set encrypted_password = crypt(v_temp_password, gen_salt('bf')), updated_at = now()
    where id = v_target.auth_user_id;

  update public.users
    set must_change_password = true, failed_login_attempts = 0, locked_until = null
    where id = v_target.id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'user.password_reset', 'user', v_target.id,
    format('Nag-reset si %s ng password ni %s.', v_actor.username, v_target.username),
    format('%s reset %s''s password.', v_actor.username, v_target.username));

  return query select v_temp_password;
end;
$$;

create or replace function public.rpc_admin_set_status(p_user_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_target public.users;
begin
  if p_status not in ('active', 'deactivated') then
    raise exception 'invalid status';
  end if;

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

  if p_status = 'deactivated' and v_target.role = 'admin' and v_target.status = 'active'
     and not public.org_unit_has_active_admin(v_target.org_unit_id, v_target.id) then
    raise exception 'cannot deactivate the last active admin for this org unit';
  end if;

  update public.users set status = p_status where id = v_target.id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (
    v_actor.id,
    case when p_status = 'deactivated' then 'user.deactivated' else 'user.reactivated' end,
    'user', v_target.id,
    case when p_status = 'deactivated'
      then format('Na-deactivate ni %s ang account ni %s.', v_actor.username, v_target.username)
      else format('Na-reactivate ni %s ang account ni %s.', v_actor.username, v_target.username)
    end,
    case when p_status = 'deactivated'
      then format('%s deactivated %s''s account.', v_actor.username, v_target.username)
      else format('%s reactivated %s''s account.', v_actor.username, v_target.username)
    end
  );
end;
$$;

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
end;
$$;

create or replace function public.rpc_admin_update_profile(
  p_user_id uuid,
  p_full_name text,
  p_contact_number text default null,
  p_email text default null,
  p_address text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_target public.users;
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

  update public.users
    set full_name = p_full_name,
        contact_number = p_contact_number,
        email = p_email,
        address = p_address
    where id = v_target.id;
end;
$$;

grant execute on function public.rpc_admin_create_user(text, text, text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.rpc_admin_reset_password(uuid) to anon, authenticated;
grant execute on function public.rpc_admin_set_status(uuid, text) to anon, authenticated;
grant execute on function public.rpc_admin_transfer_user(uuid, uuid) to anon, authenticated;
grant execute on function public.rpc_admin_update_profile(uuid, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- INC-3: KB schema (categories, Q&A entries, long-form articles,
-- synonyms) + image storage bucket
-- ---------------------------------------------------------------------

create table if not exists public.kb_categories (
  id uuid primary key default gen_random_uuid(),
  name_fil text not null,
  name_en text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists kb_categories_set_updated_at on public.kb_categories;
create trigger kb_categories_set_updated_at
  before update on public.kb_categories
  for each row execute function public.set_updated_at();

alter table public.kb_categories enable row level security;

create table if not exists public.kb_entries (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.kb_categories (id),
  question_fil text not null,
  question_en text not null,
  answer_fil text not null,
  answer_en text not null,
  keywords text[] not null default '{}'::text[],
  image_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  owner_user_id uuid references public.users (id),
  review_due_on date,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kb_entries_publish_requires_owner check (status = 'draft' or owner_user_id is not null)
);

create index if not exists kb_entries_category_id_idx on public.kb_entries using btree (category_id);
create index if not exists kb_entries_search_vector_idx on public.kb_entries using gin (search_vector);

create or replace function public.kb_entries_set_search_vector()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_vector := to_tsvector('simple',
    coalesce(new.question_fil, '') || ' ' || coalesce(new.question_en, '') || ' ' ||
    coalesce(new.answer_fil, '') || ' ' || coalesce(new.answer_en, '') || ' ' ||
    coalesce(array_to_string(new.keywords, ' '), '')
  );
  return new;
end;
$$;

drop trigger if exists kb_entries_set_search_vector on public.kb_entries;
create trigger kb_entries_set_search_vector
  before insert or update on public.kb_entries
  for each row execute function public.kb_entries_set_search_vector();

drop trigger if exists kb_entries_set_updated_at on public.kb_entries;
create trigger kb_entries_set_updated_at
  before update on public.kb_entries
  for each row execute function public.set_updated_at();

alter table public.kb_entries enable row level security;

create table if not exists public.kb_articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.kb_categories (id),
  title_fil text not null,
  title_en text not null,
  body_fil jsonb not null default '{}'::jsonb,
  body_en jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  owner_user_id uuid references public.users (id),
  review_due_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kb_articles_publish_requires_owner check (status = 'draft' or owner_user_id is not null)
);

create index if not exists kb_articles_category_id_idx on public.kb_articles using btree (category_id);

drop trigger if exists kb_articles_set_updated_at on public.kb_articles;
create trigger kb_articles_set_updated_at
  before update on public.kb_articles
  for each row execute function public.set_updated_at();

alter table public.kb_articles enable row level security;

create table if not exists public.synonyms (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  maps_to text not null,
  language text not null check (language in ('fil', 'en', 'taglish')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists synonyms_set_updated_at on public.synonyms;
create trigger synonyms_set_updated_at
  before update on public.synonyms
  for each row execute function public.set_updated_at();

alter table public.synonyms enable row level security;

drop policy if exists kb_categories_read on public.kb_categories;
create policy kb_categories_read on public.kb_categories for select using (true);

drop policy if exists kb_categories_admin_write on public.kb_categories;
create policy kb_categories_admin_write on public.kb_categories for all
  using ((select public.current_app_user()).role = 'admin')
  with check ((select public.current_app_user()).role = 'admin');

drop policy if exists kb_entries_read on public.kb_entries;
create policy kb_entries_read on public.kb_entries for select
  using (status = 'published' or (select public.current_app_user()).role = 'admin');

drop policy if exists kb_entries_admin_write on public.kb_entries;
create policy kb_entries_admin_write on public.kb_entries for all
  using ((select public.current_app_user()).role = 'admin')
  with check ((select public.current_app_user()).role = 'admin');

drop policy if exists kb_articles_read on public.kb_articles;
create policy kb_articles_read on public.kb_articles for select
  using (status = 'published' or (select public.current_app_user()).role = 'admin');

drop policy if exists kb_articles_admin_write on public.kb_articles;
create policy kb_articles_admin_write on public.kb_articles for all
  using ((select public.current_app_user()).role = 'admin')
  with check ((select public.current_app_user()).role = 'admin');

drop policy if exists synonyms_admin_all on public.synonyms;
create policy synonyms_admin_all on public.synonyms for all
  using ((select public.current_app_user()).role = 'admin')
  with check ((select public.current_app_user()).role = 'admin');

insert into storage.buckets (id, name, public)
values ('kb-images', 'kb-images', true)
on conflict (id) do nothing;

drop policy if exists kb_images_public_read on storage.objects;
create policy kb_images_public_read on storage.objects for select
  using (bucket_id = 'kb-images');

drop policy if exists kb_images_admin_insert on storage.objects;
create policy kb_images_admin_insert on storage.objects for insert
  with check (bucket_id = 'kb-images' and (select public.current_app_user()).role = 'admin');

drop policy if exists kb_images_admin_update on storage.objects;
create policy kb_images_admin_update on storage.objects for update
  using (bucket_id = 'kb-images' and (select public.current_app_user()).role = 'admin');

drop policy if exists kb_images_admin_delete on storage.objects;
create policy kb_images_admin_delete on storage.objects for delete
  using (bucket_id = 'kb-images' and (select public.current_app_user()).role = 'admin');
