-- Fix `audit_events_admin_read` (baseline migration) so admins can see
-- audit events whose subject isn't a `users` row.
--
-- The original policy's `exists` subquery only ever joined `users` to
-- `org_units`, so any event whose `subject_type` isn't `user` — `kb_entry`,
-- `kb_article`, `unmatched_question`, `feature_flag` (`flag.toggled`),
-- `announcement`, `survey`, `report` — fell through to
-- `subject_id is null`, which is false for all of these, so the whole
-- `exists` OR-branch evaluated to false and the event was silently
-- invisible to every admin regardless of org scope. Documented as a known
-- gap in delivery-plan.md §5.6 since INC-10/INC-11; this is that pass.
--
-- `audit_event_visible_to_admin` below is a security-definer helper (same
-- reason `org_unit_path()` exists, per its comment in the INC-10
-- migration: a raw `org_units` lookup inside another table's RLS policy
-- runs as the querying role and inherits `org_units_read_own_scope`'s
-- descendants-only visibility, silently collapsing an "at-or-above my
-- scope" check to false). It dispatches on `subject_type`:
--   - `user`, `announcement`, `survey`: org-scoped subjects — visible if
--     the subject's org unit is at-or-below the admin's own scope, same
--     rule the original policy applied to `user`.
--   - `feature_flag`: org-scoped only when `org_unit_filter` is set; a
--     flag with no filter is global and visible to every admin.
--   - `kb_entry`, `kb_article`, `unmatched_question`, `report`: not
--     org-scoped at all (global content / gap queue; `report.exported`
--     never sets `subject_id` in the first place) — always visible.
--   - anything else (a future subject type nobody's added a case for
--     yet): false, matching today's fail-closed behavior rather than
--     guessing at a scope rule that might leak across org units.
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

drop policy if exists audit_events_admin_read on public.audit_events;
create policy audit_events_admin_read on public.audit_events
  for select
  using (
    (select public.current_app_user()).role = 'admin'
    and (
      subject_id is null
      or public.audit_event_visible_to_admin(audit_events.subject_type, audit_events.subject_id)
    )
  );
