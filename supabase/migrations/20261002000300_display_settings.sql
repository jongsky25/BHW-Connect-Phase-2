-- ---------------------------------------------------------------------
-- Header/nav/display-settings plan, increment 2.2: merge-safe settings RPC
-- (docs/header-navigation-display-settings-plan.md §5, 2.2)
--
-- rpc_update_settings (INC-7, later widened in INC-8 to its
-- current_app_user() + analytics_events shape) has always rebuilt the
-- whole `a11y_settings` jsonb from its four fixed arguments. Increment 2.1
-- (src/lib/settings/types.ts) added seven more display-setting keys that
-- nothing writes yet; a rebuild-the-whole-object RPC would wipe them the
-- moment the existing settings form (still only theme/font_scale/
-- high_contrast) saved. This migration:
--
--   1. adds rpc_update_display_settings(jsonb), a partial-update RPC for
--      the full key set, validated key-by-key against the same allow-lists
--      as parseA11ySettings/displayAttributes so the DB and the client
--      model can't drift;
--   2. switches rpc_update_settings itself to merge rather than rebuild,
--      and widens its font-scale check to accept "sm" (2.1's new value),
--      so the old three-field form and the new RPC can coexist without
--      either one clobbering keys the other doesn't know about.
--
-- Both RPCs merge with `coalesce(a11y_settings, '{}') || ...`: a legacy
-- row (or a brand-new one, which starts as the baseline schema's `{}`
-- default) merges in cleanly, and neither RPC ever touches a key it
-- wasn't given.
-- ---------------------------------------------------------------------

create or replace function public.rpc_update_display_settings(p_settings jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor record;
  v_pair record;
  v_text text;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null then
    raise exception 'not authorized';
  end if;

  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    raise exception 'invalid display settings';
  end if;

  -- Validate every key before writing anything, so a single bad key in a
  -- batched partial update rejects the whole call instead of applying the
  -- rest and silently dropping the invalid one.
  for v_pair in select key, value from jsonb_each(p_settings)
  loop
    case v_pair.key
      when 'theme' then
        v_text := v_pair.value #>> '{}';
        if v_text is null or v_text not in ('light', 'dark', 'system') then
          raise exception 'invalid display setting: theme';
        end if;
      when 'font_scale' then
        v_text := v_pair.value #>> '{}';
        if v_text is null or v_text not in ('sm', 'md', 'lg', 'xl') then
          raise exception 'invalid display setting: font_scale';
        end if;
      when 'high_contrast' then
        if jsonb_typeof(v_pair.value) <> 'boolean' then
          raise exception 'invalid display setting: high_contrast';
        end if;
      when 'primary_color' then
        v_text := v_pair.value #>> '{}';
        if v_text is null or v_text not in
          ('marigold', 'equity', 'teal', 'emerald', 'violet', 'rose', 'crimson', 'slate') then
          raise exception 'invalid display setting: primary_color';
        end if;
      when 'accent_color' then
        v_text := v_pair.value #>> '{}';
        if v_text is null or v_text not in
          ('teal', 'equity', 'marigold', 'emerald', 'violet', 'rose', 'slate') then
          raise exception 'invalid display setting: accent_color';
        end if;
      when 'density' then
        v_text := v_pair.value #>> '{}';
        if v_text is null or v_text not in ('comfortable', 'compact') then
          raise exception 'invalid display setting: density';
        end if;
      when 'motion' then
        v_text := v_pair.value #>> '{}';
        if v_text is null or v_text not in ('system', 'reduce') then
          raise exception 'invalid display setting: motion';
        end if;
      when 'underline_links' then
        if jsonb_typeof(v_pair.value) <> 'boolean' then
          raise exception 'invalid display setting: underline_links';
        end if;
      when 'line_spacing' then
        v_text := v_pair.value #>> '{}';
        if v_text is null or v_text not in ('normal', 'relaxed') then
          raise exception 'invalid display setting: line_spacing';
        end if;
      when 'reading_font' then
        v_text := v_pair.value #>> '{}';
        if v_text is null or v_text not in ('default', 'hyperlegible') then
          raise exception 'invalid display setting: reading_font';
        end if;
      when 'colorblind_status' then
        if jsonb_typeof(v_pair.value) <> 'boolean' then
          raise exception 'invalid display setting: colorblind_status';
        end if;
      else
        raise exception 'invalid display setting: %', v_pair.key;
    end case;
  end loop;

  update public.users
    set a11y_settings = coalesce(a11y_settings, '{}'::jsonb) || p_settings
    where id = v_actor.id;

  insert into public.analytics_events (user_id, event_name, properties)
  values (v_actor.id, 'settings.changed', p_settings);
end;
$$;

revoke execute on function public.rpc_update_display_settings(jsonb) from public, anon;
grant execute on function public.rpc_update_display_settings(jsonb) to authenticated;

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
  v_actor record;
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

  if p_font_scale not in ('sm', 'md', 'lg', 'xl') then
    raise exception 'invalid font scale';
  end if;

  update public.users
    set language = p_language,
        a11y_settings = coalesce(a11y_settings, '{}'::jsonb) || jsonb_build_object(
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
