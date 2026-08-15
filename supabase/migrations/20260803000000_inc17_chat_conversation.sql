-- INC-17 — Conversational Chat Guide.
--
-- The Chat Guide has been single-turn since INC-4: /api/chat takes one string,
-- scores it against every published entry and answers. chat_messages was
-- written but never read back, and a "did you mean" turn stored the literal
-- string 'did_you_mean' with the candidate list discarded — so a follow-up
-- could not refer to anything, and tapping a suggestion re-POSTed the
-- canonical question text as a brand-new question.
--
-- This migration adds the state a conversation needs. It does not change any
-- existing column or policy: with the chat_conversation flag off, the route
-- writes exactly what it wrote before and /chat behaves identically.

-- 1. Per-turn state ---------------------------------------------------------

alter table public.chat_messages
  add column if not exists kind text
    check (kind is null or kind in ('question', 'answer', 'did_you_mean', 'clarify', 'no_answer')),
  -- How the turn was decided, as distinct from what was shown. Lets the
  -- dashboard separate a red-flag interception from an ordinary high-scoring
  -- match — without it, a forced emergency answer is indistinguishable from a
  -- confident one.
  add column if not exists route text
    check (route is null or route in ('direct', 'red_flag', 'clarify', 'selection', 'context_carry')),
  -- The candidate set actually offered, so a later turn can resolve a
  -- selection by id instead of re-scoring text.
  add column if not exists candidates jsonb,
  -- What was matched after context resolution, which for a follow-up is not
  -- what the BHW typed.
  add column if not exists resolved_query text;

comment on column public.chat_messages.kind is
  'Response type shown to the BHW. Null for rows written before INC-17.';
comment on column public.chat_messages.route is
  'How the turn was routed: direct scoring, red-flag interception, clarifier, clarifier selection, or follow-up context carry.';

-- 2. Rolling session context ------------------------------------------------

-- Deliberately small: the last answered entry (for follow-up carry) and the
-- clarifier awaiting a reply (so the same question is never asked twice in a
-- row). No transcript is duplicated here.
alter table public.chat_sessions
  add column if not exists context jsonb;

comment on column public.chat_sessions.context is
  'Rolling conversation state: {lastEntryId, pendingClarifierId}. Not a transcript.';

-- 3. Analytics taxonomy -----------------------------------------------------

-- rpc_track_event allowlists event names and raises on anything else, so the
-- three new events have to be added here or they are silently dropped. The
-- existing names are repeated verbatim — this is an extension, not a rewrite.
create or replace function public.rpc_track_event(
  p_event_name text,
  p_properties jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null then
    raise exception 'not authorized';
  end if;

  if p_event_name not in (
    'session.started', 'chat.question_asked', 'chat.answer_shown',
    'chat.no_answer', 'chat.feedback_given', 'kb.article_viewed',
    -- INC-17
    'chat.clarify_shown', 'chat.clarify_answered', 'chat.red_flag_shown'
  ) then
    raise exception 'invalid event name';
  end if;

  insert into public.analytics_events (user_id, event_name, properties)
  values (v_actor.id, p_event_name, coalesce(p_properties, '{}'::jsonb));
end;
$$;

revoke execute on function public.rpc_track_event(text, jsonb) from public, anon;
grant execute on function public.rpc_track_event(text, jsonb) to authenticated;

-- 4. Feature flag -----------------------------------------------------------

-- Default off, per the later-phase pattern: the pilot is unaffected until
-- someone deliberately turns this on, and flipping it back off restores the
-- single-turn behaviour without a deploy.
insert into public.feature_flags (key, enabled, description)
values (
  'chat_conversation',
  false,
  'Conversational Chat Guide: red-flag interception, clarifying follow-up questions, and follow-up context carry.'
)
on conflict (key) do nothing;
