-- INC-3: knowledge-base content model (delivery-plan.md §4, §6.3).
-- Content is "universal" (G-summary "admin universal content control" in
-- requirements-and-vision.md) — unlike users/audit_events, KB tables carry
-- no org_unit_id: any admin can author/publish, and published content is
-- visible to every authenticated user nationwide. The matcher (INC-4) and
-- chat UI (INC-5) are out of scope here.

create table public.kb_categories (
  id uuid primary key default gen_random_uuid(),
  name_fil text not null,
  name_en text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kb_entries (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.kb_categories(id),
  question_fil text not null,
  question_en text not null,
  answer_fil text not null,
  answer_en text not null,
  keywords text[] not null default '{}',
  image_url text,
  status text not null default 'draft' check (status = any (array['draft', 'published'])),
  owner_user_id uuid references public.users(id),
  review_due_on date,
  -- Populated by a trigger, not GENERATED ALWAYS AS: the regconfig cast
  -- to_tsvector needs isn't IMMUTABLE (it depends on the pg_ts_config
  -- catalog), which Postgres generated columns require.
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- INC-3 DoD: publishing without an owner (the KCS ownership rule, §6.3) is blocked.
  constraint kb_entries_publish_requires_owner check (status = 'draft' or owner_user_id is not null)
);

create index kb_entries_search_vector_idx on public.kb_entries using gin (search_vector);
create index kb_entries_category_id_idx on public.kb_entries (category_id);

create or replace function public.kb_entries_set_search_vector()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_vector := to_tsvector('simple',
    coalesce(new.question_fil, '') || ' ' || coalesce(new.question_en, '') || ' ' ||
    coalesce(new.answer_fil, '') || ' ' || coalesce(new.answer_en, '') || ' ' ||
    coalesce(array_to_string(new.keywords, ' '), '')
  );
  return new;
end;
$$;

create trigger kb_entries_set_search_vector before insert or update on public.kb_entries
  for each row execute function public.kb_entries_set_search_vector();

create table public.kb_articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.kb_categories(id),
  title_fil text not null,
  title_en text not null,
  body_fil jsonb not null default '{}'::jsonb,
  body_en jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status = any (array['draft', 'published'])),
  owner_user_id uuid references public.users(id),
  review_due_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kb_articles_publish_requires_owner check (status = 'draft' or owner_user_id is not null)
);

create index kb_articles_category_id_idx on public.kb_articles (category_id);

create table public.synonyms (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  maps_to text not null,
  language text not null check (language = any (array['fil', 'en', 'taglish'])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger kb_categories_set_updated_at before update on public.kb_categories
  for each row execute function public.set_updated_at();
create trigger kb_entries_set_updated_at before update on public.kb_entries
  for each row execute function public.set_updated_at();
create trigger kb_articles_set_updated_at before update on public.kb_articles
  for each row execute function public.set_updated_at();
create trigger synonyms_set_updated_at before update on public.synonyms
  for each row execute function public.set_updated_at();

alter table public.kb_categories enable row level security;
alter table public.kb_entries enable row level security;
alter table public.kb_articles enable row level security;
alter table public.synonyms enable row level security;

create policy kb_categories_read on public.kb_categories
  for select using (true);
create policy kb_categories_admin_write on public.kb_categories
  for all
  using ((select public.current_app_user()).role = 'admin')
  with check ((select public.current_app_user()).role = 'admin');

create policy kb_entries_read on public.kb_entries
  for select using (status = 'published' or (select public.current_app_user()).role = 'admin');
create policy kb_entries_admin_write on public.kb_entries
  for all
  using ((select public.current_app_user()).role = 'admin')
  with check ((select public.current_app_user()).role = 'admin');

create policy kb_articles_read on public.kb_articles
  for select using (status = 'published' or (select public.current_app_user()).role = 'admin');
create policy kb_articles_admin_write on public.kb_articles
  for all
  using ((select public.current_app_user()).role = 'admin')
  with check ((select public.current_app_user()).role = 'admin');

-- Not yet read by anything (the matcher lands in INC-4) — admin-only for now.
create policy synonyms_admin_all on public.synonyms
  for all
  using ((select public.current_app_user()).role = 'admin')
  with check ((select public.current_app_user()).role = 'admin');

-- Storage bucket for kb_entries.image_url. Public bucket: entry images are
-- educational content shown in the chat UI, not access-controlled data.
insert into storage.buckets (id, name, public)
values ('kb-images', 'kb-images', true)
on conflict (id) do nothing;

create policy kb_images_public_read on storage.objects
  for select using (bucket_id = 'kb-images');
create policy kb_images_admin_insert on storage.objects
  for insert with check (bucket_id = 'kb-images' and (select public.current_app_user()).role = 'admin');
create policy kb_images_admin_update on storage.objects
  for update using (bucket_id = 'kb-images' and (select public.current_app_user()).role = 'admin');
create policy kb_images_admin_delete on storage.objects
  for delete using (bucket_id = 'kb-images' and (select public.current_app_user()).role = 'admin');
