-- INC-1: org_units — the National -> Regional -> Provincial -> City/Municipal ->
-- Barangay hierarchy. `path` is a materialized dot-joined chain of ancestor ids
-- (this org unit's id last, trailing dot included) so scope queries are a plain
-- prefix match — no ltree extension needed (delivery-plan.md §3 portability
-- guardrail: stay on plain Postgres).

create extension if not exists pgcrypto;

create table public.org_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level text not null check (level in ('national', 'regional', 'provincial', 'city_municipal', 'barangay')),
  parent_id uuid references public.org_units (id),
  path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index org_units_path_idx on public.org_units using btree (path text_pattern_ops);
create index org_units_parent_id_idx on public.org_units (parent_id);

-- A unit's level must sit exactly one step below its parent's, and only the
-- national unit may have no parent.
create or replace function public.org_units_validate_hierarchy() returns trigger
language plpgsql as $$
declare
  parent_level text;
  expected_child_level text;
begin
  if new.level = 'national' then
    if new.parent_id is not null then
      raise exception 'national org units cannot have a parent';
    end if;
    new.path := new.id::text || '.';
    return new;
  end if;

  if new.parent_id is null then
    raise exception '% org units require a parent', new.level;
  end if;

  select level, path into parent_level, new.path
    from public.org_units where id = new.parent_id;

  if parent_level is null then
    raise exception 'parent org unit % not found', new.parent_id;
  end if;

  expected_child_level := case parent_level
    when 'national' then 'regional'
    when 'regional' then 'provincial'
    when 'provincial' then 'city_municipal'
    when 'city_municipal' then 'barangay'
    else null
  end;

  if new.level != expected_child_level then
    raise exception 'a % cannot be the parent of a %', parent_level, new.level;
  end if;

  new.path := new.path || new.id::text || '.';
  return new;
end;
$$;

create trigger org_units_set_path
  before insert on public.org_units
  for each row execute function public.org_units_validate_hierarchy();

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger org_units_set_updated_at
  before update on public.org_units
  for each row execute function public.set_updated_at();

alter table public.org_units enable row level security;
