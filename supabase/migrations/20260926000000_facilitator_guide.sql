-- ---------------------------------------------------------------------
-- Facilitator guide: barangay-wide progress for facilitators, and
-- recorded competency observations.
--
-- 1. Scope. A facilitator (`assessor`) already reads every user in their
--    org subtree (users_read_assessor_scope) and every assessment there
--    (assessments_assessor_scope_read), but course progress and test
--    attempts only for BHWs enrolled in a session they run (INC-23). The
--    facilitator guide shows every BHW in the facilitator's barangay (or
--    wider unit), so progress and attempts get the same subtree rule the
--    admin policies use. course_lesson_progress needs no change: its
--    training_progress_read policy defers to course_progress visibility.
--
-- 2. Observations. The subchapter competency checklist
--    (course_module_facilitator_notes.observation_indicators) becomes
--    something a facilitator can record against a BHW, not just read.
--    Rows are append-only history: a re-observation is a new row and the
--    latest row is the current rating, so a BHW's growth from Hindi pa to
--    Kaya na stays visible. Writes go only through
--    rpc_competency_observation_record, which checks the actor, the BHW's
--    scope, and that the indicator exists on a published course the actor
--    can see, then snapshots the indicator text (notes are editable, the
--    record of what was observed must not drift). BHWs cannot read these
--    rows; showing a BHW their own feedback is a separate decision.
--    Each record also writes an audit event with subject_type 'user'
--    (the BHW), which audit_event_visible_to_admin already scopes.
-- ---------------------------------------------------------------------

drop policy if exists course_progress_assessor_scope_read on public.course_progress;
create policy course_progress_assessor_scope_read on public.course_progress for select
  using (
    (select public.current_app_user()).role = 'assessor'
    and (select public.current_app_user()).status = 'active'
    and exists (
      select 1 from public.users u
      where u.id = course_progress.bhw_user_id
        and (select public.org_unit_path(u.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

drop policy if exists course_test_attempts_assessor_scope_read on public.course_test_attempts;
create policy course_test_attempts_assessor_scope_read on public.course_test_attempts for select
  using (
    (select public.current_app_user()).role = 'assessor'
    and (select public.current_app_user()).status = 'active'
    and exists (
      select 1 from public.users u
      where u.id = course_test_attempts.bhw_user_id
        and (select public.org_unit_path(u.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

create table if not exists public.competency_observations (
  id uuid primary key default gen_random_uuid(),
  bhw_user_id uuid not null references public.users (id),
  observer_user_id uuid not null references public.users (id),
  -- snapshot of the BHW's org unit when observed, for scoping (same
  -- reasoning as assessments.org_unit_id).
  org_unit_id uuid not null references public.org_units (id),
  module_id uuid not null references public.course_modules (id),
  objective_index integer not null check (objective_index >= 0),
  indicator_snapshot jsonb not null check (jsonb_typeof(indicator_snapshot) = 'object'),
  level text not null check (level in ('kaya_na', 'kailangan_practice', 'hindi_pa')),
  note text not null default '' check (char_length(note) <= 1000),
  observed_at timestamptz not null default now()
);

create index if not exists competency_observations_module_bhw_idx
  on public.competency_observations (module_id, bhw_user_id, observed_at desc);
create index if not exists competency_observations_bhw_idx
  on public.competency_observations (bhw_user_id);
create index if not exists competency_observations_observer_idx
  on public.competency_observations (observer_user_id);
create index if not exists competency_observations_org_unit_idx
  on public.competency_observations (org_unit_id);

alter table public.competency_observations enable row level security;

drop policy if exists competency_observations_scope_read on public.competency_observations;
create policy competency_observations_scope_read on public.competency_observations for select
  using (
    (select public.current_app_user()).role in ('assessor', 'admin')
    and (select public.current_app_user()).status = 'active'
    and (select public.org_unit_path(competency_observations.org_unit_id)) like (select public.current_org_path()) || '%'
  );

revoke all on public.competency_observations from public, anon, authenticated;
grant select on public.competency_observations to authenticated;

create or replace function public.rpc_competency_observation_record(
  p_bhw_user_id uuid,
  p_module_id uuid,
  p_objective_index integer,
  p_level text,
  p_note text default ''
)
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

  -- Same visibility rule as course_module_facilitator_notes_assessor_admin_read
  -- for a published course: the indicator must be one this actor can read.
  select i.value into v_indicator
    from public.course_module_facilitator_notes n
    join public.course_modules m on m.id = n.module_id
    join public.courses c on c.id = m.course_id
    cross join lateral jsonb_array_elements(n.observation_indicators) as i(value)
    where n.module_id = p_module_id
      and c.status = 'published'
      and public.current_org_path() like public.org_unit_path(c.org_unit_id) || '%'
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

revoke execute on function public.rpc_competency_observation_record(uuid, uuid, integer, text, text) from public, anon;
grant execute on function public.rpc_competency_observation_record(uuid, uuid, integer, text, text) to authenticated;

-- rpc_e2e_purge_test_users (20260920020000) deletes every table that
-- references a throwaway user before the user itself; redefined unchanged
-- except for the new competency_observations cleanup.
create or replace function public.rpc_e2e_purge_test_users(p_dry_run boolean default true)
returns table (users_purged bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_cutoff timestamptz := now() - interval '24 hours';
  v_target_ids uuid[];
begin
  select * into v_actor from public.current_app_user();
  if (v_actor is null or v_actor.role != 'admin') and auth.role() != 'service_role' then
    raise exception 'not authorized';
  end if;

  select array_agg(id) into v_target_ids
    from public.users
    where username like 'e2e.%' and created_at < v_cutoff;

  if not p_dry_run and v_target_ids is not null then
    -- facilitator_guide: observations of, or by, a throwaway user.
    delete from public.competency_observations
      where bhw_user_id = any(v_target_ids) or observer_user_id = any(v_target_ids);

    delete from public.course_test_attempts where bhw_user_id = any(v_target_ids);
    delete from public.course_session_enrollments where bhw_user_id = any(v_target_ids);

    -- certificates before assessments: certificates.assessment_id has no
    -- cascade, so a certificate for a real BHW graded by a throwaway
    -- assessor would otherwise block the assessment delete below.
    delete from public.certificates
      where bhw_user_id = any(v_target_ids)
         or assessment_id in (
           select id from public.assessments
           where bhw_user_id = any(v_target_ids) or assessor_user_id = any(v_target_ids)
         );
    delete from public.assessments
      where bhw_user_id = any(v_target_ids) or assessor_user_id = any(v_target_ids);

    -- cascades course_module_progress via course_progress_id.
    delete from public.course_progress where bhw_user_id = any(v_target_ids);

    delete from public.flip_charts where author_user_id = any(v_target_ids);

    -- a throwaway user is never an admin, so it can never be a
    -- hidden_by_user_id in practice; nulled defensively anyway so a
    -- future role change can't turn this into a silent FK failure.
    update public.forum_posts set hidden_by_user_id = null where hidden_by_user_id = any(v_target_ids);
    delete from public.forum_posts where author_user_id = any(v_target_ids);
    update public.forum_threads set hidden_by_user_id = null where hidden_by_user_id = any(v_target_ids);
    -- cascades the thread's own forum_posts via thread_id.
    delete from public.forum_threads where author_user_id = any(v_target_ids);

    delete from public.survey_responses where respondent_user_id = any(v_target_ids);
    -- cascades the survey's own survey_responses via survey_id.
    delete from public.surveys where author_user_id = any(v_target_ids);

    delete from public.announcements where author_user_id = any(v_target_ids);

    -- individually-addressed notifications only; org-broadcast rows have
    -- recipient_user_id null (the table's own XOR check enforces that),
    -- so this can never touch one.
    delete from public.notifications where recipient_user_id = any(v_target_ids);

    delete from public.audit_events
      where actor_user_id = any(v_target_ids)
         or (subject_type = 'user' and subject_id = any(v_target_ids));

    -- deletes the matching public.users row too, via its existing
    -- auth_user_id ... on delete cascade FK.
    delete from auth.users where id in (
      select auth_user_id from public.users where id = any(v_target_ids)
    );
  end if;

  return query select coalesce(array_length(v_target_ids, 1), 0)::bigint;
end;
$$;

revoke execute on function public.rpc_e2e_purge_test_users(boolean) from public, anon;
grant execute on function public.rpc_e2e_purge_test_users(boolean) to authenticated, service_role;
