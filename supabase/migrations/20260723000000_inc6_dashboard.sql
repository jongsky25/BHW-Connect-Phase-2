-- ---------------------------------------------------------------------
-- INC-6: Dashboard (Activity + Chat Guide tabs).
--
-- 1. Tightens chat_sessions_admin_read / chat_messages_admin_read, which
--    previously granted any admin unscoped read access to all sessions
--    and messages system-wide. Per delivery-plan.md §5.1 ("RLS is the
--    enforcement layer; UI checks are convenience only"), this closes a
--    gap that becomes directly relevant to this increment's DoD ("a
--    barangay admin sees only their scope").
-- 2. Adds four read-only, org-scoped aggregation RPCs the dashboard
--    calls (activity summary, per-BHW table, top-asked topics,
--    deflection trend) plus rpc_gap_dismiss, the triage queue's
--    "not actionable" counterpart to "Create KB entry from this".
--    unmatched_questions/kb_entries are global (no org_unit_id), so only
--    the Activity tab and the Chat Guide tab's aggregate stats — both
--    attributable via chat_sessions.user_id -> users.org_unit_id — are
--    scoped by org path; the gap queue and stale-content count are
--    shown identically to every admin.
-- 3. Wires the "Create KB entry from this" pre-fill flow: creating an
--    entry from an unmatched question links it via resolved_entry_id;
--    the gap is marked resolved (and a gap.resolved audit event fires)
--    only once that entry is actually published, whether that happens
--    immediately (rpc_kb_entry_create) or later from the edit page
--    (rpc_kb_entry_update) — the linkage survives via resolved_entry_id.
-- 4. Seeds an idempotent city_municipal-level admin fixture
--    (admin.city.stable, parent of both pilot barangays) so the
--    roll-up half of the DoD is testable in CI the same way the INC-1
--    fixtures are: provisioned once, password captured out-of-band into
--    a CI secret, never regenerated on replay.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 1. Org-scope the admin read policies on chat data.
-- ---------------------------------------------------------------------

drop policy if exists chat_sessions_admin_read on public.chat_sessions;
create policy chat_sessions_admin_read on public.chat_sessions for select
  using (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.users u
      join public.org_units o on o.id = u.org_unit_id
      where u.id = chat_sessions.user_id
        and o.path like (select public.current_org_path()) || '%'
    )
  );

drop policy if exists chat_messages_admin_read on public.chat_messages;
create policy chat_messages_admin_read on public.chat_messages for select
  using (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.chat_sessions s
      join public.users u on u.id = s.user_id
      join public.org_units o on o.id = u.org_unit_id
      where s.id = chat_messages.session_id
        and o.path like (select public.current_org_path()) || '%'
    )
  );

-- ---------------------------------------------------------------------
-- 2. Dashboard aggregation RPCs.
-- ---------------------------------------------------------------------

create or replace function public.rpc_dashboard_activity_summary(
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  total_bhws integer,
  active_bhws integer,
  pct_active_bhws numeric,
  avg_sessions_per_bhw numeric,
  total_questions_asked integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_scope_path text;
  v_total_bhws integer;
  v_active_bhws integer;
  v_total_sessions integer;
  v_total_questions integer;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  v_scope_path := public.current_org_path();

  select count(*) into v_total_bhws
    from public.users u
    join public.org_units o on o.id = u.org_unit_id
    where u.role = 'bhw' and o.path like v_scope_path || '%';

  select count(distinct s.user_id) into v_active_bhws
    from public.chat_sessions s
    join public.users u on u.id = s.user_id
    join public.org_units o on o.id = u.org_unit_id
    where u.role = 'bhw' and o.path like v_scope_path || '%'
      and s.created_at >= p_start and s.created_at < p_end;

  select count(*) into v_total_sessions
    from public.chat_sessions s
    join public.users u on u.id = s.user_id
    join public.org_units o on o.id = u.org_unit_id
    where u.role = 'bhw' and o.path like v_scope_path || '%'
      and s.created_at >= p_start and s.created_at < p_end;

  select count(*) into v_total_questions
    from public.chat_messages m
    join public.chat_sessions s on s.id = m.session_id
    join public.users u on u.id = s.user_id
    join public.org_units o on o.id = u.org_unit_id
    where m.sender = 'user' and u.role = 'bhw' and o.path like v_scope_path || '%'
      and m.created_at >= p_start and m.created_at < p_end;

  return query select
    v_total_bhws,
    v_active_bhws,
    case when v_total_bhws = 0 then 0::numeric else round((v_active_bhws::numeric / v_total_bhws) * 100, 1) end,
    case when v_total_bhws = 0 then 0::numeric else round(v_total_sessions::numeric / v_total_bhws, 2) end,
    v_total_questions;
end;
$$;

create or replace function public.rpc_dashboard_bhw_table(
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  user_id uuid,
  full_name text,
  username text,
  status text,
  last_login_at timestamptz,
  questions_asked integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_scope_path text;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  v_scope_path := public.current_org_path();

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
      ), 0) as questions_asked
    from public.users u
    join public.org_units o on o.id = u.org_unit_id
    where u.role = 'bhw' and o.path like v_scope_path || '%'
    order by u.full_name;
end;
$$;

create or replace function public.rpc_dashboard_top_topics(
  p_start timestamptz,
  p_end timestamptz,
  p_limit integer default 10
)
returns table (
  entry_id uuid,
  question_en text,
  question_fil text,
  match_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_scope_path text;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  v_scope_path := public.current_org_path();

  return query
    select
      e.id,
      e.question_en,
      e.question_fil,
      count(*)::integer as match_count
    from public.chat_messages m
    join public.chat_sessions s on s.id = m.session_id
    join public.users u on u.id = s.user_id
    join public.org_units o on o.id = u.org_unit_id
    join public.kb_entries e on e.id = m.matched_entry_id
    where m.sender = 'system' and m.matched_entry_id is not null
      and o.path like v_scope_path || '%'
      and m.created_at >= p_start and m.created_at < p_end
    group by e.id, e.question_en, e.question_fil
    order by count(*) desc
    limit p_limit;
end;
$$;

create or replace function public.rpc_dashboard_deflection_trend(
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  bucket_date date,
  asked_count integer,
  answered_count integer,
  deflection_rate numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_scope_path text;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  v_scope_path := public.current_org_path();

  return query
    select
      date_trunc('day', m.created_at)::date as bucket_date,
      count(*)::integer as asked_count,
      count(*) filter (where m.matched_entry_id is not null)::integer as answered_count,
      case when count(*) = 0 then 0::numeric
        else round((count(*) filter (where m.matched_entry_id is not null))::numeric / count(*), 2)
      end as deflection_rate
    from public.chat_messages m
    join public.chat_sessions s on s.id = m.session_id
    join public.users u on u.id = s.user_id
    join public.org_units o on o.id = u.org_unit_id
    where m.sender = 'system'
      and o.path like v_scope_path || '%'
      and m.created_at >= p_start and m.created_at < p_end
    group by date_trunc('day', m.created_at)
    order by bucket_date;
end;
$$;

create or replace function public.rpc_gap_dismiss(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_row public.unmatched_questions;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_row from public.unmatched_questions where id = p_id for update;
  if v_row is null then
    raise exception 'gap not found';
  end if;

  update public.unmatched_questions set status = 'dismissed' where id = p_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'gap.dismissed', 'unmatched_question', p_id,
    format('Isinara ni %s ang tanong na "%s" nang hindi ginagawan ng entry.', v_actor.username, v_row.text),
    format('%s dismissed the question "%s" without creating an entry.', v_actor.username, v_row.text));
end;
$$;

grant execute on function public.rpc_dashboard_activity_summary(timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.rpc_dashboard_bhw_table(timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.rpc_dashboard_top_topics(timestamptz, timestamptz, integer) to anon, authenticated;
grant execute on function public.rpc_dashboard_deflection_trend(timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.rpc_gap_dismiss(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. "Create KB entry from this" -> gap resolution linkage.
-- ---------------------------------------------------------------------

-- A new trailing default parameter still changes the function's identity
-- for GRANT purposes (see the INC-5 migration), so drop the 10-arg form
-- explicitly rather than leaving an orphaned overload granted.
drop function if exists public.rpc_kb_entry_create(uuid, text, text, text, text, text[], text, uuid, date, text);

create or replace function public.rpc_kb_entry_create(
  p_category_id uuid,
  p_question_fil text,
  p_question_en text,
  p_answer_fil text,
  p_answer_en text,
  p_keywords text[] default '{}'::text[],
  p_image_url text default null,
  p_owner_user_id uuid default null,
  p_review_due_on date default null,
  p_status text default 'draft',
  p_source_unmatched_question_id uuid default null
)
returns table (entry_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_entry_id uuid;
  v_gap public.unmatched_questions;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if p_status not in ('draft', 'published') then
    raise exception 'invalid status';
  end if;

  if p_status = 'published' and p_owner_user_id is null then
    raise exception 'an owner is required to publish';
  end if;

  insert into public.kb_entries (
    category_id, question_fil, question_en, answer_fil, answer_en,
    keywords, image_url, owner_user_id, review_due_on, status
  ) values (
    p_category_id, p_question_fil, p_question_en, p_answer_fil, p_answer_en,
    coalesce(p_keywords, '{}'::text[]), p_image_url, p_owner_user_id, p_review_due_on, p_status
  ) returning id into v_entry_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'kb.entry_created', 'kb_entry', v_entry_id,
    format('Gumawa si %s ng bagong tanong-sagot: "%s".', v_actor.username, p_question_fil),
    format('%s created a new Q&A entry: "%s".', v_actor.username, p_question_en));

  if p_status = 'published' then
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_published', 'kb_entry', v_entry_id,
      format('Inilathala ni %s ang tanong-sagot na "%s".', v_actor.username, p_question_fil),
      format('%s published the Q&A entry "%s".', v_actor.username, p_question_en));
  end if;

  if p_source_unmatched_question_id is not null then
    select * into v_gap from public.unmatched_questions where id = p_source_unmatched_question_id for update;

    if v_gap is not null then
      if v_gap.resolved_entry_id is null then
        update public.unmatched_questions set resolved_entry_id = v_entry_id where id = v_gap.id;
      end if;

      if p_status = 'published' and v_gap.status != 'resolved' then
        update public.unmatched_questions set status = 'resolved' where id = v_gap.id;

        insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
        values (v_actor.id, 'gap.resolved', 'unmatched_question', v_gap.id,
          format('Nalutas ni %s ang tanong na "%s" gamit ang bagong entry.', v_actor.username, v_gap.text),
          format('%s resolved the question "%s" with a new entry.', v_actor.username, v_gap.text));
      end if;
    end if;
  end if;

  return query select v_entry_id;
end;
$$;

-- Signature unchanged; resolution logic is added inside the existing
-- draft -> published transition branch. The link to its source gap
-- survives via unmatched_questions.resolved_entry_id (set at creation
-- time), so no new parameter is needed here.
create or replace function public.rpc_kb_entry_update(
  p_id uuid,
  p_category_id uuid,
  p_question_fil text,
  p_question_en text,
  p_answer_fil text,
  p_answer_en text,
  p_keywords text[],
  p_image_url text,
  p_owner_user_id uuid,
  p_review_due_on date,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_before public.kb_entries;
  v_gap public.unmatched_questions;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_before from public.kb_entries where id = p_id for update;
  if v_before is null then
    raise exception 'entry not found';
  end if;

  if p_status not in ('draft', 'published') then
    raise exception 'invalid status';
  end if;

  if p_status = 'published' and p_owner_user_id is null then
    raise exception 'an owner is required to publish';
  end if;

  update public.kb_entries set
    category_id = p_category_id,
    question_fil = p_question_fil,
    question_en = p_question_en,
    answer_fil = p_answer_fil,
    answer_en = p_answer_en,
    keywords = coalesce(p_keywords, '{}'::text[]),
    image_url = p_image_url,
    owner_user_id = p_owner_user_id,
    review_due_on = p_review_due_on,
    status = p_status
  where id = p_id;

  if v_before.status != 'published' and p_status = 'published' then
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_published', 'kb_entry', p_id,
      format('Inilathala ni %s ang tanong-sagot na "%s".', v_actor.username, p_question_fil),
      format('%s published the Q&A entry "%s".', v_actor.username, p_question_en));

    update public.unmatched_questions
      set status = 'resolved'
      where resolved_entry_id = p_id and status != 'resolved'
      returning * into v_gap;

    if v_gap is not null then
      insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
      values (v_actor.id, 'gap.resolved', 'unmatched_question', v_gap.id,
        format('Nalutas ni %s ang tanong na "%s" gamit ang na-publish na entry.', v_actor.username, v_gap.text),
        format('%s resolved the question "%s" with the published entry.', v_actor.username, v_gap.text));
    end if;
  elsif v_before.status = 'published' and p_status = 'draft' then
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_archived', 'kb_entry', p_id,
      format('Inalis ni %s sa publikasyon ang tanong-sagot na "%s".', v_actor.username, p_question_fil),
      format('%s unpublished the Q&A entry "%s".', v_actor.username, p_question_en));
  else
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_updated', 'kb_entry', p_id,
      format('Na-update ni %s ang tanong-sagot na "%s".', v_actor.username, p_question_fil),
      format('%s updated the Q&A entry "%s".', v_actor.username, p_question_en));
  end if;
end;
$$;

grant execute on function public.rpc_kb_entry_create(uuid, text, text, text, text, text[], text, uuid, date, text, uuid) to anon, authenticated;
grant execute on function public.rpc_kb_entry_update(uuid, uuid, text, text, text, text, text[], text, uuid, date, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. E2E fixture: a city_municipal-level admin (parent of both pilot
-- barangays) so the dashboard's org roll-up scoping is testable.
-- Idempotent — on replay, the block no-ops once the username exists, so
-- the password is generated exactly once. It is deliberately not a
-- literal in this file (never commit real credentials); capture the
-- RAISE NOTICE output the first time this migration runs against a
-- project and store it as the E2E_STABLE_CITY_ADMIN_PASSWORD secret,
-- the same way the INC-1 fixture accounts (admin.stable, bhw.stable)
-- were provisioned out-of-band.
-- ---------------------------------------------------------------------

do $$
declare
  v_username text := 'admin.city.stable';
  v_org_unit_id uuid := '00000000-0000-0000-0000-000000000004'; -- Los Baños (city_municipal)
  v_auth_user_id uuid;
  v_temp_password text;
begin
  if exists (select 1 from public.users where username = v_username) then
    return;
  end if;

  v_temp_password := public.generate_temp_password();
  v_auth_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
    created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', v_auth_user_id, 'authenticated', 'authenticated',
    v_username || '@bhw.local', crypt(v_temp_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false,
    now(), now()
  );

  insert into public.users (
    auth_user_id, username, full_name, role, org_unit_id, status,
    must_change_password, consented_at
  ) values (
    v_auth_user_id, v_username, 'E2E City Admin (Los Baños)', 'admin', v_org_unit_id, 'active',
    false, now()
  );

  raise notice 'Seeded e2e fixture %: temp password %. Capture this now and store it as E2E_STABLE_CITY_ADMIN_PASSWORD — it will not be shown again.', v_username, v_temp_password;
end;
$$;
