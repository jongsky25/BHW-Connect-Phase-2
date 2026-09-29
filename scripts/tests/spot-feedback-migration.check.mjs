import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('spot feedback migration applies and restricts capture to the pilot area', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('test.auth_uid', true), '')::uuid $$;
      create table public.org_units(id uuid primary key, path text not null);
      create table public.users(id uuid primary key, auth_user_id uuid, org_unit_id uuid,
        role text, status text, full_name text, username text);
      create table public.feature_flags(id uuid primary key default gen_random_uuid(),
        key text unique, enabled boolean, description text, org_unit_filter uuid,
        disabled_roles text[] default '{}', updated_at timestamptz default now());
      create table public.audit_events(actor_user_id uuid, event_type text, subject_type text,
        subject_id uuid, metadata jsonb, plain_summary_fil text, plain_summary_en text);
      create table public.notifications(recipient_user_id uuid, notification_type text,
        subject_type text, subject_id uuid, title_fil text, title_en text,
        body_fil text, body_en text, link_path text,
        constraint notifications_notification_type_check check (notification_type in
          ('announcement.created', 'course_session.enrolled')));
      create table storage.buckets(id text primary key, name text, public boolean,
        file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(name text, bucket_id text);
      create function storage.foldername(text) returns text[] language sql immutable as $$
        select string_to_array($1, '/') $$;
      create function public.current_app_user() returns public.users language sql stable as $$
        select * from public.users where auth_user_id = auth.uid() $$;
      create function public.current_super_admin() returns public.users language sql stable as $$
        select * from public.users where auth_user_id = auth.uid() and role = 'admin' $$;
      create function public.current_org_path() returns text language sql stable as $$
        select o.path from public.users u join public.org_units o on o.id = u.org_unit_id
          where u.auth_user_id = auth.uid() $$;
      create function public.org_unit_path(uuid) returns text language sql stable as $$
        select path from public.org_units where id = $1 $$;
    `);
    const migration = await readFile(new URL('../../supabase/migrations/20261008000000_spot_feedback.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec(`
      insert into public.org_units values
        ('00000000-0000-0000-0000-000000000001', '1.'),
        ('00000000-0000-0000-0000-000000000002', '1.2.'),
        ('00000000-0000-0000-0000-000000000003', '1.3.');
      insert into public.users values
        ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
         '00000000-0000-0000-0000-000000000002', 'bhw', 'active', 'Pilot', 'pilot'),
        ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
         '00000000-0000-0000-0000-000000000003', 'bhw', 'active', 'Outside', 'outside'),
        ('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003',
         '00000000-0000-0000-0000-000000000002', 'admin', 'active', 'Pilot admin', 'admin');
      update public.feature_flags set enabled = true,
        org_unit_filter = '00000000-0000-0000-0000-000000000002'
        where key = 'spot_feedback';
      insert into public.feature_flags(key, enabled) values ('notifications', true);
    `);
    await db.exec("select set_config('test.auth_uid', '20000000-0000-0000-0000-000000000001', false)");
    assert.equal((await db.query('select public.spot_feedback_access() as allowed')).rows[0].allowed, true);
    await db.exec(`
      grant usage on schema public, auth to authenticated;
      grant select on public.users, public.org_units, public.feature_flags to authenticated;
      grant execute on function auth.uid(), public.current_app_user(),
        public.current_org_path(), public.org_unit_path(uuid) to authenticated;
      set role authenticated;
    `);
    await db.exec(`
      insert into public.spot_feedback
        (id, submitted_by, org_unit_id, page_path, message)
      values ('30000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002', '/chat', 'Pilot comment');
    `);
    assert.equal((await db.query('select count(*)::int as n from public.spot_feedback')).rows[0].n, 1);
    await db.exec("select set_config('test.auth_uid', '20000000-0000-0000-0000-000000000002', false)");
    assert.equal((await db.query('select public.spot_feedback_access() as allowed')).rows[0].allowed, false);
    assert.equal((await db.query('select count(*)::int as n from public.spot_feedback')).rows[0].n, 0);
    await assert.rejects(db.exec(`
      insert into public.spot_feedback(submitted_by, org_unit_id, page_path, message)
      values ('10000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003', '/chat', 'Outside comment');
    `), /row-level security/);
    await db.exec('reset role');
    await db.exec(`
      insert into public.spot_feedback(id, submitted_by, org_unit_id, page_path, message)
      values ('30000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003', '/chat', 'Outside row');
      select set_config('test.auth_uid', '20000000-0000-0000-0000-000000000003', false);
      set role authenticated;
    `);
    assert.equal((await db.query('select count(*)::int as n from public.spot_feedback')).rows[0].n, 1);
    await db.exec("select public.rpc_spot_feedback_set_status('30000000-0000-0000-0000-000000000001', 'in_review')");
    await db.exec("select public.rpc_spot_feedback_reply('30000000-0000-0000-0000-000000000001', 'We are reviewing this')");
    await db.exec('reset role');
    assert.equal((await db.query('select count(*)::int as n from public.notifications where notification_type = \'feedback.reply\'')).rows[0].n, 1);
    await db.exec('set role authenticated');
    await assert.rejects(db.exec("select public.rpc_spot_feedback_set_status('30000000-0000-0000-0000-000000000002', 'resolved')"), /not authorized/);
    await db.exec('reset role');
    await db.exec("update public.feature_flags set enabled = false where key = 'spot_feedback'");
    await db.exec("select set_config('test.auth_uid', '20000000-0000-0000-0000-000000000001', false)");
    assert.equal((await db.query('select public.spot_feedback_access() as allowed')).rows[0].allowed, false);
  } finally {
    await db.close();
  }
});
