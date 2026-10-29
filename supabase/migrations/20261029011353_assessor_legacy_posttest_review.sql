-- FB-3.2: add owner-only review of frozen legacy assessor Chapter 1 posttests.
-- Existing scores and pretest key restrictions remain unchanged.
begin;
create or replace function public.rpc_my_test_history(p_course_id uuid default null, p_limit integer default 20, p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid; v_result jsonb;
begin
  v_actor := learner_assessment_private.owner_id();
  if p_limit is null or p_limit < 1 or p_limit > 50 or p_offset is null or p_offset < 0 or p_offset > 10000 then
    raise exception 'invalid history page';
  end if;
  with submitted as (
    select a.id, a.course_id, a.phase, a.score_percent, a.submitted_at,
      'versioned'::text as generation, a.form_id, a.release_id,
      a.form_snapshot as snapshot, jsonb_array_length(a.form_snapshot) as question_count,
      coalesce(a.legacy_attempt_id,a.assessor_exam_attempt_id) as final_id
    from learner_assessment_private.attempts a
    where a.learner_id=v_actor and a.state='submitted' and (p_course_id is null or a.course_id=p_course_id)
    union all
    select a.id,a.course_id,a.phase,a.score_percent,a.taken_at,'legacy_bhw',null,null,null,null,a.id
    from public.course_test_attempts a
    where a.bhw_user_id=v_actor and (p_course_id is null or a.course_id=p_course_id)
      and not exists(select 1 from learner_assessment_private.attempts v where v.legacy_attempt_id=a.id)
    union all
    select a.id,ch.course_id,a.phase,a.score_percent,a.submitted_at,'legacy_assessor',null,null,null,a.question_count,a.id
    from public.assessor_exam_attempts a join public.training_program_chapters ch on ch.id=a.chapter_id
    where a.assessor_user_id=v_actor and a.status='submitted' and (p_course_id is null or ch.course_id=p_course_id)
      and not exists(select 1 from learner_assessment_private.attempts v where v.assessor_exam_attempt_id=a.id)
  ), page as (
    select s.*,c.title_en,c.title_fil,ch.program_id,ch.chapter_key
    from submitted s join public.courses c on c.id=s.course_id
    left join public.training_program_chapters ch on ch.course_id=s.course_id
    order by s.submitted_at desc,s.id,s.generation limit p_limit+1 offset p_offset
  ), counted as (
    select b.*,case when b.generation='versioned' and b.question_count>0
      and counts.responses=b.question_count
      and pg_catalog.round(100.0*counts.correct/nullif(b.question_count,0),1)=b.score_percent
      then counts.correct else null end as correct_count
    from (select * from page order by submitted_at desc,id,generation limit p_limit) b
    left join lateral (
      select count(r.item_id)::integer as responses,
        count(*) filter(where r.kind='choice' and r.option_id=item->>'correct_option_id')::integer as correct
      from jsonb_array_elements(b.snapshot) item
      left join learner_assessment_private.responses r on r.attempt_id=b.id and r.item_id::text=item->>'item_id'
    ) counts on b.generation='versioned'
  )
  select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object(
    'id',b.id,'course_id',b.course_id,'title_en',b.title_en,'title_fil',b.title_fil,
    'program_id',b.program_id,'chapter_key',b.chapter_key,'phase',b.phase,
    'generation',b.generation,'score_percent',b.score_percent,'correct_count',b.correct_count,
    'question_count',b.question_count,'submitted_at',b.submitted_at,'form_id',b.form_id,'release_id',b.release_id,
    'review_attempt_id',case when b.phase='posttest' and b.chapter_key='chapter-1'
      and (b.generation in ('versioned','legacy_bhw')
        or (b.generation='legacy_assessor' and exists (
          select 1 from assessor_private.exam_snapshots s
          join public.assessor_exam_attempts a on a.id=s.attempt_id
          where s.attempt_id=b.id and a.phase='posttest' and a.status='submitted'
            and jsonb_array_length(s.questions)=a.question_count
            and md5(s.questions::text)=a.question_set_hash)))
      then b.final_id else null end
  ) order by b.submitted_at desc,b.id,b.generation) from counted b),'[]'::jsonb),
    'has_more',(select count(*)>p_limit from page)) into v_result;
  return v_result;
end;
$$;

create function public.rpc_legacy_assessor_posttest_review(p_final_attempt_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_actor public.users;
  v_attempt public.assessor_exam_attempts;
  v_snapshot jsonb;
  v_question jsonb;
  v_question_id text;
  v_options jsonb;
  v_matches integer;
  v_selected_text text;
  v_selected integer;
  v_correct integer;
  v_status text;
  v_entries jsonb := '[]'::jsonb;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role <> 'assessor' or v_actor.status <> 'active' then
    raise exception 'not authorized';
  end if;
  select a.* into v_attempt
  from public.assessor_exam_attempts a
  join public.training_program_chapters ch on ch.id = a.chapter_id
  where a.id = p_final_attempt_id and a.assessor_user_id = v_actor.id
    and a.phase = 'posttest' and a.status = 'submitted' and ch.chapter_key = 'chapter-1';
  if v_attempt.id is null then raise exception 'post-test review unavailable'; end if;
  if exists (select 1 from learner_assessment_private.attempts a
    where a.assessor_exam_attempt_id = v_attempt.id) then
    raise exception 'use versioned post-test review';
  end if;
  select s.questions into v_snapshot from assessor_private.exam_snapshots s
  where s.attempt_id = v_attempt.id;
  if v_snapshot is null or pg_catalog.jsonb_typeof(v_snapshot) <> 'array'
    or pg_catalog.jsonb_array_length(v_snapshot) <> v_attempt.question_count
    or pg_catalog.md5(v_snapshot::text) <> v_attempt.question_set_hash then
    raise exception 'verified post-test snapshot unavailable';
  end if;
  for v_question in select value from pg_catalog.jsonb_array_elements(v_snapshot) loop
    v_question_id := v_question->>'id';
    v_options := v_question->'options';
    if v_question_id is null or pg_catalog.jsonb_typeof(v_options) <> 'array' then
      raise exception 'verified post-test snapshot unavailable';
    end if;
    select count(*), min(value->>'selected_option_index') into v_matches,v_selected_text
    from pg_catalog.jsonb_array_elements(v_attempt.answers) ans(value)
    where ans.value->>'question_id' = v_question_id;
    v_selected := null;
    if coalesce(v_selected_text,'') ~ '^[0-9]{1,9}$' then
      v_selected := v_selected_text::integer;
    end if;
    v_correct := (v_question->>'correct_option_index')::integer;
    v_status := case
      when v_matches > 1 then 'duplicate_response'
      when v_matches = 0 then 'selection_unavailable'
      when v_selected is null or v_selected < 0
        or v_selected >= pg_catalog.jsonb_array_length(v_options) then 'selection_unavailable'
      else 'recoverable' end;
    v_entries := v_entries || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'question_id',v_question_id,'status',v_status,
      'prompt_en',v_question->>'prompt_en','prompt_fil',v_question->>'prompt_fil',
      'options',v_options,'selected_option_index',v_selected,
      'correct_option_index',v_correct,
      'matches_stored_key',case when v_status='recoverable'
        then v_selected=v_correct else null end));
  end loop;
  return pg_catalog.jsonb_build_object('generation','legacy_assessor',
    'score_percent',v_attempt.score_percent,'entries',v_entries,
    'form_membership_known',true,'explanations_available',false);
end;
$$;
revoke all on function public.rpc_legacy_assessor_posttest_review(uuid) from public, anon;
grant execute on function public.rpc_legacy_assessor_posttest_review(uuid) to authenticated;
comment on function public.rpc_legacy_assessor_posttest_review(uuid) is
  'Owner-only review of frozen Chapter 1 assessor posttest responses and keys; no pretest keys or inferred rationales.';
notify pgrst, 'reload schema';
commit;
