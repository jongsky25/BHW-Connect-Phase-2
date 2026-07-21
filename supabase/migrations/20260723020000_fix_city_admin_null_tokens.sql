-- ---------------------------------------------------------------------
-- Fix the same NULL-token bug documented in
-- 20260720073323_inc1_fix_admin_create_user_null_tokens.sql, reintroduced
-- by the INC-6 migration's admin.city.stable fixture: its raw insert into
-- auth.users copied rpc_admin_create_user's ORIGINAL (buggy) column list
-- rather than the fixed one, leaving confirmation_token / recovery_token /
-- email_change_token_new NULL. Supabase Auth's Go client scans those as
-- non-nullable strings, so admin.city.stable failed every password-grant
-- login with "500: Database error querying schema" — surfaced by
-- e2e/dashboard.spec.ts's roll-up scoping test running for real in CI.
--
-- Same backfill as the INC-1 fix, safe to replay (WHERE clause only
-- matches rows still carrying the NULL default).
-- ---------------------------------------------------------------------

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
