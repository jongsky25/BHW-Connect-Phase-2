-- C1AF-13: a separate, immutable Chapter 1 practice-evidence ledger. Legacy
-- competency_observations stay readable and retain their existing callers.
-- No criterion, approval, flag, cohort, cutover, or award is activated here.
begin;

create table assessor_rollout_private.practice_criteria (
  chapter_id uuid not null references public.training_program_chapters(id),
  lesson_id uuid not null references public.course_lessons(id),
  lesson_revision_id uuid not null,
  criterion_id text not null check (btrim(criterion_id) <> ''),
  criterion_version text not null check (btrim(criterion_version) <> ''),
  requirements_version text not null check (btrim(requirements_version) <> ''),
  rubric_version text not null check (btrim(rubric_version) <> ''),
  source_fingerprint text not null check (source_fingerprint ~ '^[a-f0-9]{64}$'),
  rubric_snapshot jsonb not null check (jsonb_typeof(rubric_snapshot) = 'object' and rubric_snapshot <> '{}'::jsonb),
  review_reference text not null check (btrim(review_reference) <> ''),
  approved_by uuid not null references public.users(id),
  enabled boolean not null default false,
  primary key (chapter_id, criterion_id, criterion_version),
  foreign key (lesson_revision_id, lesson_id) references public.course_lesson_revisions(id, lesson_id)
);
create index practice_criteria_lesson_idx on assessor_rollout_private.practice_criteria(lesson_id);
alter table assessor_rollout_private.practice_criteria enable row level security;
revoke all on assessor_rollout_private.practice_criteria from public, anon, authenticated;

create table assessor_rollout_private.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  request_payload jsonb not null check (jsonb_typeof(request_payload) = 'object'),
  program_id uuid not null references public.training_programs(id),
  chapter_id uuid not null,
  module_id uuid not null references public.course_modules(id),
  lesson_id uuid not null references public.course_lessons(id),
  lesson_revision_id uuid not null,
  criterion_id text not null,
  criterion_version text not null,
  requirements_version text not null,
  rubric_version text not null,
  criterion_snapshot jsonb not null check (jsonb_typeof(criterion_snapshot) = 'object'),
  bhw_user_id uuid not null references public.users(id),
  observer_user_id uuid not null references public.users(id),
  org_unit_id uuid not null references public.org_units(id),
  sufficiency text not null check (sufficiency in ('not_observed', 'insufficient', 'sufficient')),
  rating text check (rating in ('kaya_na', 'kailangan_practice', 'hindi_pa')),
  facts text not null check (length(btrim(facts)) between 10 and 4000),
  prompts text not null default '' check (length(prompts) <= 2000),
  private_notes text not null default '' check (length(private_notes) <= 2000),
  feedback text not null default '' check (length(feedback) <= 2000),
  next_step text not null check (length(btrim(next_step)) between 3 and 1000),
  feedback_released_at timestamptz,
  session_activity_id uuid references public.course_session_activities(id),
  activity_snapshot jsonb check (jsonb_typeof(activity_snapshot) = 'object'),
  prior_attempt_id uuid references assessor_rollout_private.practice_attempts(id),
  link_kind text check (link_kind in ('retry', 'correction')),
  recorded_at timestamptz not null default clock_timestamp(),
  unique (observer_user_id, request_id),
  foreign key (chapter_id, criterion_id, criterion_version)
    references assessor_rollout_private.practice_criteria(chapter_id, criterion_id, criterion_version),
  foreign key (lesson_revision_id, lesson_id) references public.course_lesson_revisions(id, lesson_id),
  check ((sufficiency = 'sufficient') = (rating is not null)),
  check ((prior_attempt_id is null) = (link_kind is null)),
  check (feedback_released_at is null or btrim(feedback) <> ''),
  check ((session_activity_id is null) = (activity_snapshot is null))
);
create index practice_attempts_observer_bhw_idx on assessor_rollout_private.practice_attempts
  (observer_user_id, bhw_user_id, recorded_at desc, id desc);
create index practice_attempts_bhw_released_idx on assessor_rollout_private.practice_attempts
  (bhw_user_id, recorded_at desc, id desc) where feedback_released_at is not null;
create unique index practice_attempts_one_correction_idx on assessor_rollout_private.practice_attempts(prior_attempt_id)
  where link_kind = 'correction';
alter table assessor_rollout_private.practice_attempts enable row level security;
revoke all on assessor_rollout_private.practice_attempts from public, anon, authenticated;

create function assessor_rollout_private.practice_preserve_attempt() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'practice evidence is immutable; link a correction or retry';
end;
$$;
create trigger practice_preserve_attempt before update or delete on assessor_rollout_private.practice_attempts
  for each row execute function assessor_rollout_private.practice_preserve_attempt();

create function assessor_rollout_private.practice_preserve_criterion() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from assessor_rollout_private.practice_attempts a
    where a.chapter_id = old.chapter_id and a.criterion_id = old.criterion_id
      and a.criterion_version = old.criterion_version) then
    if tg_op = 'DELETE' or (to_jsonb(new) - 'enabled') is distinct from (to_jsonb(old) - 'enabled') then
      raise exception 'used practice criterion is immutable';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger practice_preserve_criterion before update or delete on assessor_rollout_private.practice_criteria
  for each row execute function assessor_rollout_private.practice_preserve_criterion();

create function assessor_rollout_private.practice_record(
  p_request_id uuid, p_bhw_user_id uuid, p_chapter_id uuid, p_criterion_id text,
  p_criterion_version text, p_sufficiency text, p_rating text, p_facts text,
  p_prompts text, p_private_notes text, p_feedback text, p_next_step text,
  p_release_feedback boolean, p_session_activity_id uuid, p_prior_attempt_id uuid,
  p_link_kind text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor public.users; learner public.users;
  criterion assessor_rollout_private.practice_criteria;
  previous assessor_rollout_private.practice_attempts;
  existing assessor_rollout_private.practice_attempts;
  activity public.course_session_activities;
  activity_copy jsonb; payload jsonb; attempt_id uuid;
  program_id uuid; module_id uuid;
begin
  actor := public.current_app_user();
  if actor.id is null or actor.role <> 'assessor' or actor.status <> 'active'
    or exists (select 1 from public.super_admin_personas where persona_user_id = actor.id) then
    raise exception 'not authorized';
  end if;
  -- Same lock order as award issuance/lifecycle. Recheck account after lock.
  select * into actor from public.users where id = actor.id for update;
  if actor.role <> 'assessor' or actor.status <> 'active' then raise exception 'not authorized'; end if;
  if p_request_id is null or p_bhw_user_id is null or p_chapter_id is null
    or nullif(btrim(p_criterion_id), '') is null or nullif(btrim(p_criterion_version), '') is null
    or p_release_feedback is null then raise exception 'missing practice identity'; end if;
  if p_sufficiency is null or p_sufficiency not in ('not_observed', 'insufficient', 'sufficient')
    or ((p_sufficiency = 'sufficient') is distinct from (p_rating is not null))
    or (p_rating is not null and p_rating not in ('kaya_na', 'kailangan_practice', 'hindi_pa'))
    then raise exception 'invalid evidence state'; end if;
  if length(btrim(coalesce(p_facts, ''))) not between 10 and 4000
    or length(coalesce(p_prompts, '')) > 2000 or length(coalesce(p_private_notes, '')) > 2000
    or length(coalesce(p_feedback, '')) > 2000
    or length(btrim(coalesce(p_next_step, ''))) not between 3 and 1000
    or (p_release_feedback and nullif(btrim(coalesce(p_feedback, '')), '') is null)
    or ((p_prior_attempt_id is null) is distinct from (p_link_kind is null))
    or (p_link_kind is not null and p_link_kind not in ('retry', 'correction'))
    then raise exception 'invalid practice details'; end if;

  select * into criterion from assessor_rollout_private.practice_criteria r
    where r.chapter_id = p_chapter_id and r.criterion_id = p_criterion_id
      and r.criterion_version = p_criterion_version and r.enabled for share;
  select ch.program_id, module.id into program_id, module_id
    from public.training_program_chapters ch
      join public.training_programs program on program.id = ch.program_id
      join public.courses course on course.id = ch.course_id
      join public.course_modules module on module.course_id = ch.course_id
      join public.course_lessons lesson on lesson.module_id = module.id
      where ch.id = p_chapter_id and ch.chapter_key = 'chapter-1'
        and ch.availability = 'available' and program.content_key = 'bhw-reference-manual'
        and program.status = 'published' and course.status = 'published'
        and lesson.id = criterion.lesson_id and lesson.published_revision_id = criterion.lesson_revision_id
        and (public.org_unit_path(course.org_unit_id) like public.current_org_path() || '%'
          or public.current_org_path() like public.org_unit_path(course.org_unit_id) || '%');
  if criterion.chapter_id is null or program_id is null then raise exception 'criterion unavailable'; end if;
  -- The current, explicitly approved award and persisted rollout state are
  -- checked on every write. A historical AF-05 qualification is insufficient.
  perform 1 from assessor_rollout_private.chapter_awards award
    join assessor_rollout_private.award_contracts contract
      on contract.requirements_version = award.requirements_version
    where award.actor_id = actor.id and award.chapter_id = p_chapter_id
      and award.requirements_version = criterion.requirements_version
    for share of award, contract;
  if not exists (
    select 1 from assessor_rollout_private.chapter_awards award
      join assessor_rollout_private.award_contracts contract
        on contract.requirements_version = award.requirements_version
      where award.actor_id = actor.id and award.chapter_id = p_chapter_id
        and award.status = 'active' and contract.enabled
        and award.requirements_version = criterion.requirements_version
        and contract.rubric_version = criterion.rubric_version
  ) then raise exception 'chapter authority required'; end if;
  perform 1 from public.assessor_flow_cohorts cohort
    join public.training_program_chapters ch on ch.program_id = cohort.program_id
      and ch.chapter_key = cohort.chapter_key
    where ch.id = p_chapter_id for share of cohort;
  perform 1 from public.feature_flags where key in ('elearning', 'assessor_flow_writes') for share;
  if not exists (
    select 1 from assessor_rollout_private.practice_criteria r
      join public.training_program_chapters ch on ch.id = r.chapter_id
      join public.assessor_flow_cohorts cohort on cohort.program_id = ch.program_id
        and cohort.chapter_key = ch.chapter_key
      join public.assessor_flow_cohort_members staff on staff.cohort_id = cohort.id
        and staff.user_id = actor.id
      join public.assessor_flow_cohort_members member on member.cohort_id = cohort.id
        and member.user_id = p_bhw_user_id
      where r.chapter_id = criterion.chapter_id and r.criterion_id = criterion.criterion_id
        and r.criterion_version = criterion.criterion_version
        and cohort.writes_enabled and cohort.authority_cutover_at is not null
  ) or (select count(*) from public.feature_flags where key in ('elearning', 'assessor_flow_writes')
       and enabled and not ('assessor' = any(coalesce(disabled_roles, '{}'::text[])))) <> 2
    then raise exception 'practice writes unavailable'; end if;

  select * into learner from public.users where id = p_bhw_user_id for share;
  if learner.id is null or learner.role <> 'bhw' or learner.status <> 'active'
    or learner.id = actor.id
    or not (public.org_unit_path(learner.org_unit_id) like public.current_org_path() || '%')
    then raise exception 'learner unavailable in catchment'; end if;

  if p_session_activity_id is not null then
    select a.* into activity from public.course_session_activities a
      join public.course_sessions s on s.id = a.session_id
      join public.course_lessons l on l.module_id = a.module_id
      join public.training_program_chapters ch on ch.course_id = s.course_id
      where a.id = p_session_activity_id and l.id = criterion.lesson_id
        and ch.id = criterion.chapter_id and s.facilitator_user_id = actor.id
        and s.status in ('scheduled', 'completed') and a.status in ('run', 'adapted')
        and exists (select 1 from public.course_session_enrollments e
          where e.session_id = s.id and e.bhw_user_id = learner.id and e.status = 'attended');
    if activity.id is null then raise exception 'activity unavailable for learner'; end if;
    activity_copy := activity.activity_snapshot;
  end if;

  payload := jsonb_build_object('bhw', p_bhw_user_id, 'chapter', p_chapter_id,
    'criterion', p_criterion_id, 'version', p_criterion_version, 'sufficiency', p_sufficiency,
    'rating', p_rating, 'facts', btrim(p_facts), 'prompts', btrim(coalesce(p_prompts, '')),
    'privateNotes', btrim(coalesce(p_private_notes, '')), 'feedback', btrim(coalesce(p_feedback, '')),
    'nextStep', btrim(p_next_step), 'release', p_release_feedback,
    'sessionActivity', p_session_activity_id, 'priorAttempt', p_prior_attempt_id, 'linkKind', p_link_kind);
  select * into existing from assessor_rollout_private.practice_attempts
    where observer_user_id = actor.id and request_id = p_request_id;
  if existing.id is not null then
    if existing.request_payload <> payload then raise exception 'request ID reused with different evidence'; end if;
    return existing.id;
  end if;
  if p_prior_attempt_id is not null then
    select * into previous from assessor_rollout_private.practice_attempts where id = p_prior_attempt_id;
    if previous.id is null or previous.observer_user_id <> actor.id or previous.bhw_user_id <> learner.id
      or previous.chapter_id <> criterion.chapter_id or previous.criterion_id <> criterion.criterion_id
      or previous.criterion_version <> criterion.criterion_version
      then raise exception 'prior attempt unavailable'; end if;
  end if;

  insert into assessor_rollout_private.practice_attempts (
    request_id, request_payload, program_id, chapter_id, module_id, lesson_id,
    lesson_revision_id, criterion_id,
    criterion_version, requirements_version, rubric_version, criterion_snapshot,
    bhw_user_id, observer_user_id, org_unit_id, sufficiency, rating, facts, prompts,
    private_notes, feedback, next_step, feedback_released_at, session_activity_id,
    activity_snapshot, prior_attempt_id, link_kind
  ) values (
    p_request_id, payload, program_id, criterion.chapter_id, module_id,
    criterion.lesson_id, criterion.lesson_revision_id,
    criterion.criterion_id, criterion.criterion_version, criterion.requirements_version,
    criterion.rubric_version,
    jsonb_build_object('criterionId', criterion.criterion_id, 'criterionVersion', criterion.criterion_version,
      'rubric', criterion.rubric_snapshot, 'sourceFingerprint', criterion.source_fingerprint,
      'reviewReference', criterion.review_reference, 'programId', program_id,
      'chapterId', criterion.chapter_id, 'moduleId', module_id,
      'lessonRevisionId', criterion.lesson_revision_id),
    learner.id, actor.id, learner.org_unit_id,
    p_sufficiency, p_rating, btrim(p_facts), btrim(coalesce(p_prompts, '')),
    btrim(coalesce(p_private_notes, '')), btrim(coalesce(p_feedback, '')), btrim(p_next_step),
    case when p_release_feedback then clock_timestamp() else null end,
    p_session_activity_id, activity_copy, p_prior_attempt_id, p_link_kind
  ) returning id into attempt_id;
  insert into public.audit_events(actor_user_id, event_type, subject_type, subject_id, metadata,
    plain_summary_fil, plain_summary_en)
  values (actor.id, 'assessor.practice_recorded', 'user', learner.id,
    jsonb_build_object('attempt_id', attempt_id, 'chapter_id', p_chapter_id,
      'criterion_id', p_criterion_id, 'sufficiency', p_sufficiency),
    'Naitala ang ebidensiya ng pagsasanay.', 'Practice evidence was recorded.');
  return attempt_id;
end;
$$;

create function public.rpc_assessor_practice_record(
  p_request_id uuid, p_bhw_user_id uuid, p_chapter_id uuid, p_criterion_id text,
  p_criterion_version text, p_sufficiency text, p_rating text, p_facts text,
  p_prompts text default '', p_private_notes text default '', p_feedback text default '',
  p_next_step text default '', p_release_feedback boolean default false,
  p_session_activity_id uuid default null, p_prior_attempt_id uuid default null,
  p_link_kind text default null
) returns uuid language sql security invoker set search_path = '' as $$
  select assessor_rollout_private.practice_record(p_request_id, p_bhw_user_id, p_chapter_id,
    p_criterion_id, p_criterion_version, p_sufficiency, p_rating, p_facts, p_prompts,
    p_private_notes, p_feedback, p_next_step, p_release_feedback, p_session_activity_id,
    p_prior_attempt_id, p_link_kind)
$$;

-- A scoped projection keeps working notes and unreleased feedback away from
-- the learner. No direct SELECT is granted on the private evidence table.
create function assessor_rollout_private.practice_history(p_bhw_user_id uuid, p_page integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor public.users; result jsonb;
begin
  actor := public.current_app_user();
  if actor.id is null or actor.status <> 'active' or p_page is null or p_page < 1 or p_page > 10000
    or p_bhw_user_id is null then raise exception 'not authorized'; end if;
  if actor.role = 'assessor' then
    if not exists (select 1 from public.users learner where learner.id = p_bhw_user_id
      and public.org_unit_path(learner.org_unit_id) like public.current_org_path() || '%')
      then raise exception 'learner unavailable in catchment'; end if;
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'criterionId', a.criterion_id,
      'criterionVersion', a.criterion_version, 'lessonId', a.lesson_id,
      'sufficiency', a.sufficiency, 'rating', a.rating, 'facts', a.facts,
      'prompts', a.prompts, 'privateNotes', a.private_notes, 'feedback', a.feedback,
      'nextStep', a.next_step, 'feedbackReleasedAt', a.feedback_released_at,
      'activitySnapshot', a.activity_snapshot, 'criterionSnapshot', a.criterion_snapshot,
      'priorAttemptId', a.prior_attempt_id, 'linkKind', a.link_kind, 'recordedAt', a.recorded_at)
      order by a.recorded_at desc, a.id desc), '[]'::jsonb) into result
    from (select * from assessor_rollout_private.practice_attempts
      where observer_user_id = actor.id and bhw_user_id = p_bhw_user_id
      order by recorded_at desc, id desc limit 20 offset (p_page - 1) * 20) a;
  elsif actor.role = 'bhw' and actor.id = p_bhw_user_id then
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'criterionId', a.criterion_id,
      'lessonId', a.lesson_id, 'sufficiency', a.sufficiency, 'rating', a.rating,
      'feedback', a.feedback, 'nextStep', a.next_step, 'releasedAt', a.feedback_released_at)
      order by a.recorded_at desc, a.id desc), '[]'::jsonb) into result
    from (select * from assessor_rollout_private.practice_attempts
      where bhw_user_id = actor.id and feedback_released_at is not null
      order by recorded_at desc, id desc limit 20 offset (p_page - 1) * 20) a;
  else raise exception 'not authorized'; end if;
  return result;
end;
$$;
create function public.rpc_practice_evidence_history(p_bhw_user_id uuid, p_page integer default 1)
returns jsonb language sql security invoker set search_path = '' as $$
  select assessor_rollout_private.practice_history(p_bhw_user_id, p_page)
$$;

revoke execute on function assessor_rollout_private.practice_preserve_attempt(),
  assessor_rollout_private.practice_preserve_criterion(),
  assessor_rollout_private.practice_record(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,boolean,uuid,uuid,text),
  assessor_rollout_private.practice_history(uuid,integer),
  public.rpc_assessor_practice_record(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,boolean,uuid,uuid,text),
  public.rpc_practice_evidence_history(uuid,integer) from public, anon, authenticated;
grant execute on function assessor_rollout_private.practice_record(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,boolean,uuid,uuid,text),
  assessor_rollout_private.practice_history(uuid,integer),
  public.rpc_assessor_practice_record(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,boolean,uuid,uuid,text),
  public.rpc_practice_evidence_history(uuid,integer) to authenticated;
commit;
