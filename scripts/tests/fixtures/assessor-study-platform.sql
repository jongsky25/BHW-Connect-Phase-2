-- Disposable PGlite fixture: only the schema surface used by AF-02.
-- Auth/visibility function bodies are loaded unchanged from real migrations.
-- This is not a replacement for a complete Supabase migration replay.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table public.org_units(id uuid primary key,path text not null);
create table public.users(id uuid primary key,auth_user_id uuid unique,role text not null,status text not null,org_unit_id uuid references org_units(id));
create table public.training_programs(id uuid primary key,content_key text,status text,org_unit_id uuid references org_units(id));
create table public.courses(id uuid primary key,status text,org_unit_id uuid references org_units(id));
create table public.training_program_chapters(id uuid primary key,program_id uuid references training_programs(id),chapter_key text,course_id uuid unique references courses(id),availability text);
create table public.course_modules(id uuid primary key,course_id uuid references courses(id));
create table public.course_lessons(id uuid primary key,module_id uuid references course_modules(id),published_revision_id uuid);
create table public.course_lesson_revisions(id uuid primary key,lesson_id uuid references course_lessons(id),read_sections jsonb,slides jsonb,unique(id,lesson_id));
grant usage on schema public,auth to anon,authenticated;
-- Emulate Supabase's permissive table defaults: migration must revoke writes.
alter default privileges in schema public grant all on tables to anon,authenticated;
