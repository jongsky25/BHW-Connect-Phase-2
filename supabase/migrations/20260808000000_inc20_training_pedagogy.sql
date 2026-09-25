-- ---------------------------------------------------------------------
-- INC-20: Training pedagogy layer — bookends, structured lesson, visuals,
-- facilitator competency guide (docs/training-modules-plan.md §A/§D).
--
-- Extends INC-12's course_modules (not a parallel content system):
--   - objectives_*/summary_* + lesson jsonb add the §A.1 bookend format and
--     the §A.2/§A.5 chunked, tiered lesson body directly onto the existing
--     table. All five columns are nullable/defaulted so every pre-existing
--     course_modules row (INC-12, dark-launched) is untouched and a null
--     `lesson` keeps rendering the old body_fil/body_en path exactly as
--     today — this migration is a pure additive no-op for existing content.
--   - course_module_facilitator_notes is its own table, not more columns on
--     course_modules, specifically so RLS can keep the §A.4 competency
--     guide away from `bhw` entirely: Postgres RLS is row-level, so columns
--     on course_modules (which bhw can already read) would be unhideable.
--   - course_module_visuals is its own table (one row per diagram) so a
--     module can carry an ordered sequence of visuals, each with the required
--     bilingual alt text §A.2 demands and the required §A.6 tier.
--
-- RLS follows the exact same courses -> course_modules -> (child table)
-- shape course_quiz_questions already uses (20260729000000_inc12_elearning.sql),
-- extended one level further to the two new child tables. Both new tables'
-- policies only ever look "up" toward course_modules/courses, never toward
-- each other, so this migration carries none of INC-19's cross-referencing
-- helper functions — read on for how that was actually confirmed, not just
-- assumed from a read-through (INC-19 looked one-way safe on a read-through
-- too, and wasn't).
-- ---------------------------------------------------------------------

alter table public.course_modules
  add column if not exists objectives_fil text[] not null default '{}',
  add column if not exists objectives_en  text[] not null default '{}',
  add column if not exists summary_fil text not null default '',
  add column if not exists summary_en  text not null default '',
  add column if not exists lesson jsonb; -- null => render body_fil/body_en as today (INC-12 behavior, unchanged)

-- §A.4 facilitator/assessor competency guide. Kept off course_modules so RLS
-- can withhold it from `bhw` entirely (see header note above).
create table if not exists public.course_module_facilitator_notes (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null unique references public.course_modules (id) on delete cascade,
  notes_fil text not null default '',
  notes_en text not null default '',
  competency_statement_fil text not null default '',
  competency_statement_en text not null default '',
  -- [{ objective_index, observable_fil, observable_en, not_yet_fil, not_yet_en,
  --    levels: { kaya_na_fil, kaya_na_en, kailangan_practice_fil,
  --              kailangan_practice_en, hindi_pa_fil, hindi_pa_en } }, ...]
  observation_indicators jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists course_module_facilitator_notes_set_updated_at on public.course_module_facilitator_notes;
create trigger course_module_facilitator_notes_set_updated_at
  before update on public.course_module_facilitator_notes
  for each row execute function public.set_updated_at();

alter table public.course_module_facilitator_notes enable row level security;

-- §A.2 visuals. Exactly one of svg_markup / image_url (the two mechanisms
-- §A.2 decided on: inline SVG for instructional diagrams, a Storage URL for
-- photographs/procedural illustrations). Caption states the takeaway, not
-- the label; alt_text_* is required on every row — flip_chart_pages shipped
-- without an alt-text column (noted in §A.2) and cannot pass an axe-core
-- bar other increments hold themselves to; this table does not repeat that.
create table if not exists public.course_module_visuals (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules (id) on delete cascade,
  position integer not null,
  primitive text not null
    check (primitive in ('hub-spoke', 'chain', 'contrast', 'map', 'tree', 'stack', 'image')),
  svg_markup text,
  image_url text,
  caption_fil text not null,
  caption_en text not null,
  alt_text_fil text not null,
  alt_text_en text not null,
  -- §A.6: default 'core' — a visual only becomes hideable at short density
  -- if the author deliberately marks it enrichment, not by omission.
  tier text not null default 'core' check (tier in ('core', 'standard', 'deep')),
  created_at timestamptz not null default now(),
  unique (module_id, position),
  check (num_nonnulls(svg_markup, image_url) = 1),
  check (length(trim(alt_text_fil)) > 0 and length(trim(alt_text_en)) > 0)
);

create index if not exists course_module_visuals_module_id_idx on public.course_module_visuals using btree (module_id, position);

alter table public.course_module_visuals enable row level security;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

-- assessor/admin only — deliberately no `bhw` branch at all (see header
-- note: this table exists specifically so RLS can withhold it from bhw).
drop policy if exists course_module_facilitator_notes_assessor_admin_read on public.course_module_facilitator_notes;
create policy course_module_facilitator_notes_assessor_admin_read on public.course_module_facilitator_notes for select
  using (
    (select public.current_app_user()).role in ('assessor', 'admin')
    and exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = course_module_facilitator_notes.module_id
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

-- Mirrors course_modules_admin_write exactly, joined through course_modules
-- -> courses, same shape course_quiz_questions_admin_write already uses.
drop policy if exists course_module_facilitator_notes_admin_write on public.course_module_facilitator_notes;
create policy course_module_facilitator_notes_admin_write on public.course_module_facilitator_notes for all
  using (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = course_module_facilitator_notes.module_id
        and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  )
  with check (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = course_module_facilitator_notes.module_id
        and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

-- Visuals are learner-facing: mirrors course_modules_read / course_quiz_questions_read.
drop policy if exists course_module_visuals_read on public.course_module_visuals;
create policy course_module_visuals_read on public.course_module_visuals for select
  using (
    exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = course_module_visuals.module_id
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

drop policy if exists course_module_visuals_admin_write on public.course_module_visuals;
create policy course_module_visuals_admin_write on public.course_module_visuals for all
  using (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = course_module_visuals.module_id
        and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  )
  with check (
    (select public.current_app_user()).role = 'admin'
    and exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = course_module_visuals.module_id
        and (select public.org_unit_path(c.org_unit_id)) like (select public.current_org_path()) || '%'
    )
  );

-- The four new course_modules columns (objectives_*/summary_*/lesson) need
-- NO policy change: they ride the existing course_modules_read /
-- course_modules_admin_write policies unmodified, which is safe here
-- precisely because all four are learner-facing, same visibility as
-- body_fil/body_en already have.
--
-- No table-level grants here: as with every other table in this codebase,
-- schema-level default privileges (outside the migration files, same as
-- auth/storage) already grant authenticated/anon table access, with RLS
-- as the actual enforcement layer.
