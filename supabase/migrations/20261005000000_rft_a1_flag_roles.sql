-- RFT A1 (docs/role-feature-toggles-plan.md §5): feature toggles per user
-- type, changeable by super admins only.
--
-- 1. feature_flags.disabled_roles: a deny-list of user types a feature is
--    switched off for. It is a deny-list (not an allow-list) so every
--    existing row ('{}') keeps today's behaviour and any future role
--    inherits whatever is currently on. `admin` can never be stored here:
--    nothing is ever hidden from admins (plan §2 D2) — they get the
--    View-as preview instead (plan §4.4). The `enabled` column stays as the
--    master "Available" kill switch for everyone.
-- 2. flag_role_scope(key): which user types each flag can be toggled for.
--    Mirrors FLAG_ROLE_SCOPE in src/lib/flags/types.ts (added in A2); keep
--    the two in sync. Unknown keys and admin-console/system flags return
--    '{}' (master switch only).
-- 3. rpc_flag_set_role: turns one flag on/off for one user type. Super
--    admin only (plan §2 D3), audited as flag.role_toggled.
-- 4. rpc_flag_toggle: same signature and behaviour, but now requires a
--    super admin instead of any admin (plan §2 D3).
--
-- role_filter was added in INC-9 but never read or written; it is left in
-- place (marked deprecated) rather than dropped.
-- ---------------------------------------------------------------------

alter table public.feature_flags
  add column if not exists disabled_roles text[] not null default '{}';

alter table public.feature_flags
  drop constraint if exists feature_flags_disabled_roles_check;
alter table public.feature_flags
  add constraint feature_flags_disabled_roles_check
  check (disabled_roles <@ array['bhw', 'assessor', 'designer']::text[]);

comment on column public.feature_flags.disabled_roles is
  'User types this feature is switched off for, even while enabled is true. Only bhw/assessor/designer; admins always see available features. Written by rpc_flag_set_role.';
comment on column public.feature_flags.role_filter is
  'Deprecated: never read or written. Superseded by disabled_roles (RFT A1).';

-- ---------------------------------------------------------------------
-- Which user types each flag can be toggled for.
-- ---------------------------------------------------------------------

create or replace function public.flag_role_scope(p_key text)
returns text[]
language sql
immutable
set search_path = public
as $$
  select case p_key
    when 'kb_articles' then array['bhw', 'assessor', 'designer']
    when 'announcements' then array['bhw', 'assessor', 'designer']
    when 'surveys' then array['bhw', 'assessor', 'designer']
    when 'forum' then array['bhw', 'assessor', 'designer']
    when 'notifications' then array['bhw', 'assessor', 'designer']
    when 'offline_pwa' then array['bhw', 'assessor', 'designer']
    when 'chat_conversation' then array['bhw', 'assessor', 'designer']
    when 'elearning' then array['bhw', 'assessor']
    when 'course_sessions' then array['bhw', 'assessor']
    when 'flipcharts' then array['bhw', 'designer']
    else '{}'::text[]
  end;
$$;

revoke execute on function public.flag_role_scope(text) from public, anon;

-- ---------------------------------------------------------------------
-- Per-type toggle (super admin only).
-- ---------------------------------------------------------------------

create or replace function public.rpc_flag_set_role(p_key text, p_role text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_flag public.feature_flags;
  v_role_label text;
begin
  select * into v_actor from public.current_super_admin();
  if v_actor.id is null then
    raise exception 'not authorized';
  end if;

  select * into v_flag from public.feature_flags where key = p_key for update;
  if v_flag is null then
    raise exception 'flag not found';
  end if;

  if p_role is null or not (p_role = any (public.flag_role_scope(p_key))) then
    raise exception 'invalid role for flag';
  end if;

  update public.feature_flags
    set disabled_roles = case
          when p_enabled then array_remove(disabled_roles, p_role)
          when p_role = any (disabled_roles) then disabled_roles
          else array_append(disabled_roles, p_role)
        end,
        updated_at = now()
    where id = v_flag.id;

  v_role_label := case p_role
    when 'bhw' then 'BHW'
    when 'assessor' then 'Assessor'
    when 'designer' then 'Designer'
  end;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, metadata, plain_summary_fil, plain_summary_en)
  values (
    v_actor.id, 'flag.role_toggled', 'feature_flag', v_flag.id,
    jsonb_build_object('key', p_key, 'role', p_role, 'enabled', p_enabled),
    case when p_enabled
      then format('Pinagana ni %s ang feature na "%s" para sa %s.', v_actor.username, p_key, v_role_label)
      else format('Pinatay ni %s ang feature na "%s" para sa %s.', v_actor.username, p_key, v_role_label)
    end,
    case when p_enabled
      then format('%s turned on the "%s" feature for %s.', v_actor.username, p_key, v_role_label)
      else format('%s turned off the "%s" feature for %s.', v_actor.username, p_key, v_role_label)
    end
  );
end;
$$;

revoke execute on function public.rpc_flag_set_role(text, text, boolean) from public, anon;

-- ---------------------------------------------------------------------
-- Master switch: now super admin only. Body otherwise unchanged from
-- 20260726000000_inc9_ops_hardening.sql.
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
  select * into v_actor from public.current_super_admin();
  if v_actor.id is null then
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

revoke execute on function public.rpc_flag_toggle(text, boolean) from public, anon;
