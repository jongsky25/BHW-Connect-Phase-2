-- Release metadata and editorial review notes never belong in learner review payloads.
create or replace function public.rpc_learner_assessment_review(p_final_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_attempt learner_assessment_private.attempts; v_responses jsonb; v_items jsonb;
begin
  select * into v_attempt from learner_assessment_private.attempts
    where legacy_attempt_id = p_final_attempt_id;
  if v_attempt.id is null or v_attempt.state <> 'submitted' or v_attempt.phase <> 'posttest' then
    raise exception 'post-test review unavailable';
  end if;
  v_actor := learner_assessment_private.owner_id();
  if v_actor <> v_attempt.learner_id then raise exception 'not authorized'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('item_id', item_id, 'kind', kind,
    'option_id', option_id) order by item_id), '[]'::jsonb) into v_responses
    from learner_assessment_private.responses where attempt_id = v_attempt.id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'item_id', item->'item_id', 'slot', item->'slot', 'stem', item->'stem',
    'options', (select jsonb_agg(jsonb_build_object('id', option->'id',
      'label', option->'label') order by ordinal)
      from jsonb_array_elements(item->'options') with ordinality as opts(option, ordinal)),
    'correct_option_id', item->'correct_option_id', 'rationale', item->'rationale',
    'lesson_keys', item->'lesson_keys') order by position), '[]'::jsonb) into v_items
    from jsonb_array_elements(v_attempt.form_snapshot) with ordinality as questions(item, position);
  return jsonb_build_object('attempt_id', v_attempt.id, 'form_id', v_attempt.form_id,
    'release_id', v_attempt.release_id, 'form_hash', v_attempt.form_hash,
    'score_percent', v_attempt.score_percent, 'items', v_items, 'responses', v_responses);
end;
$$;

-- Progress reset removes unshared work. Shared notes and completed practice are
-- retained as history; drafts with shared versions must remain for their FK chain.
create or replace function public.rpc_course_progress_reset(p_course_id uuid, p_bhw_user_id uuid)
returns table(had_progress boolean, modules_cleared integer, test_attempts_cleared integer)
language plpgsql security definer set search_path = '' as $$
declare v_v2_attempts integer; v_notes integer; v_practice integer;
begin
  select r.had_progress, r.modules_cleared, r.test_attempts_cleared
    into had_progress, modules_cleared, test_attempts_cleared
    from public.rpc_course_progress_reset_legacy_impl(p_course_id, p_bhw_user_id) r;
  delete from learner_assessment_private.attempts
    where course_id = p_course_id and learner_id = p_bhw_user_id;
  get diagnostics v_v2_attempts = row_count;
  delete from learner_assessment_private.enrollments
    where course_id = p_course_id and learner_id = p_bhw_user_id;
  delete from learner_assessment_private.practice_attempts
    where course_id = p_course_id and learner_id = p_bhw_user_id and state = 'in_progress';
  get diagnostics v_practice = row_count;
  delete from learner_assessment_private.reflection_drafts d
    where d.course_id = p_course_id and d.learner_id = p_bhw_user_id
      and not exists (select 1 from learner_assessment_private.reflection_versions v
        where v.draft_id = d.id);
  get diagnostics v_notes = row_count;
  if v_v2_attempts + v_practice + v_notes > 0 then had_progress := true; end if;
  return next;
end;
$$;
