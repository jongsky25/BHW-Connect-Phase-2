-- ---------------------------------------------------------------------
-- INC-27: Audio narration + read-along (docs/training-modules-plan.md).
--
-- Narration is pre-rendered at content-load time by scripts/tts-render.mjs
-- (a sibling of training-load.mjs), never at runtime — content is static,
-- so there is no reason to put a paid TTS API on the critical path of a
-- page a BHW opens on mobile data. This migration ships only the storage
-- for that pre-rendered output: one row per (module, section, language),
-- carrying the uploaded audio's URL and sentence-level timing data for the
-- read-along highlight.
--
-- `section_index` is the section's position in the module's FULL authored
-- `lesson.sections` array (INC-20), not an index into whatever subset a
-- given lesson_density renders — density is a client-side filter over the
-- same authored sections (§A.6), and audio is rendered once per authored
-- section regardless of which densities later show it.
--
-- RLS mirrors course_module_visuals exactly (INC-20): learner-facing,
-- follows the module's own scope, admin-write only. Audio, like visuals,
-- carries no information beyond what course_modules/course_module_visuals
-- already expose for a visible module, so there is nothing here that needs
-- a narrower policy than "the module is visible to you".
-- ---------------------------------------------------------------------

create table public.course_module_audio (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules (id) on delete cascade,
  section_index integer not null,
  language text not null check (language in ('fil', 'en')),
  audio_url text not null,
  format text not null default 'opus' check (format in ('opus', 'mp3')),
  duration_seconds numeric not null check (duration_seconds >= 0),
  -- sha256 of the exact narrated text + voice name, so a re-run of
  -- tts-render.mjs can skip unchanged sections instead of re-billing the
  -- provider for text that hasn't changed since the last render.
  content_hash text not null,
  -- [{ zone: 'heading'|'body'|'takeaway', index: int, text, start_ms, end_ms }, ...]
  -- in narration order. See src/lib/elearning/types.ts (LessonAudioTiming)
  -- for the shape the renderer and loader both treat as the contract.
  timings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, section_index, language)
);

create index course_module_audio_module_id_idx on public.course_module_audio using btree (module_id);

drop trigger if exists course_module_audio_set_updated_at on public.course_module_audio;
create trigger course_module_audio_set_updated_at
  before update on public.course_module_audio
  for each row execute function public.set_updated_at();

alter table public.course_module_audio enable row level security;

-- Mirrors course_module_visuals_read exactly (20260808000000_inc20_training_pedagogy.sql).
drop policy if exists course_module_audio_read on public.course_module_audio;
create policy course_module_audio_read on public.course_module_audio for select
  using (
    exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = course_module_audio.module_id
        and (
          (
            c.status = 'published'
            and (select public.current_org_path()) like (select public.org_unit_path(c.org_unit_id)) || '%'
          )
          or (
            (select public.current_app_user()).role = 'admin'
            and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%'
          )
        )
    )
  );

-- Mirrors course_module_visuals_admin_write exactly. tts-render.mjs has no
-- RPC to write through (same "no RPC covers this loader-managed table"
-- situation as course_module_visuals/course_module_facilitator_notes — see
-- training-load.mjs's own header comment), so it writes rows directly
-- through PostgREST under the admin token's own write policy, same path.
drop policy if exists course_module_audio_admin_write on public.course_module_audio;
create policy course_module_audio_admin_write on public.course_module_audio for all
  using (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = course_module_audio.module_id
        and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  )
  with check (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = course_module_audio.module_id
        and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

-- Storage: reuse the flipchart-images bucket pattern
-- (20260731000000_inc14_flipcharts.sql:111-124) — public read (narration
-- audio carries no personal data, same as a KB image or a flip-chart
-- illustration), admin-only insert since only the loader writes here.
-- §5.2's per-route byte budget does not apply: audio is fetched on demand
-- from this bucket, never inlined into a route's own payload.
insert into storage.buckets (id, name, public)
values ('training-audio', 'training-audio', true)
on conflict (id) do nothing;

drop policy if exists training_audio_public_read on storage.objects;
create policy training_audio_public_read on storage.objects for select
  using (bucket_id = 'training-audio');

drop policy if exists training_audio_admin_write on storage.objects;
create policy training_audio_admin_write on storage.objects for insert
  with check (
    bucket_id = 'training-audio'
    and (select public.current_app_user()).role = 'admin'
  );

drop policy if exists training_audio_admin_update on storage.objects;
create policy training_audio_admin_update on storage.objects for update
  using (
    bucket_id = 'training-audio'
    and (select public.current_app_user()).role = 'admin'
  );

drop policy if exists training_audio_admin_delete on storage.objects;
create policy training_audio_admin_delete on storage.objects for delete
  using (
    bucket_id = 'training-audio'
    and (select public.current_app_user()).role = 'admin'
  );

-- No table-level grants here: as with course_module_visuals, schema-level
-- default privileges (outside the migration files) already grant
-- authenticated/anon table access, with RLS as the actual enforcement
-- layer.
