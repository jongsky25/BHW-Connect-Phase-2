-- ---------------------------------------------------------------------
-- Assessor catchments and BHW barangays on the PSGC hierarchy.
--
-- 20261002000000_psgc_org_units.sql loaded the full PSGC tree into
-- org_units. This migration fixes where each role may sit in that tree and
-- what that placement lets them see.
--
-- 1. Placement rules (users_enforce_role_org_level trigger).
--    * assessor — a catchment, chosen at account creation: a region, a
--      province or a city/municipality. Never a barangay (too narrow to
--      assess from) and never national.
--    * bhw — belongs to one barangay. A BHW account may be provisioned at
--      its city/municipality, in which case the BHW picks their own barangay
--      on first sign-in (rpc_bhw_select_barangay) before using the app.
--      Later, legitimate BHW records from BHW Connect (same PSGC barangay
--      codes) will replace this self-selection.
--    * admin / designer — any level, unchanged.
--    Enforced on insert and on any change of role or org_unit_id, so every
--    path in (admin create/transfer, super-admin personas, this RPC) gets the
--    same rule. Rows that predate the rule are only checked when changed.
--
-- 2. Catchment visibility. Content (courses, programs and everything hung
--    off them) cascades DOWN: a BHW sees what was published at or above
--    their barangay. An assessor additionally sees published training
--    content published anywhere INSIDE their catchment — a provincial
--    assessor must see a course a municipality published for its BHWs.
--    org_visible_to_actor() is that rule. Added as extra permissive read
--    policies so every existing read path keeps working as before.
--
-- 3. Assessment queue direction. The inc12 header promised "any assessor
--    at-or-above the BHW's own org unit", but assessments_assessor_scope_read
--    and rpc_assessment_claim compared the other way round (only an assessor
--    at the BHW's own barangay matched; flagged, not fixed, in inc19). With
--    assessors no longer allowed at barangay level that inversion would
--    empty every queue, so both now use the catchment direction, and
--    assessments_admin_read gets the same fix.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 1. Placement rules
-- ---------------------------------------------------------------------

create or replace function public.org_level_allowed_for_role(p_role text, p_level text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case p_role
    when 'assessor' then p_level in ('regional', 'provincial', 'city_municipal')
    when 'bhw' then p_level in ('city_municipal', 'barangay')
    else true
  end;
$$;

create or replace function public.users_enforce_role_org_level()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_level text;
begin
  if tg_op = 'UPDATE'
     and new.role is not distinct from old.role
     and new.org_unit_id is not distinct from old.org_unit_id then
    return new;
  end if;

  select level into v_level from public.org_units where id = new.org_unit_id;

  if not public.org_level_allowed_for_role(new.role, v_level) then
    if new.role = 'assessor' then
      raise exception 'assessor catchment must be a region, province or city/municipality';
    end if;
    raise exception 'bhw must belong to a barangay';
  end if;

  return new;
end;
$$;

-- Existing assessors placed at a barangay (the only level the old, inverted
-- queue rule worked for) move up to that barangay's city/municipality, so
-- they keep seeing the same BHWs and now also their assessments.
update public.users u
   set org_unit_id = o.parent_id
  from public.org_units o
 where u.org_unit_id = o.id
   and u.role = 'assessor'
   and o.level = 'barangay';

drop trigger if exists users_enforce_role_org_level on public.users;
create trigger users_enforce_role_org_level
  before insert or update of role, org_unit_id on public.users
  for each row execute function public.users_enforce_role_org_level();

-- ---------------------------------------------------------------------
-- 2. Catchment visibility
-- ---------------------------------------------------------------------

create or replace function public.org_visible_to_actor(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    public.current_org_path() like public.org_unit_path(p_org) || '%'
    or (
      u.role = 'assessor' and u.status = 'active'
      and public.org_unit_path(p_org) like public.current_org_path() || '%'
    ),
    false)
  from public.current_app_user() u;
$$;

revoke execute on function public.org_visible_to_actor(uuid) from public, anon;
grant execute on function public.org_visible_to_actor(uuid) to authenticated;

create or replace function public.assessor_catchment_includes(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    u.role = 'assessor' and u.status = 'active'
    and public.org_unit_path(p_org) like public.current_org_path() || '%',
    false)
  from public.current_app_user() u;
$$;

revoke execute on function public.assessor_catchment_includes(uuid) from public, anon;
grant execute on function public.assessor_catchment_includes(uuid) to authenticated;

drop policy if exists courses_assessor_catchment_read on public.courses;
create policy courses_assessor_catchment_read on public.courses for select to authenticated
  using (status = 'published' and public.assessor_catchment_includes(org_unit_id));

drop policy if exists course_modules_assessor_catchment_read on public.course_modules;
create policy course_modules_assessor_catchment_read on public.course_modules for select to authenticated
  using (exists (
    select 1 from public.courses c
    where c.id = course_modules.course_id
      and c.status = 'published' and public.assessor_catchment_includes(c.org_unit_id)
  ));

drop policy if exists course_quiz_questions_assessor_catchment_read on public.course_quiz_questions;
create policy course_quiz_questions_assessor_catchment_read on public.course_quiz_questions for select to authenticated
  using (exists (
    select 1 from public.course_modules m join public.courses c on c.id = m.course_id
    where m.id = course_quiz_questions.module_id
      and c.status = 'published' and public.assessor_catchment_includes(c.org_unit_id)
  ));

drop policy if exists course_test_questions_assessor_catchment_read on public.course_test_questions;
create policy course_test_questions_assessor_catchment_read on public.course_test_questions for select to authenticated
  using (exists (
    select 1 from public.courses c
    where c.id = course_test_questions.course_id
      and c.status = 'published' and public.assessor_catchment_includes(c.org_unit_id)
  ));

drop policy if exists course_module_facilitator_notes_assessor_catchment_read on public.course_module_facilitator_notes;
create policy course_module_facilitator_notes_assessor_catchment_read on public.course_module_facilitator_notes for select to authenticated
  using (exists (
    select 1 from public.course_modules m join public.courses c on c.id = m.course_id
    where m.id = course_module_facilitator_notes.module_id
      and c.status = 'published' and public.assessor_catchment_includes(c.org_unit_id)
  ));

drop policy if exists course_module_visuals_assessor_catchment_read on public.course_module_visuals;
create policy course_module_visuals_assessor_catchment_read on public.course_module_visuals for select to authenticated
  using (exists (
    select 1 from public.course_modules m join public.courses c on c.id = m.course_id
    where m.id = course_module_visuals.module_id
      and c.status = 'published' and public.assessor_catchment_includes(c.org_unit_id)
  ));

drop policy if exists course_module_audio_assessor_catchment_read on public.course_module_audio;
create policy course_module_audio_assessor_catchment_read on public.course_module_audio for select to authenticated
  using (exists (
    select 1 from public.course_modules m join public.courses c on c.id = m.course_id
    where m.id = course_module_audio.module_id
      and c.status = 'published' and public.assessor_catchment_includes(c.org_unit_id)
  ));

-- training_program_chapters reads defer to training_programs visibility, so
-- this one policy opens the program's chapter list too.
drop policy if exists training_program_assessor_catchment_read on public.training_programs;
create policy training_program_assessor_catchment_read on public.training_programs for select to authenticated
  using (status = 'published' and public.assessor_catchment_includes(org_unit_id));

-- Short lessons (and, through training_revision_visible, their published
-- revisions and facilitator notes): same rule, via org_visible_to_actor.
create or replace function public.training_lesson_visible(p_lesson uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(select 1 from public.course_lessons l
    join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id
    join public.training_program_chapters ch on ch.course_id=c.id join public.training_programs pr on pr.id=ch.program_id
    cross join public.current_app_user() u
    where l.id=p_lesson and u.status='active' and l.published_revision_id is not null
      and c.status='published' and pr.status='published' and ch.availability='available'
      and public.org_visible_to_actor(c.org_unit_id)
      and public.org_visible_to_actor(pr.org_unit_id));
$$;

-- A facilitator may run a session for any published course they can see:
-- one that cascades down to them, or one published inside their catchment.
create or replace function public.rpc_course_session_create(p_course_id uuid, p_scheduled_at timestamp with time zone, p_location_note text, p_lesson_density text default 'normal'::text)
returns table(session_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_course public.courses;
  v_session_id uuid;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'assessor' then
    raise exception 'not authorized';
  end if;

  if coalesce(p_lesson_density, 'normal') not in ('short', 'normal', 'long') then
    raise exception 'invalid lesson density';
  end if;

  select * into v_course from public.courses where id = p_course_id and status = 'published';
  if v_course is null then
    raise exception 'course not found';
  end if;

  if not public.org_visible_to_actor(v_course.org_unit_id) then
    raise exception 'course not authorized for your org unit';
  end if;

  insert into public.course_sessions (course_id, org_unit_id, facilitator_user_id, scheduled_at, location_note, lesson_density)
  values (p_course_id, v_actor.org_unit_id, v_actor.id, p_scheduled_at, coalesce(p_location_note, ''), coalesce(p_lesson_density, 'normal'))
  returning course_sessions.id into v_session_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'course_session.created', 'course_session', v_session_id,
    format('Gumawa si %s ng bagong training session.', v_actor.username),
    format('%s created a new training session.', v_actor.username));

  return query select v_session_id;
end;
$$;

-- The observation indicator must be on a published course the actor can
-- read — now including courses inside an assessor's catchment.
create or replace function public.rpc_competency_observation_record(p_bhw_user_id uuid, p_module_id uuid, p_objective_index integer, p_level text, p_note text default ''::text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_bhw public.users;
  v_indicator jsonb;
  v_note text := btrim(coalesce(p_note, ''));
  v_id uuid;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role not in ('assessor', 'admin') or v_actor.status != 'active' then
    raise exception 'not authorized';
  end if;

  select * into v_bhw from public.users where id = p_bhw_user_id;
  if v_bhw.id is null or v_bhw.role != 'bhw' or v_bhw.status != 'active'
     or not coalesce(public.org_unit_path(v_bhw.org_unit_id) like public.current_org_path() || '%', false) then
    raise exception 'not authorized';
  end if;

  if p_level is null or p_level not in ('kaya_na', 'kailangan_practice', 'hindi_pa') then
    raise exception 'invalid level';
  end if;
  if char_length(v_note) > 1000 then
    raise exception 'note too long';
  end if;

  select i.value into v_indicator
    from public.course_module_facilitator_notes n
    join public.course_modules m on m.id = n.module_id
    join public.courses c on c.id = m.course_id
    cross join lateral jsonb_array_elements(n.observation_indicators) as i(value)
    where n.module_id = p_module_id
      and c.status = 'published'
      and public.org_visible_to_actor(c.org_unit_id)
      and jsonb_typeof(i.value -> 'objective_index') = 'number'
      and (i.value ->> 'objective_index')::integer = p_objective_index
    limit 1;
  if v_indicator is null then
    raise exception 'indicator not found';
  end if;

  insert into public.competency_observations (
    bhw_user_id, observer_user_id, org_unit_id, module_id, objective_index,
    indicator_snapshot, level, note
  ) values (
    v_bhw.id, v_actor.id, v_bhw.org_unit_id, p_module_id, p_objective_index,
    v_indicator, p_level, v_note
  ) returning id into v_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, metadata, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'competency.observed', 'user', v_bhw.id,
    jsonb_build_object('observation_id', v_id, 'module_id', p_module_id,
      'objective_index', p_objective_index, 'level', p_level),
    format('Nagtala si %s ng obserbasyon sa kakayahan ng isang BHW.', v_actor.username),
    format('%s recorded a competency observation for a BHW.', v_actor.username));

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Assessment queue: catchment direction
-- ---------------------------------------------------------------------

drop policy if exists assessments_assessor_scope_read on public.assessments;
create policy assessments_assessor_scope_read on public.assessments for select
  using (
    (select public.current_app_user()).role = 'assessor'
    and (
      assessor_user_id = (select public.current_app_user()).id
      or (select public.org_unit_path(assessments.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

drop policy if exists assessments_admin_read on public.assessments;
create policy assessments_admin_read on public.assessments for select
  using (
    (select public.current_app_user()).role = 'admin'
    and (select public.org_unit_path(assessments.org_unit_id)) like (select public.current_org_path()) || '%'
  );

create or replace function public.rpc_assessment_claim(p_assessment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_assessment public.assessments;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'assessor' or v_actor.status != 'active' then
    raise exception 'not authorized';
  end if;

  select * into v_assessment from public.assessments where id = p_assessment_id;
  if v_assessment is null then
    raise exception 'assessment not found';
  end if;

  if v_assessment.status != 'pending' then
    raise exception 'assessment already claimed';
  end if;

  -- The BHW's barangay must lie inside the assessor's catchment.
  if not exists (
    select 1 from public.org_units o
    where o.id = v_assessment.org_unit_id
      and o.path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'not authorized';
  end if;

  update public.assessments
    set status = 'assigned', assessor_user_id = v_actor.id
    where id = p_assessment_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'assessment.claimed', 'assessment', p_assessment_id,
    format('Kinuha ni %s ang isang pagtatasa mula sa pila.', v_actor.username),
    format('%s picked up an assessment from the queue.', v_actor.username));
end;
$$;

-- ---------------------------------------------------------------------
-- 4. BHW barangay self-selection
-- ---------------------------------------------------------------------

-- A BHW not yet placed in a barangay picks one inside the unit they were
-- provisioned at. One-time: once in a barangay, only an admin transfer
-- moves them.
create or replace function public.rpc_bhw_select_barangay(p_org_unit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_current_level text;
  v_target public.org_units;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role != 'bhw' or v_actor.status != 'active' then
    raise exception 'not authorized';
  end if;

  select level into v_current_level from public.org_units where id = v_actor.org_unit_id;
  if v_current_level = 'barangay' then
    raise exception 'barangay already set';
  end if;

  select * into v_target from public.org_units where id = p_org_unit_id;
  if v_target.id is null or v_target.level != 'barangay' then
    raise exception 'not a barangay';
  end if;

  if v_target.path not like (select public.current_org_path()) || '%' then
    raise exception 'out of scope';
  end if;

  update public.users set org_unit_id = v_target.id where id = v_actor.id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, metadata, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'user.barangay_selected', 'user', v_actor.id,
    jsonb_build_object('org_unit_id', v_target.id, 'psgc_code', v_target.psgc_code),
    format('Pinili ni %s ang kanyang barangay: %s.', v_actor.username, v_target.name),
    format('%s selected their barangay: %s.', v_actor.username, v_target.name));
end;
$$;

revoke execute on function public.rpc_bhw_select_barangay(uuid) from public, anon;
grant execute on function public.rpc_bhw_select_barangay(uuid) to authenticated;
