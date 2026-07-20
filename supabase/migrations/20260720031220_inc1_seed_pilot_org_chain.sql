-- INC-1: seed the pilot org_units chain (national -> ... -> barangay), per
-- delivery-plan.md INC-1 scope. Fixed ids so downstream seed data (and this
-- migration, if re-run against a fresh database) can reference them directly.

insert into public.org_units (id, name, level, parent_id)
values ('00000000-0000-0000-0000-000000000001', 'Department of Health', 'national', null)
on conflict (id) do nothing;

insert into public.org_units (id, name, level, parent_id)
values ('00000000-0000-0000-0000-000000000002', 'Region IV-A (CALABARZON)', 'regional', '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.org_units (id, name, level, parent_id)
values ('00000000-0000-0000-0000-000000000003', 'Laguna', 'provincial', '00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into public.org_units (id, name, level, parent_id)
values ('00000000-0000-0000-0000-000000000004', 'Los Baños', 'city_municipal', '00000000-0000-0000-0000-000000000003')
on conflict (id) do nothing;

insert into public.org_units (id, name, level, parent_id)
values ('00000000-0000-0000-0000-000000000005', 'Barangay Batong Malake', 'barangay', '00000000-0000-0000-0000-000000000004')
on conflict (id) do nothing;

-- A sibling barangay under the same city — exists purely so the RLS
-- isolation test (e2e/rls.spec.ts) has a second, unrelated org branch to
-- prove a BHW in one barangay cannot read another's rows.
insert into public.org_units (id, name, level, parent_id)
values ('00000000-0000-0000-0000-000000000006', 'Barangay Anos', 'barangay', '00000000-0000-0000-0000-000000000004')
on conflict (id) do nothing;

-- Pilot fixture accounts are provisioned via the Supabase Auth admin API,
-- not plain SQL — auth.users passwords need GoTrue's hashing. They already
-- exist in the linked project (as of INC-2, rpc_admin_create_user is the
-- supported way to add more without touching auth.users directly). All in
-- Barangay Batong Malake unless noted:
--   admin.pilot   — role=admin, must_change_password=true  (manual QA of the forced-change flow)
--   admin.stable  — role=admin, must_change_password=false, consented — logs straight into /admin for e2e/admin.spec.ts
--   bhw.pilot     — role=bhw,   must_change_password=true  (consumed by e2e/auth.spec.ts's login flow; reset it before each run)
--   bhw.stable    — role=bhw,   must_change_password=false, consented — stable fixture for e2e/rls.spec.ts
--   bhw.other     — role=bhw,   Barangay Anos, must_change_password=false, consented — the "other org unit" side of the RLS test
