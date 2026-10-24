-- Read-only personal test history. Keys and item-level baseline results stay private.
begin;
create function public.rpc_my_test_history(p_course_id uuid default null, p_limit integer default 20, p_offset integer default 0)
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
      and b.generation in ('versioned','legacy_bhw') then b.final_id else null end
  ) order by b.submitted_at desc,b.id,b.generation) from counted b),'[]'::jsonb),
    'has_more',(select count(*)>p_limit from page)) into v_result;
  return v_result;
end;
$$;
revoke all on function public.rpc_my_test_history(uuid,integer,integer) from public,anon;
grant execute on function public.rpc_my_test_history(uuid,integer,integer) to authenticated;
comment on function public.rpc_my_test_history(uuid,integer,integer) is
  'Own submitted tests only. Exact snapshot counts when consistent with stored scores; no keys or per-item baseline results.';
notify pgrst, 'reload schema';
commit;
