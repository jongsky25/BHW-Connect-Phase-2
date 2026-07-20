-- INC-1 RLS test: a BHW cannot query another org unit's rows.
--
-- Run with the Supabase CLI (needs Docker/pgTAP, not available in every
-- sandbox — see supabase/tests/README.md):
--   supabase test db
--
-- Uses pgTAP. Simulates an authenticated request the same way Supabase's
-- PostgREST layer does: auth.uid() reads request.jwt.claim.sub, so setting
-- that GUC + `set local role authenticated` is enough to exercise RLS
-- without going through the real Auth/PostgREST stack.

begin;
select plan(5);

-- Two barangays under the seeded pilot chain (fixed to a stable, easy id
-- rather than the migration's real UUID, so this test doesn't depend on the
-- seed migration having run).
insert into public.org_units (id, name, level, parent_id, path)
values ('10000000-0000-0000-0000-000000000001', 'Test National', 'national', null, '10000000-0000-0000-0000-000000000001.');

insert into public.org_units (id, name, level, parent_id)
values ('10000000-0000-0000-0000-000000000002', 'Test Regional', 'regional', '10000000-0000-0000-0000-000000000001');

insert into public.org_units (id, name, level, parent_id)
values ('10000000-0000-0000-0000-000000000003', 'Test Provincial', 'provincial', '10000000-0000-0000-0000-000000000002');

insert into public.org_units (id, name, level, parent_id)
values ('10000000-0000-0000-0000-000000000004', 'Test City', 'city_municipal', '10000000-0000-0000-0000-000000000003');

insert into public.org_units (id, name, level, parent_id)
values ('10000000-0000-0000-0000-000000000005', 'Barangay A', 'barangay', '10000000-0000-0000-0000-000000000004');

insert into public.org_units (id, name, level, parent_id)
values ('10000000-0000-0000-0000-000000000006', 'Barangay B', 'barangay', '10000000-0000-0000-0000-000000000004');

-- Two auth users (minimal columns supabase's local auth schema requires).
insert into auth.users (id, email) values
  ('20000000-0000-0000-0000-0000000000a1', 'bhw-a@bhw.local'),
  ('20000000-0000-0000-0000-0000000000b1', 'bhw-b@bhw.local');

insert into public.users (id, auth_user_id, username, full_name, role, org_unit_id, status)
values
  ('30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 'bhw-a', 'BHW A', 'bhw', '10000000-0000-0000-0000-000000000005', 'active'),
  ('30000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b1', 'bhw-b', 'BHW B', 'bhw', '10000000-0000-0000-0000-000000000006', 'active');

-- Simulate BHW A's authenticated request.
set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-0000-0000-0000000000a1';

select is(
  (select count(*)::int from public.org_units where id = '10000000-0000-0000-0000-000000000005'),
  1,
  'BHW A can see her own barangay org unit'
);

select is(
  (select count(*)::int from public.org_units where id = '10000000-0000-0000-0000-000000000006'),
  0,
  'BHW A cannot see Barangay B''s org unit'
);

select is(
  (select count(*)::int from public.users where id = '30000000-0000-0000-0000-0000000000a1'),
  1,
  'BHW A can see her own user row'
);

select is(
  (select count(*)::int from public.users where id = '30000000-0000-0000-0000-0000000000b1'),
  0,
  'BHW A cannot see BHW B''s user row (different org unit, both non-admin)'
);

select is(
  (select count(*)::int from public.users),
  1,
  'BHW A''s users query returns exactly her own row, nothing else'
);

select * from finish();
rollback;
