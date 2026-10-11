-- Optional retrieval practice stays separate from diagnostic attempts.
create table learner_assessment_private.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  release_id text not null,
  group_key text not null,
  state text not null default 'in_progress' check (state in ('in_progress','completed','skipped')),
  first_snapshot jsonb not null check (jsonb_typeof(first_snapshot) = 'array' and jsonb_array_length(first_snapshot) = 2),
  alternate_snapshot jsonb not null check (jsonb_typeof(alternate_snapshot) = 'array' and jsonb_array_length(alternate_snapshot) = 2),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(learner_id, course_id, release_id, group_key),
  foreign key(release_id, group_key) references learner_assessment_private.checkpoints(release_id, group_key)
);
create index chapter_practice_course on learner_assessment_private.practice_attempts(learner_id, course_id);
create table learner_assessment_private.practice_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references learner_assessment_private.practice_attempts(id) on delete cascade,
  mutation_id uuid not null,
  item_id uuid not null,
  kind text not null check (kind in ('choice','unknown')),
  option_id text,
  first_for_item boolean not null,
  correct boolean not null,
  feedback jsonb not null,
  submitted_at timestamptz not null default now(),
  unique(attempt_id, mutation_id),
  check ((kind = 'choice' and option_id is not null) or (kind = 'unknown' and option_id is null))
);
create unique index chapter_practice_first_response
  on learner_assessment_private.practice_events(attempt_id, item_id) where first_for_item;
alter table learner_assessment_private.practice_attempts enable row level security;
alter table learner_assessment_private.practice_events enable row level security;
revoke all on learner_assessment_private.practice_attempts, learner_assessment_private.practice_events from public, anon, authenticated;
grant select, insert, update on learner_assessment_private.practice_attempts, learner_assessment_private.practice_events to service_role;

create function public.rpc_chapter_practice_get(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_attempt learner_assessment_private.practice_attempts; v_events jsonb;
begin
  select * into v_attempt from learner_assessment_private.practice_attempts where id = p_attempt_id;
  if v_attempt.id is null then raise exception 'practice not found'; end if;
  v_actor := learner_assessment_private.owner_id();
  if v_attempt.learner_id <> v_actor then raise exception 'not authorized'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('item_id', item_id, 'kind', kind,
    'option_id', option_id, 'first_for_item', first_for_item, 'correct', correct,
    'feedback', feedback, 'submitted_at', submitted_at) order by submitted_at), '[]'::jsonb)
    into v_events from learner_assessment_private.practice_events where attempt_id = p_attempt_id;
  return jsonb_build_object('attempt_id', v_attempt.id, 'group_key', v_attempt.group_key,
    'state', v_attempt.state, 'first_items', learner_assessment_private.safe_items(v_attempt.first_snapshot),
    'alternate_items', learner_assessment_private.safe_items(v_attempt.alternate_snapshot),
    'events', v_events);
end;
$$;
revoke execute on function public.rpc_chapter_practice_get(uuid) from public, anon;
grant execute on function public.rpc_chapter_practice_get(uuid) to authenticated;

create function public.rpc_chapter_practice_start(p_course_id uuid, p_group_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_attempt learner_assessment_private.practice_attempts;
  v_enrollment learner_assessment_private.enrollments; v_release learner_assessment_private.releases;
  v_checkpoint learner_assessment_private.checkpoints; v_progress public.course_progress;
begin
  v_actor := learner_assessment_private.actor_for_course(p_course_id);
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
    where key = 'chapter1_assessment_v2' and enabled and not ('bhw' = any(disabled_roles))) then
    raise exception 'new practice starts unavailable';
  end if;
  select * into v_checkpoint from learner_assessment_private.checkpoints
    where release_id = v_release.id and group_key = p_group_key;
  if v_checkpoint.release_id is null then raise exception 'checkpoint unavailable'; end if;
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
  if v_enrollment.learner_id is null then
    insert into learner_assessment_private.enrollments(learner_id, course_id, release_id, legacy_baseline)
      values(v_actor, p_course_id, v_release.id, true);
  end if;
  insert into learner_assessment_private.practice_attempts(learner_id, course_id, release_id, group_key,
    first_snapshot, alternate_snapshot)
    values(v_actor, p_course_id, v_release.id, p_group_key,
      v_checkpoint.first_items, v_checkpoint.alternate_items) returning * into v_attempt;
  return public.rpc_chapter_practice_get(v_attempt.id);
end;
$$;
revoke execute on function public.rpc_chapter_practice_start(uuid, text) from public, anon;
grant execute on function public.rpc_chapter_practice_start(uuid, text) to authenticated;

create function public.rpc_chapter_practice_commit(
  p_attempt_id uuid, p_item_id uuid, p_kind text, p_option_id text, p_mutation_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_attempt learner_assessment_private.practice_attempts; v_actor uuid; v_item jsonb;
  v_first_id uuid; v_position bigint; v_existing learner_assessment_private.practice_events;
  v_correct boolean; v_feedback jsonb; v_event learner_assessment_private.practice_events;
begin
  if p_mutation_id is null or p_kind not in ('choice','unknown') then raise exception 'invalid practice response'; end if;
  select * into v_attempt from learner_assessment_private.practice_attempts where id = p_attempt_id for update;
  if v_attempt.id is null then raise exception 'practice not found'; end if;
  v_actor := learner_assessment_private.owner_id();
  if v_attempt.learner_id <> v_actor then raise exception 'not authorized'; end if;
  select * into v_event from learner_assessment_private.practice_events
    where attempt_id = p_attempt_id and mutation_id = p_mutation_id;
  if v_event.id is not null then
    if v_event.item_id <> p_item_id or v_event.kind <> p_kind or v_event.option_id is distinct from p_option_id then
      raise exception 'mutation ID reused with different payload';
    end if;
    return jsonb_build_object('item_id', v_event.item_id, 'first_for_item', v_event.first_for_item,
      'correct', v_event.correct, 'feedback', v_event.feedback);
  end if;
  select value, ordinal into v_item, v_position
    from jsonb_array_elements(v_attempt.first_snapshot) with ordinality as items(value, ordinal)
    where value->>'item_id' = p_item_id::text;
  if v_item is null then
    select value, ordinal into v_item, v_position
      from jsonb_array_elements(v_attempt.alternate_snapshot) with ordinality as items(value, ordinal)
      where value->>'item_id' = p_item_id::text;
    if v_item is null then raise exception 'foreign practice item'; end if;
    v_first_id := (v_attempt.first_snapshot->(v_position::integer - 1)->>'item_id')::uuid;
    if not exists(select 1 from learner_assessment_private.practice_events
      where attempt_id = p_attempt_id and item_id = v_first_id) then
      raise exception 'answer the first item before its alternate';
    end if;
  end if;
  if (p_kind = 'choice' and not exists(select 1 from jsonb_array_elements(v_item->'options') option
      where option->>'id' = p_option_id)) or (p_kind = 'unknown' and p_option_id is not null) then
    raise exception 'invalid practice option';
  end if;
  select * into v_existing from learner_assessment_private.practice_events
    where attempt_id = p_attempt_id and item_id = p_item_id order by submitted_at limit 1;
  v_correct := p_kind = 'choice' and p_option_id = v_item->>'correct_option_id';
  v_feedback := jsonb_build_object('correct_option_id', v_item->'correct_option_id',
    'rationale', v_item->'rationale', 'distractor_rationale',
    (select option->'distractor_rationale' from jsonb_array_elements(v_item->'options') option
      where option->>'id' = p_option_id));
  insert into learner_assessment_private.practice_events(attempt_id, mutation_id, item_id,
    kind, option_id, first_for_item, correct, feedback)
    values(p_attempt_id, p_mutation_id, p_item_id, p_kind, p_option_id,
      v_existing.id is null, v_correct, v_feedback) returning * into v_event;
  if (select count(distinct e.item_id) from learner_assessment_private.practice_events e
      where e.attempt_id = p_attempt_id and e.item_id in (
        (v_attempt.first_snapshot->0->>'item_id')::uuid,
        (v_attempt.first_snapshot->1->>'item_id')::uuid)) = 2 then
    update learner_assessment_private.practice_attempts
      set state = 'completed', updated_at = now() where id = p_attempt_id;
  end if;
  return jsonb_build_object('item_id', v_event.item_id, 'first_for_item', v_event.first_for_item,
    'correct', v_event.correct, 'feedback', v_event.feedback);
end;
$$;
revoke execute on function public.rpc_chapter_practice_commit(uuid, uuid, text, text, uuid) from public, anon;
grant execute on function public.rpc_chapter_practice_commit(uuid, uuid, text, text, uuid) to authenticated;
