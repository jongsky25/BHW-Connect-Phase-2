-- Keep the same admin and subject-scope rules, but evaluate the entire
-- caller-only role predicate as an initplan. Comparing the role outside
-- the initplan made PostgreSQL estimate only 48 visible rows out of 28k,
-- so LIMIT 100 chose a full scan and per-row scope checks (~8.9 seconds).
-- The boolean initplan lets the existing created_at index serve the latest
-- 100 visible events (~53 ms) within the Data API's 8-second timeout.
-- No grants, subject visibility rules, or audit records change.
alter policy audit_events_admin_read on public.audit_events
  using (
    (select (public.current_app_user()).role = 'admin')
    and (
      subject_id is null
      or public.audit_event_visible_to_admin(audit_events.subject_type, audit_events.subject_id)
    )
  );
