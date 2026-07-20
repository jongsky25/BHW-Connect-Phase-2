-- INC-2: admin console RPCs — create/reset/deactivate/reactivate/transfer/
-- edit BHW & admin accounts, org-scoped, audit-logged per delivery-plan.md
-- §5.6. Listing users/org_units for the console reuses the existing SELECT
-- RLS policies (users_read_self_or_admin_scope, org_units_read_own_scope) —
-- no new read policy needed.

create or replace function public.generate_temp_password()
returns text
language sql
volatile
set search_path = public
as $$
  select substr(md5(random()::text || clock_timestamp()::text), 1, 10);
$$;

-- Creates a BHW or admin account with a random temp password (returned once
-- so the console can display it) inside the caller's org scope. Password
-- policy is NIST 800-63B (length over composition, delivery-plan.md §5.1) —
-- a random 10-char string clears the 8-char minimum with no charset rules.
create or replace function public.rpc_admin_create_user(
  p_username text,
  p_full_name text,
  p_role text,
  p_org_unit_id uuid,
  p_contact_number text default null,
  p_email text default null,
  p_address text default null
)
returns table(user_id uuid, temp_password text)
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

-- Issues a fresh temp password for an existing user and forces a change on
-- next login. Also clears any lockout, since a reset is the account-recovery
-- path for a BHW who's locked themselves out (delivery-plan.md §5.1).
create or replace function public.rpc_admin_reset_password(p_user_id uuid)
returns table(temp_password text)
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

-- Deactivate/reactivate. Blocks deactivating a barangay's last active admin
-- (delivery-plan.md G12 / account lifecycle).
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

-- Barangay transfer: org_unit_id change, blocked if it would strip a
-- barangay's last active admin (same guard as deactivation).
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

-- Profile edit. Not part of the fixed §5.6 audit taxonomy, so it isn't
-- audit-logged — only the listed lifecycle/security events are.
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

revoke execute on function public.generate_temp_password() from public;
revoke execute on function public.rpc_admin_create_user(text, text, text, uuid, text, text, text) from public;
revoke execute on function public.rpc_admin_reset_password(uuid) from public;
revoke execute on function public.rpc_admin_set_status(uuid, text) from public;
revoke execute on function public.rpc_admin_transfer_user(uuid, uuid) from public;
revoke execute on function public.rpc_admin_update_profile(uuid, text, text, text, text) from public;

grant execute on function public.rpc_admin_create_user(text, text, text, uuid, text, text, text) to authenticated;
grant execute on function public.rpc_admin_reset_password(uuid) to authenticated;
grant execute on function public.rpc_admin_set_status(uuid, text) to authenticated;
grant execute on function public.rpc_admin_transfer_user(uuid, uuid) to authenticated;
grant execute on function public.rpc_admin_update_profile(uuid, text, text, text, text) to authenticated;
