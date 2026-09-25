-- Follow-up to INC-29 (20260920000000_inc29_course_progress_reset.sql).
--
-- That migration granted execute to `authenticated` but never revoked the
-- default PUBLIC execute, so `anon` could reach the SECURITY DEFINER RPC via
-- /rest/v1/rpc/rpc_course_progress_reset. The function's own admin check
-- still refused the call ('not authorized'), but the Supabase security
-- advisor flagged it (anon_security_definer_function_executable), and every
-- sibling RPC since (facilitation_log, versioned_test_bank) revokes from
-- public/anon explicitly. Found when inc29 was applied late to both projects
-- on 2026-09-25 — see docs/deploy-runbook.md, "Migration history notes".

revoke execute on function public.rpc_course_progress_reset(uuid, uuid) from public, anon;
