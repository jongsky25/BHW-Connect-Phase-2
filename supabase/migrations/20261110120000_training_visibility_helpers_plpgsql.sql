-- Cheaper training visibility helpers behind the course_lessons and
-- course_lesson_revisions read policies.
--
-- The course_lessons list was the top statement by total DB time on the pilot
-- (20k calls at ~68 ms between 28 Sep and 10 Nov). Its RLS policy evaluates
-- training_admin_module_ids() and training_visible_module_ids(). Both were
-- SQL-language SECURITY DEFINER functions, which Postgres 17 never inlines and
-- re-plans on every statement (~550 buffer hits and ~1.9 ms of planning each).
-- Their plans also ran current_org_path() and current_app_user() once per
-- candidate row rather than once per call. The admin helper checked the
-- actor's role last, so a BHW paid for the full module x course x org join.
--
-- Same signatures, same visibility rules. Each helper now:
--   * reads the actor once with the same current_app_user() and
--     current_org_path() calls;
--   * returns early when the actor cannot qualify;
--   * is PL/pgSQL, so each pooled PostgREST connection keeps its plans.
-- CREATE OR REPLACE keeps the existing grants, revokes and the policies that
-- call these functions.

create or replace function public.training_admin_module_ids()
returns setof uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user public.users;
  v_path text;
begin
  v_user := public.current_app_user();
  if v_user.id is null or v_user.role is distinct from 'admin' or v_user.status is distinct from 'active' then
    return;
  end if;
  v_path := public.current_org_path();
  return query
    select m.id
    from public.course_modules m
    join public.courses c on c.id = m.course_id
    join public.org_units co on co.id = c.org_unit_id
    where co.path like v_path || '%';
end;
$$;

create or replace function public.training_visible_module_ids()
returns setof uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user public.users;
  v_path text;
begin
  v_user := public.current_app_user();
  if v_user.id is null or v_user.status is distinct from 'active' then
    return;
  end if;
  v_path := public.current_org_path();
  return query
    select m.id
    from public.course_modules m
    join public.courses c on c.id = m.course_id
    join public.training_program_chapters ch on ch.course_id = c.id
    join public.training_programs pr on pr.id = ch.program_id
    left join public.org_units co on co.id = c.org_unit_id
    left join public.org_units po on po.id = pr.org_unit_id
    where c.status = 'published'
      and pr.status = 'published'
      and ch.availability = 'available'
      and coalesce(v_path like co.path || '%' or (v_user.role = 'assessor' and co.path like v_path || '%'), false)
      and coalesce(v_path like po.path || '%' or (v_user.role = 'assessor' and po.path like v_path || '%'), false);
end;
$$;

-- These two wrap the helpers above. As PL/pgSQL they also keep their plans
-- per connection instead of re-planning on every policy check.
create or replace function public.training_admin_lesson_ids()
returns setof uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  return query
    select l.id
    from public.course_lessons l
    where l.module_id in (select public.training_admin_module_ids());
end;
$$;

create or replace function public.training_visible_revision_ids()
returns setof uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  return query
    select l.published_revision_id
    from public.course_lessons l
    where l.published_revision_id is not null
      and l.module_id in (select public.training_visible_module_ids());
end;
$$;
