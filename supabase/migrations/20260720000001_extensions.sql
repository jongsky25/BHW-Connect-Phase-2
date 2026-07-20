-- Hierarchical paths for org_units scope queries (delivery-plan.md §4).
create extension if not exists ltree;

-- Shared "touch updated_at" trigger used by every table below.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
