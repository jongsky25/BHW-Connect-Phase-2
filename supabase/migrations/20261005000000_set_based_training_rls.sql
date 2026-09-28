-- Set-based RLS for the training manual, a notifications policy without
-- per-row lookups, and two write paths that no longer write when they have
-- nothing to do. Item 16 of docs/dev-efficiency-usage-audit.md.
--
-- 1. course_lessons / course_lesson_revisions read policies.
--    `training_module_admin(module_id) OR training_lesson_visible(id)` ran
--    per row: training_lesson_visible is a SECURITY DEFINER 5-table join plus
--    current_app_user() and 2x org_visible_to_actor() (each calling
--    current_app_user, current_org_path and org_unit_path again), and
--    SECURITY DEFINER SQL functions are never inlined. The lesson list was the
--    slowest statement on the pilot: 266 ms mean, ~6,600 buffer reads per
--    call, for a 97-row table.
--    Everything training_lesson_visible checks except the lesson's own
--    published_revision_id depends only on the lesson's module, so the
--    policies now test `module_id in (select <set of module ids>)`, which the
--    planner evaluates once per statement (a hashed subplan), not per row.
--    The sets reproduce the old helpers' conditions exactly (see each
--    function). The old helpers stay: the insert/update policies and the
--    training RPCs still call them once per write.
--
-- 2. notifications read policy. `current_org_path() like
--    org_unit_path(org_unit_id) || '%'` (the notification's org is the
--    actor's org or one of its ancestors) looked up org_unit_path per row.
--    org_units.path is the chain of ancestor ids, each a fixed-length uuid
--    followed by '.', so that condition is exactly "org_unit_id is one of the
--    ids in the actor's path" — computed once from one string.
--
-- 3. rpc_course_lesson_resume no longer locks. It went through
--    training_lesson_progress_context, which takes FOR UPDATE on the shared
--    course_modules row (so every learner's position saves in a module
--    serialized on one row lock, with WAL for each) and on course_progress.
--    Those locks order publishing against *completion*; a resume position is
--    a bookmark. If a publish lands between its check and its upsert, the
--    bookmark names the previous revision, and the lesson view already falls
--    back to the start when a bookmark's revision is not the published one.
--    rpc_course_lesson_complete keeps the locking context unchanged.
--
-- 4. rpc_onboarding_complete_step returns early when the step is already
--    recorded, instead of UPDATE-ing users (the hottest-read table, with its
--    updated_at trigger) on every KB category view and chat question.

-- 1. Set-based training visibility -------------------------------------------

-- Modules whose course is in the actor's training-admin scope. Same condition
-- as training_module_admin(m.id) -> training_admin_scope(c.org_unit_id):
-- an active admin whose org path is a prefix of the course org's path.
create or replace function public.training_admin_module_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.id
  from public.current_app_user() u
  cross join lateral (select public.current_org_path() as path) a
  join public.course_modules m on true
  join public.courses c on c.id = m.course_id
  join public.org_units co on co.id = c.org_unit_id
  where u.role = 'admin'
    and u.status = 'active'
    and co.path like a.path || '%';
$$;

-- Modules a learner may read published lessons in. Same conditions as
-- training_lesson_visible(l.id) minus the lesson's own published_revision_id
-- (checked in the policy): an active actor; published course and program; an
-- available chapter linking them; and org_visible_to_actor() for both the
-- course's and the program's org. That is: the org is the actor's org or an
-- ancestor of it, or the actor is an active assessor and the org is within
-- their catchment. Left joins keep org_unit_path(null) -> null -> false.
create or replace function public.training_visible_module_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.id
  from public.current_app_user() u
  cross join lateral (select public.current_org_path() as path) a
  join public.course_modules m on true
  join public.courses c on c.id = m.course_id
  join public.training_program_chapters ch on ch.course_id = c.id
  join public.training_programs pr on pr.id = ch.program_id
  left join public.org_units co on co.id = c.org_unit_id
  left join public.org_units po on po.id = pr.org_unit_id
  where u.status = 'active'
    and c.status = 'published'
    and pr.status = 'published'
    and ch.availability = 'available'
    and coalesce(a.path like co.path || '%' or (u.role = 'assessor' and co.path like a.path || '%'), false)
    and coalesce(a.path like po.path || '%' or (u.role = 'assessor' and po.path like a.path || '%'), false);
$$;

-- Lessons in the actor's admin scope (training_lesson_admin).
create or replace function public.training_admin_lesson_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select l.id
  from public.course_lessons l
  where l.module_id in (select public.training_admin_module_ids());
$$;

-- Published revisions a learner may read: the non-admin half of
-- training_revision_visible(r.id) — r is its lesson's published revision and
-- the lesson is visible.
create or replace function public.training_visible_revision_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select l.published_revision_id
  from public.course_lessons l
  where l.published_revision_id is not null
    and l.module_id in (select public.training_visible_module_ids());
$$;

drop policy if exists training_lesson_read on public.course_lessons;
create policy training_lesson_read on public.course_lessons for select to authenticated using (
  module_id in (select public.training_admin_module_ids())
  or (published_revision_id is not null and module_id in (select public.training_visible_module_ids()))
);

drop policy if exists training_revision_read on public.course_lesson_revisions;
create policy training_revision_read on public.course_lesson_revisions for select to authenticated using (
  lesson_id in (select public.training_admin_lesson_ids())
  or id in (select public.training_visible_revision_ids())
);

-- 2. Notifications ------------------------------------------------------------

-- The actor's org and its ancestors, parsed from the actor's org path
-- ("<uuid>.<uuid>.…<uuid>."). Empty without a profile or org.
create or replace function public.actor_org_ancestor_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(string_to_array(rtrim(public.current_org_path(), '.'), '.')::uuid[], '{}'::uuid[]);
$$;

drop policy if exists notifications_read_own on public.notifications;
-- Now `to authenticated` (it was every role): the helper is not executable by
-- anon, and anon never matched either branch anyway (no profile, no org path).
create policy notifications_read_own on public.notifications for select to authenticated using (
  recipient_user_id = (select public.current_app_user()).id
  or org_unit_id = any ((select public.actor_org_ancestor_ids())::uuid[])
);

-- 3. Lock-free resume -----------------------------------------------------------

-- training_lesson_progress_context without the row locks (see header, 3).
-- Same authorization and revision checks; executable only by the RPC owner.
create or replace function public.training_lesson_resume_context(p_lesson_id uuid, p_revision_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_actor public.users; v_lesson public.course_lessons; v_course uuid; v_progress uuid;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role <> 'bhw' or v_actor.status <> 'active' or not public.training_lesson_visible(p_lesson_id) then
    raise exception 'not authorized';
  end if;
  select * into v_lesson from public.course_lessons where id = p_lesson_id;
  if p_revision_id is null or p_revision_id is distinct from v_lesson.published_revision_id then
    raise exception 'lesson revision changed; reload the lesson';
  end if;
  select course_id into v_course from public.course_modules where id = v_lesson.module_id;
  select id into v_progress from public.course_progress where course_id = v_course and bhw_user_id = v_actor.id;
  if v_progress is null then
    insert into public.course_progress(course_id, bhw_user_id) values (v_course, v_actor.id)
      on conflict (course_id, bhw_user_id) do nothing;
    select id into v_progress from public.course_progress where course_id = v_course and bhw_user_id = v_actor.id;
  end if;
  return v_progress;
end;
$$;

create or replace function public.rpc_course_lesson_resume(p_lesson_id uuid,p_revision_id uuid,p_modality text,p_language text,p_position_key text,p_concept_id text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_progress uuid; v_content jsonb;
begin
  if p_modality is null or p_modality not in ('read','slides') or p_language is null or p_language not in ('fil','en') then raise exception 'invalid lesson mode or language'; end if;
  v_progress:=public.training_lesson_resume_context(p_lesson_id,p_revision_id);
  select case when p_modality='read' then read_sections else slides end into v_content from public.course_lesson_revisions where id=p_revision_id;
  if not exists(select 1 from jsonb_array_elements(v_content) item where item->>'id'=p_position_key and (item->'concept_ids') ? p_concept_id) then
    raise exception 'position and concept must belong to the current lesson revision'; end if;
  insert into public.course_lesson_resume(course_progress_id,lesson_id,modality,language,revision_id,position_key,concept_id)
    values(v_progress,p_lesson_id,p_modality,p_language,p_revision_id,p_position_key,p_concept_id)
    on conflict(course_progress_id,lesson_id,modality) do update set language=excluded.language,revision_id=excluded.revision_id,
      position_key=excluded.position_key,concept_id=excluded.concept_id,updated_at=now();
end;
$$;

-- 4. Onboarding step: no write when already recorded ------------------------------

create or replace function public.rpc_onboarding_complete_step(p_step text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_progress jsonb;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null then
    raise exception 'not authorized';
  end if;

  if p_step not in ('language', 'chat', 'kb') then
    raise exception 'invalid onboarding step';
  end if;

  -- Already recorded (and, once all three are, onboarding_completed_at was
  -- set by the call that recorded the last one): nothing to write.
  if coalesce(v_actor.onboarding_progress @> jsonb_build_object(p_step, true), false) then
    return;
  end if;

  update public.users
    set onboarding_progress = onboarding_progress || jsonb_build_object(p_step, true)
    where id = v_actor.id
    returning onboarding_progress into v_progress;

  if v_progress @> '{"language": true, "chat": true, "kb": true}'::jsonb then
    update public.users
      set onboarding_completed_at = coalesce(onboarding_completed_at, now())
      where id = v_actor.id and onboarding_completed_at is null;

    if found then
      insert into public.analytics_events (user_id, event_name, properties)
      values (v_actor.id, 'onboarding.completed', '{}'::jsonb);
    end if;
  end if;
end;
$$;

-- Grants ------------------------------------------------------------------------

-- The set helpers run inside RLS policies evaluated for authenticated
-- callers, like the per-row helpers they replace.
revoke execute on function public.training_admin_module_ids(), public.training_visible_module_ids(),
  public.training_admin_lesson_ids(), public.training_visible_revision_ids(), public.actor_org_ancestor_ids()
  from public, anon;
grant execute on function public.training_admin_module_ids(), public.training_visible_module_ids(),
  public.training_admin_lesson_ids(), public.training_visible_revision_ids(), public.actor_org_ancestor_ids()
  to authenticated;

-- Internal, like training_lesson_progress_context.
revoke execute on function public.training_lesson_resume_context(uuid, uuid) from public, anon, authenticated;
