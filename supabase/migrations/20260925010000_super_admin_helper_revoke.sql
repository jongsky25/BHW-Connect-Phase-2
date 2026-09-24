-- Follow-up to 20260925000000_super_admin_personas.sql: that migration's
-- `revoke ... from public, anon` on current_super_admin() left it callable
-- over /rest/v1/rpc by `authenticated`, because Supabase's default
-- privileges grant EXECUTE to that role directly rather than via PUBLIC
-- (flagged by the security advisor). The helper is only ever called from
-- inside the super admin definer RPCs, which run as the function owner, so
-- nothing needs it exposed.
revoke execute on function public.current_super_admin() from authenticated;
