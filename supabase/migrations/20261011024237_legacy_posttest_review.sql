-- Historical forms were not snapshotted. Preserve the stored score and show
-- only recoverable raw response evidence; never infer scoring membership.
create function public.rpc_legacy_posttest_review(p_final_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor public.users; v_attempt public.course_test_attempts;
  v_raw jsonb; v_question public.course_test_questions; v_question_text text;
  v_selected integer; v_duplicates integer; v_entries jsonb := '[]'::jsonb;
  v_status text;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role <> 'bhw' or v_actor.status <> 'active' then
    raise exception 'not authorized';
  end if;
  select * into v_attempt from public.course_test_attempts
    where id = p_final_attempt_id and bhw_user_id = v_actor.id and phase = 'posttest';
  if v_attempt.id is null then raise exception 'post-test review unavailable'; end if;
  if exists (select 1 from learner_assessment_private.attempts a
    where a.legacy_attempt_id = v_attempt.id) then
    raise exception 'use versioned post-test review';
  end if;
  for v_raw in select value from jsonb_array_elements(
    case when jsonb_typeof(v_attempt.answers) = 'array' then v_attempt.answers else '[]'::jsonb end
  ) loop
    v_question_text := v_raw->>'question_id';
    v_selected := null;
    if coalesce(v_raw->>'selected_option_index', '') ~ '^[0-9]{1,9}$' then
      v_selected := (v_raw->>'selected_option_index')::integer;
    end if;
    v_duplicates := (select count(*) from jsonb_array_elements(v_attempt.answers) other
      where other->>'question_id' = v_question_text);
    v_question := null;
    if coalesce(v_question_text, '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select * into v_question from public.course_test_questions
        where id = v_question_text::uuid and course_id = v_attempt.course_id;
    end if;
    v_status := case
      when v_duplicates > 1 then 'duplicate_response'
      when v_question.id is null then 'original_question_unavailable'
      when v_selected is null or v_selected < 0 or v_selected >= jsonb_array_length(v_question.options)
        then 'selection_unavailable'
      else 'recoverable' end;
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'question_id', v_question_text, 'status', v_status,
      'prompt_fil', v_question.prompt_fil, 'prompt_en', v_question.prompt_en,
      'options', v_question.options, 'selected_option_index', v_selected,
      'correct_option_index', v_question.correct_option_index,
      'matches_stored_key', case when v_status = 'recoverable'
        then v_selected = v_question.correct_option_index else null end));
  end loop;
  return jsonb_build_object('generation', 'legacy', 'score_percent', v_attempt.score_percent,
    'entries', v_entries, 'form_membership_known', false,
    'explanations_available', false);
end;
$$;
revoke execute on function public.rpc_legacy_posttest_review(uuid) from public, anon;
grant execute on function public.rpc_legacy_posttest_review(uuid) to authenticated;
