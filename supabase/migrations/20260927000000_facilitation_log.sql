-- ---------------------------------------------------------------------
-- Facilitation log: attendance, what was delivered, session completion.
--
-- INC-19 gave course_session_enrollments an attended/no_show status and
-- course_sessions a completed status, but nothing ever wrote either:
-- a session could be scheduled and cancelled, never run. This adds the
-- evidence that standardized facilitation actually happened:
--
-- - course_session_deliveries: which subchapter (course_modules row) a
--   session delivered, for how long, with the facilitator's notes. One
--   row per session and subchapter; logging again corrects it.
-- - rpc_course_session_set_attendance: attended / no_show / back to
--   enrolled for a BHW enrolled in the session.
-- - rpc_course_session_log_delivery: records a delivery.
-- - rpc_course_session_complete: closes the session, only once at least
--   one subchapter is logged and every enrolled BHW's attendance is
--   marked, so a completed session always carries its evidence.
--
-- All three follow the existing session RPCs: only the session's own
-- facilitator (an active assessor), plain-exception errors, an audit
-- event per write. Deliveries are readable by that facilitator and by
-- assessors/admins whose scope covers the session's org unit (the
-- subchapter guide lists where a subchapter has been run in the area).
-- Writes are RPC-only.
--
-- rpc_e2e_purge_test_users needs no change: recorded_by is always the
-- session's facilitator, and course_sessions.facilitator_user_id is
-- already outside what a throwaway user can reach (see that migration).
-- ---------------------------------------------------------------------

create table if not exists public.course_session_deliveries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.course_sessions (id) on delete cascade,
  module_id uuid not null references public.course_modules (id),
  duration_minutes integer not null check (duration_minutes between 1 and 600),
  notes text not null default '' check (char_length(notes) <= 2000),
  recorded_by uuid not null references public.users (id),
  recorded_at timestamptz not null default now(),
  unique (session_id, module_id)
);

create index if not exists course_session_deliveries_module_idx
  on public.course_session_deliveries (module_id, recorded_at desc);
create index if not exists course_session_deliveries_recorded_by_idx
  on public.course_session_deliveries (recorded_by);

alter table public.course_session_deliveries enable row level security;

-- Uses the INC-19 helpers, not a join to course_sessions, so this policy
-- never re-enters course_sessions' own RLS.
drop policy if exists course_session_deliveries_read on public.course_session_deliveries;
create policy course_session_deliveries_read on public.course_session_deliveries for select
  using (
    (select public.current_app_user()).status = 'active'
    and (
      public.course_session_facilitator_id(session_id) = (select public.current_app_user()).id
      or (
        (select public.current_app_user()).role in ('assessor', 'admin')
        and (select public.org_unit_path(public.course_session_org_unit_id(session_id))) like (select public.current_org_path()) || '%'
      )
    )
  );

revoke all on public.course_session_deliveries from public, anon, authenticated;
grant select on public.course_session_deliveries to authenticated;

-- Shared guard for the three RPCs: the actor must be the active assessor
-- who scheduled the session, and the session must still be open.
create or replace function public.course_session_facilitator_guard(p_session_id uuid)
returns public.course_sessions
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_session public.course_sessions;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role != 'assessor' or v_actor.status != 'active' then
    raise exception 'not authorized';
  end if;
  select * into v_session from public.course_sessions where id = p_session_id;
  if v_session.id is null then
    raise exception 'session not found';
  end if;
  if v_session.facilitator_user_id != v_actor.id then
    raise exception 'not authorized';
  end if;
  if v_session.status != 'scheduled' then
    raise exception 'session is no longer scheduled';
  end if;
  return v_session;
end;
$$;

revoke execute on function public.course_session_facilitator_guard(uuid) from public, anon, authenticated;

create or replace function public.rpc_course_session_set_attendance(p_session_id uuid, p_bhw_user_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.course_sessions := public.course_session_facilitator_guard(p_session_id);
  v_actor public.users := public.current_app_user();
begin
  if p_status is null or p_status not in ('enrolled', 'attended', 'no_show') then
    raise exception 'invalid attendance status';
  end if;

  update public.course_session_enrollments set status = p_status
    where session_id = v_session.id and bhw_user_id = p_bhw_user_id;
  if not found then
    raise exception 'not enrolled in this session';
  end if;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, metadata, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'course_session.attendance', 'course_session', v_session.id,
    jsonb_build_object('bhw_user_id', p_bhw_user_id, 'status', p_status),
    format('Itinala ni %s ang pagdalo ng isang BHW sa training session.', v_actor.username),
    format('%s recorded a BHW''s attendance at a training session.', v_actor.username));
end;
$$;

create or replace function public.rpc_course_session_log_delivery(
  p_session_id uuid,
  p_module_id uuid,
  p_duration_minutes integer,
  p_notes text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.course_sessions := public.course_session_facilitator_guard(p_session_id);
  v_actor public.users := public.current_app_user();
  v_notes text := btrim(coalesce(p_notes, ''));
  v_id uuid;
begin
  if not exists (
    select 1 from public.course_modules
    where id = p_module_id and course_id = v_session.course_id and type != 'quiz'
  ) then
    raise exception 'module not found';
  end if;
  if p_duration_minutes is null or p_duration_minutes < 1 or p_duration_minutes > 600 then
    raise exception 'invalid duration';
  end if;
  if char_length(v_notes) > 2000 then
    raise exception 'notes too long';
  end if;

  insert into public.course_session_deliveries (session_id, module_id, duration_minutes, notes, recorded_by)
  values (v_session.id, p_module_id, p_duration_minutes, v_notes, v_actor.id)
  on conflict (session_id, module_id) do update
    set duration_minutes = excluded.duration_minutes, notes = excluded.notes,
        recorded_by = excluded.recorded_by, recorded_at = now()
  returning id into v_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, metadata, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'course_session.delivery_logged', 'course_session', v_session.id,
    jsonb_build_object('module_id', p_module_id, 'duration_minutes', p_duration_minutes),
    format('Itinala ni %s ang isang subchapter na naituro sa training session.', v_actor.username),
    format('%s logged a subchapter delivered in a training session.', v_actor.username));

  return v_id;
end;
$$;

create or replace function public.rpc_course_session_complete(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.course_sessions := public.course_session_facilitator_guard(p_session_id);
  v_actor public.users := public.current_app_user();
begin
  if not exists (select 1 from public.course_session_deliveries where session_id = v_session.id) then
    raise exception 'log at least one subchapter';
  end if;
  if exists (select 1 from public.course_session_enrollments where session_id = v_session.id and status = 'enrolled') then
    raise exception 'attendance incomplete';
  end if;

  update public.course_sessions set status = 'completed' where id = v_session.id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'course_session.completed', 'course_session', v_session.id,
    format('Tinapos ni %s ang isang training session.', v_actor.username),
    format('%s completed a training session.', v_actor.username));
end;
$$;

revoke execute on function public.rpc_course_session_set_attendance(uuid, uuid, text) from public, anon;
revoke execute on function public.rpc_course_session_log_delivery(uuid, uuid, integer, text) from public, anon;
revoke execute on function public.rpc_course_session_complete(uuid) from public, anon;
grant execute on function public.rpc_course_session_set_attendance(uuid, uuid, text) to authenticated;
grant execute on function public.rpc_course_session_log_delivery(uuid, uuid, integer, text) to authenticated;
grant execute on function public.rpc_course_session_complete(uuid) to authenticated;
