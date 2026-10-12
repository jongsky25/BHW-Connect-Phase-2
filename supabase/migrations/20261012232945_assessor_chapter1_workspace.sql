-- C1AF-10: bounded, read-only Chapter 1 working area. Learning progress is
-- descriptive; it is never an assessment-readiness or authority decision.
begin;

create function public.rpc_assessor_chapter1_workspace(
  p_program_id uuid,
  p_search text default null,
  p_area_id uuid default null,
  p_status text default 'all',
  p_page integer default 1
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor public.users;
  actor_path text;
  area_path text;
  chapter_course uuid;
  page_number integer;
  term text;
  total_rows integer;
  people jsonb;
  areas jsonb;
begin
  actor := public.current_app_user();
  if actor.id is null or actor.role <> 'assessor' or actor.status <> 'active'
    or exists (select 1 from public.super_admin_personas where persona_user_id = actor.id) then
    raise exception 'not authorized';
  end if;
  select path into actor_path from public.org_units where id = actor.org_unit_id;
  if actor_path is null then raise exception 'not authorized'; end if;
  if p_status is null or p_status not in
    ('all','not_started','in_progress','content_completed','certified','failed_assessment') then
    raise exception 'invalid status filter';
  end if;
  page_number := least(greatest(coalesce(p_page, 1), 1), 10000);
  term := left(nullif(btrim(coalesce(p_search, '')), ''), 80);
  if p_area_id is not null then
    select path into area_path from public.org_units where id = p_area_id;
    if area_path is null or area_path not like actor_path || '%' then
      raise exception 'area outside catchment';
    end if;
  else
    area_path := actor_path;
  end if;
  select ch.course_id into chapter_course
  from public.training_programs pr
  join public.training_program_chapters ch on ch.program_id = pr.id
  join public.courses c on c.id = ch.course_id and c.status = 'published'
  where pr.id = p_program_id and pr.content_key = 'bhw-reference-manual'
    and pr.status = 'published' and ch.chapter_key = 'chapter-1'
    and ch.availability = 'available'
    and public.org_visible_to_actor(pr.org_unit_id)
    and public.org_visible_to_actor(c.org_unit_id);
  if chapter_course is null then raise exception 'chapter unavailable'; end if;

  with matching as (
    select u.id, u.full_name, o.name as barangay, o.id as area_id,
      coalesce(cp.status, 'not_started') as learning_status
    from public.users u
    join public.org_units o on o.id = u.org_unit_id
    left join public.course_progress cp on cp.bhw_user_id = u.id and cp.course_id = chapter_course
    where u.role = 'bhw' and u.status = 'active' and o.path like area_path || '%'
      and (term is null or strpos(lower(u.full_name),lower(term)) > 0
        or strpos(lower(o.name),lower(term)) > 0)
      and (p_status = 'all' or coalesce(cp.status, 'not_started') = p_status)
  ), paged as (
    select * from matching order by full_name, barangay, id
    limit 20 offset (page_number - 1) * 20
  )
  select (select count(*) from matching),
    coalesce((select jsonb_agg(to_jsonb(paged) order by full_name, barangay, id) from paged), '[]'::jsonb)
    into total_rows, people;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.name, a.id), '[]'::jsonb) into areas
  from (select id, name from public.org_units
    where path like actor_path || '%' and level = 'barangay'
    order by case when id = p_area_id then 0 else 1 end, name, id limit 200) a;
  return jsonb_build_object('rows',people,'total',total_rows,'page',page_number,
    'pageSize',20,'areas',areas,'areasTruncated',
    (select count(*) > 200 from public.org_units where path like actor_path || '%' and level = 'barangay'));
end;
$$;

revoke all on function public.rpc_assessor_chapter1_workspace(uuid,text,uuid,text,integer)
  from public, anon, authenticated;
grant execute on function public.rpc_assessor_chapter1_workspace(uuid,text,uuid,text,integer)
  to authenticated;

commit;
