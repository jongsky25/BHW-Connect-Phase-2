-- Exact owner-approved FB-2.2i formative transfer check. Run as one transaction after CI.
-- Historical lesson progress and formal assessment rows are never rewritten.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $release$
declare
  v_module constant uuid := '5a915215-7237-4211-a189-8d75664d05b6';
  v_lesson constant uuid := 'df6ebece-5e81-4163-b8be-d71dba45d773';
  v_old constant uuid := '2897e8f8-7c63-4307-b7b3-bd01ad50fade';
  v_old_hash constant text := '1bbbef559c76bf08af42d25fe8e05460d3c90ec6b3be102dd8862b160ab362b4';
  v_new_hash constant text := '68c16ccf0e7790566ef551c1b5fab55597cd10cf35d3ce3323c5cfb29b34a154';
  v_old_check constant jsonb := $_old_${"prompt_fil":"Aling ulat ang tumutugon sa buong tagubilin at nagsasabi ng kailangan pang aksyon?","prompt_en":"Which report addresses the whole instruction and states what action is still needed?","options":[{"fil":"May tubig sa tatlong bakuran. Naitala ko, nakinig sa tanong, at ipinaabot ang residenteng gustong makausap ang health team. Kailangan ko pa ng gabay sa susunod na hakbang.","en":"There is water in three yards. I recorded it, listened to questions, and passed on the request of a resident who wants to speak with the health team. I still need guidance on the next step."},{"fil":"May tubig sa tatlong bakuran. Naitala ko na ito, kaya tapos na ang buong tagubilin.","en":"There is water in three yards. I recorded it, so the whole instruction is complete."},{"fil":"May tubig sa tatlong bakuran. Tiyak na iyon ang sanhi ng sakit ng mga residente; sinabi ko nang iyon ang diagnosis.","en":"There is water in three yards. It is certainly the cause of residents’ illness; I told them that was the diagnosis."}],"correct_option_index":0,"feedback_fil":"Ang unang ulat ay may nakita, aktwal na ginawa, at kailangan pang aksyon. Ang ikalawa ay tala lamang; hindi nito tinutugunan ang pagtanong at pag-uulat. Ang ikatlo ay nag-aangkin ng sanhi at diagnosis na hindi napatunayan. Subukan ang sarili mong handover at ipaliwanag ang tatlong tungkulin; hiwalay ang praktikal na assessment.","feedback_en":"The first report includes the observation, actual action, and remaining need. The second only records; it does not address asking and reporting. The third claims a cause and diagnosis that have not been established. Try your own handover and explain the three roles; practical assessment is separate."}$_old_$::jsonb;
  v_new_check constant jsonb := $_approved_${"prompt_en":"During a visit, BHW Lani sees that the handwashing station has no soap. The midwife asks her to record what she sees, ask residents what help they need, check with the agreed supply contact, and report what still needs follow-up. Which handover follows the instruction?","prompt_fil":"Sa pagbisita, nakita ni BHW Lani na walang sabon sa hugasan ng kamay. Inutusan siya ng midwife na itala ang nakita, itanong sa mga residente kung anong tulong ang kailangan nila, makipag-ugnayan sa napagkasunduang tagapamahala ng gamit, at iulat ang kailangan pang asikasuhin. Aling ulat ang sumusunod sa tagubilin?","options":[{"en":"The handwashing station has no soap. I recorded that, asked residents what help they needed, and checked with the agreed supply contact. The refill plan still needs confirmation.","fil":"Walang sabon sa hugasan ng kamay. Itinala ko ito, tinanong ang mga residente kung anong tulong ang kailangan nila, at kinausap ang napagkasunduang tagapamahala ng gamit. Kailangan pang tiyakin ang plano sa paglalagay ng sabon."},{"en":"The handwashing station has no soap. I recorded it and told residents the contact would refill it today, although I have not checked with that contact.","fil":"Walang sabon sa hugasan ng kamay. Itinala ko ito at sinabi sa mga residente na lalagyan ito ng sabon ngayong araw, kahit hindi ko pa nakausap ang tagapamahala ng gamit."},{"en":"The handwashing station has no soap. I asked the contact to refill it and reported the problem solved, although I have not checked whether soap arrived or asked residents what help they needed.","fil":"Walang sabon sa hugasan ng kamay. Nakiusap ako sa tagapamahala na lagyan ito ng sabon at iniulat na ayos na ang problema, kahit hindi ko pa natiyak kung may sabon na o naitanong sa mga residente kung anong tulong ang kailangan nila."}],"correct_option_index":0,"feedback_en":"The first report records the observation, asks residents, checks with the agreed contact, and names what remains unconfirmed. The second promises a refill without checking. The third reports the problem solved without confirming the refill and omits the residents' needs. Give your own handover and explain the roles you used; practical assessment is separate.","feedback_fil":"Ang unang ulat ay nagtala ng nakita, nagtanong sa mga residente, nakipag-ugnayan sa napagkasunduang tagapamahala, at nagsabi ng hindi pa tiyak. Ang ikalawa ay nangako ng paglalagay ng sabon nang hindi pa nagtatanong sa tagapamahala. Iniulat ng ikatlo na ayos na ang problema nang hindi tinitiyak ang sabon at hindi itinatanong ang pangangailangan ng mga residente. Magbigay ng sarili mong ulat at ipaliwanag ang mga tungkuling ginamit; hiwalay ang praktikal na assessment."}$_approved_$::jsonb;
  v_revision public.course_lesson_revisions%rowtype;
  v_new uuid;
  v_course uuid;
  v_actor uuid;
  v_count integer;
begin
  select course_id into strict v_course from public.course_modules where id=v_module for update;
  select id into strict v_actor from public.users where username='training.loader' and role='admin' and status='active';
  perform 1 from public.course_lessons where module_id=v_module for update;
  if (select count(*) from public.course_lessons where module_id=v_module)<>6 or
     (select count(*) from public.course_lessons where module_id=v_module and published_revision_id is not null)<>6 then
    raise exception 'Roles subchapter membership or publication drift';
  end if;
  if (select published_revision_id from public.course_lessons where id=v_lesson and module_id=v_module)<>v_old then
    raise exception 'Roles lesson published pointer drift';
  end if;
  select * into strict v_revision from public.course_lesson_revisions where id=v_old and lesson_id=v_lesson and content_hash=v_old_hash;
  if jsonb_array_length(v_revision.read_sections)<>6 or jsonb_array_length(v_revision.slides)<>6 or
     v_revision.read_sections->5->>'id'<>'check' or v_revision.slides->5->>'id'<>'check-slide' or
     v_revision.read_sections->5->'check'<>v_old_check or v_revision.slides->5->'check'<>v_old_check or
     (v_new_check->>'correct_option_index')::integer<>0 or jsonb_array_length(v_new_check->'options')<>3 then
    raise exception 'Roles check copy or answer key drift';
  end if;
  if exists(select 1 from public.course_lesson_revisions where lesson_id=v_lesson and content_hash=v_new_hash) then
    raise exception 'New roles revision already exists; reconcile before retry';
  end if;
  if (select count(*) from assessor_rollout_private.practice_criteria
      where lesson_id=v_lesson and lesson_revision_id=v_old and enabled)<>1 or
     exists(select 1 from assessor_rollout_private.practice_attempts a
       join assessor_rollout_private.practice_criteria c
         on (c.chapter_id,c.criterion_id,c.criterion_version)=(a.chapter_id,a.criterion_id,a.criterion_version)
       where c.lesson_id=v_lesson) then
    raise exception 'Roles criterion or historical attempts need separate review';
  end if;
  insert into public.course_lesson_revisions
    (lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,featured_asset_id,created_by)
  values
    (v_lesson,v_new_hash,v_new_hash,
     jsonb_set(v_revision.read_sections,'{5,check}',v_new_check,false),
     jsonb_set(v_revision.slides,'{5,check}',v_new_check,false),
     v_revision.coverage,v_revision.sources,v_revision.assets,v_revision.featured_asset_id,v_actor)
  returning id into v_new;
  insert into public.course_lesson_facilitator_notes(revision_id,notes_fil,notes_en,observation_indicators)
    select v_new,notes_fil,notes_en,observation_indicators
      from public.course_lesson_facilitator_notes where revision_id=v_old;
  get diagnostics v_count=row_count;
  if v_count<>1 then raise exception 'Missing pinned facilitator notes'; end if;
  update assessor_rollout_private.practice_criteria
    set lesson_revision_id=v_new,review_reference='FB-2.2i approved transfer check, 2026-10-27'
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
      'content_hash',v_new_hash,'review_reference','FB-2.2i approved transfer check, 2026-10-27'),
    'Inilathala ang bagong pagsasanay sa pag-uulat para sa araling tungkulin ng BHW.',
    'Published the new handover transfer check for the BHW roles lesson.');
end
$release$;
commit;
