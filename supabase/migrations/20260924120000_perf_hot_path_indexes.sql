-- Performance: indexes for the lookups the learner pages and Chat Guide run
-- on every request (docs/performance-slowdown-plan.md, Phase 4 first pass).
--
-- Additive only. Each index backs a query filter the app issues today and
-- also covers a foreign key the Supabase performance advisor flagged as
-- unindexed. Pilot tables are still small, so this is headroom for growth
-- rather than a fix for current latency (which was network round trips,
-- addressed in Phases 1-3).

-- /courses and dashboards look up a BHW's progress by user; the existing
-- unique (course_id, bhw_user_id) only helps when course_id is known.
create index if not exists course_progress_bhw_user_id_idx
  on public.course_progress (bhw_user_id);

-- courses/[id] and the training chapter page read a BHW's certificate by
-- (bhw_user_id, course_id); there was no index beyond the PK/verification code.
create index if not exists certificates_bhw_user_id_course_id_idx
  on public.certificates (bhw_user_id, course_id);

-- Same shape for a BHW's assessments.
create index if not exists assessments_bhw_user_id_course_id_idx
  on public.assessments (bhw_user_id, course_id);

-- Lesson pages join lessons to their published revision.
create index if not exists course_lessons_published_revision_id_idx
  on public.course_lessons (published_revision_id);

-- Module progress lookups/cascades by module.
create index if not exists course_module_progress_module_id_idx
  on public.course_module_progress (module_id);

-- api/chat's first-answer check counts a user's system messages with a
-- matched entry; partial so unmatched turns don't bloat it.
create index if not exists chat_messages_matched_entry_id_idx
  on public.chat_messages (matched_entry_id)
  where matched_entry_id is not null;
