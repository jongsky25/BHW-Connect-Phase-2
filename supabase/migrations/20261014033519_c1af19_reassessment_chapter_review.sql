-- C1AF-19: released formal feedback, explicit retry, and one Chapter 1 BHW decision.
-- No reviewed contract, cohort, flag, cutover, or award is seeded here.
begin;

alter table assessor_rollout_private.formal_attempts
  add column feedback_fil text check (feedback_fil is null or length(btrim(feedback_fil)) between 10 and 2000),
  add column feedback_en text check (feedback_en is null or length(btrim(feedback_en)) between 10 and 2000),
  add column feedback_released_at timestamptz,
  add column feedback_key uuid,
  add constraint formal_feedback_complete check
    ((feedback_released_at is null and feedback_fil is null and feedback_en is null and feedback_key is null)
      or (feedback_released_at is not null and feedback_fil is not null
        and feedback_en is not null and feedback_key is not null));

alter table assessor_rollout_private.component_requests
  drop constraint component_requests_status_check;
alter table assessor_rollout_private.component_requests
  add constraint component_requests_status_check
  check (status in ('pending','assigned','arranged','assessed','reassessed','cancelled','released'));

create table assessor_rollout_private.formal_reassessments (
  id uuid primary key default gen_random_uuid(),
  prior_attempt_id uuid not null unique references assessor_rollout_private.formal_attempts(id),
  next_request_id uuid not null unique references assessor_rollout_private.component_requests(id),
  actor_id uuid not null references public.users(id),
  request_key uuid not null,
  practice_note text not null check (length(btrim(practice_note)) between 20 and 2000),
  practice_attempt_id uuid references assessor_rollout_private.practice_attempts(id),
  created_at timestamptz not null default clock_timestamp(),
  unique(actor_id,request_key)
);
alter table assessor_rollout_private.formal_reassessments enable row level security;
revoke all on assessor_rollout_private.formal_reassessments from public,anon,authenticated;

create table assessor_rollout_private.bhw_chapter_reviews (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id),
  chapter_id uuid not null references public.training_program_chapters(id),
  course_id uuid not null references public.courses(id),
  bhw_user_id uuid not null references public.users(id),
  reviewer_id uuid not null references public.users(id),
  request_key uuid not null,
  requirements_version text not null,
  evidence_snapshot jsonb not null check (jsonb_typeof(evidence_snapshot)='array'),
  outcome text not null check (outcome in ('complete','needs_practice','insufficient_evidence')),
  summary_fil text not null check (length(btrim(summary_fil)) between 10 and 2000),
  summary_en text not null check (length(btrim(summary_en)) between 10 and 2000),
  state text not null check (state in ('issuing','released','issued')),
  assessment_id uuid unique references public.assessments(id),
  certificate_id uuid unique references public.certificates(id),
  decided_at timestamptz not null default clock_timestamp(),
  unique(reviewer_id,request_key),
  check ((outcome='complete' and state in ('issuing','issued'))
    or (outcome<>'complete' and state='released' and assessment_id is null and certificate_id is null)),
  check (state<>'issued' or certificate_id is not null)
);
create index bhw_chapter_reviews_bhw_idx on assessor_rollout_private.bhw_chapter_reviews
  (bhw_user_id,decided_at desc);
create unique index bhw_chapter_one_issued on assessor_rollout_private.bhw_chapter_reviews
  (chapter_id,bhw_user_id) where state='issued';
alter table assessor_rollout_private.bhw_chapter_reviews enable row level security;
revoke all on assessor_rollout_private.bhw_chapter_reviews from public,anon,authenticated;

alter table public.assessments add column formal_chapter_review_id uuid unique
  references assessor_rollout_private.bhw_chapter_reviews(id);

create function assessor_rollout_private.formal_feedback_release(
  p_key uuid,p_attempt_id uuid,p_fil text,p_en text
) returns uuid language plpgsql security definer set search_path='' as $$
declare a assessor_rollout_private.formal_attempts; actor public.users;
begin
  actor:=public.current_app_user();
  if p_key is null or length(btrim(coalesce(p_fil,''))) not between 10 and 2000
    or length(btrim(coalesce(p_en,''))) not between 10 and 2000
    then raise exception 'feedback unavailable'; end if;
  select * into a from assessor_rollout_private.formal_attempts where id=p_attempt_id for update;
  if a.id is null or a.assessor_user_id is distinct from actor.id or a.status<>'submitted'
    then raise exception 'feedback unavailable'; end if;
  if a.feedback_released_at is not null then
    if a.feedback_key=p_key and a.feedback_fil=btrim(p_fil) and a.feedback_en=btrim(p_en)
      then return a.id; end if;
    raise exception 'feedback already released';
  end if;
  if not assessor_rollout_private.component_request_scope(a.program_id,a.bhw_user_id,actor.id)
    or not exists(select 1 from assessor_rollout_private.component_assignments owner
      where owner.id=a.assignment_id and owner.status='active'
        and owner.assessor_user_id=actor.id)
    then raise exception 'feedback unavailable'; end if;
  update assessor_rollout_private.formal_attempts set feedback_fil=btrim(p_fil),
    feedback_en=btrim(p_en),feedback_released_at=clock_timestamp(),feedback_key=p_key
    where id=a.id;
  insert into public.notifications (recipient_user_id,notification_type,subject_type,subject_id,
    title_fil,title_en,body_fil,body_en,link_path)
  values(a.bhw_user_id,'assessment.formal_feedback','formal_attempt',a.id,
    'Resulta ng pormal na pagtatasa','Formal assessment feedback',
    'May inilabas na resulta at susunod na hakbang para sa iyong pagtatasa.',
    'An assessment result and next step are available.',
    '/training/'||a.program_id::text||'/assessment-requests') on conflict do nothing;
  return a.id;
end;
$$;

create function assessor_rollout_private.formal_retry_request(
  p_key uuid,p_prior_attempt_id uuid,p_practice_note text,p_practice_attempt_id uuid default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare a assessor_rollout_private.formal_attempts;
  old_request assessor_rollout_private.component_requests;
  prior_link assessor_rollout_private.formal_reassessments;
  requirement assessor_rollout_private.component_requirements;
  practice assessor_rollout_private.practice_attempts;
  actor public.users; next_id uuid; payload jsonb; criteria jsonb;
begin
  actor:=public.current_app_user();
  if p_key is null or p_prior_attempt_id is null
    or length(btrim(coalesce(p_practice_note,''))) not between 20 and 2000
    then raise exception 'reassessment unavailable'; end if;
  select * into a from assessor_rollout_private.formal_attempts
    where id=p_prior_attempt_id;
  if a.id is null then raise exception 'reassessment unavailable'; end if;
  select * into old_request from assessor_rollout_private.component_requests
    where id=a.request_id for update;
  select * into prior_link from assessor_rollout_private.formal_reassessments
    where prior_attempt_id=a.id;
  if prior_link.id is not null then
    if prior_link.actor_id=actor.id and prior_link.request_key=p_key
      and prior_link.practice_note=btrim(p_practice_note)
      and prior_link.practice_attempt_id is not distinct from p_practice_attempt_id
      then return prior_link.next_request_id; end if;
    raise exception 'reassessment already opened';
  end if;
  if a.status<>'submitted' or a.outcome='complete' or a.feedback_released_at is null
    or old_request.status<>'assessed'
    or not assessor_rollout_private.component_request_scope(a.program_id,a.bhw_user_id,actor.id)
    or not assessor_rollout_private.component_request_ready(a.program_id,a.bhw_user_id,a.module_id)
    then raise exception 'reassessment unavailable'; end if;
  if p_practice_attempt_id is not null then
    select * into practice from assessor_rollout_private.practice_attempts
      where id=p_practice_attempt_id;
    if practice.id is null or practice.bhw_user_id<>a.bhw_user_id
      or practice.module_id<>a.module_id or practice.recorded_at<=a.submitted_at
      or not exists(select 1 from jsonb_array_elements(a.criteria_snapshot) c
        where c->>'id'=practice.criterion_id and c->>'version'=practice.criterion_version)
      then raise exception 'practice evidence unavailable'; end if;
  end if;
  select * into requirement from assessor_rollout_private.component_requirements c
    where c.module_id=a.module_id and c.chapter_id=a.chapter_id and c.enabled;
  if requirement.module_id is null then raise exception 'contract unavailable'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('fil',c.description_fil,'en',c.description_en)
    order by c.criterion_id),'[]'::jsonb) into criteria
    from assessor_rollout_private.component_required_criteria c where c.module_id=a.module_id;
  payload:=jsonb_build_object('program',a.program_id,'learner',a.bhw_user_id,'module',a.module_id);
  update assessor_rollout_private.component_requests set status='reassessed',updated_at=clock_timestamp()
    where id=old_request.id;
  update assessor_rollout_private.component_assignments set status='released',
    updated_at=clock_timestamp() where id=a.assignment_id and status='active';
  insert into assessor_rollout_private.component_requests
    (program_id,chapter_id,module_id,bhw_user_id,requested_by,request_key,request_payload,
      requirements_version,rubric_version,purpose_fil,purpose_en,criteria_snapshot)
  values(a.program_id,a.chapter_id,a.module_id,a.bhw_user_id,actor.id,p_key,payload,
    requirement.requirements_version,requirement.rubric_version,
    requirement.purpose_fil,requirement.purpose_en,criteria) returning id into next_id;
  insert into assessor_rollout_private.formal_reassessments
    (prior_attempt_id,next_request_id,actor_id,request_key,practice_note,practice_attempt_id)
  values(a.id,next_id,actor.id,p_key,btrim(p_practice_note),p_practice_attempt_id);
  return next_id;
end;
$$;

create function assessor_rollout_private.chapter_review_read_scope(
  p_program_id uuid,p_bhw_user_id uuid,p_actor_id uuid
) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.users actor
    join public.users learner on learner.id=p_bhw_user_id
    join public.assessor_flow_cohorts cohort on cohort.program_id=p_program_id
      and cohort.chapter_key='chapter-1' and cohort.ui_enabled
    join public.assessor_flow_cohort_members staff on staff.cohort_id=cohort.id
      and staff.user_id=actor.id
    join public.assessor_flow_cohort_members member on member.cohort_id=cohort.id
      and member.user_id=learner.id
    join public.training_programs program on program.id=p_program_id
      and program.content_key='bhw-reference-manual' and program.status='published'
    where actor.id=p_actor_id and actor.role='assessor' and actor.status='active'
      and learner.role='bhw' and learner.status='active'
      and public.org_unit_path(learner.org_unit_id)
        like public.org_unit_path(actor.org_unit_id)||'%'
      and not exists(select 1 from public.super_admin_personas s where s.persona_user_id=actor.id)
      and exists(select 1 from public.feature_flags f where f.key='assessor_flow_ui'
        and f.enabled and not ('assessor'=any(coalesce(f.disabled_roles,'{}'::text[]))))
      and exists(select 1 from public.feature_flags f where f.key='elearning'
        and f.enabled and not ('assessor'=any(coalesce(f.disabled_roles,'{}'::text[])))))
$$;

create function assessor_rollout_private.chapter_review_authorized(
  p_program_id uuid,p_bhw_user_id uuid,p_actor_id uuid
) returns boolean language sql stable security definer set search_path='' as $$
  select assessor_rollout_private.chapter_review_read_scope(p_program_id,p_bhw_user_id,p_actor_id)
    and assessor_rollout_private.component_request_scope(p_program_id,p_bhw_user_id,p_actor_id)
    and exists(select 1 from public.assessor_flow_cohorts cohort
      join public.assessor_flow_cohort_members staff on staff.cohort_id=cohort.id
        and staff.user_id=p_actor_id
      join public.assessor_flow_cohort_members member on member.cohort_id=cohort.id
        and member.user_id=p_bhw_user_id
      join public.training_program_chapters chapter on chapter.program_id=cohort.program_id
        and chapter.chapter_key='chapter-1' and chapter.availability='available'
      join assessor_rollout_private.chapter_awards award on award.chapter_id=chapter.id
        and award.actor_id=p_actor_id and award.status='active'
        and award.requirements_version=cohort.requirements_version
      join assessor_rollout_private.award_contracts contract
        on contract.requirements_version=award.requirements_version and contract.enabled
      where cohort.program_id=p_program_id and cohort.chapter_key='chapter-1')
$$;

create function assessor_rollout_private.chapter_review_snapshot(
  p_program_id uuid,p_bhw_user_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor public.users; chapter public.training_program_chapters;
  cohort public.assessor_flow_cohorts; module public.course_modules;
  requirement assessor_rollout_private.component_requirements;
  attempt assessor_rollout_private.formal_attempts;
  retry_link assessor_rollout_private.formal_reassessments;
  readiness jsonb; ready_item jsonb; components jsonb:='[]'::jsonb;
  proposed text:='complete'; current_contract boolean; learner_ready boolean;
  module_count integer:=0; submitted_count integer:=0;
begin
  actor:=public.current_app_user();
  if not assessor_rollout_private.chapter_review_read_scope(p_program_id,p_bhw_user_id,actor.id)
    then raise exception 'chapter review unavailable'; end if;
  select ch.* into chapter from public.training_program_chapters ch
    join public.courses course on course.id=ch.course_id and course.status='published'
    where ch.program_id=p_program_id and ch.chapter_key='chapter-1'
      and ch.availability='available';
  select c.* into cohort from public.assessor_flow_cohorts c
    join public.assessor_flow_cohort_members staff on staff.cohort_id=c.id
      and staff.user_id=actor.id
    join public.assessor_flow_cohort_members member on member.cohort_id=c.id
      and member.user_id=p_bhw_user_id
    where c.program_id=p_program_id and c.chapter_key='chapter-1';
  if chapter.id is null or cohort.id is null then raise exception 'chapter unavailable'; end if;
  readiness:=assessor_rollout_private.component_readiness(p_program_id,p_bhw_user_id);
  for module in select * from public.course_modules m where m.course_id=chapter.course_id
    order by m.position,m.id loop
    module_count:=module_count+1;
    if module_count>20 then raise exception 'too many components for review'; end if;
    select * into requirement from assessor_rollout_private.component_requirements c
      where c.module_id=module.id;
    select * into attempt from assessor_rollout_private.formal_attempts a
      where a.module_id=module.id and a.bhw_user_id=p_bhw_user_id
        and a.chapter_id=chapter.id
      order by a.started_at desc,a.id desc limit 1;
    select * into retry_link from assessor_rollout_private.formal_reassessments link
      where link.next_request_id=attempt.request_id;
    select value into ready_item from jsonb_array_elements(readiness) item(value)
      where value->>'moduleId'=module.id::text;
    learner_ready:=coalesce((ready_item->>'learnerReady')::boolean,false);
    current_contract:=coalesce(requirement.enabled,false)
      and requirement.chapter_id=chapter.id
      and requirement.requirements_version=cohort.requirements_version
      and attempt.id is not null and attempt.status='submitted'
      and attempt.requirements_version=requirement.requirements_version
      and attempt.rubric_version=requirement.rubric_version
      and attempt.criteria_snapshot=assessor_rollout_private.formal_contract(attempt.request_id)
      and jsonb_array_length(attempt.criteria_snapshot)=(select count(*)
        from assessor_rollout_private.component_required_criteria c where c.module_id=module.id);
    if attempt.status='submitted' then submitted_count:=submitted_count+1; end if;
    if not learner_ready or not coalesce(current_contract,false)
      or attempt.feedback_released_at is null or attempt.outcome='insufficient_evidence'
      then proposed:='insufficient_evidence';
    elsif attempt.outcome='needs_practice' and proposed='complete'
      then proposed:='needs_practice'; end if;
    components:=components||jsonb_build_array(jsonb_build_object(
      'moduleId',module.id,'titleFil',module.title_fil,'titleEn',module.title_en,
      'learnerReady',learner_ready,
      'learnerBlockers',coalesce(ready_item->'learnerBlockers','[]'::jsonb),
      'contractCurrent',coalesce(current_contract,false),
      'attemptId',attempt.id,'attemptStatus',attempt.status,'outcome',attempt.outcome,
      'ownedByMe',coalesce(attempt.assessor_user_id=actor.id,false),
      'retryOpened',exists(select 1 from assessor_rollout_private.formal_reassessments link
        where link.prior_attempt_id=attempt.id),
      'reassessment',case when retry_link.id is null then null else jsonb_build_object(
        'priorAttemptId',retry_link.prior_attempt_id,'practiceNote',retry_link.practice_note,
        'practiceAttemptId',retry_link.practice_attempt_id) end,
      'feedbackReleased',attempt.feedback_released_at is not null,
      'criteria',attempt.criteria_snapshot,'evidence',attempt.evidence));
  end loop;
  if module_count=0 or submitted_count=0 then proposed:='insufficient_evidence'; end if;
  return jsonb_build_object('programId',p_program_id,'chapterId',chapter.id,
    'courseId',chapter.course_id,'learnerId',p_bhw_user_id,
    'learnerName',(select full_name from public.users where id=p_bhw_user_id),
    'requirementsVersion',cohort.requirements_version,
    'components',components,'suggestedOutcome',proposed,
    'canDecide',submitted_count>0 and assessor_rollout_private.chapter_review_authorized(
      p_program_id,p_bhw_user_id,actor.id),
    'latestReview',(select jsonb_build_object('id',review.id,'outcome',review.outcome,
      'summaryFil',review.summary_fil,'summaryEn',review.summary_en,
      'decidedAt',review.decided_at,'certificateId',review.certificate_id)
      from assessor_rollout_private.bhw_chapter_reviews review
      where review.chapter_id=chapter.id and review.bhw_user_id=p_bhw_user_id
        and review.state in ('released','issued')
      order by review.decided_at desc,review.id desc limit 1));
end;
$$;

-- The only exception to the cutover backstop is an insert tied to an
-- uncommitted, private complete review being issued by its actual reviewer.
create function assessor_rollout_private.formal_award_insert_allowed(
  p_table text,p_row jsonb
) returns boolean language plpgsql stable security definer set search_path='' as $$
declare actor public.users; review assessor_rollout_private.bhw_chapter_reviews;
  assessment public.assessments;
begin
  actor:=public.current_app_user();
  if actor.id is null then return false; end if;
  if p_table='assessments' then
    select * into review from assessor_rollout_private.bhw_chapter_reviews
      where id=(p_row->>'formal_chapter_review_id')::uuid;
    return review.id is not null and review.state='issuing' and review.outcome='complete'
      and review.reviewer_id=actor.id and review.course_id=(p_row->>'course_id')::uuid
      and review.bhw_user_id=(p_row->>'bhw_user_id')::uuid
      and actor.id=(p_row->>'assessor_user_id')::uuid and p_row->>'status'='passed';
  elsif p_table='certificates' then
    select * into assessment from public.assessments
      where id=(p_row->>'assessment_id')::uuid;
    select * into review from assessor_rollout_private.bhw_chapter_reviews
      where id=assessment.formal_chapter_review_id;
    return review.id is not null and review.state='issuing' and review.outcome='complete'
      and review.reviewer_id=actor.id and assessment.status='passed'
      and assessment.bhw_user_id=(p_row->>'bhw_user_id')::uuid
      and assessment.course_id=(p_row->>'course_id')::uuid
      and review.bhw_user_id=assessment.bhw_user_id and review.course_id=assessment.course_id;
  end if;
  return false;
end;
$$;

create or replace function assessor_rollout_private.legacy_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_rows jsonb[]; v_row jsonb; v_course uuid; v_row_course uuid; v_module_course uuid; v_session uuid;
 v_subjects uuid[]; v_actor uuid;
begin
 if tg_op='INSERT' and tg_table_name in ('assessments','certificates')
   and assessor_rollout_private.formal_award_insert_allowed(tg_table_name,to_jsonb(new))
   then return new; end if;
 if not exists(select 1 from public.assessor_flow_cohorts) then
  if tg_op='DELETE' then return old; end if;
  return new;
 end if;
 if tg_table_name='assessor_chapter_qualifications' and tg_op='UPDATE'
  and (to_jsonb(old)-'status'-'status_changed_at')=(to_jsonb(new)-'status'-'status_changed_at') then return new; end if;
 v_actor:=(public.current_app_user()).id;
 if tg_op='INSERT' then v_rows:=array[to_jsonb(new)];
 elsif tg_op='DELETE' then v_rows:=array[to_jsonb(old)];
 else v_rows:=array[to_jsonb(old),to_jsonb(new)]; end if;
 foreach v_row in array v_rows loop
  v_course:=null; v_row_course:=null; v_module_course:=null; v_session:=null;
  v_subjects:=array_remove(array[v_actor,(v_row->>'bhw_user_id')::uuid,(v_row->>'observer_user_id')::uuid,
    (v_row->>'assessor_user_id')::uuid,(v_row->>'facilitator_user_id')::uuid,(v_row->>'recorded_by')::uuid],null);
  if v_row ? 'course_id' then v_row_course:=(v_row->>'course_id')::uuid; v_course:=v_row_course; end if;
  if v_row ? 'module_id' then select course_id into v_module_course from public.course_modules where id=(v_row->>'module_id')::uuid; end if;
  if tg_table_name='course_sessions' then v_session:=(v_row->>'id')::uuid;
  elsif v_row ? 'session_id' then v_session:=(v_row->>'session_id')::uuid; end if;
  if v_session is not null then
   select s.course_id,array_append(v_subjects,s.facilitator_user_id) into v_course,v_subjects from public.course_sessions s where s.id=v_session;
   if v_course is null then v_course:=(v_row->>'course_id')::uuid; end if;
   v_subjects:=coalesce(v_subjects,'{}')||coalesce((select array_agg(e.bhw_user_id) from public.course_session_enrollments e where e.session_id=v_session),'{}');
   v_subjects:=v_subjects||array_remove(array[v_actor,(v_row->>'facilitator_user_id')::uuid],null);
  end if;
  if v_row ? 'chapter_id' then select course_id into v_course from public.training_program_chapters where id=(v_row->>'chapter_id')::uuid; end if;
  perform assessor_rollout_private.assert_legacy_allowed(v_course,v_subjects);
  if v_row_course is distinct from v_course then perform assessor_rollout_private.assert_legacy_allowed(v_row_course,v_subjects); end if;
  perform assessor_rollout_private.assert_legacy_allowed(v_module_course,v_subjects);
 end loop;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;

create function assessor_rollout_private.chapter_review_decide(
  p_key uuid,p_program_id uuid,p_bhw_user_id uuid,p_fil text,p_en text
) returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.users; snapshot jsonb; previous assessor_rollout_private.bhw_chapter_reviews;
  v_chapter_id uuid; v_course_id uuid; proposed text; review_id uuid;
  existing_cert public.certificates; v_assessment_id uuid; v_certificate_id uuid;
  learner public.users; course public.courses;
begin
  actor:=public.current_app_user();
  if p_key is null or p_program_id is null or p_bhw_user_id is null
    or length(btrim(coalesce(p_fil,''))) not between 10 and 2000
    or length(btrim(coalesce(p_en,''))) not between 10 and 2000
    then raise exception 'chapter decision unavailable'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_program_id::text||':'||p_bhw_user_id::text,0));
  if not assessor_rollout_private.chapter_review_authorized(
    p_program_id,p_bhw_user_id,actor.id)
    then raise exception 'chapter decision unavailable'; end if;
  select * into previous from assessor_rollout_private.bhw_chapter_reviews
    where reviewer_id=actor.id and request_key=p_key;
  if previous.id is not null then
    if previous.program_id=p_program_id and previous.bhw_user_id=p_bhw_user_id
      and previous.summary_fil=btrim(p_fil) and previous.summary_en=btrim(p_en)
      then return previous.id; end if;
    raise exception 'decision key reused';
  end if;
  snapshot:=assessor_rollout_private.chapter_review_snapshot(p_program_id,p_bhw_user_id);
  if (snapshot->>'canDecide')::boolean is distinct from true
    then raise exception 'chapter decision unavailable'; end if;
  v_chapter_id:=(snapshot->>'chapterId')::uuid;
  v_course_id:=(snapshot->>'courseId')::uuid;
  proposed:=snapshot->>'suggestedOutcome';
  select * into previous from assessor_rollout_private.bhw_chapter_reviews
    where chapter_id=v_chapter_id and bhw_user_id=p_bhw_user_id and state='issued'
    order by decided_at desc limit 1;
  if previous.id is not null then return previous.id; end if;
  select * into previous from assessor_rollout_private.bhw_chapter_reviews review
    where review.chapter_id=v_chapter_id and review.bhw_user_id=p_bhw_user_id
      and review.evidence_snapshot=snapshot->'components'
      and review.outcome=proposed and review.state='released'
    order by review.decided_at desc limit 1;
  if previous.id is not null then return previous.id; end if;
  insert into assessor_rollout_private.bhw_chapter_reviews
    (program_id,chapter_id,course_id,bhw_user_id,reviewer_id,request_key,
      requirements_version,evidence_snapshot,outcome,summary_fil,summary_en,state)
  values(p_program_id,v_chapter_id,v_course_id,p_bhw_user_id,actor.id,p_key,
    snapshot->>'requirementsVersion',snapshot->'components',proposed,
    btrim(p_fil),btrim(p_en),
    case when proposed='complete' then 'issuing' else 'released' end)
  returning id into review_id;
  if proposed='complete' then
    select * into existing_cert from public.certificates cert
      where cert.course_id=v_course_id and cert.bhw_user_id=p_bhw_user_id
      order by cert.issued_at,cert.id limit 1;
    if existing_cert.id is not null then
      v_assessment_id:=existing_cert.assessment_id;
      v_certificate_id:=existing_cert.id;
    else
      select * into learner from public.users where id=p_bhw_user_id;
      select * into course from public.courses where id=v_course_id;
      insert into public.assessments
        (course_id,bhw_user_id,org_unit_id,status,assessor_user_id,notes,decided_at,
          formal_chapter_review_id)
      values(v_course_id,p_bhw_user_id,learner.org_unit_id,'passed',actor.id,btrim(p_en),
        clock_timestamp(),review_id) returning id into v_assessment_id;
      insert into public.certificates
        (assessment_id,course_id,bhw_user_id,verification_code,bhw_full_name_snapshot,
          course_title_fil_snapshot,course_title_en_snapshot)
      values(v_assessment_id,v_course_id,p_bhw_user_id,
        upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)),learner.full_name,
        course.title_fil,course.title_en) returning id into v_certificate_id;
      update public.course_progress set status='certified'
        where course_id=v_course_id and bhw_user_id=p_bhw_user_id;
      if not found then raise exception 'chapter progress unavailable'; end if;
    end if;
    update assessor_rollout_private.bhw_chapter_reviews set state='issued',
      assessment_id=v_assessment_id,certificate_id=v_certificate_id where id=review_id;
  end if;
  insert into public.notifications (recipient_user_id,notification_type,subject_type,subject_id,
    title_fil,title_en,body_fil,body_en,link_path)
  values(p_bhw_user_id,'assessment.chapter_review','bhw_chapter_review',review_id,
    'Resulta ng pagsusuri ng Kabanata 1','Chapter 1 review outcome',
    'May inilabas na buod ng iyong pagsusuri sa Kabanata 1.',
    'Your Chapter 1 review summary is available.',
    '/training/'||p_program_id::text||'/assessment-requests') on conflict do nothing;
  return review_id;
end;
$$;

create function assessor_rollout_private.bhw_formal_results(p_program_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor public.users; attempts jsonb; reviews jsonb;
begin
  actor:=public.current_app_user();
  if actor.id is null or actor.role<>'bhw' or actor.status<>'active'
    or exists(select 1 from public.super_admin_personas s where s.persona_user_id=actor.id)
    or not exists(select 1 from public.training_programs p where p.id=p_program_id
      and p.content_key='bhw-reference-manual' and p.status='published')
    or not exists(select 1 from public.feature_flags f where f.key='elearning'
      and f.enabled and not ('bhw'=any(coalesce(f.disabled_roles,'{}'::text[]))))
    then raise exception 'not authorized'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'moduleTitleFil',m.title_fil,
    'moduleTitleEn',m.title_en,'outcome',a.outcome,'feedbackFil',a.feedback_fil,
    'feedbackEn',a.feedback_en,'criteria',a.criteria_snapshot,'evidence',a.evidence,
    'releasedAt',a.feedback_released_at) order by a.feedback_released_at desc),'[]'::jsonb)
    into attempts from (select * from assessor_rollout_private.formal_attempts a
      where a.program_id=p_program_id and a.bhw_user_id=actor.id
        and a.feedback_released_at is not null
      order by a.feedback_released_at desc limit 20) a
    join public.course_modules m on m.id=a.module_id;
  select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'outcome',r.outcome,
    'summaryFil',r.summary_fil,'summaryEn',r.summary_en,'decidedAt',r.decided_at,
    'verificationCode',cert.verification_code) order by r.decided_at desc),'[]'::jsonb)
    into reviews from (select * from assessor_rollout_private.bhw_chapter_reviews r
      where r.program_id=p_program_id and r.bhw_user_id=actor.id
        and r.state in ('released','issued')
      order by r.decided_at desc limit 10) r
    left join public.certificates cert on cert.id=r.certificate_id;
  return jsonb_build_object('attempts',attempts,'reviews',reviews);
end;
$$;

alter table public.notifications drop constraint notifications_notification_type_check;
alter table public.notifications add constraint notifications_notification_type_check check
  (notification_type in ('announcement.created','survey.published','course.published',
    'assessment.decided','forum.reply','flipchart.reviewed','user.transferred',
    'course_session.enrolled','feedback.reply','practice.feedback_released',
    'assessment.arrangement','assessment.formal_feedback','assessment.chapter_review'));
create unique index formal_feedback_notification_once on public.notifications
  (recipient_user_id,subject_id) where notification_type='assessment.formal_feedback';
create unique index chapter_review_notification_once on public.notifications
  (recipient_user_id,subject_id) where notification_type='assessment.chapter_review';

create function public.rpc_assessor_formal_feedback_release(
  p_key uuid,p_attempt_id uuid,p_fil text,p_en text
) returns uuid language sql security invoker set search_path='' as $$
  select assessor_rollout_private.formal_feedback_release(p_key,p_attempt_id,p_fil,p_en)
$$;
create function public.rpc_assessor_formal_retry_request(
  p_key uuid,p_prior_attempt_id uuid,p_practice_note text,p_practice_attempt_id uuid default null
) returns uuid language sql security invoker set search_path='' as $$
  select assessor_rollout_private.formal_retry_request(
    p_key,p_prior_attempt_id,p_practice_note,p_practice_attempt_id)
$$;
create function public.rpc_assessor_chapter_review_state(p_program_id uuid,p_bhw_user_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select assessor_rollout_private.chapter_review_snapshot(p_program_id,p_bhw_user_id)
$$;
create function public.rpc_assessor_chapter_review_decide(
  p_key uuid,p_program_id uuid,p_bhw_user_id uuid,p_fil text,p_en text
) returns uuid language sql security invoker set search_path='' as $$
  select assessor_rollout_private.chapter_review_decide(
    p_key,p_program_id,p_bhw_user_id,p_fil,p_en)
$$;
create function public.rpc_bhw_formal_results(p_program_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select assessor_rollout_private.bhw_formal_results(p_program_id)
$$;

revoke execute on function
  assessor_rollout_private.formal_feedback_release(uuid,uuid,text,text),
  assessor_rollout_private.formal_retry_request(uuid,uuid,text,uuid),
  assessor_rollout_private.chapter_review_read_scope(uuid,uuid,uuid),
  assessor_rollout_private.chapter_review_authorized(uuid,uuid,uuid),
  assessor_rollout_private.chapter_review_snapshot(uuid,uuid),
  assessor_rollout_private.formal_award_insert_allowed(text,jsonb),
  assessor_rollout_private.chapter_review_decide(uuid,uuid,uuid,text,text),
  assessor_rollout_private.bhw_formal_results(uuid),
  public.rpc_assessor_formal_feedback_release(uuid,uuid,text,text),
  public.rpc_assessor_formal_retry_request(uuid,uuid,text,uuid),
  public.rpc_assessor_chapter_review_state(uuid,uuid),
  public.rpc_assessor_chapter_review_decide(uuid,uuid,uuid,text,text),
  public.rpc_bhw_formal_results(uuid) from public,anon,authenticated;
grant execute on function
  assessor_rollout_private.formal_feedback_release(uuid,uuid,text,text),
  assessor_rollout_private.formal_retry_request(uuid,uuid,text,uuid),
  assessor_rollout_private.chapter_review_snapshot(uuid,uuid),
  assessor_rollout_private.chapter_review_decide(uuid,uuid,uuid,text,text),
  assessor_rollout_private.bhw_formal_results(uuid),
  public.rpc_assessor_formal_feedback_release(uuid,uuid,text,text),
  public.rpc_assessor_formal_retry_request(uuid,uuid,text,uuid),
  public.rpc_assessor_chapter_review_state(uuid,uuid),
  public.rpc_assessor_chapter_review_decide(uuid,uuid,uuid,text,text),
  public.rpc_bhw_formal_results(uuid) to authenticated;
commit;
