-- Exact owner-approved copy release for the pilot. Run as one transaction after CI.
-- No assessment enrollment, response, score or historical lesson progress is updated.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $release$
declare
  v_module constant uuid := 'ffd36ec0-f8f9-4c7a-bf34-2ab821ac95ec';
  v_lesson constant uuid := '5403083f-b3e6-43cb-9221-769bac13dc52';
  v_old constant uuid := '0d3b81b9-ca07-4c79-94f6-8acc203ce911';
  v_old_hash constant text := 'ac7ab4b403d1a7d18699b2be524b02381f018ea639ddc92a98fb9cb0fdbc408e';
  v_new_hash constant text := 'f4ddc98beedc20f35572f5d6c270d32a551a63ea6d55bebb093af96ecbab8a8d';
  v_old_choice constant text := '“Basang pasukan, panganib madulas; ilayo muna ang tao at ipatama sa responsableng staff.”';
  v_new_choice constant text := '“Basang sahig sa pasukan; maaaring madulas ang tao. Mula sa ligtas na puwesto, ilayo muna sila sa basang bahagi at ipaayos ito sa responsableng staff.”';
  v_revision public.course_lesson_revisions%rowtype;
  v_new uuid;
  v_course uuid;
  v_actor uuid;
  v_count integer;
begin
  select course_id into strict v_course from public.course_modules where id=v_module for update;
  select id into strict v_actor from public.users where username='training.loader' and role='admin' and status='active';
  perform 1 from public.course_lessons where module_id=v_module for update;
  if (select count(*) from public.course_lessons where module_id=v_module)<>4 or
     (select count(*) from public.course_lessons where module_id=v_module and published_revision_id is not null)<>4 then
    raise exception 'Safety subchapter membership or publication drift';
  end if;
  if (select published_revision_id from public.course_lessons where id=v_lesson and module_id=v_module)<>v_old then
    raise exception 'Safety lesson published pointer drift';
  end if;
  select * into strict v_revision from public.course_lesson_revisions where id=v_old and lesson_id=v_lesson and content_hash=v_old_hash;
  if jsonb_array_length(v_revision.read_sections)<>6 or jsonb_array_length(v_revision.slides)<>6 or
     v_revision.read_sections->5->>'id'<>'check' or v_revision.slides->5->>'id'<>'slide-check' or
     (v_revision.read_sections->5->'check'->>'correct_option_index')::integer<>0 or
     (v_revision.slides->5->'check'->>'correct_option_index')::integer<>0 or
     v_revision.read_sections->5->'check'->'options'->0->>'fil'<>v_old_choice or
     v_revision.slides->5->'check'->'options'->0->>'fil'<>v_old_choice then
    raise exception 'Safety check copy or answer key drift';
  end if;
  if exists(select 1 from public.course_lesson_revisions where lesson_id=v_lesson and content_hash=v_new_hash) then
    raise exception 'New safety revision already exists; reconcile before retry';
  end if;
  if (select count(*) from assessor_rollout_private.practice_criteria
      where lesson_id=v_lesson and lesson_revision_id=v_old and enabled)<>1 or
     exists(select 1 from assessor_rollout_private.practice_attempts a
       join assessor_rollout_private.practice_criteria c
         on (c.chapter_id,c.criterion_id,c.criterion_version)=(a.chapter_id,a.criterion_id,a.criterion_version)
       where c.lesson_id=v_lesson) then
    raise exception 'Safety criterion or historical attempts need separate review';
  end if;
  insert into public.course_lesson_revisions
    (lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,featured_asset_id,created_by)
  values
    (v_lesson,v_new_hash,v_new_hash,
     jsonb_set(v_revision.read_sections,'{5,check,options,0,fil}',to_jsonb(v_new_choice),false),
     jsonb_set(v_revision.slides,'{5,check,options,0,fil}',to_jsonb(v_new_choice),false),
     v_revision.coverage,v_revision.sources,v_revision.assets,v_revision.featured_asset_id,v_actor)
  returning id into v_new;
  insert into public.course_lesson_facilitator_notes(revision_id,notes_fil,notes_en,observation_indicators)
    select v_new,notes_fil,notes_en,observation_indicators
      from public.course_lesson_facilitator_notes where revision_id=v_old;
  get diagnostics v_count=row_count;
  if v_count<>1 then raise exception 'Missing pinned facilitator notes'; end if;
  update assessor_rollout_private.practice_criteria
    set lesson_revision_id=v_new,review_reference='FB-2.3o approved copy release, 2026-10-27'
    where lesson_id=v_lesson and lesson_revision_id=v_old and enabled;
  get diagnostics v_count=row_count;
  if v_count<>1 then raise exception 'Criterion link update drift'; end if;
  update public.course_lessons set published_revision_id=v_new
    where id=v_lesson and module_id=v_module and published_revision_id=v_old;
  get diagnostics v_count=row_count;
  if v_count<>1 then raise exception 'Lesson publication drift'; end if;
  insert into public.audit_events(actor_user_id,event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
  values(v_actor,'course.lessons_published','course',v_course,
    jsonb_build_object('module_id',v_module,'lesson_id',v_lesson,'old_revision_id',v_old,'new_revision_id',v_new,
      'content_hash',v_new_hash,'review_reference','FB-2.3o approved copy release, 2026-10-27'),
    'Inilathala ang binagong salitang Filipino sa safety check.','Published the revised Filipino safety-check wording.');
end
$release$;
commit;
