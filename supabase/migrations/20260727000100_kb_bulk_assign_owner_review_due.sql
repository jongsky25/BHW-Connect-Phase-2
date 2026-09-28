-- ---------------------------------------------------------------------
-- Bulk-assign owner + review-due date across multiple kb_entries in one
-- call, so an admin can clear the "owner required to publish" blocker
-- (INC-3) for a batch of seed-content drafts instead of opening each one
-- individually. Publishing itself is unchanged: this only sets the two
-- KCS fields and logs a kb.entry_updated audit row per entry, same as
-- rpc_kb_entry_update would for a manual per-field edit.
-- ---------------------------------------------------------------------

create or replace function public.rpc_kb_entries_bulk_assign(
  p_entry_ids uuid[],
  p_owner_user_id uuid,
  p_review_due_on date default null
)
returns table (updated_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_entry record;
  v_count integer := 0;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if p_entry_ids is null or array_length(p_entry_ids, 1) is null then
    raise exception 'no entries selected';
  end if;

  if p_owner_user_id is null then
    raise exception 'bulk: an owner is required';
  end if;

  for v_entry in
    select id, question_fil, question_en
    from public.kb_entries
    where id = any(p_entry_ids)
    for update
  loop
    update public.kb_entries
    set owner_user_id = p_owner_user_id,
        review_due_on = coalesce(p_review_due_on, review_due_on)
    where id = v_entry.id;

    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_updated', 'kb_entry', v_entry.id,
      format('Na-update ni %s ang may-ari/petsa ng review ng tanong-sagot na "%s".', v_actor.username, v_entry.question_fil),
      format('%s updated the owner/review date on the Q&A entry "%s".', v_actor.username, v_entry.question_en));

    v_count := v_count + 1;
  end loop;

  return query select v_count;
end;
$$;

grant execute on function public.rpc_kb_entries_bulk_assign(uuid[], uuid, date) to anon, authenticated;
