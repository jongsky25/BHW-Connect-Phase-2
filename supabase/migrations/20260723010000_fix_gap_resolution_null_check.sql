-- ---------------------------------------------------------------------
-- Fix rpc_kb_entry_create's gap-resolution check (INC-6 follow-up).
--
-- `if v_gap is not null then` is broken for this use case: per the SQL
-- standard, IS NOT NULL on a row/composite type is only true when EVERY
-- field is non-null. unmatched_questions.resolved_entry_id is null on
-- every fresh, unresolved gap by definition — exactly the row this
-- branch exists to handle — so the check was always false and the
-- resolution branch (and the "Create KB entry from this" -> gap.resolved
-- linkage) never ran, confirmed by calling the deployed function
-- directly with a known-good non-null id and inspecting a minimal
-- reproduction of the same `select ... into row_var; if row_var is not
-- null` pattern. Replaced with a check on the row's primary key column,
-- which is never null when a row was actually found.
-- ---------------------------------------------------------------------

create or replace function public.rpc_kb_entry_create(
  p_category_id uuid,
  p_question_fil text,
  p_question_en text,
  p_answer_fil text,
  p_answer_en text,
  p_keywords text[] default '{}'::text[],
  p_image_url text default null,
  p_owner_user_id uuid default null,
  p_review_due_on date default null,
  p_status text default 'draft',
  p_source_unmatched_question_id uuid default null
)
returns table (entry_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_entry_id uuid;
  v_gap public.unmatched_questions;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if p_status not in ('draft', 'published') then
    raise exception 'invalid status';
  end if;

  if p_status = 'published' and p_owner_user_id is null then
    raise exception 'an owner is required to publish';
  end if;

  insert into public.kb_entries (
    category_id, question_fil, question_en, answer_fil, answer_en,
    keywords, image_url, owner_user_id, review_due_on, status
  ) values (
    p_category_id, p_question_fil, p_question_en, p_answer_fil, p_answer_en,
    coalesce(p_keywords, '{}'::text[]), p_image_url, p_owner_user_id, p_review_due_on, p_status
  ) returning id into v_entry_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'kb.entry_created', 'kb_entry', v_entry_id,
    format('Gumawa si %s ng bagong tanong-sagot: "%s".', v_actor.username, p_question_fil),
    format('%s created a new Q&A entry: "%s".', v_actor.username, p_question_en));

  if p_status = 'published' then
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_published', 'kb_entry', v_entry_id,
      format('Inilathala ni %s ang tanong-sagot na "%s".', v_actor.username, p_question_fil),
      format('%s published the Q&A entry "%s".', v_actor.username, p_question_en));
  end if;

  if p_source_unmatched_question_id is not null then
    select * into v_gap from public.unmatched_questions where id = p_source_unmatched_question_id for update;

    if v_gap.id is not null then
      if v_gap.resolved_entry_id is null then
        update public.unmatched_questions set resolved_entry_id = v_entry_id where id = v_gap.id;
      end if;

      if p_status = 'published' and v_gap.status != 'resolved' then
        update public.unmatched_questions set status = 'resolved' where id = v_gap.id;

        insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
        values (v_actor.id, 'gap.resolved', 'unmatched_question', v_gap.id,
          format('Nalutas ni %s ang tanong na "%s" gamit ang bagong entry.', v_actor.username, v_gap.text),
          format('%s resolved the question "%s" with a new entry.', v_actor.username, v_gap.text));
      end if;
    end if;
  end if;

  return query select v_entry_id;
end;
$$;

-- Same defensive fix applied to rpc_kb_entry_update's gap-resolution check
-- for consistency, even though it happens to work today only because its
-- WHERE clause (resolved_entry_id = p_id) forces that column non-null —
-- the same IS NOT NULL-on-a-partially-null-row footgun otherwise applies.
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
