-- Extends audit_event_visible_to_admin() (20260729000000) to cover the
-- subject types INC-12 (Forum) and INC-13 (E-Learning + Assessor) added
-- after that fix was written: `course`/`assessment` from INC-12 and
-- `forum_category`/`forum_thread`/`forum_post` from INC-13. Until this
-- migration, events for all five fell through to the function's
-- fail-closed `else false` and were invisible to every admin — same
-- symptom as the original gap, just for entity types that didn't exist
-- on `main` yet when that fix was written (see delivery-plan.md §5.6).
--
--   - `course`, `assessment` (`courses`/`assessments` tables): org-scoped
--     via `org_unit_id`, same rule as `announcement`/`survey`.
--   - `forum_category`, `forum_thread`, `forum_post`: the forum has no
--     org scoping at all (`forum_categories_read`/`forum_threads_read`
--     policies grant visibility to any authenticated user, not scoped by
--     org unit) — global, like `kb_entry`.
create or replace function public.audit_event_visible_to_admin(p_subject_type text, p_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_subject_type
    when 'kb_entry' then true
    when 'kb_article' then true
    when 'unmatched_question' then true
    when 'report' then true
    when 'forum_category' then true
    when 'forum_thread' then true
    when 'forum_post' then true
    when 'user' then exists (
      select 1 from public.users u
      where u.id = p_subject_id
        and public.org_unit_path(u.org_unit_id) like (select public.current_org_path()) || '%'
    )
    when 'announcement' then exists (
      select 1 from public.announcements a
      where a.id = p_subject_id
        and public.org_unit_path(a.org_unit_id) like (select public.current_org_path()) || '%'
    )
    when 'survey' then exists (
      select 1 from public.surveys s
      where s.id = p_subject_id
        and public.org_unit_path(s.org_unit_id) like (select public.current_org_path()) || '%'
    )
    when 'course' then exists (
      select 1 from public.courses c
      where c.id = p_subject_id
        and public.org_unit_path(c.org_unit_id) like (select public.current_org_path()) || '%'
    )
    when 'assessment' then exists (
      select 1 from public.assessments asm
      where asm.id = p_subject_id
        and public.org_unit_path(asm.org_unit_id) like (select public.current_org_path()) || '%'
    )
    when 'feature_flag' then exists (
      select 1 from public.feature_flags f
      where f.id = p_subject_id
        and (
          f.org_unit_filter is null
          or public.org_unit_path(f.org_unit_filter) like (select public.current_org_path()) || '%'
        )
    )
    else false
  end;
$$;

grant execute on function public.audit_event_visible_to_admin(text, uuid) to authenticated;
