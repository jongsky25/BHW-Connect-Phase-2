-- Follow-up to 20260729000000_fix_audit_events_admin_read_subject_scope.sql.
--
-- That migration fixed `audit_event_visible_to_admin` for the subject types
-- that existed on `main` at the time, but was written and merged before
-- INC-12 (E-Learning + Assessor Certification) and INC-13 (Forum) landed.
-- Their audit events carry subject types the dispatch `case` has no branch
-- for — `course`/`assessment` (INC-12's `course.*`/`assessment.*` events)
-- and `forum_category`/`forum_thread`/`forum_post` (INC-13's `forum.*`
-- events) — so they fall through to `else false` and stay invisible to
-- every admin regardless of scope, the exact gap the prior migration
-- closed for `user`/`announcement`/`survey`/`kb_entry`/etc. Flagged as a
-- known follow-up in delivery-plan.md §5.6. INC-14 (Flip-Chart Builder),
-- merged since, adds the same gap for its `flip_chart` subject type, so
-- this pass picks that up too. INC-15 (Offline/PWA) writes no audit
-- events, so it needs no case here.
--
-- Scope rule per subject type, same reasoning as the prior migration:
--   - `course`, `assessment`: org-scoped exactly like `announcement` and
--     `survey` — both tables carry `org_unit_id`, visible if that org
--     unit is at-or-below the admin's own scope.
--   - `forum_category`, `forum_thread`, `forum_post`: forum content is
--     deliberately *not* hierarchy-scoped (see INC-13's migration header
--     and delivery-plan.md's INC-13 entry — a cross-cutting space, visible
--     app-wide to any authenticated user) — always visible.
--   - `flip_chart`: `flip_charts` carries no `org_unit_id` at all; like
--     `kb_entry`/`kb_article`, it's global content once it exists —
--     always visible.
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
    when 'flip_chart' then true
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
      select 1 from public.assessments a
      where a.id = p_subject_id
        and public.org_unit_path(a.org_unit_id) like (select public.current_org_path()) || '%'
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
