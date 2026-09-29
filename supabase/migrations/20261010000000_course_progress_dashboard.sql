-- Catchment-scoped course dashboard. The function reads only derived progress
-- evidence; exam answers and lesson resume positions never leave the database.
-- It is SECURITY DEFINER because assessor study/exam rows are intentionally
-- private to their owner in the Data API. Authorization is checked here before
-- any result is assembled, and the requested area may only narrow the actor's
-- own org subtree.
create or replace function public.rpc_training_dashboard(
  p_org_unit_id uuid default null,
  p_chapter_id uuid default null,
  p_role text default 'all',
  p_search text default null,
  p_page integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.users;
  v_actor_path text;
  v_scope_path text;
  v_scope_id uuid;
  v_page integer;
  v_search text;
  v_result jsonb;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role <> 'admin' or v_actor.status <> 'active' then
    raise exception 'not authorized';
  end if;
  if p_role not in ('all', 'bhw', 'assessor') or p_role is null then
    raise exception 'invalid role filter';
  end if;
  select path into v_actor_path from public.org_units where id = v_actor.org_unit_id;
  v_scope_id := coalesce(p_org_unit_id, v_actor.org_unit_id);
  select path into v_scope_path from public.org_units where id = v_scope_id;
  if v_actor_path is null or v_scope_path is null
     or v_scope_path not like v_actor_path || '%' then
    raise exception 'area outside catchment';
  end if;
  v_page := least(greatest(coalesce(p_page, 1), 1), 100000);
  v_search := left(nullif(trim(coalesce(p_search, '')), ''), 100);

  with published_chapters as (
    select ch.id, ch.chapter_key, ch.position, ch.course_id,
      ch.title_fil, ch.title_en, req.curriculum_version,
      course_org.path as course_path, program_org.path as program_path,
      count(l.id)::integer as lesson_total
    from public.training_program_chapters ch
    join public.training_programs pr on pr.id = ch.program_id
      and pr.content_key = 'bhw-reference-manual' and pr.status = 'published'
    join public.courses c on c.id = ch.course_id and c.status = 'published'
    join public.org_units course_org on course_org.id = c.org_unit_id
    join public.org_units program_org on program_org.id = pr.org_unit_id
    join public.course_modules m on m.course_id = c.id
    join public.course_lessons l on l.module_id = m.id
      and l.required and l.published_revision_id is not null
    left join assessor_private.exam_requirements req on req.chapter_key = ch.chapter_key
    where ch.availability = 'available'
    group by ch.id, ch.chapter_key, ch.position, ch.course_id,
      ch.title_fil, ch.title_en, req.curriculum_version,
      course_org.path, program_org.path
  ),
  scoped_people as (
    select u.id, u.role, u.username, u.full_name, u.org_unit_id,
      o.name as org_unit_name, o.path as org_path
    from public.users u
    join public.org_units o on o.id = u.org_unit_id
    where u.status = 'active' and u.role in ('bhw', 'assessor')
      and o.path like v_scope_path || '%'
  ),
  assessor_required as (
    select ch.id as chapter_id, ch.course_id,
      (entry.value->>'position')::integer as module_position,
      entry.value->>'key' as lesson_key
    from published_chapters ch
    join assessor_private.exam_requirements req on req.chapter_key = ch.chapter_key
    cross join lateral jsonb_array_elements(req.required_lessons) entry
  ),
  assessor_targets as (
    select ar.chapter_id, count(*)::integer as required_total,
      count(l.id)::integer as available_total
    from assessor_required ar
    left join public.course_modules m on m.course_id = ar.course_id
      and m.position = ar.module_position
    left join public.course_lessons l on l.module_id = m.id
      and l.lesson_key = ar.lesson_key and l.published_revision_id is not null
    group by ar.chapter_id
  ),
  bhw_done as (
    select cp.bhw_user_id as user_id, ch.id as chapter_id,
      count(distinct lp.lesson_id)::integer as done
    from public.course_progress cp
    join scoped_people u on u.id = cp.bhw_user_id and u.role = 'bhw'
    join published_chapters ch on ch.course_id = cp.course_id
    join public.course_lesson_progress lp on lp.course_progress_id = cp.id
    join public.course_lessons l on l.id = lp.lesson_id
      and l.required and l.published_revision_id is not null
    join public.course_modules m on m.id = l.module_id and m.course_id = cp.course_id
    group by cp.bhw_user_id, ch.id
  ),
  assessor_done as (
    select lp.assessor_user_id as user_id, ar.chapter_id,
      count(distinct lp.lesson_id)::integer as done
    from assessor_required ar
    join public.course_modules m on m.course_id = ar.course_id
      and m.position = ar.module_position
    join public.course_lessons l on l.module_id = m.id
      and l.lesson_key = ar.lesson_key and l.published_revision_id is not null
    join public.assessor_lesson_progress lp on lp.chapter_id = ar.chapter_id
      and lp.lesson_id = l.id and lp.revision_id = l.published_revision_id
    join scoped_people u on u.id = lp.assessor_user_id and u.role = 'assessor'
    group by lp.assessor_user_id, ar.chapter_id
  ),
  assessor_started as (
    select a.assessor_user_id as user_id, a.chapter_id
    from public.assessor_exam_attempts a
    join scoped_people u on u.id = a.assessor_user_id and u.role = 'assessor'
    union
    select a.assessor_user_id, a.chapter_id
    from public.assessor_orientation_attempts a
    join scoped_people u on u.id = a.assessor_user_id and u.role = 'assessor'
  ),
  assessor_qualified as (
    select distinct q.assessor_user_id, q.chapter_id, q.curriculum_version
    from public.assessor_chapter_qualifications q
    join scoped_people u on u.id = q.assessor_user_id and u.role = 'assessor'
    where q.status = 'active'
  ),
  person_chapter as (
    select u.id as user_id, u.role, u.username, u.full_name,
      u.org_unit_id, u.org_unit_name, ch.id as chapter_id,
      ch.chapter_key, ch.position, ch.title_fil, ch.title_en,
      case when u.role = 'bhw' then ch.lesson_total
        else coalesce(at.required_total, 0) end as lesson_total,
      case when u.role = 'bhw' then coalesce(bd.done, 0)
        else coalesce(ad.done, 0) end as lesson_done,
      case when u.role = 'bhw' then cp.id is not null
        else coalesce(ad.done, 0) > 0 or ast.user_id is not null
          or aq.assessor_user_id is not null end as started,
      case when u.role = 'bhw' then
          cp.content_completed_at is not null
          or coalesce(cp.status in ('content_completed', 'certified', 'failed_assessment'), false)
        else coalesce(at.required_total, 0) > 0
          and at.available_total = at.required_total
          and coalesce(ad.done, 0) >= at.required_total end as content_completed,
      case when u.role = 'bhw' then coalesce(cp.status = 'certified', false)
        else aq.assessor_user_id is not null end as final_completed
    from scoped_people u
    join published_chapters ch on (
      u.role = 'bhw'
      and u.org_path like ch.course_path || '%'
      and u.org_path like ch.program_path || '%'
    ) or (
      u.role = 'assessor' and ch.curriculum_version is not null
      and (
        (u.org_path like ch.course_path || '%' and u.org_path like ch.program_path || '%')
        or (ch.course_path like u.org_path || '%' and ch.program_path like u.org_path || '%')
      )
    )
    left join public.course_progress cp on u.role = 'bhw'
      and cp.bhw_user_id = u.id and cp.course_id = ch.course_id
    left join bhw_done bd on bd.user_id = u.id and bd.chapter_id = ch.id
    left join assessor_targets at on at.chapter_id = ch.id
    left join assessor_done ad on ad.user_id = u.id and ad.chapter_id = ch.id
    left join assessor_started ast on ast.user_id = u.id and ast.chapter_id = ch.id
    left join assessor_qualified aq on u.role = 'assessor'
      and aq.assessor_user_id = u.id and aq.chapter_id = ch.id
      and aq.curriculum_version = ch.curriculum_version
    where p_chapter_id is null or ch.id = p_chapter_id
  ),
  person_totals as (
    select pc.user_id, pc.role, pc.username, pc.full_name,
      pc.org_unit_id, pc.org_unit_name,
      count(*)::integer as chapter_total,
      bool_or(pc.started) as started,
      bool_and(pc.content_completed) as content_completed,
      bool_and(pc.final_completed) as final_completed,
      sum(pc.lesson_done)::integer as lesson_done,
      sum(pc.lesson_total)::integer as lesson_total
    from person_chapter pc
    group by pc.user_id, pc.role, pc.username, pc.full_name,
      pc.org_unit_id, pc.org_unit_name
  ),
  summary as (
    select role, count(*)::integer as eligible,
      count(*) filter (where started)::integer as started,
      count(*) filter (where content_completed)::integer as content_completed,
      count(*) filter (where final_completed)::integer as final_completed
    from person_totals group by role
  ),
  area_breakdown as (
    select coalesce(child.id, v_scope_id) as id,
      coalesce(child.name, scope.name) as name,
      t.role, count(*)::integer as eligible,
      count(*) filter (where t.started)::integer as started,
      count(*) filter (where t.content_completed)::integer as content_completed,
      count(*) filter (where t.final_completed)::integer as final_completed
    from person_totals t
    join public.org_units assigned on assigned.id = t.org_unit_id
    join public.org_units scope on scope.id = v_scope_id
    left join lateral (
      select o.id, o.name from public.org_units o
      where o.parent_id = v_scope_id and assigned.path like o.path || '%'
      limit 1
    ) child on true
    group by coalesce(child.id, v_scope_id), coalesce(child.name, scope.name), t.role
  ),
  matching_people as (
    select * from person_totals t
    where (p_role = 'all' or t.role = p_role)
      and (v_search is null or position(lower(v_search) in lower(t.full_name)) > 0
        or position(lower(v_search) in lower(t.username)) > 0)
  ),
  page_people as (
    select * from matching_people
    order by full_name, user_id
    limit 20 offset (v_page - 1) * 20
  )
  select jsonb_build_object(
    'summary', coalesce((select jsonb_agg(to_jsonb(s) order by s.role) from summary s), '[]'::jsonb),
    'areas', coalesce((select jsonb_agg(to_jsonb(a) order by a.name, a.role)
      from area_breakdown a), '[]'::jsonb),
    'chapters', coalesce((select jsonb_agg(jsonb_build_object(
      'id', ch.id, 'chapter_key', ch.chapter_key, 'position', ch.position,
      'title_fil', ch.title_fil, 'title_en', ch.title_en,
      'assessor_available', ch.curriculum_version is not null
    ) order by ch.position) from published_chapters ch), '[]'::jsonb),
    'total', (select count(*) from matching_people),
    'people', coalesce((select jsonb_agg(to_jsonb(p) || jsonb_build_object(
      'chapters', coalesce((select jsonb_agg(jsonb_build_object(
        'id', pc.chapter_id, 'chapter_key', pc.chapter_key,
        'title_fil', pc.title_fil, 'title_en', pc.title_en,
        'lesson_done', pc.lesson_done, 'lesson_total', pc.lesson_total,
        'started', pc.started, 'content_completed', pc.content_completed,
        'final_completed', pc.final_completed
      ) order by pc.position) from person_chapter pc
        where pc.user_id = p.user_id), '[]'::jsonb)
    ) order by p.full_name, p.user_id) from page_people p), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke execute on function public.rpc_training_dashboard(uuid, uuid, text, text, integer)
  from public, anon;
grant execute on function public.rpc_training_dashboard(uuid, uuid, text, text, integer)
  to authenticated;
