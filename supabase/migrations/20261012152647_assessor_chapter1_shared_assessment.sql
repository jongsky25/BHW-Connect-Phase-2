-- Share the approved Chapter 1 learner forms and attempt UI with assessor candidates.
-- Assessor results remain in their own qualification ledger; BHW dashboards and
-- course-test records continue to contain only BHW attempts.
begin;
alter table learner_assessment_private.attempts
  add column assessor_exam_attempt_id uuid unique references public.assessor_exam_attempts(id) on delete cascade;
alter table learner_assessment_private.attempts drop constraint attempts_check;
alter table learner_assessment_private.attempts add constraint attempts_check check (
  (state = 'submitted' and submitted_at is not null and score_percent is not null
    and num_nonnulls(legacy_attempt_id, assessor_exam_attempt_id) = 1)
  or (state <> 'submitted' and submitted_at is null and score_percent is null
    and legacy_attempt_id is null and assessor_exam_attempt_id is null));
drop index learner_assessment_private.learner_assessment_one_submitted;
create unique index learner_assessment_one_submitted_pretest
  on learner_assessment_private.attempts(learner_id, course_id, phase)
  where state = 'submitted' and phase = 'pretest';

create or replace function learner_assessment_private.actor_for_course(p_course_id uuid, p_session_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor public.users; v_course public.courses;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role not in ('bhw', 'assessor') or v_actor.status <> 'active' then
    raise exception 'not authorized';
  end if;
  select * into v_course from public.courses where id = p_course_id and status = 'published';
  if v_course.id is null or not exists (
    select 1 from public.training_program_chapters ch
    join public.training_programs p on p.id = ch.program_id
    where ch.course_id = p_course_id and ch.chapter_key = 'chapter-1'
      and ch.availability = 'available' and p.content_key = 'bhw-reference-manual'
      and p.status = 'published'
  ) or not exists (
    select 1 from public.org_units o where o.id = v_course.org_unit_id
      and public.current_org_path() like o.path || '%'
  ) then raise exception 'chapter unavailable'; end if;
  if v_actor.role = 'assessor' then
    if p_session_id is not null or not exists (
      select 1 from public.training_program_chapters ch
      where ch.course_id = p_course_id and ch.chapter_key = 'chapter-1'
        and exists (select 1 from assessor_private.exam_context(ch.id) ctx
          where ctx.actor_id = v_actor.id and ctx.course_id = p_course_id)
    ) then raise exception 'assessor chapter unavailable'; end if;
  end if;
  if p_session_id is not null and not exists (
    select 1 from public.course_session_enrollments e
    join public.course_sessions s on s.id = e.session_id
    where e.session_id = p_session_id and e.bhw_user_id = v_actor.id and s.course_id = p_course_id
  ) then raise exception 'not enrolled in this session'; end if;
  return v_actor.id;
end;
$$;

create or replace function learner_assessment_private.owner_id()
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role not in ('bhw', 'assessor') or v_actor.status <> 'active' then
    raise exception 'not authorized';
  end if;
  return v_actor.id;
end;
$$;

create or replace function public.rpc_learner_assessment_get(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_attempt learner_assessment_private.attempts; v_responses jsonb;
begin
  select * into v_attempt from learner_assessment_private.attempts where id = p_attempt_id;
  if v_attempt.id is null then raise exception 'attempt not found'; end if;
  v_actor := learner_assessment_private.owner_id();
  if v_attempt.learner_id <> v_actor then raise exception 'not authorized'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('item_id', item_id, 'kind', kind,
    'option_id', option_id, 'marked', marked) order by item_id), '[]'::jsonb)
    into v_responses from learner_assessment_private.responses where attempt_id = p_attempt_id;
  return jsonb_build_object('attempt_id', v_attempt.id, 'phase', v_attempt.phase,
    'state', v_attempt.state, 'revision', v_attempt.revision, 'position', v_attempt.position,
    'language', v_attempt.language, 'form_id', v_attempt.form_id,
    'release_id', v_attempt.release_id, 'form_hash', v_attempt.form_hash,
    'items', learner_assessment_private.safe_items(v_attempt.form_snapshot),
    'responses', v_responses, 'score_percent', v_attempt.score_percent,
    'legacy_attempt_id', coalesce(v_attempt.legacy_attempt_id, v_attempt.assessor_exam_attempt_id));
end;
$$;

create or replace function public.rpc_learner_assessment_start(p_course_id uuid, p_phase text, p_session_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_attempt learner_assessment_private.attempts; v_enrollment learner_assessment_private.enrollments;
  v_release learner_assessment_private.releases; v_form learner_assessment_private.forms;
  v_progress public.course_progress; v_legacy boolean; v_role text; v_ctx record;
begin
  v_actor := learner_assessment_private.actor_for_course(p_course_id, p_session_id);
  if p_phase not in ('pretest', 'posttest') then raise exception 'invalid phase'; end if;
  select role into v_role from public.users where id = v_actor;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || p_course_id::text, 0));
  if v_role = 'assessor' then
    select * into v_ctx from assessor_private.exam_context(
      (select id from public.training_program_chapters where course_id = p_course_id
        and chapter_key = 'chapter-1' limit 1));
    select * into v_attempt from learner_assessment_private.attempts
      where learner_id = v_actor and course_id = p_course_id and phase = p_phase
        and state = 'draft' order by started_at desc limit 1;
    if v_attempt.id is not null then return public.rpc_learner_assessment_get(v_attempt.id); end if;
    if p_phase = 'pretest' and exists (
      select 1 from learner_assessment_private.attempts where learner_id = v_actor
        and course_id = p_course_id and phase = 'pretest' and state = 'submitted') then
      raise exception 'baseline already submitted'; end if;
    if p_phase = 'posttest' then
      if not exists (select 1 from learner_assessment_private.attempts
        where learner_id = v_actor and course_id = p_course_id and phase = 'pretest'
          and state = 'submitted') then raise exception 'baseline required'; end if;
      if not assessor_private.chapter_lessons_complete(v_actor,
        (select id from public.training_program_chapters where course_id = p_course_id
          and chapter_key = 'chapter-1' limit 1), p_course_id, v_ctx.required_lessons) then
        raise exception 'complete all lessons before the posttest'; end if;
      if exists (select 1 from public.assessor_exam_attempts a where a.assessor_user_id = v_actor
        and a.chapter_id = (select id from public.training_program_chapters
          where course_id = p_course_id and chapter_key = 'chapter-1' limit 1)
        and a.curriculum_version = v_ctx.curriculum_version and a.phase = 'posttest'
        and a.passed) then raise exception 'qualifying exam already passed'; end if;
    end if;
  else
  select * into v_attempt from learner_assessment_private.attempts
    where learner_id = v_actor and course_id = p_course_id and phase = p_phase
      and state in ('draft', 'submitted') order by (state = 'submitted') desc limit 1;
  if v_attempt.id is not null then return public.rpc_learner_assessment_get(v_attempt.id); end if;
  if exists (select 1 from public.course_test_attempts
      where course_id = p_course_id and bhw_user_id = v_actor and phase = p_phase) then
    return jsonb_build_object('state', 'legacy_submitted', 'phase', p_phase);
  end if;
  select * into v_progress from public.course_progress
    where course_id = p_course_id and bhw_user_id = v_actor;
  if p_phase = 'pretest' then
    if v_progress.id is not null and exists (
      select 1 from public.course_module_progress where course_progress_id = v_progress.id
    ) then raise exception 'content already started; pretest must come first'; end if;
  else
    if v_progress.id is null or v_progress.status = 'in_progress' then
      raise exception 'complete all modules before the posttest';
    end if;
    if not exists (select 1 from public.course_test_attempts
      where course_id = p_course_id and bhw_user_id = v_actor and phase = 'pretest') then
      raise exception 'baseline required';
    end if;
  end if;
  end if;
  if not exists (select 1 from public.feature_flags where key = 'chapter1_assessment_v2'
      and enabled = true and not (v_role = any(disabled_roles))) then
    raise exception 'new assessment starts unavailable';
  end if;
  select * into v_enrollment from learner_assessment_private.enrollments
    where learner_id = v_actor and course_id = p_course_id;
  if v_enrollment.learner_id is null then
    select * into v_release from learner_assessment_private.releases
      where program_key = 'bhw-reference-manual' and chapter_key = 'chapter-1' and status = 'active';
    if v_release.id is null then raise exception 'approved assessment release unavailable'; end if;
    select v_role = 'bhw' and exists(select 1 from public.course_test_attempts where course_id = p_course_id
      and bhw_user_id = v_actor and phase = 'pretest') into v_legacy;
    insert into learner_assessment_private.enrollments(learner_id, course_id, release_id, legacy_baseline)
      values (v_actor, p_course_id, v_release.id, v_legacy);
  else
    select * into v_release from learner_assessment_private.releases where id = v_enrollment.release_id;
  end if;
  if v_release.status = 'withdrawn' then raise exception 'assigned assessment release withdrawn'; end if;
  select * into v_form from learner_assessment_private.forms where release_id = v_release.id and phase = p_phase;
  if v_form.id is null then raise exception 'assessment form unavailable'; end if;
  insert into learner_assessment_private.attempts(learner_id, course_id, session_id, release_id,
    form_id, phase, form_snapshot, form_hash)
    values(v_actor, p_course_id, p_session_id, v_release.id, v_form.id, p_phase, v_form.items, v_form.form_hash)
    returning * into v_attempt;
  return public.rpc_learner_assessment_get(v_attempt.id);
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
  v_result := jsonb_build_object('state', 'submitted', 'attempt_id', p_attempt_id,
    'legacy_attempt_id', v_legacy_id, 'assessor_exam_attempt_id', v_assessor_id, 'score_percent', v_score, 'correct_count', v_correct);
  insert into learner_assessment_private.mutation_receipts(attempt_id, mutation_id, payload_hash, result)
    values(p_attempt_id, p_mutation_id, v_hash, v_result);
  return v_result;
end;
$$;

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

create or replace function public.rpc_learner_assessment_state(p_course_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_attempts jsonb; v_legacy jsonb; v_role text;
begin
  v_actor := learner_assessment_private.actor_for_course(p_course_id);
  select role into v_role from public.users where id = v_actor;
  select coalesce(jsonb_agg(jsonb_build_object('attempt_id', id, 'phase', phase,
    'state', state, 'form_id', form_id, 'release_id', release_id,
    'score_percent', score_percent, 'legacy_attempt_id', coalesce(legacy_attempt_id, assessor_exam_attempt_id))
    order by started_at), '[]'::jsonb) into v_attempts
  from learner_assessment_private.attempts
  where learner_id = v_actor and course_id = p_course_id and state in ('draft', 'submitted');
  if v_role = 'bhw' then
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'phase', phase,
      'score_percent', score_percent) order by taken_at), '[]'::jsonb) into v_legacy
    from public.course_test_attempts where bhw_user_id = v_actor and course_id = p_course_id;
  else v_legacy := '[]'::jsonb; end if;
  return jsonb_build_object('attempts', v_attempts, 'final_attempts', v_legacy);
end;
$$;

-- Once the shared form is available, prevent a second Chapter 1 question path
-- from issuing fresh assessor evidence. Historical attempts remain intact.
create or replace function assessor_private.chapter1_shared_form_active()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.feature_flags f where f.key = 'chapter1_assessment_v2'
    and f.enabled and not ('assessor' = any(f.disabled_roles)))
    and exists(select 1 from learner_assessment_private.releases r
      where r.program_key = 'bhw-reference-manual' and r.chapter_key = 'chapter-1'
        and r.status = 'active');
$$;
revoke all on function assessor_private.chapter1_shared_form_active() from public, anon, authenticated;
create or replace function public.rpc_chapter_practice_start(p_course_id uuid, p_group_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_attempt learner_assessment_private.practice_attempts;
  v_enrollment learner_assessment_private.enrollments; v_release learner_assessment_private.releases;
  v_checkpoint learner_assessment_private.checkpoints; v_progress public.course_progress; v_role text;
begin
  v_actor := learner_assessment_private.actor_for_course(p_course_id);
  select role into v_role from public.users where id = v_actor;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || p_course_id::text, 0));
  select * into v_enrollment from learner_assessment_private.enrollments
    where learner_id = v_actor and course_id = p_course_id;
  if v_enrollment.learner_id is not null then
    select * into v_release from learner_assessment_private.releases where id = v_enrollment.release_id;
  else
    select * into v_release from learner_assessment_private.releases
      where program_key = 'bhw-reference-manual' and chapter_key = 'chapter-1' and status = 'active';
  end if;
  if v_release.id is null then raise exception 'practice release unavailable'; end if;
  select * into v_attempt from learner_assessment_private.practice_attempts
    where learner_id = v_actor and course_id = p_course_id and release_id = v_release.id and group_key = p_group_key;
  if v_attempt.id is not null then return public.rpc_chapter_practice_get(v_attempt.id); end if;
  if v_release.status <> 'active' or not exists (select 1 from public.feature_flags
    where key = 'chapter1_assessment_v2' and enabled and not (v_role = any(disabled_roles))) then
    raise exception 'new practice starts unavailable';
  end if;
  select * into v_checkpoint from learner_assessment_private.checkpoints
    where release_id = v_release.id and group_key = p_group_key;
  if v_checkpoint.release_id is null then raise exception 'checkpoint unavailable'; end if;
  if v_role = 'assessor' then
    if not exists(select 1 from public.assessor_lesson_progress lp
      join public.course_lessons l on l.id = lp.lesson_id
      join public.course_modules m on m.id = l.module_id
      join public.training_program_chapters ch on ch.id = lp.chapter_id
      where lp.assessor_user_id = v_actor and ch.course_id = p_course_id
        and m.course_id = p_course_id and l.lesson_key = v_checkpoint.after_lesson_key
        and lp.revision_id = l.published_revision_id)
    then raise exception 'finish the mapped lesson before practice'; end if;
  else
  select * into v_progress from public.course_progress
    where course_id = p_course_id and bhw_user_id = v_actor;
  if v_progress.id is null or not (
    v_progress.status in ('certified','content_completed','failed_assessment')
    or exists(select 1 from public.course_lesson_progress lp
      join public.course_lessons l on l.id = lp.lesson_id
      join public.course_modules m on m.id = l.module_id
      where lp.course_progress_id = v_progress.id and m.course_id = p_course_id
        and l.lesson_key = v_checkpoint.after_lesson_key)
  ) then raise exception 'finish the mapped lesson before practice'; end if;
  end if;
  if v_enrollment.learner_id is null then
    insert into learner_assessment_private.enrollments(learner_id, course_id, release_id, legacy_baseline)
      values(v_actor, p_course_id, v_release.id, v_role = 'bhw');
  end if;
  insert into learner_assessment_private.practice_attempts(learner_id, course_id, release_id, group_key,
    first_snapshot, alternate_snapshot)
    values(v_actor, p_course_id, v_release.id, p_group_key,
      v_checkpoint.first_items, v_checkpoint.alternate_items) returning * into v_attempt;
  return public.rpc_chapter_practice_get(v_attempt.id);
end;
$$;

create or replace function public.rpc_assessor_exam_open(p_chapter_id uuid,p_phase text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_ctx record; v_attempt public.assessor_exam_attempts; v_questions jsonb; v_public_questions jsonb;
  v_count integer; v_late boolean; v_exam_id text;
begin
  if p_phase is null or p_phase not in ('pretest','posttest') then raise exception 'invalid exam phase'; end if;
  select * into v_ctx from assessor_private.exam_context(p_chapter_id);
  -- Serialize starts and retakes for this actor, including concurrent tabs.
  perform 1 from public.users where id=v_ctx.actor_id for update;
  v_exam_id:=v_ctx.chapter_key || ':' || p_phase;
  if p_phase='pretest' then
    if exists(select 1 from public.assessor_exam_attempts a where a.assessor_user_id=v_ctx.actor_id
      and a.chapter_id=p_chapter_id and a.curriculum_version=v_ctx.curriculum_version
      and a.phase='pretest' and a.status='submitted') then raise exception 'diagnostic pretest already submitted'; end if;
  else
    if not exists(select 1 from public.assessor_exam_attempts a where a.assessor_user_id=v_ctx.actor_id
      and a.chapter_id=p_chapter_id and a.curriculum_version=v_ctx.curriculum_version
      and a.phase='pretest' and a.status='submitted') then raise exception 'take the diagnostic pretest first'; end if;
    if not assessor_private.chapter_lessons_complete(v_ctx.actor_id,p_chapter_id,v_ctx.course_id,v_ctx.required_lessons) then
      raise exception 'complete the full chapter before the posttest'; end if;
    if exists(select 1 from public.assessor_exam_attempts a where a.assessor_user_id=v_ctx.actor_id
      and a.chapter_id=p_chapter_id and a.curriculum_version=v_ctx.curriculum_version
      and a.phase='posttest' and a.passed) then raise exception 'qualifying exam already passed'; end if;
  end if;
  select * into v_attempt from public.assessor_exam_attempts a where a.assessor_user_id=v_ctx.actor_id
    and a.chapter_id=p_chapter_id and a.curriculum_version=v_ctx.curriculum_version and a.phase=p_phase and a.status='open';
  if v_attempt.id is null then
    if v_ctx.chapter_key = 'chapter-1' and assessor_private.chapter1_shared_form_active() then
      raise exception 'Chapter 1 uses the shared assessment'; end if;
    select count(*),jsonb_agg(jsonb_build_object('id',q.id,'prompt_fil',q.prompt_fil,'prompt_en',q.prompt_en,
      'options',q.options,'correct_option_index',q.correct_option_index) order by q.position)
      into v_count,v_questions from public.course_test_questions_current q where q.course_id=v_ctx.course_id;
    if v_count<v_ctx.minimum_questions then raise exception 'reviewed chapter exam bank unavailable'; end if;
    if exists(select 1 from jsonb_array_elements(v_questions) q where jsonb_array_length(q->'options')<2
      or (q->>'correct_option_index')::integer not between 0 and jsonb_array_length(q->'options')-1) then
      raise exception 'invalid chapter exam bank'; end if;
    v_late:=p_phase='pretest' and exists(select 1 from public.assessor_lesson_progress lp
      where lp.assessor_user_id=v_ctx.actor_id and lp.chapter_id=p_chapter_id);
    insert into public.assessor_exam_attempts(assessor_user_id,chapter_id,curriculum_version,exam_id,phase,
      question_set_hash,question_count,passing_percent,pretest_late)
      values(v_ctx.actor_id,p_chapter_id,v_ctx.curriculum_version,v_exam_id,p_phase,md5(v_questions::text),v_count,
        case when p_phase='posttest' then v_ctx.passing_percent else null end,v_late)
      returning * into v_attempt;
    insert into assessor_private.exam_snapshots(attempt_id,questions) values(v_attempt.id,v_questions);
  else
    select s.questions into v_questions from assessor_private.exam_snapshots s where s.attempt_id=v_attempt.id;
  end if;
  select jsonb_agg(q.value - 'correct_option_index' order by q.ordinality) into v_public_questions
    from jsonb_array_elements(v_questions) with ordinality q(value,ordinality);
  return jsonb_build_object('attempt_id',v_attempt.id,'phase',p_phase,'questions',v_public_questions,
    'passing_percent',v_attempt.passing_percent,'pretest_late',v_attempt.pretest_late);
end;
$$;
commit;
