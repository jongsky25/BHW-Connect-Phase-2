-- INC-1: auth RPCs. These are the only way failed_login_attempts,
-- locked_until, consented_at, and must_change_password are ever written —
-- there is no RLS UPDATE policy on public.users for clients, by design.

-- Called before signInWithPassword so the app can refuse to even attempt
-- auth while an account is locked. Must be callable pre-session (anon).
create or replace function public.rpc_login_precheck(p_username text)
returns table (auth_email text, status text, locked boolean, locked_until timestamptz)
language plpgsql security definer set search_path = public as $$
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

grant execute on function public.rpc_login_precheck(text) to anon, authenticated;

-- Records the outcome of a login attempt: resets the counter on success,
-- increments and locks after 5 failures on failure. Also the only writer of
-- auth.login / auth.login_failed / auth.lockout audit events.
create or replace function public.rpc_record_login_attempt(p_username text, p_success boolean)
returns table (locked boolean, locked_until timestamptz)
language plpgsql security definer set search_path = public as $$
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

grant execute on function public.rpc_record_login_attempt(text, boolean) to anon, authenticated;

-- First-access DPA consent (delivery-plan.md §5.4): no consent, no access.
create or replace function public.rpc_give_consent()
returns void
language plpgsql security definer set search_path = public as $$
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

grant execute on function public.rpc_give_consent() to authenticated;

-- Clears the forced-password-change flag after a successful first change.
create or replace function public.rpc_complete_password_change()
returns void
language sql security definer set search_path = public as $$
  update public.users set must_change_password = false where auth_user_id = auth.uid();
$$;

grant execute on function public.rpc_complete_password_change() to authenticated;
