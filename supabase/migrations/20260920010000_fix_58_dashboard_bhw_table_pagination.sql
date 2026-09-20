-- Issue #58: rpc_dashboard_bhw_table (INC-6) returned every BHW at-or-below
-- the acting admin's org unit with no LIMIT/OFFSET, and
-- src/app/admin/dashboard/page.tsx rendered all of it into one
-- server-rendered <table> with no pagination. At barangay scale that's
-- fine; at city/provincial/national scale (this system's actual design
-- point — see docs/concept-notes) it's a huge payload and an unusable
-- table. It also turned out to be actively breaking CI, not just a future
-- scale concern: the shared bhw-connect-e2e project's accumulated
-- throwaway users pushed one barangay's BHW count past 1,000, which is why
-- e2e/dashboard.spec.ts's row lookups were timing out (PR #66, #73).
--
-- Adds p_search/p_limit/p_offset, all optional and additive, plus a
-- total_count output column (window function over the same filtered set,
-- before LIMIT/OFFSET) so the UI can render "page N of M" without a second
-- round trip. p_limit defaults to null, which Postgres's own `limit null`
-- treats as "no limit" — so the one other caller,
-- src/app/api/admin/reports/export/route.ts, keeps working with its
-- existing two-argument call (it needs every row for the CSV/XLSX export,
-- and is updated in this same change to pass p_limit/p_offset explicitly
-- rather than lean on the default, so that behavior is asserted, not
-- assumed). p_search does a case-insensitive match against full_name OR
-- username — pagination alone would only move the "can't find one BHW
-- among thousands" problem from page load to page navigation.

-- create or replace can't change an existing function's return columns,
-- and the new (p_search, p_limit, p_offset) parameters give this a
-- different signature anyway — left as a second overload, the old 2-arg
-- version would still resolve for any PostgREST call that only sends
-- p_start/p_end (both signatures accept it, ambiguously). Drop it first so
-- there is exactly one rpc_dashboard_bhw_table.
drop function if exists public.rpc_dashboard_bhw_table(timestamptz, timestamptz);

create or replace function public.rpc_dashboard_bhw_table(
  p_start timestamptz,
  p_end timestamptz,
  p_search text default null,
  p_limit integer default null,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  full_name text,
  username text,
  status text,
  last_login_at timestamptz,
  questions_asked integer,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_scope_path text;
  v_search text;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  v_scope_path := public.current_org_path();
  v_search := nullif(trim(coalesce(p_search, '')), '');

  return query
    select
      u.id,
      u.full_name,
      u.username,
      u.status,
      (
        select max(a.created_at) from public.audit_events a
        where a.subject_id = u.id and a.event_type = 'auth.login'
      ) as last_login_at,
      coalesce((
        select count(*)::integer from public.chat_messages m
        join public.chat_sessions s on s.id = m.session_id
        where s.user_id = u.id and m.sender = 'user'
          and m.created_at >= p_start and m.created_at < p_end
      ), 0) as questions_asked,
      count(*) over ()::bigint as total_count
    from public.users u
    join public.org_units o on o.id = u.org_unit_id
    where u.role = 'bhw' and o.path like v_scope_path || '%'
      and (v_search is null or u.full_name ilike '%' || v_search || '%' or u.username ilike '%' || v_search || '%')
    order by u.full_name
    limit p_limit
    offset p_offset;
end;
$$;

grant execute on function public.rpc_dashboard_bhw_table(timestamptz, timestamptz, text, integer, integer) to anon, authenticated;
