-- ---------------------------------------------------------------------
-- INC-8: Reports export & analytics.
--
-- 1. `analytics_events` — the §8 product-analytics taxonomy, kept
--    deliberately separate from `audit_events` (the §5.6 laymanized
--    admin audit trail) even where a couple of names overlap
--    conceptually (e.g. `gap.resolved` exists in both): audit_events
--    answers "what did an admin do to the system", analytics_events
--    answers "what did a BHW do in the product". Same no-client-insert
--    shape as audit_events (see INC-3's "audit_events has no
--    client-facing insert policy" note) — every row is written by a
--    security definer RPC, never directly by a client insert.
--
-- 2. `rpc_track_event` is the generic entry point, but it only accepts
--    the subset of the taxonomy that is genuinely just "the client
--    observed something happen" (a question was asked, an answer was
--    shown, feedback was given, an article was viewed, a session
--    started). The other three taxonomy events — `settings.changed`,
--    `onboarding.completed`, `gap.resolved` — are asserted directly
--    inside the RPCs that already own those exact state transitions
--    (`rpc_update_settings`, `rpc_onboarding_complete_step`,
--    `rpc_kb_entry_create`/`rpc_kb_entry_update`), so a client can't
--    fabricate one of those three independent of the real change.
--
-- 3. `rpc_reports_kpi_summary` computes the four pilot KPIs the INC-8
--    dashboard panel needs (activation, weekly-active, deflection,
--    CSAT/answer-quality) directly from the existing authoritative
--    tables (users/chat_sessions/chat_messages) rather than from
--    analytics_events — those tables are already the source of truth
--    for the Activity/Chat Guide tabs (INC-6) and aren't subject to
--    best-effort client instrumentation being dropped.
--
-- 4. `rpc_report_exported` writes the `report.exported` audit event
--    already listed in the §5.6 taxonomy (this is the first RPC to
--    use it). Following INC-7's own corrected convention (its PR
--    description flagged INC-6's dashboard RPCs for being callable by
--    anon), every new function below explicitly revokes anon/public
--    execute and grants only authenticated.
-- ---------------------------------------------------------------------

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_event_name_created_at_idx
  on public.analytics_events (event_name, created_at);
create index if not exists analytics_events_user_id_idx
  on public.analytics_events (user_id);

alter table public.analytics_events enable row level security;

drop policy if exists analytics_events_admin_read on public.analytics_events;
create policy analytics_events_admin_read on public.analytics_events for select
  using (
    (select public.current_app_user()).role = 'admin'
    and (
      user_id is null
      or exists (
        select 1 from public.users u
        join public.org_units o on o.id = u.org_unit_id
        where u.id = analytics_events.user_id
          and o.path like (select public.current_org_path()) || '%'
      )
    )
  );

-- ---------------------------------------------------------------------
-- Generic client-observed event sink.
-- ---------------------------------------------------------------------

create or replace function public.rpc_track_event(
  p_event_name text,
  p_properties jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null then
    raise exception 'not authorized';
  end if;

  if p_event_name not in (
    'session.started', 'chat.question_asked', 'chat.answer_shown',
    'chat.no_answer', 'chat.feedback_given', 'kb.article_viewed'
  ) then
    raise exception 'invalid event name';
  end if;

  insert into public.analytics_events (user_id, event_name, properties)
  values (v_actor.id, p_event_name, coalesce(p_properties, '{}'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------
-- Pilot-KPI panel.
-- ---------------------------------------------------------------------

create or replace function public.rpc_reports_kpi_summary(
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  activation_rate numeric,
  wau_rate numeric,
  deflection_rate numeric,
  csat_rate numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_scope_path text;
  v_total_bhws integer;
  v_activated_bhws integer;
  v_asked integer;
  v_answered integer;
  v_up integer;
  v_down integer;
  v_week_start timestamptz;
  v_week_sum numeric := 0;
  v_week_count integer := 0;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  v_scope_path := public.current_org_path();

  -- Activation: BHW asked >= 3 questions within their first 7 days.
  select count(*) into v_total_bhws
    from public.users u
    join public.org_units o on o.id = u.org_unit_id
    where u.role = 'bhw' and o.path like v_scope_path || '%';

  select count(*) into v_activated_bhws
    from public.users u
    join public.org_units o on o.id = u.org_unit_id
    where u.role = 'bhw' and o.path like v_scope_path || '%'
      and (
        select count(*) from public.chat_messages m
        join public.chat_sessions s on s.id = m.session_id
        where s.user_id = u.id and m.sender = 'user'
          and m.created_at < u.created_at + interval '7 days'
      ) >= 3;

  -- Weekly active: average, across successive 7-day buckets spanning
  -- [p_start, p_end), of the fraction of org-scoped BHWs with >= 1 chat
  -- session that week.
  v_week_start := p_start;
  while v_week_start < p_end loop
    v_week_count := v_week_count + 1;
    v_week_sum := v_week_sum + (
      case when v_total_bhws = 0 then 0 else
        (
          select count(distinct s.user_id) from public.chat_sessions s
          join public.users u on u.id = s.user_id
          join public.org_units o on o.id = u.org_unit_id
          where u.role = 'bhw' and o.path like v_scope_path || '%'
            and s.created_at >= v_week_start
            and s.created_at < least(v_week_start + interval '7 days', p_end)
        )::numeric / v_total_bhws
      end
    );
    v_week_start := v_week_start + interval '7 days';
  end loop;

  -- Deflection: answered / asked chat questions in range (org-scoped).
  select count(*) into v_asked
    from public.chat_messages m
    join public.chat_sessions s on s.id = m.session_id
    join public.users u on u.id = s.user_id
    join public.org_units o on o.id = u.org_unit_id
    where m.sender = 'system' and o.path like v_scope_path || '%'
      and m.created_at >= p_start and m.created_at < p_end;

  select count(*) into v_answered
    from public.chat_messages m
    join public.chat_sessions s on s.id = m.session_id
    join public.users u on u.id = s.user_id
    join public.org_units o on o.id = u.org_unit_id
    where m.sender = 'system' and m.matched_entry_id is not null and o.path like v_scope_path || '%'
      and m.created_at >= p_start and m.created_at < p_end;

  -- CSAT / answer quality: 👍 / (👍 + 👎) on answers in range.
  select
    count(*) filter (where m.feedback = 'up'),
    count(*) filter (where m.feedback = 'down')
    into v_up, v_down
    from public.chat_messages m
    join public.chat_sessions s on s.id = m.session_id
    join public.users u on u.id = s.user_id
    join public.org_units o on o.id = u.org_unit_id
    where m.sender = 'system' and m.feedback is not null and o.path like v_scope_path || '%'
      and m.created_at >= p_start and m.created_at < p_end;

  return query select
    case when v_total_bhws = 0 then 0::numeric else round((v_activated_bhws::numeric / v_total_bhws) * 100, 1) end,
    case when v_week_count = 0 then 0::numeric else round((v_week_sum / v_week_count) * 100, 1) end,
    case when v_asked = 0 then 0::numeric else round((v_answered::numeric / v_asked) * 100, 1) end,
    case when (v_up + v_down) = 0 then 0::numeric else round((v_up::numeric / (v_up + v_down)) * 100, 1) end;
end;
$$;

-- ---------------------------------------------------------------------
-- Report export audit trail.
-- ---------------------------------------------------------------------

create or replace function public.rpc_report_exported(
  p_report_type text,
  p_format text,
  p_columns text[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if p_format not in ('csv', 'xlsx', 'pdf') then
    raise exception 'invalid export format';
  end if;

  insert into public.audit_events (
    actor_user_id, event_type, subject_type, subject_id, metadata, plain_summary_fil, plain_summary_en
  ) values (
    v_actor.id, 'report.exported', 'report', null,
    jsonb_build_object('report_type', p_report_type, 'format', p_format, 'columns', to_jsonb(p_columns)),
    format('Nag-export si %s ng %s bilang %s.', v_actor.username, p_report_type, upper(p_format)),
    format('%s exported %s as %s.', v_actor.username, p_report_type, upper(p_format))
  );
end;
$$;

revoke execute on function public.rpc_track_event(text, jsonb) from public, anon;
revoke execute on function public.rpc_reports_kpi_summary(timestamptz, timestamptz) from public, anon;
revoke execute on function public.rpc_report_exported(text, text, text[]) from public, anon;
grant execute on function public.rpc_track_event(text, jsonb) to authenticated;
grant execute on function public.rpc_reports_kpi_summary(timestamptz, timestamptz) to authenticated;
grant execute on function public.rpc_report_exported(text, text, text[]) to authenticated;

-- ---------------------------------------------------------------------
-- Instrument the three RPC-owned analytics events on top of their
-- existing audit-event writes. Signatures are unchanged, so no GRANT
-- changes are needed for these three.
-- ---------------------------------------------------------------------

create or replace function public.rpc_update_settings(
  p_language text,
  p_theme text,
  p_font_scale text,
  p_high_contrast boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null then
    raise exception 'not authorized';
  end if;

  if p_language not in ('fil', 'en') then
    raise exception 'invalid language';
  end if;

  if p_theme not in ('light', 'dark', 'system') then
    raise exception 'invalid theme';
  end if;

  if p_font_scale not in ('md', 'lg', 'xl') then
    raise exception 'invalid font scale';
  end if;

  update public.users
    set language = p_language,
        a11y_settings = jsonb_build_object(
          'theme', p_theme,
          'font_scale', p_font_scale,
          'high_contrast', coalesce(p_high_contrast, false)
        )
    where id = v_actor.id;

  insert into public.analytics_events (user_id, event_name, properties)
  values (
    v_actor.id, 'settings.changed',
    jsonb_build_object(
      'language', p_language, 'theme', p_theme,
      'font_scale', p_font_scale, 'high_contrast', coalesce(p_high_contrast, false)
    )
  );
end;
$$;

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

    if v_gap.id is not null then
      if v_gap.resolved_entry_id is null then
        update public.unmatched_questions set resolved_entry_id = v_entry_id where id = v_gap.id;
      end if;

      if p_status = 'published' and v_gap.status != 'resolved' then
        update public.unmatched_questions set status = 'resolved' where id = v_gap.id;

        insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
        values (v_actor.id, 'gap.resolved', 'unmatched_question', v_gap.id,
          format('Nalutas ni %s ang tanong na "%s" gamit ang bagong entry.', v_actor.username, v_gap.text),
          format('%s resolved the question "%s" with a new entry.', v_actor.username, v_gap.text));

        insert into public.analytics_events (user_id, event_name, properties)
        values (v_actor.id, 'gap.resolved', jsonb_build_object('unmatched_question_id', v_gap.id, 'entry_id', v_entry_id));
      end if;
    end if;
  end if;

  return query select v_entry_id;
end;
$$;

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

    if v_gap.id is not null then
      insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
      values (v_actor.id, 'gap.resolved', 'unmatched_question', v_gap.id,
        format('Nalutas ni %s ang tanong na "%s" gamit ang na-publish na entry.', v_actor.username, v_gap.text),
        format('%s resolved the question "%s" with the published entry.', v_actor.username, v_gap.text));

      insert into public.analytics_events (user_id, event_name, properties)
      values (v_actor.id, 'gap.resolved', jsonb_build_object('unmatched_question_id', v_gap.id, 'entry_id', p_id));
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
