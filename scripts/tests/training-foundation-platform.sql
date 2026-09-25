-- Disposable PostgreSQL rehearsal only: minimum Supabase-owned infrastructure.
-- Never run against a Supabase project. Real public schema/migrations are replayed.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema storage;
create schema extensions;
create table auth.users (
  id uuid primary key, instance_id uuid, aud text, role text, email text,
  encrypted_password text, email_confirmed_at timestamptz, invited_at timestamptz,
  confirmation_token text default '', confirmation_sent_at timestamptz,
  recovery_token text default '', recovery_sent_at timestamptz,
  email_change_token_new text default '', email_change text default '',
  email_change_token_current text default '', email_change_confirm_status integer default 0,
  phone_change text default '', phone_change_token text default '', reauthentication_token text default '',
  raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}',
  is_super_admin boolean, is_sso_user boolean default false, is_anonymous boolean default false,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
create table storage.buckets(id text primary key,name text,"public" boolean);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid);
alter table storage.objects enable row level security;
grant usage on schema public,auth,storage,extensions to anon,authenticated,service_role;
grant execute on function auth.uid(),auth.role() to anon,authenticated,service_role;
alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
set search_path = public, extensions;
