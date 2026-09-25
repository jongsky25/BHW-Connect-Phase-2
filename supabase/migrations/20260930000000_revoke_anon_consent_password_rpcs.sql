-- Revoke the default PUBLIC (and so anon) execute on the two INC-1
-- self-service RPCs.
--
-- The baseline (20260720000000_baseline_captured_from_remote.sql) grants
-- rpc_give_consent() and rpc_complete_password_change() to `authenticated`
-- and says they "only make sense once signed in", but never revokes the
-- default PUBLIC execute. The pilot project had that revoke applied directly
-- (its harden_function_grants / harden_function_grants_v2 history rows),
-- which never reached the repo, so a project built from these files — the CI
-- project — still lets anon reach both SECURITY DEFINER functions via
-- /rest/v1/rpc. Both act only on the caller's own row via auth.uid(), which
-- is null for anon, so an anon call was a no-op; the Supabase security advisor
-- still flags both (anon_security_definer_function_executable). Found while
-- explaining the pilot/CI advisor drift on 2026-09-25 — see
-- docs/deploy-runbook.md, "Migration history notes".
--
-- Idempotent: on the pilot these grants already match, so this changes
-- nothing there.

revoke execute on function public.rpc_give_consent() from public, anon;
revoke execute on function public.rpc_complete_password_change() from public, anon;

grant execute on function public.rpc_give_consent() to authenticated;
grant execute on function public.rpc_complete_password_change() to authenticated;
