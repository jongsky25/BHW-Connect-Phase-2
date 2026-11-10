-- Finishing the last required lesson of Chapter 1 failed for every BHW once the
-- formal-review flow took authority (c1af28). rpc_course_lesson_complete calls
-- course_progress_maybe_finish, which inserted a legacy `assessments` row; the
-- c1af20 legacy_guard() trigger rejects that insert with 'Chapter 1 decision
-- requires formal review', so the whole completion rolled back and the lesson
-- never saved (HTTP 400). The lesson that finishes the chapter is whichever one
-- the BHW completes last, e.g. 1.9.3 normally or 1.8 after doing 1.9 first.
--
-- Same body as the inc12 definition. The only change: do not create the legacy
-- assessment row when Chapter 1 formal authority is active for this course,
-- because the formal flow owns the decision there. The condition mirrors the
-- guard's own `v_activated` test so the two cannot disagree. CREATE OR REPLACE
-- keeps the existing grants (execute stays revoked from public roles).
create or replace function public.course_progress_maybe_finish(p_course_progress_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_progress public.course_progress;
  v_total_modules integer;
  v_completed_modules integer;
begin
  select * into v_progress from public.course_progress where id = p_course_progress_id;

  select count(*) into v_total_modules from public.course_modules where course_id = v_progress.course_id;
  select count(*) into v_completed_modules
    from public.course_module_progress
    where course_progress_id = p_course_progress_id and completed_at is not null;

  if v_completed_modules < v_total_modules then
    return;
  end if;

  update public.course_progress
    set status = 'content_completed', content_completed_at = now()
    where id = p_course_progress_id and status = 'in_progress';

  if not exists (select 1 from public.assessments where course_id = v_progress.course_id and bhw_user_id = v_progress.bhw_user_id)
    and not exists (
      select 1
      from public.training_program_chapters chapter
      join public.training_programs program on program.id = chapter.program_id
      join public.assessor_flow_cohorts cohort on cohort.program_id = chapter.program_id
        and cohort.chapter_key = chapter.chapter_key
      where chapter.course_id = v_progress.course_id
        and chapter.chapter_key = 'chapter-1'
        and program.content_key = 'bhw-reference-manual'
        and cohort.authority_cutover_at is not null
    ) then
    insert into public.assessments (course_id, bhw_user_id, org_unit_id)
    select v_progress.course_id, v_progress.bhw_user_id, u.org_unit_id
    from public.users u
    where u.id = v_progress.bhw_user_id;
  end if;
end;
$$;
