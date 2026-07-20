-- org_units: national -> regional -> provincial -> city_municipal -> barangay
-- hierarchy (delivery-plan.md §4). `path` is a materialized ltree path built
-- from ancestor ids, used for scope queries (RLS and roll-up dashboards).

create table org_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level text not null check (level in ('national', 'regional', 'provincial', 'city_municipal', 'barangay')),
  parent_id uuid references org_units(id),
  path ltree,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index org_units_path_idx on org_units using gist (path);
create index org_units_parent_id_idx on org_units (parent_id);

create trigger org_units_set_updated_at
  before update on org_units
  for each row
  execute function set_updated_at();

-- Computes `path` from the parent's path plus this row's own id, at insert
-- time. ltree labels can't contain hyphens, so uuids are stored with '_'
-- in place of '-'. Restructuring the hierarchy (changing parent_id after
-- creation) is out of scope for Phase 1 and does not recompute descendants.
create or replace function org_units_set_path()
returns trigger
language plpgsql
as $$
declare
  parent_path ltree;
  own_label ltree;
begin
  own_label := text2ltree(replace(new.id::text, '-', '_'));

  if new.parent_id is null then
    new.path := own_label;
  else
    select path into parent_path from org_units where id = new.parent_id;
    if parent_path is null then
      raise exception 'org_units: parent_id % has no path (does it exist?)', new.parent_id;
    end if;
    new.path := parent_path || own_label;
  end if;

  return new;
end;
$$;

create trigger org_units_set_path_trigger
  before insert on org_units
  for each row
  execute function org_units_set_path();

alter table org_units enable row level security;

-- Reference data (names/hierarchy only, no PII): every authenticated user
-- may read the full org tree, needed to render breadcrumbs and scope
-- pickers. Writes are admin-console work (INC-2+); no write policy yet, so
-- only the service role can mutate org_units for now.
create policy "org_units readable by authenticated users"
  on org_units for select
  to authenticated
  using (true);
