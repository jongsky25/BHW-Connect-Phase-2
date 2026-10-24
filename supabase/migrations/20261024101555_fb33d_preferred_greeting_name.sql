-- A personal Home greeting only; official profile names and learner records are untouched.
begin;
create schema user_preferences_private;
revoke all on schema user_preferences_private from public, anon, authenticated;
create table user_preferences_private.greeting_names (
  user_id uuid primary key references public.users(id) on delete cascade,
  preferred_name text not null check (
    char_length(preferred_name) between 1 and 80
    and preferred_name = btrim(preferred_name, chr(32) || chr(160))
    and preferred_name !~ '[[:cntrl:]]'
  )
);
alter table user_preferences_private.greeting_names enable row level security;
revoke all on user_preferences_private.greeting_names from public, anon, authenticated;
comment on table user_preferences_private.greeting_names is
  'Optional personal Home greeting. Not an official name, identity or certificate field. Access only through active-owner RPCs.';

create function public.rpc_my_greeting_name()
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_actor public.users; v_name text;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.status is distinct from 'active' then
    raise exception 'active account required' using errcode = '42501';
  end if;
  select preferred_name into v_name from user_preferences_private.greeting_names where user_id=v_actor.id;
  return v_name;
end;
$$;

create function public.rpc_set_my_greeting_name(p_preferred_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_actor public.users; v_name text;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.status is distinct from 'active' then
    raise exception 'active account required' using errcode = '42501';
  end if;
  v_name := nullif(btrim(coalesce(p_preferred_name,''), chr(32) || chr(160)), '');
  if v_name is not null and (char_length(v_name)>80 or v_name ~ '[[:cntrl:]]') then
    raise exception 'invalid preferred name' using errcode = '22023';
  end if;
  if v_name is null then
    delete from user_preferences_private.greeting_names where user_id=v_actor.id;
  else
    insert into user_preferences_private.greeting_names(user_id,preferred_name) values(v_actor.id,v_name)
      on conflict(user_id) do update set preferred_name=excluded.preferred_name;
  end if;
  return v_name;
end;
$$;
revoke all on function public.rpc_my_greeting_name() from public, anon;
revoke all on function public.rpc_set_my_greeting_name(text) from public, anon;
grant execute on function public.rpc_my_greeting_name() to authenticated;
grant execute on function public.rpc_set_my_greeting_name(text) to authenticated;
notify pgrst, 'reload schema';
commit;
