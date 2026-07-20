-- INC-1: RLS policies for org_units and users.
--
-- Scope model: an account's "scope" is its own org unit and every org unit
-- below it in the hierarchy (roll-up visibility, delivery-plan.md §2/§4).
-- A barangay-level account (every BHW, and a barangay admin) is a leaf, so
-- in practice its scope is exactly its own org unit — this is what makes
-- "a BHW cannot query another org unit's rows" hold.

create policy org_units_read_own_scope on public.org_units
  for select
  using (path like (select public.current_org_path()) || '%');

-- users: everyone can read their own row; admins can additionally read
-- every user whose org unit falls within their scope. BHWs never see other
-- users' rows in INC-1 (no BHW-facing directory feature yet).
create policy users_read_self on public.users
  for select
  using (auth_user_id = auth.uid());

create policy users_read_admin_scope on public.users
  for select
  using (
    (select role from public.current_app_user()) = 'admin'
    and exists (
      select 1 from public.org_units o
      where o.id = users.org_unit_id
        and o.path like (select public.current_org_path()) || '%'
    )
  );

-- No client-facing insert/update/delete policies on users in INC-1: account
-- provisioning is a service-role seed step until INC-2 ships the admin
-- console, and the only self-service mutations (consent, forced password
-- change, login-attempt tracking) go through the SECURITY DEFINER RPCs in
-- the next migration so failed_login_attempts/locked_until can never be
-- written directly by a client.
