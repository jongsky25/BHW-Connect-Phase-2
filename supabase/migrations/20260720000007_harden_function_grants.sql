-- INC-1 hardening: fixes raised by the Supabase security advisor after the
-- first pass of migrations landed.
--
-- 1. Pin search_path on every function so it can't be hijacked by a caller
--    manipulating their session's search_path ahead of the call.
-- 2. Postgres grants EXECUTE on new functions to PUBLIC by default, which
--    includes the anon/authenticated API roles — revoke that and grant only
--    the roles each function actually needs.

create or replace function public.org_units_validate_hierarchy() returns trigger
language plpgsql set search_path = public as $$
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

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.org_unit_has_active_admin(p_org_unit_id uuid, p_excluding_user_id uuid default null) returns boolean
language sql stable set search_path = public as $$
  select exists (
    select 1 from public.users
    where org_unit_id = p_org_unit_id
      and role = 'admin'
      and status = 'active'
      and (p_excluding_user_id is null or id != p_excluding_user_id)
  );
$$;

revoke execute on function public.current_app_user() from public;
revoke execute on function public.current_org_path() from public;
revoke execute on function public.org_unit_has_active_admin(uuid, uuid) from public;
revoke execute on function public.rpc_login_precheck(text) from public;
revoke execute on function public.rpc_record_login_attempt(text, boolean) from public;
revoke execute on function public.rpc_give_consent() from public;
revoke execute on function public.rpc_complete_password_change() from public;

-- Re-grant exactly what each caller needs. rpc_login_precheck and
-- rpc_record_login_attempt must stay reachable pre-session (anon); nothing
-- else does. org_unit_has_active_admin has no client caller in INC-1 — it's
-- available to the admin console (INC-2) via service-role/definer contexts.
grant execute on function public.current_app_user() to authenticated;
grant execute on function public.current_org_path() to authenticated;
grant execute on function public.rpc_login_precheck(text) to anon, authenticated;
grant execute on function public.rpc_record_login_attempt(text, boolean) to anon, authenticated;
grant execute on function public.rpc_give_consent() to authenticated;
grant execute on function public.rpc_complete_password_change() to authenticated;
