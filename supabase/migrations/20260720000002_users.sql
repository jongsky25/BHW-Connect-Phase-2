-- INC-1: users — the app profile layered over Supabase Auth. Login is
-- username + password; the auth email is synthesized as `<username>@bhw.local`
-- (see src/lib/auth/username.ts) and never shown to the user.

create table public.users (
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
  -- Login throttling (delivery-plan.md §5.1): 5 failed attempts -> 15 min lockout.
  failed_login_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_org_unit_id_idx on public.users (org_unit_id);
create index users_auth_user_id_idx on public.users (auth_user_id);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;

-- Every barangay must have at least one active admin (delivery-plan.md §4);
-- enforced fully by the admin console in INC-2, but the guard function lives
-- here so it's available to any path that can deactivate/transfer a user.
create or replace function public.org_unit_has_active_admin(p_org_unit_id uuid, p_excluding_user_id uuid default null) returns boolean
language sql stable as $$
  select exists (
    select 1 from public.users
    where org_unit_id = p_org_unit_id
      and role = 'admin'
      and status = 'active'
      and (p_excluding_user_id is null or id != p_excluding_user_id)
  );
$$;

-- Helpers RLS policies (and server code) use to resolve the caller's app
-- identity without re-querying the users table under RLS on every check.
create or replace function public.current_app_user() returns public.users
language sql stable security definer set search_path = public as $$
  select * from public.users where auth_user_id = auth.uid();
$$;

grant execute on function public.current_app_user() to authenticated;

create or replace function public.current_org_path() returns text
language sql stable security definer set search_path = public as $$
  select o.path
    from public.users u
    join public.org_units o on o.id = u.org_unit_id
    where u.auth_user_id = auth.uid();
$$;

grant execute on function public.current_org_path() to authenticated;
