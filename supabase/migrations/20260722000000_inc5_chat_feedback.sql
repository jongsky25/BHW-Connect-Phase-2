-- ---------------------------------------------------------------------
-- INC-5: Chat Guide UI support — a 👎 on an answer feeds the gap queue
-- flagged distinctly from a genuine no-answer miss (§6.1 step 5:
-- "a 👎 also feeds the gap queue flagged as *bad answer* (distinct from
-- *no answer*)"). Adds a `reason` column to unmatched_questions and
-- threads it through rpc_chat_upsert_unmatched.
-- ---------------------------------------------------------------------

alter table public.unmatched_questions
  add column if not exists reason text not null default 'no_answer'
    check (reason in ('no_answer', 'bad_answer'));

-- The 2-arg signature is replaced by a 3-arg one below (a trailing default
-- parameter still changes the function's identity for GRANT purposes), so
-- drop it explicitly rather than leaving an orphaned overload granted.
drop function if exists public.rpc_chat_upsert_unmatched(text, text);

create or replace function public.rpc_chat_upsert_unmatched(
  p_text text,
  p_normalized_text text,
  p_reason text default 'no_answer'
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

  if p_reason not in ('no_answer', 'bad_answer') then
    raise exception 'invalid reason';
  end if;

  insert into public.unmatched_questions (text, normalized_text, asked_count, last_asked_at, reason)
  values (p_text, p_normalized_text, 1, now(), p_reason)
  on conflict (normalized_text) do update set
    asked_count = public.unmatched_questions.asked_count + 1,
    last_asked_at = now(),
    reason = excluded.reason,
    status = case
      when public.unmatched_questions.status = 'dismissed' then 'open'
      else public.unmatched_questions.status
    end
  returning * into v_row;

  return query select v_row.id, v_row.asked_count;
end;
$$;

grant execute on function public.rpc_chat_upsert_unmatched(text, text, text) to authenticated;
