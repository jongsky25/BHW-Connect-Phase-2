-- Super admin + linked test personas (development aid).
--
-- The problem: checking how the roles relate to one another — a BHW
-- finishes a course, a facilitator/assessor grades it, an admin sees it on
-- the dashboard, a designer's flip chart goes to admin review — needs one
-- account per role, and every round of testing needs that BHW's progress
-- wiped (which, like INC-29, otherwise means dashboard SQL).
--
-- The shape: a super admin (rcventura) owns a set of *real* linked persona
-- accounts, one per role they want to exercise (`rcventura.bhw`,
-- `rcventura.assessor`, ...). Personas are ordinary public.users rows, so
-- every existing RLS policy and RPC treats them exactly as it would a real
-- BHW/assessor/designer — nothing in the rest of the schema learns about
-- personas, and nothing a persona does is faked. The super admin switches
-- the browser session between them (src/app/actions/super-admin.ts) and
-- can reset a persona's progress back to a fresh account.
--
-- Deliberately NOT a column on public.users: getAppUser() selects an
-- explicit column list on every request, and a column that is missing
-- because this migration hasn't run yet would sign everyone out (see the
-- comment in src/lib/supabase/app-user.ts). Separate tables, readable only
-- through the definer RPCs below, keep this feature fully out of that path.
--
-- Guardrails:
-- - Only a super_admins row can create, sign in as, or reset a persona, and
--   only its own personas. There is no RPC that grants super admin; it is
--   granted here, in a migration, and nowhere else.
-- - Signing in as a persona rotates that persona's password to a fresh
--   random secret and hands it back to the caller once. Persona passwords
--   are never known to anyone, so a persona cannot be logged into except
--   through its owner's switch.
-- - Reset touches only persona-owned rows (a persona's own learning
--   progress, survey responses, notifications, onboarding). Content a
--   persona authored — forum threads, flip charts, courses, sessions it
--   facilitated — is left alone, as is any grading a persona did on a real
--   BHW.

create table if not exists public.super_admins (
  user_id uuid primary key references public.users (id) on delete cascade,
  granted_at timestamptz not null default now()
);

alter table public.super_admins enable row level security;

create table if not exists public.super_admin_personas (
  persona_user_id uuid primary key references public.users (id) on delete cascade,
  super_admin_user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists super_admin_personas_super_admin_user_id_idx
  on public.super_admin_personas using btree (super_admin_user_id);

alter table public.super_admin_personas enable row level security;

-- No policies on either table: every read and write goes through the
-- definer RPCs below.

-- A no-op on any project without an `rcventura` account.
insert into public.super_admins (user_id)
  select id from public.users where username = 'rcventura'
on conflict (user_id) do nothing;

create or replace function public.current_super_admin()
returns public.users
language sql
stable security definer
set search_path = public
as $$
  select u.* from public.users u
  join public.super_admins s on s.user_id = u.id
  where u.auth_user_id = auth.uid() and u.status = 'active';
$$;

revoke execute on function public.current_super_admin() from public, anon;

-- ---------------------------------------------------------------------
-- Context: is the caller a super admin, a persona, or neither?
-- ---------------------------------------------------------------------

create or replace function public.rpc_super_admin_context()
returns table (
  is_super_admin boolean,
  is_persona boolean,
  super_admin_user_id uuid,
  super_admin_auth_user_id uuid,
  super_admin_username text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_owner public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null then
    return;
  end if;

  if exists (select 1 from public.super_admins where user_id = v_actor.id) then
    return query select true, false, v_actor.id, v_actor.auth_user_id, v_actor.username;
    return;
  end if;

  select u.* into v_owner
    from public.super_admin_personas p
    join public.users u on u.id = p.super_admin_user_id
    where p.persona_user_id = v_actor.id;

  if v_owner.id is not null then
    return query select false, true, v_owner.id, v_owner.auth_user_id, v_owner.username;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- List the caller's personas, with a summary of what reset would clear.
-- ---------------------------------------------------------------------

create or replace function public.rpc_super_admin_personas()
returns table (
  persona_user_id uuid,
  username text,
  full_name text,
  role text,
  status text,
  org_unit_id uuid,
  org_unit_name text,
  org_unit_level text,
  course_progress_count bigint,
  test_attempt_count bigint,
  assessment_count bigint,
  certificate_count bigint,
  survey_response_count bigint,
  onboarding_completed_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor public.users;
begin
  select * into v_actor from public.current_super_admin();
  if v_actor.id is null then
    raise exception 'not authorized';
  end if;

  return query
    select
      u.id, u.username, u.full_name, u.role, u.status, u.org_unit_id, o.name, o.level,
      (select count(*) from public.course_progress cp where cp.bhw_user_id = u.id),
      (select count(*) from public.course_test_attempts ta where ta.bhw_user_id = u.id),
      (select count(*) from public.assessments a where a.bhw_user_id = u.id),
      (select count(*) from public.certificates c where c.bhw_user_id = u.id),
      (select count(*) from public.survey_responses sr where sr.respondent_user_id = u.id),
      u.onboarding_completed_at,
      p.created_at
    from public.super_admin_personas p
    join public.users u on u.id = p.persona_user_id
    join public.org_units o on o.id = u.org_unit_id
    where p.super_admin_user_id = v_actor.id
    order by p.created_at;
end;
$$;

-- ---------------------------------------------------------------------
-- Create a persona: a real, ready-to-use account (active, consented, no
-- forced password change) linked to the caller.
-- ---------------------------------------------------------------------

create or replace function public.rpc_super_admin_persona_create(
  p_role text,
  p_org_unit_id uuid,
  p_full_name text default null
)
returns table (persona_user_id uuid, username text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor public.users;
  v_base text;
  v_username text;
  v_suffix integer := 1;
  v_auth_user_id uuid := gen_random_uuid();
  v_user_id uuid;
  v_full_name text;
begin
  select * into v_actor from public.current_super_admin();
  if v_actor.id is null then
    raise exception 'not authorized';
  end if;

  if p_role not in ('bhw', 'admin', 'assessor', 'designer') then
    raise exception 'invalid role';
  end if;

  if not exists (
    select 1 from public.org_units
    where id = p_org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'org unit out of scope';
  end if;

  -- rcventura.bhw, then rcventura.bhw2, rcventura.bhw3, ...
  v_base := v_actor.username || '.' || p_role;
  v_username := v_base;
  while exists (select 1 from public.users where users.username = v_username) loop
    v_suffix := v_suffix + 1;
    v_username := v_base || v_suffix::text;
  end loop;

  v_full_name := coalesce(nullif(trim(p_full_name), ''),
    format('%s (test %s)', v_actor.full_name, p_role));

  -- Same auth.users shape as rpc_admin_create_user, including the '' token
  -- columns (20260720073323_inc1_fix_admin_create_user_null_tokens.sql).
  -- The password is random and never returned: the persona can only be
  -- entered through rpc_super_admin_persona_sign_in.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    phone_change_token, email_change, phone_change, reauthentication_token,
    created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', v_auth_user_id, 'authenticated', 'authenticated',
    v_username || '@bhw.local', crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false,
    '', '', '', '', '', '', '', '',
    now(), now()
  );

  insert into public.users (
    auth_user_id, username, full_name, role, org_unit_id, status,
    must_change_password, consented_at, language
  ) values (
    v_auth_user_id, v_username, v_full_name, p_role, p_org_unit_id, 'active',
    false, now(), v_actor.language
  ) returning id into v_user_id;

  insert into public.super_admin_personas (persona_user_id, super_admin_user_id)
  values (v_user_id, v_actor.id);

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, metadata, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'super_admin.persona_created', 'user', v_user_id,
    jsonb_build_object('role', p_role),
    format('Gumawa si %s ng test account na %s (%s).', v_actor.username, v_username, p_role),
    format('%s created test account %s (%s).', v_actor.username, v_username, p_role));

  return query select v_user_id, v_username;
end;
$$;

-- ---------------------------------------------------------------------
-- Sign in as a persona: rotate its password to a one-time random secret
-- and return it, so the server action can sign the browser in as it.
-- ---------------------------------------------------------------------

create or replace function public.rpc_super_admin_persona_sign_in(p_persona_user_id uuid)
returns table (auth_email text, secret text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor public.users;
  v_target public.users;
  v_secret text := encode(gen_random_bytes(24), 'hex');
begin
  select * into v_actor from public.current_super_admin();
  if v_actor.id is null then
    raise exception 'not authorized';
  end if;

  select u.* into v_target
    from public.super_admin_personas p
    join public.users u on u.id = p.persona_user_id
    where p.persona_user_id = p_persona_user_id and p.super_admin_user_id = v_actor.id;
  if v_target.id is null then
    raise exception 'persona not found';
  end if;

  if v_target.status != 'active' then
    raise exception 'persona is not active';
  end if;

  update auth.users set encrypted_password = crypt(v_secret, gen_salt('bf')), updated_at = now()
    where id = v_target.auth_user_id;

  -- A persona should never be locked out of its own owner's switch.
  update public.users set failed_login_attempts = 0, locked_until = null
    where id = v_target.id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'super_admin.persona_switched', 'user', v_target.id,
    format('Lumipat si %s sa test account na %s.', v_actor.username, v_target.username),
    format('%s switched to test account %s.', v_actor.username, v_target.username));

  return query select v_target.username || '@bhw.local', v_secret;
end;
$$;

-- ---------------------------------------------------------------------
-- Reset a persona back to a fresh account.
-- ---------------------------------------------------------------------

create or replace function public.rpc_super_admin_persona_reset(p_persona_user_id uuid)
returns table (
  course_progress_cleared integer,
  test_attempts_cleared integer,
  assessments_cleared integer,
  certificates_cleared integer,
  enrollments_cleared integer,
  survey_responses_cleared integer,
  notifications_cleared integer,
  assessments_released integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_target public.users;
  v_progress_ids uuid[];
  v_assessment_ids uuid[];
  v_course_progress integer := 0;
  v_test_attempts integer := 0;
  v_assessments integer := 0;
  v_certificates integer := 0;
  v_enrollments integer := 0;
  v_survey_responses integer := 0;
  v_notifications integer := 0;
  v_released integer := 0;
begin
  select * into v_actor from public.current_super_admin();
  if v_actor.id is null then
    raise exception 'not authorized';
  end if;

  select u.* into v_target
    from public.super_admin_personas p
    join public.users u on u.id = p.persona_user_id
    where p.persona_user_id = p_persona_user_id and p.super_admin_user_id = v_actor.id;
  if v_target.id is null then
    raise exception 'persona not found';
  end if;

  -- As a learner: everything from first course open to certificate.
  select coalesce(array_agg(id), '{}') into v_progress_ids
    from public.course_progress where bhw_user_id = v_target.id;
  select coalesce(array_agg(id), '{}') into v_assessment_ids
    from public.assessments where bhw_user_id = v_target.id;

  -- course_lesson_* reference course_progress without a cascade.
  delete from public.course_lesson_resume where course_progress_id = any(v_progress_ids);
  delete from public.course_lesson_progress where course_progress_id = any(v_progress_ids);

  delete from public.course_test_attempts where bhw_user_id = v_target.id;
  get diagnostics v_test_attempts = row_count;

  delete from public.course_session_enrollments where bhw_user_id = v_target.id;
  get diagnostics v_enrollments = row_count;

  -- certificates before assessments: certificates.assessment_id has no cascade.
  delete from public.certificates
    where bhw_user_id = v_target.id or assessment_id = any(v_assessment_ids);
  get diagnostics v_certificates = row_count;

  delete from public.assessments where id = any(v_assessment_ids);
  get diagnostics v_assessments = row_count;

  -- cascades course_module_progress.
  delete from public.course_progress where id = any(v_progress_ids);
  get diagnostics v_course_progress = row_count;

  -- As an assessor: hand back claims it hasn't decided, so the queue shows
  -- them as open again. Decided grading is the BHW's record, not the
  -- assessor's progress — resetting the BHW persona clears that side.
  update public.assessments set status = 'pending', assessor_user_id = null
    where assessor_user_id = v_target.id and status = 'assigned';
  get diagnostics v_released = row_count;

  -- Non-anonymous responses only; an anonymous response is never linked to
  -- its respondent in the first place (INC-11).
  delete from public.survey_responses where respondent_user_id = v_target.id;
  get diagnostics v_survey_responses = row_count;

  delete from public.notifications where recipient_user_id = v_target.id;
  get diagnostics v_notifications = row_count;

  delete from public.chat_rate_limits where user_id = v_target.id;

  update public.users set
    onboarding_progress = '{}'::jsonb,
    onboarding_completed_at = null,
    notifications_last_read_at = null,
    failed_login_attempts = 0,
    locked_until = null
  where id = v_target.id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, metadata, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'super_admin.persona_reset', 'user', v_target.id,
    jsonb_build_object(
      'course_progress_cleared', v_course_progress,
      'test_attempts_cleared', v_test_attempts,
      'assessments_cleared', v_assessments,
      'certificates_cleared', v_certificates,
      'enrollments_cleared', v_enrollments,
      'survey_responses_cleared', v_survey_responses,
      'notifications_cleared', v_notifications,
      'assessments_released', v_released
    ),
    format('Nireset ni %s ang progress ng test account na %s.', v_actor.username, v_target.username),
    format('%s reset test account %s''s progress.', v_actor.username, v_target.username));

  return query select v_course_progress, v_test_attempts, v_assessments, v_certificates,
    v_enrollments, v_survey_responses, v_notifications, v_released;
end;
$$;

revoke execute on function public.rpc_super_admin_context() from public, anon;
revoke execute on function public.rpc_super_admin_personas() from public, anon;
revoke execute on function public.rpc_super_admin_persona_create(text, uuid, text) from public, anon;
revoke execute on function public.rpc_super_admin_persona_sign_in(uuid) from public, anon;
revoke execute on function public.rpc_super_admin_persona_reset(uuid) from public, anon;

grant execute on function public.rpc_super_admin_context() to authenticated;
grant execute on function public.rpc_super_admin_personas() to authenticated;
grant execute on function public.rpc_super_admin_persona_create(text, uuid, text) to authenticated;
grant execute on function public.rpc_super_admin_persona_sign_in(uuid) to authenticated;
grant execute on function public.rpc_super_admin_persona_reset(uuid) to authenticated;
