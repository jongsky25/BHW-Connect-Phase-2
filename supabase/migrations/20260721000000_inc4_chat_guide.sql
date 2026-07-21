-- ---------------------------------------------------------------------
-- INC-4: Chat Guide matching engine.
--
-- Adds the chat_sessions / chat_messages / unmatched_questions tables
-- from the data model (delivery-plan.md §4), a public-read policy on
-- synonyms (the Taglish/typo dictionary every role's Chat Guide query
-- expands against — the existing synonyms_admin_all policy only covers
-- admins), and the two security-definer RPCs the /api/chat route calls:
-- a per-user sliding-window rate limit and the unmatched-question
-- upsert/dedup used when the matcher scores below the no-answer
-- threshold (§6.1 step 4).
-- ---------------------------------------------------------------------

create extension if not exists pg_trgm with schema extensions;

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists chat_sessions_user_id_idx on public.chat_sessions using btree (user_id);

alter table public.chat_sessions enable row level security;

drop policy if exists chat_sessions_owner_all on public.chat_sessions;
create policy chat_sessions_owner_all on public.chat_sessions for all
  using (user_id = (select public.current_app_user()).id)
  with check (user_id = (select public.current_app_user()).id);

drop policy if exists chat_sessions_admin_read on public.chat_sessions;
create policy chat_sessions_admin_read on public.chat_sessions for select
  using ((select public.current_app_user()).role = 'admin');

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  sender text not null check (sender in ('user', 'system')),
  text text not null,
  matched_entry_id uuid references public.kb_entries (id),
  match_score numeric,
  feedback text check (feedback in ('up', 'down')),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_id_idx on public.chat_messages using btree (session_id);

alter table public.chat_messages enable row level security;

drop policy if exists chat_messages_owner_all on public.chat_messages;
create policy chat_messages_owner_all on public.chat_messages for all
  using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id
        and s.user_id = (select public.current_app_user()).id
    )
  )
  with check (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id
        and s.user_id = (select public.current_app_user()).id
    )
  );

drop policy if exists chat_messages_admin_read on public.chat_messages;
create policy chat_messages_admin_read on public.chat_messages for select
  using ((select public.current_app_user()).role = 'admin');

create table if not exists public.unmatched_questions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  normalized_text text not null unique,
  asked_count integer not null default 1,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_entry_id uuid references public.kb_entries (id),
  first_asked_at timestamptz not null default now(),
  last_asked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists unmatched_questions_status_idx on public.unmatched_questions using btree (status);

drop trigger if exists unmatched_questions_set_updated_at on public.unmatched_questions;
create trigger unmatched_questions_set_updated_at
  before update on public.unmatched_questions
  for each row execute function public.set_updated_at();

alter table public.unmatched_questions enable row level security;

drop policy if exists unmatched_questions_admin_all on public.unmatched_questions;
create policy unmatched_questions_admin_all on public.unmatched_questions for all
  using ((select public.current_app_user()).role = 'admin')
  with check ((select public.current_app_user()).role = 'admin');

drop policy if exists synonyms_read on public.synonyms;
create policy synonyms_read on public.synonyms for select using (true);

create table if not exists public.chat_rate_limits (
  user_id uuid primary key references public.users (id) on delete cascade,
  window_start timestamptz not null default now(),
  request_count integer not null default 0
);

alter table public.chat_rate_limits enable row level security;
-- No policies: only the security-definer rpc_chat_check_rate_limit below
-- touches this table, so RLS blocks direct client access entirely.

create or replace function public.rpc_chat_check_rate_limit(
  p_limit integer default 20,
  p_window_seconds integer default 60
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_row public.chat_rate_limits;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null then
    raise exception 'not authorized';
  end if;

  insert into public.chat_rate_limits (user_id, window_start, request_count)
  values (v_actor.id, now(), 1)
  on conflict (user_id) do update set
    window_start = case
      when now() - chat_rate_limits.window_start > make_interval(secs => p_window_seconds)
        then now()
        else chat_rate_limits.window_start
    end,
    request_count = case
      when now() - chat_rate_limits.window_start > make_interval(secs => p_window_seconds)
        then 1
        else chat_rate_limits.request_count + 1
    end
  returning * into v_row;

  if v_row.request_count > p_limit then
    return query select false,
      greatest(0, p_window_seconds - extract(epoch from (now() - v_row.window_start))::integer);
  else
    return query select true, 0;
  end if;
end;
$$;

grant execute on function public.rpc_chat_check_rate_limit(integer, integer) to authenticated;

create or replace function public.rpc_chat_upsert_unmatched(
  p_text text,
  p_normalized_text text
)
returns table (unmatched_id uuid, asked_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_row public.unmatched_questions;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null then
    raise exception 'not authorized';
  end if;

  if p_normalized_text is null or length(trim(p_normalized_text)) = 0 then
    raise exception 'normalized text is required';
  end if;

  insert into public.unmatched_questions (text, normalized_text, asked_count, last_asked_at)
  values (p_text, p_normalized_text, 1, now())
  on conflict (normalized_text) do update set
    asked_count = public.unmatched_questions.asked_count + 1,
    last_asked_at = now(),
    status = case
      when public.unmatched_questions.status = 'dismissed' then 'open'
      else public.unmatched_questions.status
    end
  returning * into v_row;

  return query select v_row.id, v_row.asked_count;
end;
$$;

grant execute on function public.rpc_chat_upsert_unmatched(text, text) to authenticated;
