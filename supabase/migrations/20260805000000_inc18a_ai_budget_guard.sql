-- INC-18a — the AI budget guard.
--
-- docs/free-ai-leverage-plan.md §2 specifies this module and INC-4 never built
-- it: an ai_usage table, per-provider ceilings at 80% of the published free
-- limit, a circuit breaker, and an ai.external_call audit event per Tier B
-- call. This migration is that, and nothing that uses it — the feature that
-- spends the quota is INC-18b.
--
-- Ceilings deliberately live in src/lib/ai/config.ts, not here, and are passed
-- in as parameters. §2 says "ceilings live in config, admin-visible"; keeping
-- the number in one place means the admin panel and the guard can never
-- disagree about what the limit is.

-- 1. Usage counters ---------------------------------------------------------

-- Grain is (provider, feature, window). Per-feature so the admin panel can say
-- what the quota was spent on, not merely that it was spent; the ceiling
-- itself is per-provider and is checked by summing across features.
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  feature text not null,
  window_kind text not null check (window_kind in ('day', 'week')),
  window_start date not null,
  request_count integer not null default 0,
  token_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, feature, window_kind, window_start)
);

create index if not exists ai_usage_provider_window_idx
  on public.ai_usage (provider, window_kind, window_start);

-- Circuit-breaker state, separate from the counters so that "is this provider
-- currently paused" is one row to read rather than an aggregate to compute,
-- and so the paused transition has somewhere unambiguous to be recorded.
create table if not exists public.ai_provider_state (
  provider text primary key,
  paused_until timestamptz,
  paused_reason text,
  updated_at timestamptz not null default now()
);

alter table public.ai_usage enable row level security;
alter table public.ai_provider_state enable row level security;

-- No policies on either table: only the security-definer RPCs below touch
-- them, so RLS blocks direct client access entirely. Same discipline as
-- chat_rate_limits in the INC-4 migration — admins read usage through
-- rpc_ai_usage_summary, never off the table.

-- 2. The guard --------------------------------------------------------------

-- Counts this request, then decides. Returns a value rather than raising:
-- free-ai-leverage-plan.md rule 3 requires degrading silently to the
-- rule-based baseline, never erroring at the user.
--
-- The upsert is atomic (insert ... on conflict do update ... returning), the
-- same shape as rpc_chat_check_rate_limit. The subsequent sum across features
-- is a separate read, so two calls racing at the exact ceiling boundary can
-- both be admitted. That is why the ceiling sits at 80% of the published free
-- limit — the headroom absorbs it, and a hard lock here would serialise every
-- AI call for no real benefit.
create or replace function public.rpc_ai_check_budget(
  p_provider text,
  p_feature text,
  p_daily_ceiling integer,
  p_weekly_ceiling integer
)
returns table (allowed boolean, reason text, used_today integer, used_this_week integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_state public.ai_provider_state;
  v_day date := (now() at time zone 'utc')::date;
  v_week date := date_trunc('week', now() at time zone 'utc')::date;
  v_used_day integer;
  v_used_week integer;
  v_was_open boolean;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  -- Breaker first: if it is open, do not spend a counter increment finding out.
  select * into v_state from public.ai_provider_state where provider = p_provider;
  if v_state.paused_until is not null and v_state.paused_until > now() then
    select coalesce(sum(request_count), 0) into v_used_day
      from public.ai_usage
      where provider = p_provider and window_kind = 'day' and window_start = v_day;
    select coalesce(sum(request_count), 0) into v_used_week
      from public.ai_usage
      where provider = p_provider and window_kind = 'week' and window_start = v_week;
    return query select false, 'breaker_open', v_used_day, v_used_week;
    return;
  end if;

  insert into public.ai_usage (provider, feature, window_kind, window_start, request_count)
  values (p_provider, p_feature, 'day', v_day, 1)
  on conflict (provider, feature, window_kind, window_start) do update
    set request_count = public.ai_usage.request_count + 1, updated_at = now();

  insert into public.ai_usage (provider, feature, window_kind, window_start, request_count)
  values (p_provider, p_feature, 'week', v_week, 1)
  on conflict (provider, feature, window_kind, window_start) do update
    set request_count = public.ai_usage.request_count + 1, updated_at = now();

  select coalesce(sum(request_count), 0) into v_used_day
    from public.ai_usage
    where provider = p_provider and window_kind = 'day' and window_start = v_day;

  select coalesce(sum(request_count), 0) into v_used_week
    from public.ai_usage
    where provider = p_provider and window_kind = 'week' and window_start = v_week;

  if v_used_day > p_daily_ceiling or v_used_week > p_weekly_ceiling then
    v_was_open := v_state.paused_until is not null and v_state.paused_until > now();

    insert into public.ai_provider_state (provider, paused_until, paused_reason)
    values (
      p_provider,
      case when v_used_week > p_weekly_ceiling
        then (v_week + interval '7 days')
        else (v_day + interval '1 day')
      end,
      case when v_used_week > p_weekly_ceiling then 'weekly_ceiling' else 'daily_ceiling' end
    )
    on conflict (provider) do update
      set paused_until = excluded.paused_until,
          paused_reason = excluded.paused_reason,
          updated_at = now();

    -- One event on the transition into paused, not one per rejected call —
    -- otherwise a busy day buries /admin/audit, which is a hardcoded
    -- .limit(100) with no filtering.
    if not v_was_open then
      insert into public.audit_events (
        actor_user_id, event_type, subject_type, subject_id, metadata,
        plain_summary_fil, plain_summary_en
      ) values (
        v_actor.id, 'ai.provider_paused', 'ai_provider', null,
        jsonb_build_object(
          'provider', p_provider,
          'used_today', v_used_day,
          'used_this_week', v_used_week,
          'daily_ceiling', p_daily_ceiling,
          'weekly_ceiling', p_weekly_ceiling
        ),
        format('Pansamantalang inihinto ang AI provider na "%s" — naabot ang takdang limitasyon.', p_provider),
        format('AI provider "%s" was paused — the configured ceiling was reached.', p_provider)
      );
    end if;

    return query select false, 'over_ceiling', v_used_day, v_used_week;
    return;
  end if;

  return query select true, 'ok', v_used_day, v_used_week;
end;
$$;

-- 3. The accountability trail ------------------------------------------------

-- §2: "Every Tier B call writes an ai.external_call audit event recording
-- provider, feature, classification, and a content hash — DPA accountability
-- is demonstrable, not asserted." The hash is of the redacted text that
-- actually left; the text itself is never stored anywhere.
create or replace function public.rpc_ai_record_call(
  p_provider text,
  p_feature text,
  p_classification text,
  p_content_hash text,
  p_token_count integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_day date := (now() at time zone 'utc')::date;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  -- Defence in depth behind the application-side gate: even if a caller
  -- somehow reached here with a forbidden classification, it is not recordable
  -- as a legitimate call.
  if p_classification not in ('public_content', 'admin_authored', 'admin_cleared') then
    raise exception 'classification not permitted for external providers';
  end if;

  update public.ai_usage
    set token_count = token_count + greatest(p_token_count, 0), updated_at = now()
    where provider = p_provider and feature = p_feature
      and window_kind = 'day' and window_start = v_day;

  -- subject_id is null deliberately. audit_event_visible_to_admin ends in
  -- `else false`, so any new subject_type is invisible to every admin until a
  -- branch is added for it — a bug this repo has shipped twice
  -- (20260729000000_..., 20260801000000_...). A null subject_id short-circuits
  -- the policy's `subject_id is null` branch before that function is called,
  -- which is the same escape rpc_report_exported uses.
  insert into public.audit_events (
    actor_user_id, event_type, subject_type, subject_id, metadata,
    plain_summary_fil, plain_summary_en
  ) values (
    v_actor.id, 'ai.external_call', 'ai_call', null,
    jsonb_build_object(
      'provider', p_provider,
      'feature', p_feature,
      'classification', p_classification,
      'content_hash', p_content_hash
    ),
    format('Nagpadala si %s ng %s na nilalaman sa AI provider na "%s".', v_actor.username, p_classification, p_provider),
    format('%s sent %s content to AI provider "%s".', v_actor.username, p_classification, p_provider)
  );
end;
$$;

-- 4. Admin-facing summary ----------------------------------------------------

-- The panel reads this rather than the table, so ai_usage can keep zero RLS
-- policies. Ceilings are not returned: they live in src/lib/ai/config.ts and
-- the panel pairs them with these numbers.
create or replace function public.rpc_ai_usage_summary()
returns table (
  provider text,
  used_today integer,
  used_this_week integer,
  paused_until timestamptz,
  paused_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_day date := (now() at time zone 'utc')::date;
  v_week date := date_trunc('week', now() at time zone 'utc')::date;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  return query
    select
      p.provider,
      coalesce((
        select sum(u.request_count)::integer from public.ai_usage u
        where u.provider = p.provider and u.window_kind = 'day' and u.window_start = v_day
      ), 0),
      coalesce((
        select sum(u.request_count)::integer from public.ai_usage u
        where u.provider = p.provider and u.window_kind = 'week' and u.window_start = v_week
      ), 0),
      s.paused_until,
      s.paused_reason
    from (select unnest(array['gemini']) as provider) p
    left join public.ai_provider_state s on s.provider = p.provider;
end;
$$;

revoke execute on function public.rpc_ai_check_budget(text, text, integer, integer) from public, anon;
revoke execute on function public.rpc_ai_record_call(text, text, text, text, integer) from public, anon;
revoke execute on function public.rpc_ai_usage_summary() from public, anon;

grant execute on function public.rpc_ai_check_budget(text, text, integer, integer) to authenticated;
grant execute on function public.rpc_ai_record_call(text, text, text, text, integer) to authenticated;
grant execute on function public.rpc_ai_usage_summary() to authenticated;

-- 5. Feature flag ------------------------------------------------------------

-- The master Tier B kill switch. free-ai-leverage-plan.md §2 names per-feature
-- flags with dots (ai.semantic_search, ai.gap_summary); every existing flag in
-- this table is snake_case and FeatureFlagKey is a TypeScript union, so dotted
-- keys would need quoting throughout DEFAULT_FLAGS. ai_external is the
-- equivalent master switch — per-feature flags arrive with the features
-- themselves in INC-18b.
insert into public.feature_flags (key, enabled, description)
values (
  'ai_external',
  false,
  'Master switch for external (Tier B) AI provider calls. Off means the adapter reports unavailable and every AI feature falls back to its rule-based baseline.'
)
on conflict (key) do nothing;
