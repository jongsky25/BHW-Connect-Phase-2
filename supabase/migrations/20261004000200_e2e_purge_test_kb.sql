-- ---------------------------------------------------------------------
-- E2E KB purge: KB entries and chat-guide gap-queue rows.
--
-- rpc_e2e_purge_test_content (20261004000000) covers announcements, surveys,
-- flip charts, forum and courses, but not the Chat Guide side. Every run of
-- chat-guide*.spec.ts, dashboard.spec.ts, kb-authoring.spec.ts,
-- kb-bulk-assign.spec.ts and ai-gap-draft.spec.ts creates KB entries (#148's
-- afterEach only *unpublishes* them, and only when the test passes) and
-- unmatched_questions rows for its "nonsense" questions. On 27 Sep 2026 the
-- pilot held ~150 such KB entries (a few still published) and ~200 of its
-- 230 gap-queue rows, all visible in /admin/kb and the admin dashboard.
--
-- Those specs can't all use the `e2e.<tag>.<epoch-ms>.<random>` marker: the
-- KB matcher tokenizes on punctuation, so the ones that need a single-token
-- keyword mint `zzz` / `zzzgap` / `fly` / `qzxjklw` / `dash` + base36
-- epoch (+ random) instead. public.e2e_marker_pattern() recognizes both
-- shapes. scripts/tests/e2e-markers.test.mjs reads that pattern out of this
-- file and fails if any e2e spec mints a per-run marker it doesn't match,
-- so a new spec can't quietly start leaking KB junk again.
--
-- e2e/global-teardown.ts calls this after every CI run with
-- p_min_age_hours => 0, under the same one-E2E-job-at-a-time guarantee as
-- the other purges.
-- ---------------------------------------------------------------------

-- Postgres ARE syntax (\m / \M are word start/end); used with ~* (case-insensitive).
create or replace function public.e2e_marker_pattern()
returns text
language sql
immutable
as $$
  select '(\me2e\.[a-z0-9]|\m(zzzgap|zzz|fly|qzxjklw|dash)[a-z0-9]{8,}\M)'
$$;

create or replace function public.rpc_e2e_purge_test_kb(
  p_dry_run boolean default true,
  p_min_age_hours int default 24
)
returns table (kb_entries_purged bigint, unmatched_questions_purged bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_cutoff timestamptz := now() - make_interval(hours => greatest(p_min_age_hours, 0));
  v_rx constant text := public.e2e_marker_pattern();
  v_kb_ids uuid[];
  v_unmatched_ids uuid[];
begin
  select * into v_actor from public.current_app_user();
  if (v_actor is null or v_actor.role != 'admin') and auth.role() != 'service_role' then
    raise exception 'not authorized';
  end if;

  -- ai-gap-draft.spec.ts's AI-drafted entry carries its marker only in the
  -- keywords, so keywords are matched alongside the question/answer text.
  select array_agg(id) into v_kb_ids from public.kb_entries
    where created_at < v_cutoff
      and (coalesce(question_en, '') || ' ' || coalesce(question_fil, '') || ' ' ||
           coalesce(answer_en, '') || ' ' || coalesce(answer_fil, '') || ' ' ||
           coalesce(array_to_string(keywords, ' '), '')) ~* v_rx;

  select array_agg(id) into v_unmatched_ids from public.unmatched_questions
    where created_at < v_cutoff
      and (text || ' ' || coalesce(normalized_text, '')) ~* v_rx;

  if not p_dry_run then
    -- chat_messages.matched_entry_id and unmatched_questions.resolved_entry_id
    -- have no cascade (both nullable): detach any real history first.
    update public.chat_messages set matched_entry_id = null where matched_entry_id = any(v_kb_ids);
    update public.unmatched_questions set resolved_entry_id = null where resolved_entry_id = any(v_kb_ids);
    delete from public.unmatched_questions where id = any(v_unmatched_ids);
    delete from public.kb_entries where id = any(v_kb_ids);
  end if;

  return query select
    coalesce(array_length(v_kb_ids, 1), 0)::bigint,
    coalesce(array_length(v_unmatched_ids, 1), 0)::bigint;
end;
$$;

revoke execute on function public.rpc_e2e_purge_test_kb(boolean, int) from public, anon;
grant execute on function public.rpc_e2e_purge_test_kb(boolean, int) to authenticated, service_role;
