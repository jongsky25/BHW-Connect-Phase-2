-- INC-18b — the flywheel: AI drafts a KB entry from a cleared gap question.
--
-- INC-18a built the gate, the budget guard and the adapter, and deliberately
-- shipped nothing that spends the quota. This migration is the database half of
-- the feature that does:
--
--   a BHW asks something the KB cannot answer -> it lands in the gap queue ->
--   an admin reads it, redacts it, and clears it -> the AI drafts a bilingual
--   entry -> the admin reviews and publishes -> the next BHW who asks is
--   answered from the KB, with no AI call at all.
--
-- The single hard requirement from free-ai-leverage-plan.md's risk table is
-- "No LLM-generated text reaches a BHW unreviewed." That is enforced here, in
-- rpc_kb_entry_update, rather than in the form — a direct PostgREST publish
-- attempt has to fail the same way the UI does, or the control is decorative.

-- 1. Provenance --------------------------------------------------------------

-- Two timestamps rather than one boolean pair: "when was this drafted by a
-- model" and "when did a human sign off on it" are both facts an auditor may
-- ask for, and a null is a cheaper way to say "never" than a separate flag.
--
-- Entries created before this migration have both null, which reads correctly:
-- not AI-drafted, so nothing to confirm, so the publish gate below never fires
-- for them.
alter table public.kb_entries
  add column if not exists ai_drafted_at timestamptz,
  add column if not exists ai_draft_confirmed_at timestamptz;

comment on column public.kb_entries.ai_drafted_at is
  'Set when the entry body was drafted by an external AI provider (INC-18b). Null means human-authored.';

comment on column public.kb_entries.ai_draft_confirmed_at is
  'Set when an admin explicitly confirmed they reviewed the AI draft. Publishing an ai_drafted_at row with this null is refused by rpc_kb_entry_update.';

-- Partial index: the flywheel KPI and the "needs review" case both filter on
-- ai_drafted_at is not null, which is a small minority of rows.
create index if not exists kb_entries_ai_drafted_at_idx
  on public.kb_entries (ai_drafted_at)
  where ai_drafted_at is not null;

-- 2. The review gate ---------------------------------------------------------

-- Replaced at the SAME 11-argument signature, deliberately. `create or replace
-- function` keys on the full argument list, so adding a parameter would create
-- a second overload and PostgREST would answer every call with PGRST203
-- ambiguity — a trap this repo has already hit once (INC-17b). The new
-- behaviour needs no new parameter: it reads the row it is already locking.
--
-- Body is otherwise byte-identical to the INC-8 version; the only addition is
-- the publish check below.
create or replace function public.rpc_kb_entry_update(
  p_id uuid,
  p_category_id uuid,
  p_question_fil text,
  p_question_en text,
  p_answer_fil text,
  p_answer_en text,
  p_keywords text[],
  p_image_url text,
  p_owner_user_id uuid,
  p_review_due_on date,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_before public.kb_entries;
  v_gap public.unmatched_questions;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_before from public.kb_entries where id = p_id for update;
  if v_before is null then
    raise exception 'entry not found';
  end if;

  if p_status not in ('draft', 'published') then
    raise exception 'invalid status';
  end if;

  if p_status = 'published' and p_owner_user_id is null then
    raise exception 'an owner is required to publish';
  end if;

  -- The one new rule. Checked on the locked row, so a concurrent confirm and
  -- publish cannot interleave into a published-but-unreviewed entry.
  if p_status = 'published'
     and v_before.ai_drafted_at is not null
     and v_before.ai_draft_confirmed_at is null then
    raise exception 'ai draft must be reviewed before publishing';
  end if;

  update public.kb_entries set
    category_id = p_category_id,
    question_fil = p_question_fil,
    question_en = p_question_en,
    answer_fil = p_answer_fil,
    answer_en = p_answer_en,
    keywords = coalesce(p_keywords, '{}'::text[]),
    image_url = p_image_url,
    owner_user_id = p_owner_user_id,
    review_due_on = p_review_due_on,
    status = p_status
  where id = p_id;

  if v_before.status != 'published' and p_status = 'published' then
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_published', 'kb_entry', p_id,
      format('Inilathala ni %s ang tanong-sagot na "%s".', v_actor.username, p_question_fil),
      format('%s published the Q&A entry "%s".', v_actor.username, p_question_en));

    update public.unmatched_questions
      set status = 'resolved'
      where resolved_entry_id = p_id and status != 'resolved'
      returning * into v_gap;

    if v_gap.id is not null then
      insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
      values (v_actor.id, 'gap.resolved', 'unmatched_question', v_gap.id,
        format('Nalutas ni %s ang tanong na "%s" gamit ang na-publish na entry.', v_actor.username, v_gap.text),
        format('%s resolved the question "%s" with the published entry.', v_actor.username, v_gap.text));

      insert into public.analytics_events (user_id, event_name, properties)
      values (v_actor.id, 'gap.resolved', jsonb_build_object('unmatched_question_id', v_gap.id, 'entry_id', p_id));
    end if;
  elsif v_before.status = 'published' and p_status = 'draft' then
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_archived', 'kb_entry', p_id,
      format('Inalis ni %s sa publikasyon ang tanong-sagot na "%s".', v_actor.username, p_question_fil),
      format('%s unpublished the Q&A entry "%s".', v_actor.username, p_question_en));
  else
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_updated', 'kb_entry', p_id,
      format('Na-update ni %s ang tanong-sagot na "%s".', v_actor.username, p_question_fil),
      format('%s updated the Q&A entry "%s".', v_actor.username, p_question_en));
  end if;
end;
$$;

-- 3. Marking a row as AI-drafted, and confirming it --------------------------

-- Called by POST /api/admin/gap/draft immediately after rpc_kb_entry_create.
-- A separate RPC rather than an extra parameter on the create function, for
-- the overload reason above; the same escape INC-17b took for content_id.
create or replace function public.rpc_kb_entry_mark_ai_drafted(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_entry public.kb_entries;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_entry from public.kb_entries where id = p_id for update;
  if v_entry is null then
    raise exception 'entry not found';
  end if;

  -- Only ever applied to a fresh draft. Stamping a published entry as
  -- AI-drafted would retroactively invent provenance, and stamping one that is
  -- already confirmed would not un-confirm it — both are caller bugs.
  if v_entry.status != 'draft' then
    raise exception 'only a draft entry can be marked as AI-drafted';
  end if;

  update public.kb_entries
    set ai_drafted_at = coalesce(ai_drafted_at, now()),
        ai_draft_confirmed_at = null
    where id = p_id;
end;
$$;

-- The human sign-off. Separate from rpc_kb_entry_update so that "I reviewed
-- this" is its own audited act rather than a side effect of saving a form —
-- which is what makes the accountability trail meaningful.
create or replace function public.rpc_kb_entry_confirm_ai_draft(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_entry public.kb_entries;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_entry from public.kb_entries where id = p_id for update;
  if v_entry is null then
    raise exception 'entry not found';
  end if;

  if v_entry.ai_drafted_at is null then
    raise exception 'entry is not an ai draft';
  end if;

  -- Idempotent: re-confirming keeps the first sign-off rather than moving the
  -- timestamp, so the audit row and the column agree about who signed off when.
  if v_entry.ai_draft_confirmed_at is not null then
    return;
  end if;

  update public.kb_entries
    set ai_draft_confirmed_at = now()
    where id = p_id;

  -- One event on the transition, not one per call. The entry form calls this
  -- immediately before every publish, so an unconditional insert would put a
  -- duplicate row into /admin/audit each time an already-confirmed entry was
  -- republished — and that page is a hardcoded .limit(100) with no filtering,
  -- so noise there costs real visibility. Same discipline as the breaker
  -- transition in the INC-18a migration.
  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'kb.ai_draft_confirmed', 'kb_entry', p_id,
    format('Sinuri at kinumpirma ni %s ang AI draft na "%s".', v_actor.username, v_entry.question_fil),
    format('%s reviewed and confirmed the AI draft "%s".', v_actor.username, v_entry.question_en));
end;
$$;

-- subject_type 'kb_entry' is used above rather than a new value, deliberately.
-- audit_event_visible_to_admin ends in `else false`, so any new subject_type is
-- invisible to every admin until a branch is added for it — a bug this repo has
-- shipped twice. 'kb_entry' already has a branch, so the event is visible with
-- no policy change at all.

-- 4. The flywheel KPI --------------------------------------------------------

-- The number that makes "relies less and less on the LLM" measurable rather
-- than aspirational: how many entries the AI drafted, how many of those an
-- admin published, and how many gap_draft calls were spent to get there.
--
-- A separate RPC rather than four more columns on rpc_reports_kpi_summary:
-- widening a `returns table` on an unchanged argument list requires
-- drop function + re-grant, which is avoidable churn in a function the whole
-- reports tab depends on.
--
-- ai_usage has zero RLS policies by design (INC-18a), so reading it needs a
-- definer function; this is that function for the reports tab.
create or replace function public.rpc_dashboard_ai_flywheel(
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  drafts_created integer,
  drafts_published integer,
  drafts_awaiting_review integer,
  gap_draft_calls integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  -- No current_org_path() scoping here, unlike the other dashboard RPCs. Those
  -- count BHW activity, which belongs to an org subtree; the KB is a single
  -- national corpus with no org column, and the AI quota is one account-wide
  -- budget. Scoping either would mean inventing an ownership model that does
  -- not exist. The admin check above is the authorization boundary.
  return query
    select
      (select count(*)::integer from public.kb_entries e
        where e.ai_drafted_at is not null
          and e.ai_drafted_at >= p_start and e.ai_drafted_at < p_end),
      (select count(*)::integer from public.kb_entries e
        where e.ai_drafted_at is not null
          and e.status = 'published'
          and e.ai_drafted_at >= p_start and e.ai_drafted_at < p_end),
      -- Deliberately not windowed: a draft waiting for review is a to-do, and
      -- a to-do from last month is more urgent than one from today, not less.
      (select count(*)::integer from public.kb_entries e
        where e.ai_drafted_at is not null
          and e.ai_draft_confirmed_at is null
          and e.status = 'draft'),
      (select coalesce(sum(u.request_count), 0)::integer from public.ai_usage u
        where u.feature = 'gap_draft'
          and u.window_kind = 'day'
          and u.window_start >= p_start::date and u.window_start < p_end::date);
end;
$$;

revoke execute on function public.rpc_kb_entry_mark_ai_drafted(uuid) from public, anon;
revoke execute on function public.rpc_kb_entry_confirm_ai_draft(uuid) from public, anon;
revoke execute on function public.rpc_dashboard_ai_flywheel(timestamptz, timestamptz) from public, anon;

grant execute on function public.rpc_kb_entry_mark_ai_drafted(uuid) to authenticated;
grant execute on function public.rpc_kb_entry_confirm_ai_draft(uuid) to authenticated;
grant execute on function public.rpc_dashboard_ai_flywheel(timestamptz, timestamptz) to authenticated;

-- 5. Feature flag ------------------------------------------------------------

-- Per-feature switch under the ai_external master switch from INC-18a. Both
-- must be on for a draft to be requested, so the master switch remains a real
-- kill switch and this one can be used to retire the feature independently.
insert into public.feature_flags (key, enabled, description)
values (
  'ai_gap_draft',
  false,
  'Lets an admin send a cleared gap question to an AI provider to draft a KB entry. Requires ai_external. Off means the gap queue keeps only its manual "create entry from this" action.'
)
on conflict (key) do nothing;
