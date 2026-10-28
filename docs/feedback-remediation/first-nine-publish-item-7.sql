begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $wording$
declare
  prior public.course_lesson_revisions%rowtype;
  next_read jsonb;
  next_slides jsonb;
  sections jsonb;
  edit jsonb;
  idx integer;
  target uuid;
  actor uuid;
  course uuid;
  n integer;
begin
  perform 1 from public.course_lessons where id='aaa79e45-599a-44c8-b1ed-c0b6e1e13293'::uuid and published_revision_id='ea4bd53f-4833-4869-900a-27ff7d8db50c'::uuid for update;
  if not found then raise exception 'Published lesson pointer drift'; end if;
  select * into strict prior from public.course_lesson_revisions where id='ea4bd53f-4833-4869-900a-27ff7d8db50c'::uuid and lesson_id='aaa79e45-599a-44c8-b1ed-c0b6e1e13293'::uuid and content_hash='26c6c781e7c76dfd4a911d20eafe49ff65d4e252224f8bcbf2544373ab4eaefe';
  if exists(select 1 from public.course_lesson_revisions where lesson_id=prior.lesson_id and content_hash='866eb828d42c12f36121a713ab2a88c4e56c2bbc12f95459e0429ff093a74813') then raise exception 'Successor already exists; reconcile before retry'; end if;
  select u.id into strict actor from public.users u where username='training.loader' and role='admin' and status='active';
  select m.course_id into strict course from public.course_modules m join public.course_lessons l on l.module_id=m.id where l.id=prior.lesson_id;
  perform 1 from assessor_rollout_private.practice_criteria where lesson_id=prior.lesson_id for update;
  if (select count(*) from assessor_rollout_private.practice_criteria where lesson_id=prior.lesson_id and enabled and lesson_revision_id=prior.id)<>1 or
     exists(select 1 from assessor_rollout_private.practice_attempts a join assessor_rollout_private.practice_criteria c using(chapter_id,criterion_id,criterion_version) where c.lesson_id=prior.lesson_id) then
    raise exception 'Practice criterion has drift or attempts; separate migration required';
  end if;
  next_read=prior.read_sections; next_slides=prior.slides;
  for edit in select value from jsonb_array_elements('[{"collection":"read_sections","id":"open-question","field":"heading_fil","old":"Bukas muna, saka linawin","new":"Maging bukas muna, hanapin ang linaw"},{"collection":"slides","id":"slide-open-question","field":"heading_fil","old":"Bukas muna, saka linawin","new":"Maging bukas muna, hanapin ang linaw"}]'::jsonb) loop
    sections=case edit->>'collection' when 'read_sections' then next_read when 'slides' then next_slides else null end;
    select ordinality::integer-1 into strict idx from jsonb_array_elements(sections) with ordinality where value->>'id'=edit->>'id';
    if (length(sections->idx->>(edit->>'field'))-length(replace(sections->idx->>(edit->>'field'),edit->>'old','')))/length(edit->>'old')<>1 then raise exception 'Exact source wording drift'; end if;
    sections=jsonb_set(sections,array[idx::text,edit->>'field'],to_jsonb(replace(sections->idx->>(edit->>'field'),edit->>'old',edit->>'new')),false);
    if edit->>'collection'='read_sections' then next_read=sections; else next_slides=sections; end if;
  end loop;
  insert into public.course_lesson_revisions(lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,featured_asset_id,created_by)
    values(prior.lesson_id,'866eb828d42c12f36121a713ab2a88c4e56c2bbc12f95459e0429ff093a74813','866eb828d42c12f36121a713ab2a88c4e56c2bbc12f95459e0429ff093a74813',next_read,next_slides,prior.coverage,prior.sources,prior.assets,prior.featured_asset_id,actor) returning id into target;
  insert into public.course_lesson_facilitator_notes(revision_id,notes_fil,notes_en,observation_indicators)
    select target,notes_fil,notes_en,observation_indicators from public.course_lesson_facilitator_notes where revision_id=prior.id;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Facilitator notes missing'; end if;
  update assessor_rollout_private.practice_criteria set lesson_revision_id=target,review_reference='Feedback queue item 7 wording fix, 2026-10-28' where lesson_id=prior.lesson_id and lesson_revision_id=prior.id and enabled;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Practice criterion update drift'; end if;
  update public.course_lessons set published_revision_id=target where id=prior.lesson_id and published_revision_id=prior.id;
  if not found then raise exception 'Publication pointer drift'; end if;
  insert into public.audit_events(actor_user_id,event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
    values(actor,'course.lessons_published','course',course,jsonb_build_object('lesson_id',prior.lesson_id,'old_revision_id',prior.id,'new_revision_id',target,'content_hash','866eb828d42c12f36121a713ab2a88c4e56c2bbc12f95459e0429ff093a74813','review_reference','Feedback queue item 7, owner directed fix/disposition, 2026-10-28'),'Inilathala ang pagwawasto sa salita.','Published the reviewed wording correction.');
end $wording$;
commit;
