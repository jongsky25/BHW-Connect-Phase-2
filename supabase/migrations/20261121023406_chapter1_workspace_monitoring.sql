-- C1-PE-4: enrich only the existing authorized page (at most 20 BHWs).
-- No answers, draft scores, competency decisions, or cross-form gain claims.
begin;

create or replace function public.rpc_assessor_chapter1_workspace(
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

  with page_people as (
    select value as person, (value->>'id')::uuid as learner_id
    from jsonb_array_elements(people)
  ), lessons as materialized (
    select l.id, l.lesson_key, l.title_fil, l.title_en, l.required
    from public.course_lessons l join public.course_modules m on m.id=l.module_id
    where m.course_id=chapter_course and l.published_revision_id is not null
  ), submitted as materialized (
    select a.id, a.learner_id, a.phase, a.submitted_at, a.score_percent,
      a.form_id, a.release_id, 'snapshot'::text as source, a.form_snapshot
    from learner_assessment_private.attempts a join page_people p on p.learner_id=a.learner_id
    where a.course_id=chapter_course and a.state='submitted'
    union all
    select t.id, t.bhw_user_id, t.phase, t.taken_at, t.score_percent,
      null::text, null::text, 'legacy'::text, null::jsonb
    from public.course_test_attempts t join page_people p on p.learner_id=t.bhw_user_id
    where t.course_id=chapter_course and t.phase in ('pretest','posttest')
      and not exists (select 1 from learner_assessment_private.attempts a where a.legacy_attempt_id=t.id)
  ), first_results as (
    select distinct on (learner_id,phase) * from submitted
    order by learner_id,phase,submitted_at,id
  ), enriched as (
    select p.person || jsonb_build_object('training',jsonb_build_object(
      'lessons_total',(select count(*) from lessons where required),
      'lessons_done',(select count(distinct lp.lesson_id)
        from public.course_progress cp join public.course_lesson_progress lp on lp.course_progress_id=cp.id
        join lessons l on l.id=lp.lesson_id and l.required
        where cp.course_id=chapter_course and cp.bhw_user_id=p.learner_id),
      'tests',(select jsonb_object_agg(ph.phase,jsonb_build_object(
        'state',case when f.id is not null then 'submitted' when exists (
          select 1 from learner_assessment_private.attempts d where d.learner_id=p.learner_id
          and d.course_id=chapter_course and d.phase=ph.phase and d.state='draft') then 'incomplete' else 'not_started' end,
        'score',f.score_percent,'form_id',f.form_id,'release_id',f.release_id,'source',f.source,
        'submitted_at',f.submitted_at,
        'submitted_count',(select count(*) from submitted x where x.learner_id=p.learner_id and x.phase=ph.phase)))
        from (values ('pretest'),('posttest')) ph(phase)
        left join first_results f on f.learner_id=p.learner_id and f.phase=ph.phase),
      'practice_completed',(select count(*) from learner_assessment_private.practice_attempts pr
        where pr.learner_id=p.learner_id and pr.course_id=chapter_course and pr.state='completed'),
      'topics_available',coalesce(post.source='snapshot',false),
      'topics',coalesce((select jsonb_agg(to_jsonb(topic) order by topic.missed desc,topic.lesson_key) from (
        select l.lesson_key,l.title_fil,l.title_en,count(distinct item->>'item_id')::integer as total,
          count(distinct item->>'item_id') filter (where r.kind is distinct from 'choice' or r.option_id is distinct from item->>'correct_option_id')::integer as missed
        from jsonb_array_elements(post.form_snapshot) item
        cross join lateral (select distinct value as lesson_key from jsonb_array_elements_text(item->'lesson_keys')) mapped
        join lessons l on l.lesson_key=mapped.lesson_key
        left join learner_assessment_private.responses r on r.attempt_id=post.id and r.item_id=(item->>'item_id')::uuid
        group by l.lesson_key,l.title_fil,l.title_en
        order by missed desc,l.lesson_key limit 60
      ) topic),'[]'::jsonb)
    )) as person
    from page_people p left join first_results post on post.learner_id=p.learner_id and post.phase='posttest'
  ) select coalesce(jsonb_agg(person order by person->>'full_name',person->>'barangay',person->>'id'),'[]'::jsonb)
    into people from enriched;

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
