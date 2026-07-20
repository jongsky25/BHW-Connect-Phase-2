-- INC-1: RLS enforcement + auth RPCs (username+password login, lockout,
-- forced password change, DPA consent). RLS is the authorization layer
-- (delivery-plan.md §5.1) — UI checks are convenience only.

alter table public.org_units enable row level security;
alter table public.users enable row level security;
alter table public.audit_events enable row level security;

-- Resolves the calling auth user's app-profile row. SECURITY DEFINER so it
-- can read public.users under RLS without recursing into the users policy
-- that itself depends on this function.
create or replace function public.current_app_user()
returns public.users
language sql
stable security definer
set search_path = public
as $$
  select * from public.users where auth_user_id = auth.uid();
$$;

-- Resolves the calling user's org_units.path for scope comparisons.
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

-- Looks up the synthesized auth email + lockout state for a username before
-- the client attempts supabase.auth.signInWithPassword. Anon-callable: the
-- caller isn't authenticated yet at this point in the login flow.
create or replace function public.rpc_login_precheck(p_username text)
returns table(auth_email text, status text, locked boolean, locked_until timestamptz)
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

-- Records a login attempt's outcome: resets the failure counter on success,
-- or increments it and locks the account for 15 minutes after 5 consecutive
-- failures (NIST 800-63B throttling, delivery-plan.md §5.1). Every outcome
-- is audit-logged.
create or replace function public.rpc_record_login_attempt(p_username text, p_success boolean)
returns table(locked boolean, locked_until timestamptz)
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

-- Clears the forced-password-change flag after the user sets a new password
-- via supabase.auth.updateUser on first login.
create or replace function public.rpc_complete_password_change()
returns void
language sql
security definer
set search_path = public
as $$
  update public.users set must_change_password = false where auth_user_id = auth.uid();
$$;

-- Records DPA consent (delivery-plan.md §5.4). Idempotent: a second call
-- from an already-consented user is a no-op and logs nothing.
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

-- Least-privilege grants: revoke the default PUBLIC execute grant that
-- Postgres applies to new functions, then grant only to the roles that need
-- each RPC. Pre-auth lookups (precheck, record-attempt) must be anon-callable;
-- everything else requires an authenticated session.
revoke execute on function public.current_app_user() from public;
revoke execute on function public.current_org_path() from public;
revoke execute on function public.org_unit_has_active_admin(uuid, uuid) from public;
revoke execute on function public.org_units_validate_hierarchy() from public;
revoke execute on function public.set_updated_at() from public;
revoke execute on function public.rpc_login_precheck(text) from public;
revoke execute on function public.rpc_record_login_attempt(text, boolean) from public;
revoke execute on function public.rpc_complete_password_change() from public;
revoke execute on function public.rpc_give_consent() from public;

grant execute on function public.current_app_user() to anon, authenticated;
grant execute on function public.current_org_path() to anon, authenticated;
grant execute on function public.rpc_login_precheck(text) to anon, authenticated;
grant execute on function public.rpc_record_login_attempt(text, boolean) to anon, authenticated;
grant execute on function public.rpc_complete_password_change() to authenticated;
grant execute on function public.rpc_give_consent() to authenticated;
