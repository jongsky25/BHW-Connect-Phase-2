-- INC-1 bugfix, found via live testing on the provisioned project: querying
-- org_units or users as the anon role crashed with
-- "permission denied for function current_org_path"/"current_app_user"
-- instead of cleanly returning zero rows.
--
-- Root cause: those RLS policies call current_app_user()/current_org_path()
-- in their USING clause. Postgres requires EXECUTE on a function to even
-- attempt evaluating it, regardless of what the policy's row-filtering
-- logic would have decided — so revoking EXECUTE from anon in
-- 20260720000008 (meant to close the "public can execute SECURITY DEFINER
-- function" advisory) broke every anon query against a table whose policy
-- calls these helpers. Both functions are safe for anon to execute: they
-- key off auth.uid(), which is null pre-session, so they simply return no
-- row — no data exposure, just no more crash.

grant execute on function public.current_app_user() to anon;
grant execute on function public.current_org_path() to anon;
