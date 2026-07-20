-- audit_events: append-only log backing the "laymanized audit" viewer
-- (delivery-plan.md §5.6). The full taxonomy and the viewer UI ship in
-- INC-2; this increment only writes the auth/consent events it produces.

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id),
  event_type text not null,
  subject_type text,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  plain_summary_fil text not null,
  plain_summary_en text not null,
  created_at timestamptz not null default now()
);

create index audit_events_actor_user_id_idx on audit_events (actor_user_id);
create index audit_events_event_type_idx on audit_events (event_type);
create index audit_events_created_at_idx on audit_events (created_at desc);

alter table audit_events enable row level security;

-- Audit integrity: written exclusively by server-side auth code via the
-- service role (bypasses RLS). No policy is granted to `authenticated` in
-- this increment, so the table is unreadable and unwritable from a
-- client-held session; the scoped admin-facing viewer policy lands in
-- INC-2 alongside the viewer itself.
