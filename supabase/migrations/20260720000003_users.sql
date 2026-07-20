-- users: app profile layered over Supabase Auth (delivery-plan.md §4).
-- Login is username+password; the Auth email is synthesized internally as
-- "<username>@bhw.local" (see src/lib/auth) and never shown to the user.

create table users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null,
  full_name text not null,
  contact_number text,
  email text,
  address text,
  role text not null default 'bhw' check (role in ('bhw', 'admin')),
  org_unit_id uuid not null references org_units(id),
  status text not null default 'invited' check (status in ('invited', 'active', 'deactivated')),
  must_change_password boolean not null default true,
  consented_at timestamptz,
  language text not null default 'fil' check (language in ('fil', 'en')),
  a11y_settings jsonb not null default '{}'::jsonb,
  -- Login throttling (delivery-plan.md §5.1): 5 failed attempts -> 15 min
  -- lockout. Mutated only by server-side auth code via the service role;
  -- never exposed to a client-held session.
  failed_login_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive uniqueness: "MariaDLC" and "mariadlc" are the same login.
create unique index users_username_lower_idx on users (lower(username));
create index users_org_unit_id_idx on users (org_unit_id);

create trigger users_set_updated_at
  before update on users
  for each row
  execute function set_updated_at();

-- Resolves the calling session's app-user row plus their org unit's ltree
-- path, for use in RLS policies below (and by future scoped-read policies
-- on other tables). security definer so it can read `users`/`org_units`
-- without those tables' own RLS policies recursing into this function.
create or replace function current_app_user()
returns table (id uuid, role text, org_unit_id uuid, org_unit_path ltree)
language sql
security definer
stable
set search_path = public
as $$
  select u.id, u.role, u.org_unit_id, ou.path
  from users u
  join org_units ou on ou.id = u.org_unit_id
  where u.auth_user_id = auth.uid();
$$;

alter table users enable row level security;

-- A signed-in user may always read their own profile row.
create policy "users can read their own row"
  on users for select
  to authenticated
  using (auth_user_id = auth.uid());

-- Admins may read every user within their org unit's subtree (roll-up
-- scoping per the hierarchy). BHWs get no visibility into other BHWs'
-- profiles in Phase 1.
create policy "admins can read users in their org-unit subtree"
  on users for select
  to authenticated
  using (
    exists (
      select 1
      from current_app_user() cu
      join org_units target_ou on target_ou.id = users.org_unit_id
      where cu.role = 'admin'
        and target_ou.path <@ cu.org_unit_path
    )
  );

-- No insert/update/delete policy for `authenticated` yet: account
-- provisioning (INC-2) and the auth flows in this increment (lockout,
-- forced password change, consent) all write through server actions using
-- the service role, which bypasses RLS. Client-side self-service writes
-- can be added deliberately once there's a concrete need for them.
