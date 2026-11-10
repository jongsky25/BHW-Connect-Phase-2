-- Stop storing a full assessment state copy on every answer save.
--
-- Between 28 Sep and 10 Nov, rpc_learner_assessment_save ran 5,006 times at a
-- 179 ms mean and wrote 104 MB of WAL, the most of any statement. Each save
-- stored the complete rpc_learner_assessment_get() result (~17 KB of TOASTed
-- jsonb) in learner_assessment_private.mutation_receipts, only so that a
-- retried request with the same mutation ID could return it. The table held
-- 96 MB on 10 Nov (half the database), and ~95% of its rows belonged to
-- attempts that were already submitted.
--
-- 1. A save receipt is now a ~60-byte marker. A retry with the same mutation
--    ID and payload still returns without saving twice; it rebuilds the
--    response from the attempt's current state. The client
--    (chapter1-assessment.tsx) only retries its latest pending mutation and
--    sets its state from whatever comes back. A current state is what it
--    needs, and if another tab saved in between it avoids a stale revision.
--    Receipts written before this migration still replay their stored result.
-- 2. Submitting deletes the attempt's receipts before writing its own small
--    submit receipt. Once an attempt is submitted no save on it can be
--    retried, and a retried submit is still answered by its receipt or by the
--    existing already-submitted branch.
-- 3. The one-time cleanup of existing receipts is a separate migration,
--    20261110160100_assessment_receipts_cleanup.sql. Its DELETE needs a
--    confirmation that the MCP apply cannot show here, so it is applied on its
--    own. Until it runs, old receipts stay; with this change no new large ones
--    are written.

create or replace function public.rpc_learner_assessment_save(
  p_attempt_id uuid, p_expected_revision bigint, p_mutation_id uuid,
  p_changes jsonb, p_position integer, p_language text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_attempt learner_assessment_private.attempts; v_actor uuid; v_change jsonb;
  v_item jsonb; v_item_id uuid; v_kind text; v_option_id text;
  v_seen uuid[] := '{}'; v_hash text; v_receipt learner_assessment_private.mutation_receipts;
  v_result jsonb;
begin
  if p_mutation_id is null or p_expected_revision is null or jsonb_typeof(p_changes) <> 'array' or
      p_position not between 0 and 29 or p_language not in ('en', 'fil') then
    raise exception 'invalid save request';
  end if;
  select * into v_attempt from learner_assessment_private.attempts where id = p_attempt_id for update;
  if v_attempt.id is null then raise exception 'attempt not found'; end if;
  v_actor := learner_assessment_private.actor_for_course(v_attempt.course_id);
  if v_attempt.learner_id <> v_actor then raise exception 'not authorized'; end if;
  v_hash := pg_catalog.md5(pg_catalog.concat_ws('|', p_expected_revision::text,
    p_changes::text, p_position::text, p_language));
  select * into v_receipt from learner_assessment_private.mutation_receipts
    where attempt_id = p_attempt_id and mutation_id = p_mutation_id;
  if v_receipt.attempt_id is not null then
    if v_receipt.payload_hash <> v_hash then raise exception 'mutation ID reused with different payload'; end if;
    -- Compact receipts replay the attempt's current state; older receipts
    -- still hold their full result.
    if v_receipt.result ? 'replay_from_attempt' then
      return public.rpc_learner_assessment_get(p_attempt_id);
    end if;
    return v_receipt.result;
  end if;
  if v_attempt.state <> 'draft' then raise exception 'attempt is not a draft'; end if;
  if v_attempt.revision <> p_expected_revision then raise exception 'stale assessment revision'; end if;
  for v_change in select value from jsonb_array_elements(p_changes) loop
    if jsonb_typeof(v_change) <> 'object' or not (v_change ? 'item_id') or not (v_change ? 'kind') then
      raise exception 'invalid response';
    end if;
    v_item_id := (v_change->>'item_id')::uuid;
    if v_item_id = any(v_seen) then raise exception 'duplicate item in save'; end if;
    v_seen := v_seen || v_item_id;
    select value into v_item from jsonb_array_elements(v_attempt.form_snapshot)
      where value->>'item_id' = v_item_id::text;
    if v_item is null then raise exception 'foreign assessment item'; end if;
    v_kind := v_change->>'kind';
    v_option_id := v_change->>'option_id';
    if v_kind = 'unset' then
      if v_option_id is not null then raise exception 'unset cannot include an option'; end if;
      delete from learner_assessment_private.responses
        where attempt_id = p_attempt_id and item_id = v_item_id;
    elsif v_kind in ('choice', 'unknown') then
      if (v_kind = 'choice' and not exists (
        select 1 from jsonb_array_elements(v_item->'options') option
        where option->>'id' = v_option_id
      )) or (v_kind = 'unknown' and v_option_id is not null) then
        raise exception 'invalid response option';
      end if;
      insert into learner_assessment_private.responses(attempt_id, item_id, kind, option_id, marked, revision)
      values(p_attempt_id, v_item_id, v_kind, v_option_id,
        coalesce((v_change->>'marked')::boolean, false), v_attempt.revision + 1)
      on conflict (attempt_id, item_id) do update set kind = excluded.kind,
        option_id = excluded.option_id, marked = excluded.marked, revision = excluded.revision;
    else raise exception 'invalid response kind'; end if;
  end loop;
  update learner_assessment_private.attempts
    set revision = revision + 1, position = p_position, language = p_language
    where id = p_attempt_id returning * into v_attempt;
  v_result := public.rpc_learner_assessment_get(p_attempt_id);
  insert into learner_assessment_private.mutation_receipts(attempt_id, mutation_id, payload_hash, result)
    values(p_attempt_id, p_mutation_id, v_hash,
      jsonb_build_object('replay_from_attempt', true, 'revision', v_attempt.revision));
  return v_result;
end;
$$;


create or replace function public.rpc_learner_assessment_submit(
  p_attempt_id uuid, p_expected_revision bigint, p_mutation_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_attempt learner_assessment_private.attempts; v_actor uuid; v_item jsonb;
  v_response learner_assessment_private.responses; v_correct integer := 0;
  v_answers jsonb := '[]'::jsonb; v_option_index integer; v_legacy_id uuid;
  v_score numeric; v_result jsonb; v_receipt learner_assessment_private.mutation_receipts;
  v_hash text; v_progress public.course_progress; v_role text; v_ctx record; v_assessor_id uuid; v_chapter_id uuid;
begin
  if p_mutation_id is null or p_expected_revision is null then raise exception 'mutation ID and revision required'; end if;
  select * into v_attempt from learner_assessment_private.attempts where id = p_attempt_id for update;
  if v_attempt.id is null then raise exception 'attempt not found'; end if;
  v_actor := learner_assessment_private.actor_for_course(v_attempt.course_id);
  if v_attempt.learner_id <> v_actor then raise exception 'not authorized'; end if;
  v_hash := pg_catalog.md5(p_expected_revision::text || ':submit');
  select * into v_receipt from learner_assessment_private.mutation_receipts
    where attempt_id = p_attempt_id and mutation_id = p_mutation_id;
  if v_receipt.attempt_id is not null then
    if v_receipt.payload_hash <> v_hash then raise exception 'mutation ID reused with different payload'; end if;
    return v_receipt.result;
  end if;
  if v_attempt.state = 'submitted' then
    return jsonb_build_object('state', 'submitted', 'attempt_id', p_attempt_id,
      'legacy_attempt_id', v_attempt.legacy_attempt_id, 'assessor_exam_attempt_id', v_attempt.assessor_exam_attempt_id, 'score_percent', v_attempt.score_percent);
  end if;
  if v_attempt.state <> 'draft' then raise exception 'attempt is not a draft'; end if;
  if v_attempt.revision <> p_expected_revision then raise exception 'stale assessment revision'; end if;
  select role into v_role from public.users where id = v_actor;
  if v_role = 'assessor' then
    select id into v_chapter_id from public.training_program_chapters
      where course_id = v_attempt.course_id and chapter_key = 'chapter-1' limit 1;
    select * into v_ctx from assessor_private.exam_context(v_chapter_id);
    if v_attempt.phase = 'posttest' and not assessor_private.chapter_lessons_complete(
      v_actor, v_chapter_id, v_attempt.course_id, v_ctx.required_lessons) then
      raise exception 'complete all lessons before the posttest';
    end if;
  else
  select * into v_progress from public.course_progress
    where course_id = v_attempt.course_id and bhw_user_id = v_actor;
  if v_attempt.phase = 'pretest' and v_progress.id is not null and exists (
    select 1 from public.course_module_progress where course_progress_id = v_progress.id
  ) then raise exception 'content already started; pretest must come first'; end if;
  if v_attempt.phase = 'posttest' and (v_progress.id is null or v_progress.status = 'in_progress') then
    raise exception 'complete all modules before the posttest';
  end if;
  end if;
  if (select count(*) from learner_assessment_private.responses where attempt_id = p_attempt_id) <> 30 then
    raise exception 'all 30 questions require a choice or explicit unknown';
  end if;
  for v_item in select value from jsonb_array_elements(v_attempt.form_snapshot) loop
    select * into v_response from learner_assessment_private.responses
      where attempt_id = p_attempt_id and item_id = (v_item->>'item_id')::uuid;
    if v_response.item_id is null then raise exception 'missing assessment response'; end if;
    v_option_index := null;
    if v_response.kind = 'choice' then
      select (ordinal - 1)::integer into v_option_index
      from jsonb_array_elements(v_item->'options') with ordinality as opts(option, ordinal)
      where option->>'id' = v_response.option_id;
      if v_option_index is null then raise exception 'invalid saved response'; end if;
      if v_response.option_id = v_item->>'correct_option_id' then v_correct := v_correct + 1; end if;
    end if;
    v_answers := v_answers || jsonb_build_array(jsonb_build_object(
      'question_id', v_response.item_id, 'selected_option_index', v_option_index,
      'response_kind', v_response.kind));
  end loop;
  v_score := pg_catalog.round(100.0 * v_correct / 30, 1);
  if v_role = 'assessor' then
    insert into public.assessor_exam_attempts(
      assessor_user_id, chapter_id, curriculum_version, exam_id, phase,
      status, question_set_hash, question_count, passing_percent,
      score_percent, passed, answers, pretest_late, submitted_at)
    values(v_actor, v_chapter_id, v_ctx.curriculum_version,
      v_ctx.chapter_key || ':' || v_attempt.phase, v_attempt.phase, 'submitted',
      pg_catalog.md5(v_attempt.form_snapshot::text), 30,
      case when v_attempt.phase = 'posttest' then v_ctx.passing_percent else null end,
      v_score, v_attempt.phase = 'posttest' and v_score >= v_ctx.passing_percent,
      v_answers, v_attempt.phase = 'pretest' and exists (
        select 1 from public.assessor_lesson_progress where assessor_user_id = v_actor
          and chapter_id = v_chapter_id), now()) returning id into v_assessor_id;
    update learner_assessment_private.attempts
      set state = 'submitted', submitted_at = now(), score_percent = v_score,
        assessor_exam_attempt_id = v_assessor_id, revision = revision + 1
      where id = p_attempt_id;
  else
    insert into public.course_test_attempts(course_id, bhw_user_id, session_id, phase, score_percent, answers)
      values(v_attempt.course_id, v_actor, v_attempt.session_id, v_attempt.phase, v_score, v_answers)
      returning id into v_legacy_id;
    update learner_assessment_private.attempts
      set state = 'submitted', submitted_at = now(), score_percent = v_score,
        legacy_attempt_id = v_legacy_id, revision = revision + 1
      where id = p_attempt_id;
  end if;
  -- The attempt is final: no save on it can be retried any more. A retried
  -- submit finds its own receipt below, or the already-submitted branch above.
  delete from learner_assessment_private.mutation_receipts where attempt_id = p_attempt_id;
  v_result := jsonb_build_object('state', 'submitted', 'attempt_id', p_attempt_id,
    'legacy_attempt_id', v_legacy_id, 'assessor_exam_attempt_id', v_assessor_id, 'score_percent', v_score, 'correct_count', v_correct);
  insert into learner_assessment_private.mutation_receipts(attempt_id, mutation_id, payload_hash, result)
    values(p_attempt_id, p_mutation_id, v_hash, v_result);
  return v_result;
end;
$$;
