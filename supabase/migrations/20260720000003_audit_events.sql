-- INC-1: audit_events — append-only log behind the "laymanized audit" viewer
-- (full viewer UI ships in INC-2). Every row carries a pre-rendered plain-
-- language sentence in both locales per delivery-plan.md §5.6. Only the
-- INC-1 auth slice of the fixed taxonomy is emitted so far: auth.login,
-- auth.login_failed, auth.lockout, user.consent_given.

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users (id),
  event_type text not null,
  subject_type text not null,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  plain_summary_fil text not null,
  plain_summary_en text not null,
  created_at timestamptz not null default now()
);

create index audit_events_actor_user_id_idx on public.audit_events (actor_user_id);
create index audit_events_created_at_idx on public.audit_events (created_at desc);

alter table public.audit_events enable row level security;

-- Admins can read audit events for their own org scope and below; the
-- filtered/laymanized viewer UI itself lands in INC-2.
create policy audit_events_admin_read on public.audit_events
  for select
  using (
    (select role from public.current_app_user()) = 'admin'
    and (
      subject_id is null
      or exists (
        select 1 from public.users u
        join public.org_units o on o.id = u.org_unit_id
        where u.id = audit_events.subject_id
          and o.path like (select public.current_org_path()) || '%'
      )
    )
  );

-- No insert/update/delete policies: every row is written by the
-- SECURITY DEFINER RPC functions below, which bypass RLS.
