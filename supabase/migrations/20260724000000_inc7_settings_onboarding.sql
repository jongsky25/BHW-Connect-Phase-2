-- ---------------------------------------------------------------------
-- INC-7: Settings, accessibility & onboarding
--
-- `users.language` and `users.a11y_settings` already existed in the
-- baseline schema (provisioned ahead of this increment) but nothing read
-- or wrote them yet. This migration adds the self-service RPC that lets a
-- signed-in user persist language/theme/font-scale/high-contrast to their
-- own profile row, plus onboarding-checklist tracking columns mirroring
-- the must_change_password / consented_at "set-once flag" pattern from
-- INC-1.
--
-- Settings changes and onboarding completion are intentionally NOT written
-- to audit_events: the §5.6 audit taxonomy (docs/delivery-plan.md) doesn't
-- list them, and the analogous `settings.changed` / `onboarding.completed`
-- events belong to the separate §8 product-analytics taxonomy slated for
-- INC-8's instrumentation work, not this laymanized admin audit trail.
-- ---------------------------------------------------------------------

alter table public.users
  add column if not exists onboarding_progress jsonb not null default '{}'::jsonb,
  add column if not exists onboarding_completed_at timestamptz;

-- Existing accounts predate the onboarding checklist entirely; treat them
-- as already onboarded so the checklist only appears for users provisioned
-- after this migration ships.
update public.users
  set onboarding_completed_at = now()
  where onboarding_completed_at is null;

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
begin
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
    where auth_user_id = auth.uid();
end;
$$;

create or replace function public.rpc_onboarding_complete_step(p_step text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_progress jsonb;
begin
  if p_step not in ('language', 'chat', 'kb') then
    raise exception 'invalid onboarding step';
  end if;

  update public.users
    set onboarding_progress = onboarding_progress || jsonb_build_object(p_step, true)
    where auth_user_id = auth.uid()
    returning onboarding_progress into v_progress;

  if v_progress @> '{"language": true, "chat": true, "kb": true}'::jsonb then
    update public.users
      set onboarding_completed_at = coalesce(onboarding_completed_at, now())
      where auth_user_id = auth.uid();
  end if;
end;
$$;

-- This project's default privileges auto-grant EXECUTE on newly created
-- functions to both anon and authenticated (so they're callable via
-- PostgREST without an explicit grant per function) — that predates
-- rpc_give_consent / rpc_complete_password_change, which is why those
-- don't need this, but it applies to anything created from here on. Both
-- RPCs below act on the caller's own row via auth.uid() and only make
-- sense once signed in, so anon must be revoked explicitly.
revoke execute on function public.rpc_update_settings(text, text, text, boolean) from public, anon;
revoke execute on function public.rpc_onboarding_complete_step(text) from public, anon;
grant execute on function public.rpc_update_settings(text, text, text, boolean) to authenticated;
grant execute on function public.rpc_onboarding_complete_step(text) to authenticated;
