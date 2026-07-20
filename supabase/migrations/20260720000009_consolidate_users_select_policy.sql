-- INC-1 hardening, part 3: performance fixes raised by the Supabase advisor.
--
-- 1. `auth_user_id = auth.uid()` re-evaluates auth.uid() per row; wrapping
--    it as `(select auth.uid())` lets Postgres evaluate it once as an
--    InitPlan instead (delivery-plan.md's other auth.<fn>() calls already
--    went through current_app_user()/current_org_path(), which are
--    themselves wrapped in `select` at every call site — only this one was
--    missed).
-- 2. Two separate permissive SELECT policies on the same table mean both
--    run on every query; combining them into one is both faster and
--    equivalent (self-row OR admin-scope was always an OR).

drop policy users_read_self on public.users;
drop policy users_read_admin_scope on public.users;

create policy users_read_self_or_admin_scope on public.users
  for select
  using (
    auth_user_id = (select auth.uid())
    or (
      (select role from public.current_app_user()) = 'admin'
      and exists (
        select 1 from public.org_units o
        where o.id = users.org_unit_id
          and o.path like (select public.current_org_path()) || '%'
      )
    )
  );
