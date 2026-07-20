-- INC-1 hardening, part 2: 20260720000007's `revoke ... from public` didn't
-- actually remove anon/authenticated's EXECUTE — this Supabase project has
-- an `alter default privileges` rule that grants EXECUTE on every new
-- public-schema function directly to anon/authenticated, independent of
-- PUBLIC. Revoke from those roles explicitly, then re-grant only what each
-- function's caller actually needs.
--
-- Trigger functions (org_units_validate_hierarchy, set_updated_at) don't
-- need EXECUTE granted to any client role at all: Postgres fires triggers
-- as part of the DML privilege check on the table itself, not via a
-- separate EXECUTE check on the trigger function.

revoke execute on function public.org_units_validate_hierarchy() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.current_app_user() from public, anon, authenticated;
revoke execute on function public.current_org_path() from public, anon, authenticated;
revoke execute on function public.org_unit_has_active_admin(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.rpc_login_precheck(text) from public, anon, authenticated;
revoke execute on function public.rpc_record_login_attempt(text, boolean) from public, anon, authenticated;
revoke execute on function public.rpc_give_consent() from public, anon, authenticated;
revoke execute on function public.rpc_complete_password_change() from public, anon, authenticated;

grant execute on function public.current_app_user() to authenticated;
grant execute on function public.current_org_path() to authenticated;
grant execute on function public.rpc_login_precheck(text) to anon, authenticated;
grant execute on function public.rpc_record_login_attempt(text, boolean) to anon, authenticated;
grant execute on function public.rpc_give_consent() to authenticated;
grant execute on function public.rpc_complete_password_change() to authenticated;
