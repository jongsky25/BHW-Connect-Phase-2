-- C1AF-20. Share the activated Chapter 1 authority check across revised and
-- legacy writes. No rollout gate, cohort, contract or cutover is enabled here.
begin;

create function assessor_rollout_private.chapter_write_scope(
  p_course_id uuid,p_actor_id uuid,p_bhw_user_id uuid default null
) returns boolean language plpgsql security definer set search_path='' as $$
declare actor public.users; learner public.users;
  cohort public.assessor_flow_cohorts; chapter public.training_program_chapters;
begin
  actor:=public.current_app_user();
  if actor.id is null or actor.id is distinct from p_actor_id
    or actor.role<>'assessor' or actor.status<>'active'
    or exists(select 1 from public.super_admin_personas s where s.persona_user_id=actor.id)
    then return false; end if;
  select c.* into cohort from public.training_program_chapters ch
    join public.training_programs program on program.id=ch.program_id
    join public.courses course on course.id=ch.course_id
    join public.assessor_flow_cohorts c on c.program_id=ch.program_id
      and c.chapter_key=ch.chapter_key
    join public.assessor_flow_cohort_members member on member.cohort_id=c.id
      and member.user_id=actor.id
    where ch.course_id=p_course_id and ch.chapter_key='chapter-1'
      and ch.availability='available' and program.content_key='bhw-reference-manual'
      and program.status='published' and course.status='published'
      and c.authority_cutover_at is not null and c.ui_enabled and c.writes_enabled
    order by c.id limit 1 for share of c;
  if cohort.id is null then return false; end if;
  select * into chapter from public.training_program_chapters ch
    where ch.program_id=cohort.program_id and ch.chapter_key='chapter-1'
      and ch.course_id=p_course_id;
  perform 1 from public.feature_flags f
    where f.key in ('elearning','assessor_flow_ui','assessor_flow_writes') for share;
  if (select count(*) from public.feature_flags f
    where f.key in ('elearning','assessor_flow_ui','assessor_flow_writes')
      and f.enabled and not ('assessor'=any(coalesce(f.disabled_roles,'{}'::text[]))))<>3
    then return false; end if;
  perform 1 from assessor_rollout_private.chapter_awards award
    where award.actor_id=actor.id and award.chapter_id=chapter.id for share;
  perform 1 from public.assessor_chapter_qualifications qualification
    where qualification.assessor_user_id=actor.id and qualification.chapter_id=chapter.id for share;
  if exists(select 1 from assessor_rollout_private.chapter_awards award
      where award.actor_id=actor.id and award.chapter_id=chapter.id and award.status<>'active')
    or exists(select 1 from public.assessor_chapter_qualifications qualification
      where qualification.assessor_user_id=actor.id and qualification.chapter_id=chapter.id
        and qualification.status<>'active')
    or not exists(select 1 from assessor_rollout_private.chapter_awards award
      join assessor_rollout_private.award_contracts contract
        on contract.requirements_version=award.requirements_version and contract.enabled
      where award.actor_id=actor.id and award.chapter_id=chapter.id and award.status='active'
        and award.requirements_version=cohort.requirements_version)
    then return false; end if;
  if p_bhw_user_id is null then return true; end if;
  select * into learner from public.users where id=p_bhw_user_id;
  return learner.id is not null and learner.role='bhw' and learner.status='active'
    and public.org_unit_path(learner.org_unit_id)
      like public.org_unit_path(actor.org_unit_id)||'%'
    and exists(select 1 from public.assessor_flow_cohort_members member
      where member.cohort_id=cohort.id and member.user_id=learner.id);
end;
$$;

create or replace function assessor_rollout_private.component_request_scope(
  p_program_id uuid,p_bhw_user_id uuid,p_actor_id uuid
) returns boolean language sql security definer set search_path='' as $$
  select coalesce((select assessor_rollout_private.chapter_write_scope(
    chapter.course_id,p_actor_id,p_bhw_user_id)
    from public.training_program_chapters chapter
    where chapter.program_id=p_program_id and chapter.chapter_key='chapter-1'),false)
$$;

create or replace function assessor_rollout_private.assert_legacy_allowed(
  p_course_id uuid,p_subjects uuid[]
) returns void language plpgsql security definer set search_path='' as $$
declare actor public.users; subject uuid;
begin
  if p_course_id is null or not exists(select 1 from public.training_program_chapters chapter
    join public.training_programs program on program.id=chapter.program_id
    join public.assessor_flow_cohorts cohort on cohort.program_id=chapter.program_id
      and cohort.chapter_key=chapter.chapter_key
    where chapter.course_id=p_course_id and chapter.chapter_key='chapter-1'
      and program.content_key='bhw-reference-manual' and cohort.authority_cutover_at is not null)
    then return; end if;
  actor:=public.current_app_user();
  if not assessor_rollout_private.chapter_write_scope(p_course_id,actor.id,null)
    then raise exception 'revised assessor authority required'; end if;
  for subject in select distinct u.id
    from unnest(coalesce(p_subjects,'{}'::uuid[])) target(user_id)
    join public.users u on u.id=target.user_id and u.role='bhw' loop
    if not assessor_rollout_private.chapter_write_scope(p_course_id,actor.id,subject)
      then raise exception 'revised assessor authority required'; end if;
  end loop;
end;
$$;

create or replace function assessor_rollout_private.legacy_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_rows jsonb[]; v_row jsonb; v_course uuid; v_row_course uuid;
  v_module_course uuid; v_session uuid; v_owner uuid; v_subjects uuid[]; v_actor uuid;
  v_activated boolean;
begin
  if tg_op='INSERT' and tg_table_name in ('assessments','certificates')
    and assessor_rollout_private.formal_award_insert_allowed(tg_table_name,to_jsonb(new))
    then return new; end if;
  if not exists(select 1 from public.assessor_flow_cohorts) then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;
  -- Historical qualification lifecycle changes use their separately audited
  -- administrator route; no new grant can be created through this exception.
  if tg_table_name='assessor_chapter_qualifications' and tg_op='UPDATE'
    and (to_jsonb(old)-'status'-'status_changed_at')
      =(to_jsonb(new)-'status'-'status_changed_at') then return new; end if;
  v_actor:=(public.current_app_user()).id;
  if tg_op='INSERT' then v_rows:=array[to_jsonb(new)];
  elsif tg_op='DELETE' then v_rows:=array[to_jsonb(old)];
  else v_rows:=array[to_jsonb(old),to_jsonb(new)]; end if;
  foreach v_row in array v_rows loop
    v_course:=null; v_row_course:=null; v_module_course:=null;
    v_session:=null; v_owner:=null;
    v_subjects:=array_remove(array[v_actor,(v_row->>'bhw_user_id')::uuid,
      (v_row->>'observer_user_id')::uuid,(v_row->>'assessor_user_id')::uuid,
      (v_row->>'facilitator_user_id')::uuid,(v_row->>'recorded_by')::uuid],null);
    if v_row ? 'course_id' then v_row_course:=(v_row->>'course_id')::uuid;
      v_course:=v_row_course; end if;
    if v_row ? 'module_id' then select course_id into v_module_course
      from public.course_modules where id=(v_row->>'module_id')::uuid; end if;
    if tg_table_name='course_sessions' then
      v_session:=(v_row->>'id')::uuid;
      v_owner:=(v_row->>'facilitator_user_id')::uuid;
    elsif v_row ? 'session_id' then v_session:=(v_row->>'session_id')::uuid; end if;
    if v_session is not null then
      select session.course_id,session.facilitator_user_id into v_course,v_owner
        from public.course_sessions session where session.id=v_session;
      if v_course is null then v_course:=v_row_course; end if;
      if tg_table_name='course_sessions' then
        v_owner:=(v_row->>'facilitator_user_id')::uuid; end if;
      v_subjects:=coalesce(v_subjects,'{}'::uuid[])||coalesce((select array_agg(e.bhw_user_id)
        from public.course_session_enrollments e where e.session_id=v_session),'{}'::uuid[]);
    end if;
    if v_row ? 'chapter_id' then select course_id into v_course
      from public.training_program_chapters where id=(v_row->>'chapter_id')::uuid; end if;
    v_activated:=exists(select 1 from public.training_program_chapters chapter
      join public.training_programs program on program.id=chapter.program_id
      join public.assessor_flow_cohorts cohort on cohort.program_id=chapter.program_id
        and cohort.chapter_key=chapter.chapter_key
      where chapter.course_id=any(array_remove(array[v_course,v_row_course,v_module_course],null))
        and chapter.chapter_key='chapter-1' and program.content_key='bhw-reference-manual'
        and cohort.authority_cutover_at is not null);
    if v_activated then
      if tg_table_name in ('assessments','certificates')
        then raise exception 'Chapter 1 decision requires formal review'; end if;
      if (tg_table_name='course_sessions' or tg_table_name like 'course_session_%')
        and v_owner is distinct from v_actor
        then raise exception 'session owner required'; end if;
      if tg_table_name='competency_observations'
        and (v_row->>'observer_user_id')::uuid is distinct from v_actor
        then raise exception 'observation owner required'; end if;
      if tg_table_name in ('course_session_deliveries','course_session_activities')
        and (v_row->>'recorded_by')::uuid is distinct from v_actor
        then raise exception 'session recorder required'; end if;
      if tg_table_name='assessor_chapter_qualifications'
        then raise exception 'Chapter 1 qualification requires reviewed award'; end if;
    end if;
    perform assessor_rollout_private.assert_legacy_allowed(v_course,v_subjects);
    if v_row_course is distinct from v_course then
      perform assessor_rollout_private.assert_legacy_allowed(v_row_course,v_subjects); end if;
    perform assessor_rollout_private.assert_legacy_allowed(v_module_course,v_subjects);
  end loop;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

create function assessor_rollout_private.chapter_progress_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor public.users;
begin
  if tg_op='UPDATE' and new.status is not distinct from old.status
    and new.course_id is not distinct from old.course_id
    and new.bhw_user_id is not distinct from old.bhw_user_id then return new; end if;
  if not exists(select 1 from public.training_program_chapters chapter
    join public.training_programs program on program.id=chapter.program_id
    join public.assessor_flow_cohorts cohort on cohort.program_id=chapter.program_id
      and cohort.chapter_key=chapter.chapter_key
    where chapter.course_id=any(array_remove(array[new.course_id,
      case when tg_op='UPDATE' then old.course_id else null end],null))
      and chapter.chapter_key='chapter-1'
      and program.content_key='bhw-reference-manual'
      and cohort.authority_cutover_at is not null) then return new; end if;
  if tg_op='UPDATE' and (new.course_id is distinct from old.course_id
    or new.bhw_user_id is distinct from old.bhw_user_id)
    then raise exception 'Chapter 1 progress binding is immutable'; end if;
  if new.status not in ('certified','failed_assessment')
    and (tg_op='INSERT' or old.status not in ('certified','failed_assessment'))
    then return new; end if;
  actor:=public.current_app_user();
  if new.status='certified' and exists(select 1
    from assessor_rollout_private.bhw_chapter_reviews review
    join public.assessments assessment on assessment.formal_chapter_review_id=review.id
    join public.certificates cert on cert.assessment_id=assessment.id
    where review.state='issuing' and review.outcome='complete'
      and review.reviewer_id=actor.id and review.course_id=new.course_id
      and review.bhw_user_id=new.bhw_user_id and cert.bhw_user_id=new.bhw_user_id)
    then return new; end if;
  raise exception 'Chapter 1 progress requires formal review';
end;
$$;
create trigger c1af20_chapter_progress_guard before insert or update of status,course_id,bhw_user_id
  on public.course_progress for each row
  execute function assessor_rollout_private.chapter_progress_guard();

revoke execute on function assessor_rollout_private.chapter_write_scope(uuid,uuid,uuid),
  assessor_rollout_private.chapter_progress_guard() from public,anon,authenticated;
commit;
