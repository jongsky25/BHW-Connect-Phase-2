-- Return explanations from the immutable attempt snapshot only. Disclosure policy is unchanged.
create or replace function public.rpc_learner_assessment_review(p_final_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_attempt learner_assessment_private.attempts; v_responses jsonb; v_items jsonb;
begin
  select * into v_attempt from learner_assessment_private.attempts
    where legacy_attempt_id = p_final_attempt_id or assessor_exam_attempt_id = p_final_attempt_id;
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
      'label', option->'label', 'distractor_rationale', option->'distractor_rationale') order by ordinal)
      from jsonb_array_elements(item->'options') with ordinality as opts(option, ordinal)),
    'correct_option_id', item->'correct_option_id', 'rationale', item->'rationale',
    'lesson_keys', item->'lesson_keys') order by position), '[]'::jsonb) into v_items
    from jsonb_array_elements(v_attempt.form_snapshot) with ordinality as questions(item, position);
  return jsonb_build_object('attempt_id', v_attempt.id, 'form_id', v_attempt.form_id,
    'release_id', v_attempt.release_id, 'form_hash', v_attempt.form_hash,
    'score_percent', v_attempt.score_percent, 'items', v_items, 'responses', v_responses);
end;
$$;

revoke all on function public.rpc_learner_assessment_review(uuid) from public, anon;
grant execute on function public.rpc_learner_assessment_review(uuid) to authenticated;
