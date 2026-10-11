-- Chapter 1 learner form storage. This schema is not exposed by PostgREST.
-- Publication and learner entry stay closed until a reviewed 108-item release
-- and the complete journey are present. The assessor bank is untouched.
create schema if not exists learner_assessment_private;
revoke all on schema learner_assessment_private from public, anon, authenticated;
grant usage on schema learner_assessment_private to service_role;

create table learner_assessment_private.releases (
  id text primary key,
  blueprint_id text not null,
  source_commit text not null,
  program_key text not null check (program_key = 'bhw-reference-manual'),
  chapter_key text not null check (chapter_key = 'chapter-1'),
  curriculum_revisions jsonb not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  comparability_status text not null default 'unvalidated'
    check (comparability_status in ('unvalidated', 'validated')),
  status text not null default 'draft' check (status in ('draft', 'active', 'withdrawn')),
  created_at timestamptz not null default now()
);
create unique index learner_assessment_one_active_release
  on learner_assessment_private.releases(program_key, chapter_key) where status = 'active';

create table learner_assessment_private.forms (
  id text primary key,
  release_id text not null references learner_assessment_private.releases(id),
  phase text not null check (phase in ('pretest', 'posttest')),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) = 30),
  form_hash text not null check (form_hash ~ '^[0-9a-f]{64}$'),
  unique(release_id, phase)
);

create table learner_assessment_private.checkpoints (
  release_id text not null references learner_assessment_private.releases(id),
  group_key text not null check (group_key ~ '^G(0[1-9]|1[0-2])$'),
  after_lesson_key text not null,
  first_items jsonb not null check (jsonb_typeof(first_items) = 'array' and jsonb_array_length(first_items) = 2),
  alternate_items jsonb not null check (jsonb_typeof(alternate_items) = 'array' and jsonb_array_length(alternate_items) = 2),
  primary key(release_id, group_key)
);

create table learner_assessment_private.enrollments (
  learner_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  release_id text not null references learner_assessment_private.releases(id),
  legacy_baseline boolean not null default false,
  assigned_at timestamptz not null default now(),
  primary key (learner_id, course_id)
);

create table learner_assessment_private.attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  session_id uuid references public.course_sessions(id),
  release_id text not null references learner_assessment_private.releases(id),
  form_id text not null references learner_assessment_private.forms(id),
  phase text not null check (phase in ('pretest', 'posttest')),
  state text not null default 'draft' check (state in ('draft', 'submitted', 'invalidated')),
  form_snapshot jsonb not null check (jsonb_typeof(form_snapshot) = 'array' and jsonb_array_length(form_snapshot) = 30),
  form_hash text not null,
  revision bigint not null default 0 check (revision >= 0),
  position integer not null default 0 check (position between 0 and 29),
  language text not null default 'fil' check (language in ('en', 'fil')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score_percent numeric,
  legacy_attempt_id uuid unique references public.course_test_attempts(id) on delete cascade,
  invalidation_reason text,
  check ((state = 'submitted' and submitted_at is not null and score_percent is not null and legacy_attempt_id is not null)
    or (state <> 'submitted' and submitted_at is null and score_percent is null))
);
create unique index learner_assessment_one_draft
  on learner_assessment_private.attempts(learner_id, course_id, phase) where state = 'draft';
create unique index learner_assessment_one_submitted
  on learner_assessment_private.attempts(learner_id, course_id, phase) where state = 'submitted';
create index learner_assessment_attempt_history
  on learner_assessment_private.attempts(learner_id, course_id, started_at desc);

create table learner_assessment_private.responses (
  attempt_id uuid not null references learner_assessment_private.attempts(id) on delete cascade,
  item_id uuid not null,
  kind text not null check (kind in ('choice', 'unknown')),
  option_id text,
  marked boolean not null default false,
  revision bigint not null,
  primary key (attempt_id, item_id),
  check ((kind = 'choice' and option_id is not null) or (kind = 'unknown' and option_id is null))
);
create table learner_assessment_private.mutation_receipts (
  attempt_id uuid not null references learner_assessment_private.attempts(id) on delete cascade,
  mutation_id uuid not null,
  payload_hash text not null,
  result jsonb not null,
  primary key (attempt_id, mutation_id)
);

alter table learner_assessment_private.releases enable row level security;
alter table learner_assessment_private.forms enable row level security;
alter table learner_assessment_private.checkpoints enable row level security;
alter table learner_assessment_private.enrollments enable row level security;
alter table learner_assessment_private.attempts enable row level security;
alter table learner_assessment_private.responses enable row level security;
alter table learner_assessment_private.mutation_receipts enable row level security;
revoke all on all tables in schema learner_assessment_private from public, anon, authenticated;
grant select, insert, update on all tables in schema learner_assessment_private to service_role;
grant delete on learner_assessment_private.responses, learner_assessment_private.mutation_receipts to service_role;

-- A frozen form must receive a new ID for any content change. Status is the
-- only mutable release field, so rollback can stop new assignments safely.
create function learner_assessment_private.reject_form_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'assessment forms are immutable';
end;
$$;
create trigger assessment_form_immutable before update or delete
  on learner_assessment_private.forms for each row
  execute function learner_assessment_private.reject_form_mutation();
create trigger assessment_checkpoint_immutable before update or delete
  on learner_assessment_private.checkpoints for each row
  execute function learner_assessment_private.reject_form_mutation();

create function learner_assessment_private.safe_items(p_items jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(
    jsonb_build_object('item_id', item->'item_id', 'slot', item->'slot',
      'stem', item->'stem', 'lesson_keys', item->'lesson_keys', 'options', (
      select jsonb_agg(jsonb_build_object('id', option->'id', 'label', option->'label') order by ordinal)
      from jsonb_array_elements(item->'options') with ordinality as opts(option, ordinal)
    )) order by position), '[]'::jsonb)
  from jsonb_array_elements(p_items) with ordinality as questions(item, position);
$$;
revoke execute on function learner_assessment_private.safe_items(jsonb) from public, anon, authenticated;

create function learner_assessment_private.actor_for_course(p_course_id uuid, p_session_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor public.users; v_course public.courses;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role <> 'bhw' or v_actor.status <> 'active' then
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
  if p_session_id is not null and not exists (
    select 1 from public.course_session_enrollments e
    join public.course_sessions s on s.id = e.session_id
    where e.session_id = p_session_id and e.bhw_user_id = v_actor.id and s.course_id = p_course_id
  ) then raise exception 'not enrolled in this session'; end if;
  return v_actor.id;
end;
$$;
revoke execute on function learner_assessment_private.actor_for_course(uuid, uuid) from public, anon, authenticated;

create function learner_assessment_private.owner_id()
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role <> 'bhw' or v_actor.status <> 'active' then
    raise exception 'not authorized';
  end if;
  return v_actor.id;
end;
$$;
revoke execute on function learner_assessment_private.owner_id() from public, anon, authenticated;

create function public.rpc_learner_assessment_get(p_attempt_id uuid)
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
    'legacy_attempt_id', v_attempt.legacy_attempt_id);
end;
$$;
revoke execute on function public.rpc_learner_assessment_get(uuid) from public, anon;
grant execute on function public.rpc_learner_assessment_get(uuid) to authenticated;

create function public.rpc_learner_assessment_start(p_course_id uuid, p_phase text, p_session_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_attempt learner_assessment_private.attempts; v_enrollment learner_assessment_private.enrollments;
  v_release learner_assessment_private.releases; v_form learner_assessment_private.forms;
  v_progress public.course_progress; v_legacy boolean;
begin
  v_actor := learner_assessment_private.actor_for_course(p_course_id, p_session_id);
  if p_phase not in ('pretest', 'posttest') then raise exception 'invalid phase'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || p_course_id::text, 0));
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
  if not exists (select 1 from public.feature_flags where key = 'chapter1_assessment_v2'
      and enabled = true and not ('bhw' = any(disabled_roles))) then
    raise exception 'new assessment starts unavailable';
  end if;
  select * into v_enrollment from learner_assessment_private.enrollments
    where learner_id = v_actor and course_id = p_course_id;
  if v_enrollment.learner_id is null then
    select * into v_release from learner_assessment_private.releases
      where program_key = 'bhw-reference-manual' and chapter_key = 'chapter-1' and status = 'active';
    if v_release.id is null then raise exception 'approved assessment release unavailable'; end if;
    select exists(select 1 from public.course_test_attempts where course_id = p_course_id
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
revoke execute on function public.rpc_learner_assessment_start(uuid, text, uuid) from public, anon;
grant execute on function public.rpc_learner_assessment_start(uuid, text, uuid) to authenticated;

create function public.rpc_learner_assessment_save(
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
    values(p_attempt_id, p_mutation_id, v_hash, v_result);
  return v_result;
end;
$$;
revoke execute on function public.rpc_learner_assessment_save(uuid, bigint, uuid, jsonb, integer, text) from public, anon;
grant execute on function public.rpc_learner_assessment_save(uuid, bigint, uuid, jsonb, integer, text) to authenticated;

create function public.rpc_learner_assessment_submit(
  p_attempt_id uuid, p_expected_revision bigint, p_mutation_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_attempt learner_assessment_private.attempts; v_actor uuid; v_item jsonb;
  v_response learner_assessment_private.responses; v_correct integer := 0;
  v_answers jsonb := '[]'::jsonb; v_option_index integer; v_legacy_id uuid;
  v_score numeric; v_result jsonb; v_receipt learner_assessment_private.mutation_receipts;
  v_hash text; v_progress public.course_progress;
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
      'legacy_attempt_id', v_attempt.legacy_attempt_id, 'score_percent', v_attempt.score_percent);
  end if;
  if v_attempt.state <> 'draft' then raise exception 'attempt is not a draft'; end if;
  if v_attempt.revision <> p_expected_revision then raise exception 'stale assessment revision'; end if;
  select * into v_progress from public.course_progress
    where course_id = v_attempt.course_id and bhw_user_id = v_actor;
  if v_attempt.phase = 'pretest' and v_progress.id is not null and exists (
    select 1 from public.course_module_progress where course_progress_id = v_progress.id
  ) then raise exception 'content already started; pretest must come first'; end if;
  if v_attempt.phase = 'posttest' and (v_progress.id is null or v_progress.status = 'in_progress') then
    raise exception 'complete all modules before the posttest';
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
  insert into public.course_test_attempts(course_id, bhw_user_id, session_id, phase, score_percent, answers)
    values(v_attempt.course_id, v_actor, v_attempt.session_id, v_attempt.phase, v_score, v_answers)
    returning id into v_legacy_id;
  update learner_assessment_private.attempts
    set state = 'submitted', submitted_at = now(), score_percent = v_score,
      legacy_attempt_id = v_legacy_id, revision = revision + 1
    where id = p_attempt_id;
  v_result := jsonb_build_object('state', 'submitted', 'attempt_id', p_attempt_id,
    'legacy_attempt_id', v_legacy_id, 'score_percent', v_score, 'correct_count', v_correct);
  insert into learner_assessment_private.mutation_receipts(attempt_id, mutation_id, payload_hash, result)
    values(p_attempt_id, p_mutation_id, v_hash, v_result);
  return v_result;
end;
$$;
revoke execute on function public.rpc_learner_assessment_submit(uuid, bigint, uuid) from public, anon;
grant execute on function public.rpc_learner_assessment_submit(uuid, bigint, uuid) to authenticated;

create function public.rpc_learner_assessment_review(p_final_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_attempt learner_assessment_private.attempts; v_responses jsonb;
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
  return jsonb_build_object('attempt_id', v_attempt.id, 'form_id', v_attempt.form_id,
    'release_id', v_attempt.release_id, 'form_hash', v_attempt.form_hash,
    'score_percent', v_attempt.score_percent, 'items', v_attempt.form_snapshot,
    'responses', v_responses);
end;
$$;
revoke execute on function public.rpc_learner_assessment_review(uuid) from public, anon;
grant execute on function public.rpc_learner_assessment_review(uuid) to authenticated;

create function public.rpc_learner_assessment_state(p_course_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_attempts jsonb; v_legacy jsonb;
begin
  v_actor := learner_assessment_private.actor_for_course(p_course_id);
  select coalesce(jsonb_agg(jsonb_build_object('attempt_id', id, 'phase', phase,
    'state', state, 'form_id', form_id, 'release_id', release_id,
    'score_percent', score_percent, 'legacy_attempt_id', legacy_attempt_id)
    order by started_at), '[]'::jsonb) into v_attempts
  from learner_assessment_private.attempts
  where learner_id = v_actor and course_id = p_course_id and state in ('draft', 'submitted');
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'phase', phase,
    'score_percent', score_percent) order by taken_at), '[]'::jsonb) into v_legacy
  from public.course_test_attempts where bhw_user_id = v_actor and course_id = p_course_id;
  return jsonb_build_object('attempts', v_attempts, 'final_attempts', v_legacy);
end;
$$;
revoke execute on function public.rpc_learner_assessment_state(uuid) from public, anon;
grant execute on function public.rpc_learner_assessment_state(uuid) to authenticated;

create function public.rpc_learner_assessment_session_forms(p_session_id uuid)
returns table(final_attempt_id uuid, form_id text, release_id text, comparability_status text)
language plpgsql security definer set search_path = '' as $$
declare v_actor public.users; v_session public.course_sessions;
begin
  select * into v_actor from public.current_app_user();
  select * into v_session from public.course_sessions where id = p_session_id;
  if v_actor.id is null or v_actor.status <> 'active' or v_session.id is null or
    not ((v_actor.role = 'assessor' and v_session.facilitator_user_id = v_actor.id)
      or (v_actor.role = 'admin' and public.org_unit_path(v_session.org_unit_id)
        like public.current_org_path() || '%')) then
    raise exception 'not authorized';
  end if;
  return query select a.legacy_attempt_id, a.form_id, a.release_id, r.comparability_status
    from learner_assessment_private.attempts a
    join learner_assessment_private.releases r on r.id = a.release_id
    where a.session_id = p_session_id and a.state = 'submitted';
end;
$$;
revoke execute on function public.rpc_learner_assessment_session_forms(uuid) from public, anon;
grant execute on function public.rpc_learner_assessment_session_forms(uuid) to authenticated;

-- Keep the legacy submit contract for other chapters and existing learners,
-- but never let a caller bypass a v2 draft or enabled Chapter 1 entry.
alter function public.rpc_course_test_submit(uuid, text, jsonb, uuid)
  rename to rpc_course_test_submit_legacy_impl;
revoke execute on function public.rpc_course_test_submit_legacy_impl(uuid, text, jsonb, uuid)
  from public, anon, authenticated;
create function public.rpc_course_test_submit(
  p_course_id uuid, p_phase text, p_answers jsonb, p_session_id uuid default null
) returns table(score_percent numeric)
language plpgsql security definer set search_path = '' as $$
declare v_actor public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null then raise exception 'not authorized'; end if;
  if v_actor.role = 'bhw' and exists (
    select 1 from public.training_program_chapters ch
    join public.training_programs p on p.id = ch.program_id
    where ch.course_id = p_course_id and ch.chapter_key = 'chapter-1'
      and p.content_key = 'bhw-reference-manual'
  ) and (
    exists (select 1 from learner_assessment_private.attempts a
      where a.learner_id = v_actor.id and a.course_id = p_course_id and a.state in ('draft', 'submitted'))
    or exists (select 1 from public.feature_flags f where f.key = 'chapter1_assessment_v2'
      and f.enabled = true and not ('bhw' = any(f.disabled_roles)))
  ) then raise exception 'use the Chapter 1 assessment flow'; end if;
  return query select * from public.rpc_course_test_submit_legacy_impl(
    p_course_id, p_phase, p_answers, p_session_id);
end;
$$;
revoke execute on function public.rpc_course_test_submit(uuid, text, jsonb, uuid) from public, anon;
grant execute on function public.rpc_course_test_submit(uuid, text, jsonb, uuid) to authenticated;
