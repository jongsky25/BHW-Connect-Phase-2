-- Bug found by e2e/auth.spec.ts running for real in CI: rpc_admin_create_user
-- (INC-2) inserted new auth.users rows without setting confirmation_token /
-- recovery_token / email_change* / phone_change* / reauthentication_token,
-- leaving them at their column default of NULL. Supabase Auth's Go client
-- scans those columns as non-nullable strings, so every account created
-- through this RPC failed ALL password-grant logins with
-- "500: Database error querying schema" / "converting NULL to string is
-- unsupported" — this affected every pilot fixture account.
--
-- Backfills existing rows and fixes the RPC to set '' instead of relying on
-- the NULL default going forward.

update auth.users set
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  email_change = coalesce(email_change, ''),
  phone_change = coalesce(phone_change, ''),
  reauthentication_token = coalesce(reauthentication_token, '')
where confirmation_token is null or recovery_token is null or email_change_token_new is null
   or email_change_token_current is null or phone_change_token is null or email_change is null
   or phone_change is null or reauthentication_token is null;

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
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    phone_change_token, email_change, phone_change, reauthentication_token,
    created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', v_auth_user_id, 'authenticated', 'authenticated',
    v_username || '@bhw.local', crypt(v_temp_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false,
    '', '', '', '', '', '', '', '',
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
