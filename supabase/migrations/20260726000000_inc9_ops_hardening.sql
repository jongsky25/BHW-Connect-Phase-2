-- ---------------------------------------------------------------------
-- INC-9: Ops hardening & pilot readiness.
--
-- 1. `feature_flags` — the §4 data-model table finally gets created.
--    Every authenticated user can read the (small) flag set so the
--    server-side gating helper can decide what to render without a
--    second privileged round trip; only an admin can flip one, via
--    `rpc_flag_toggle`, which is also the first RPC to use the
--    `flag.toggled` taxonomy event.
--
-- 2. DPA data-subject-rights actions (§5.4): `rpc_admin_export_user_data`
--    bundles a user's profile plus every table that references them
--    into one JSON payload (the `user.data_exported` taxonomy event
--    fires here); `rpc_admin_anonymize_user` is the "deactivate +
--    anonymize" pairing from the same section — it reuses the existing
--    `user.deactivated` event type (the taxonomy in §5.6 is a fixed
--    list; anonymization is a variant of deactivation, not a new event)
--    with `metadata.anonymized = true` distinguishing it in the audit
--    view. Both follow the same admin + org-scope + last-admin-guard
--    checks already established by `rpc_admin_set_status`.
--
-- 3. `rpc_retention_purge` implements the §5.3/§5.4 retention schedule
--    (chat messages + analytics events past 24 months, audit events
--    past 5 years) with a dry-run mode that only counts. It's callable
--    two ways: an admin from the console (for an on-demand dry run),
--    or the scheduled purge job authenticating with the Supabase
--    service-role key (`auth.role() = 'service_role'`) — that key has
--    no `auth.uid()`/app-user row, so the admin check is widened to
--    accept the service role directly rather than routing the
--    scheduled job through a synthetic admin account.
-- ---------------------------------------------------------------------

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  enabled boolean not null default false,
  description text not null default '',
  role_filter text,
  org_unit_filter uuid references public.org_units (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

drop policy if exists feature_flags_authenticated_read on public.feature_flags;
create policy feature_flags_authenticated_read on public.feature_flags for select
  using ((select auth.uid()) is not null);

insert into public.feature_flags (key, enabled, description)
values
  ('kb_articles', true, 'Long-form KB articles: admin authoring nav + BHW-facing article pages.'),
  ('reports_export', true, 'Reports & analytics dashboard tab and CSV/Excel/PDF export routes.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Flag toggling.
-- ---------------------------------------------------------------------

create or replace function public.rpc_flag_toggle(p_key text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_flag public.feature_flags;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_flag from public.feature_flags where key = p_key for update;
  if v_flag is null then
    raise exception 'flag not found';
  end if;

  update public.feature_flags
    set enabled = p_enabled, updated_at = now()
    where id = v_flag.id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, metadata, plain_summary_fil, plain_summary_en)
  values (
    v_actor.id, 'flag.toggled', 'feature_flag', v_flag.id,
    jsonb_build_object('key', p_key, 'enabled', p_enabled),
    case when p_enabled
      then format('Pinagana ni %s ang feature na "%s".', v_actor.username, p_key)
      else format('Pinatay ni %s ang feature na "%s".', v_actor.username, p_key)
    end,
    case when p_enabled
      then format('%s turned on the "%s" feature.', v_actor.username, p_key)
      else format('%s turned off the "%s" feature.', v_actor.username, p_key)
    end
  );
end;
$$;

-- ---------------------------------------------------------------------
-- DPA data-subject rights: export.
-- ---------------------------------------------------------------------

create or replace function public.rpc_admin_export_user_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_target public.users;
  v_payload jsonb;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_target from public.users where id = p_user_id;
  if v_target is null then
    raise exception 'user not found';
  end if;

  if not exists (
    select 1 from public.org_units
    where id = v_target.org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'user out of scope';
  end if;

  select jsonb_build_object(
    'profile', to_jsonb(v_target) - 'auth_user_id',
    'chat_sessions', coalesce((
      select jsonb_agg(to_jsonb(s)) from public.chat_sessions s where s.user_id = v_target.id
    ), '[]'::jsonb),
    'chat_messages', coalesce((
      select jsonb_agg(to_jsonb(m))
      from public.chat_messages m
      join public.chat_sessions s on s.id = m.session_id
      where s.user_id = v_target.id
    ), '[]'::jsonb),
    'analytics_events', coalesce((
      select jsonb_agg(to_jsonb(a)) from public.analytics_events a where a.user_id = v_target.id
    ), '[]'::jsonb),
    'audit_events_about_them', coalesce((
      select jsonb_agg(to_jsonb(e)) from public.audit_events e where e.subject_id = v_target.id
    ), '[]'::jsonb),
    'exported_at', now()
  ) into v_payload;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'user.data_exported', 'user', v_target.id,
    format('Nag-export si %s ng data ni %s.', v_actor.username, v_target.username),
    format('%s exported %s''s data.', v_actor.username, v_target.username));

  return v_payload;
end;
$$;

-- ---------------------------------------------------------------------
-- DPA data-subject rights: deactivate + anonymize.
-- ---------------------------------------------------------------------

create or replace function public.rpc_admin_anonymize_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor public.users;
  v_target public.users;
  v_anon_suffix text;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_target from public.users where id = p_user_id;
  if v_target is null then
    raise exception 'user not found';
  end if;

  if not exists (
    select 1 from public.org_units
    where id = v_target.org_unit_id and path like (select public.current_org_path()) || '%'
  ) then
    raise exception 'user out of scope';
  end if;

  if v_target.role = 'admin' and v_target.status = 'active'
     and not public.org_unit_has_active_admin(v_target.org_unit_id, v_target.id) then
    raise exception 'cannot deactivate the last active admin for this org unit';
  end if;

  v_anon_suffix := substr(v_target.id::text, 1, 8);

  update auth.users
    set encrypted_password = crypt(public.generate_temp_password(), gen_salt('bf')), updated_at = now()
    where id = v_target.auth_user_id;

  update public.users
    set status = 'deactivated',
        username = 'anonymized-' || v_anon_suffix,
        full_name = 'Anonymized User',
        contact_number = null,
        email = null,
        address = null,
        must_change_password = true
    where id = v_target.id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, metadata, plain_summary_fil, plain_summary_en)
  values (
    v_actor.id, 'user.deactivated', 'user', v_target.id,
    jsonb_build_object('anonymized', true),
    format('Na-deactivate at na-anonymize ni %s ang account ni %s.', v_actor.username, v_target.username),
    format('%s deactivated and anonymized %s''s account.', v_actor.username, v_target.username)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Retention purge (§5.3/§5.4): chat data + analytics past 24 months,
-- audit events past 5 years. Dry run only counts; live run deletes and
-- returns the same counts.
-- ---------------------------------------------------------------------

create or replace function public.rpc_retention_purge(p_dry_run boolean default true)
returns table (
  chat_sessions_purged bigint,
  chat_messages_purged bigint,
  analytics_events_purged bigint,
  audit_events_purged bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_chat_cutoff timestamptz := now() - interval '24 months';
  v_audit_cutoff timestamptz := now() - interval '5 years';
  v_sessions bigint;
  v_messages bigint;
  v_analytics bigint;
  v_audit bigint;
begin
  select * into v_actor from public.current_app_user();
  if (v_actor is null or v_actor.role != 'admin') and auth.role() != 'service_role' then
    raise exception 'not authorized';
  end if;

  -- A session's last_message_at is the timestamp of its newest message,
  -- so once every message older than the cutoff is gone, a session
  -- still at last_message_at < cutoff has no messages left at all —
  -- safe to drop without cascading away anything newer.
  select count(*) into v_messages from public.chat_messages where created_at < v_chat_cutoff;
  select count(*) into v_sessions from public.chat_sessions where last_message_at < v_chat_cutoff;
  select count(*) into v_analytics from public.analytics_events where created_at < v_chat_cutoff;
  select count(*) into v_audit from public.audit_events where created_at < v_audit_cutoff;

  if not p_dry_run then
    delete from public.chat_messages where created_at < v_chat_cutoff;
    delete from public.chat_sessions where last_message_at < v_chat_cutoff;
    delete from public.analytics_events where created_at < v_chat_cutoff;
    delete from public.audit_events where created_at < v_audit_cutoff;
  end if;

  return query select v_sessions, v_messages, v_analytics, v_audit;
end;
$$;

revoke execute on function public.rpc_flag_toggle(text, boolean) from public, anon;
revoke execute on function public.rpc_admin_export_user_data(uuid) from public, anon;
revoke execute on function public.rpc_admin_anonymize_user(uuid) from public, anon;
revoke execute on function public.rpc_retention_purge(boolean) from public, anon;
grant execute on function public.rpc_flag_toggle(text, boolean) to authenticated;
grant execute on function public.rpc_admin_export_user_data(uuid) to authenticated;
grant execute on function public.rpc_admin_anonymize_user(uuid) to authenticated;
grant execute on function public.rpc_retention_purge(boolean) to authenticated, service_role;
