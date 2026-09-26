-- A lesson-level "Panoorin" (Watch) asset shown once, outside the Read/
-- Slides section arc (docs/handrub-clip-enhancement-handoff.md §2, option
-- C). Application-side validation (scripts/lib/reference-content.mjs)
-- already checks it references a known asset id in the same revision's
-- `assets` array; this column only enforces the id-shape convention shared
-- with lesson_key/section ids.
alter table public.course_lesson_revisions
  add column featured_asset_id text null
    check (featured_asset_id is null or featured_asset_id ~ '^[a-z0-9][a-z0-9-]*$');
