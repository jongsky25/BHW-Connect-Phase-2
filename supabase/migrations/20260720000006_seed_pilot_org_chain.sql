-- INC-1: seed the pilot org chain (national -> regional -> provincial ->
-- city/municipal -> barangay) so there's a real org_unit_id to provision
-- accounts against. User accounts themselves are seeded separately via
-- scripts/seed.ts (they need Supabase Auth, not just a table row).

insert into public.org_units (id, name, level, parent_id)
values ('00000000-0000-0000-0000-000000000001', 'Department of Health', 'national', null);

insert into public.org_units (id, name, level, parent_id)
values ('00000000-0000-0000-0000-000000000002', 'Region IV-A (CALABARZON)', 'regional', '00000000-0000-0000-0000-000000000001');

insert into public.org_units (id, name, level, parent_id)
values ('00000000-0000-0000-0000-000000000003', 'Laguna', 'provincial', '00000000-0000-0000-0000-000000000002');

insert into public.org_units (id, name, level, parent_id)
values ('00000000-0000-0000-0000-000000000004', 'Los Baños', 'city_municipal', '00000000-0000-0000-0000-000000000003');

insert into public.org_units (id, name, level, parent_id)
values ('00000000-0000-0000-0000-000000000005', 'Barangay Batong Malake', 'barangay', '00000000-0000-0000-0000-000000000004');
