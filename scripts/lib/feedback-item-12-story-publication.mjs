import {readFileSync} from 'node:fs';
import {loadReferenceModule} from './reference-content.mjs';
import {applyFeedbackItem12StoryRelease} from './feedback-item-12-story-release.mjs';

const literal=s=>"'"+s.replaceAll("'","''")+"'";

export function item12StoryPublicationSql(){
  const release=JSON.parse(readFileSync('src/lib/elearning/feedback-item-12-story-release.json'));
  const source=loadReferenceModule('content/training/day1-basic-competencies/modules/06-komunikasyon','public').lessons.find(l=>l.manifest.lesson_key===release.lesson_key);
  const current=applyFeedbackItem12StoryRelease(source);
  const oldAsset=source.revision.assets.find(a=>a.id===release.asset_id);
  const newAsset=current.revision.assets.find(a=>a.id===release.asset_id);
  return `begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $item12$
declare
  prior public.course_lesson_revisions%rowtype;
  target uuid;
  actor uuid;
  course uuid;
  idx integer;
  n integer;
  next_assets jsonb;
begin
  perform 1 from public.course_lessons where id=${literal(release.lesson_id)}::uuid and published_revision_id=${literal(release.base_revision_id)}::uuid for update;
  if not found then raise exception 'Published lesson pointer drift'; end if;
  select * into strict prior from public.course_lesson_revisions where id=${literal(release.base_revision_id)}::uuid and lesson_id=${literal(release.lesson_id)}::uuid and content_hash=${literal(release.base_content_hash)};
  if exists(select 1 from public.course_lesson_revisions where lesson_id=prior.lesson_id and content_hash=${literal(release.new_content_hash)}) then raise exception 'Successor already exists; reconcile before retry'; end if;
  select ordinality::integer-1 into strict idx from jsonb_array_elements(prior.assets) with ordinality where value->>'id'=${literal(release.asset_id)};
  if prior.assets->idx<>${literal(JSON.stringify(oldAsset))}::jsonb then raise exception 'Published story asset drift'; end if;
  next_assets=jsonb_set(prior.assets,array[idx::text],${literal(JSON.stringify(newAsset))}::jsonb,false);
  select u.id into strict actor from public.users u where username='training.loader' and role='admin' and status='active';
  select m.course_id into strict course from public.course_modules m join public.course_lessons l on l.module_id=m.id where l.id=prior.lesson_id;
  perform 1 from assessor_rollout_private.practice_criteria where lesson_id=prior.lesson_id for update;
  if (select count(*) from assessor_rollout_private.practice_criteria where lesson_id=prior.lesson_id and enabled and lesson_revision_id=prior.id)<>1 or
     exists(select 1 from assessor_rollout_private.practice_attempts a join assessor_rollout_private.practice_criteria c using(chapter_id,criterion_id,criterion_version) where c.lesson_id=prior.lesson_id) then
    raise exception 'Practice criterion has drift or attempts; separate migration required';
  end if;
  insert into public.course_lesson_revisions(lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,featured_asset_id,created_by)
    values(prior.lesson_id,${literal(release.new_content_hash)},${literal(release.new_content_hash)},prior.read_sections,prior.slides,prior.coverage,prior.sources,next_assets,prior.featured_asset_id,actor) returning id into target;
  insert into public.course_lesson_facilitator_notes(revision_id,notes_fil,notes_en,observation_indicators)
    select target,notes_fil,notes_en,observation_indicators from public.course_lesson_facilitator_notes where revision_id=prior.id;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Facilitator notes missing'; end if;
  update assessor_rollout_private.practice_criteria set lesson_revision_id=target,review_reference='Feedback queue item 12 spoken story context, 2026-10-28' where lesson_id=prior.lesson_id and lesson_revision_id=prior.id and enabled;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Practice criterion update drift'; end if;
  update public.course_lessons set published_revision_id=target where id=prior.lesson_id and published_revision_id=prior.id;
  if not found then raise exception 'Publication pointer drift'; end if;
  insert into public.audit_events(actor_user_id,event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
    values(actor,'course.lessons_published','course',course,jsonb_build_object('lesson_id',prior.lesson_id,'old_revision_id',prior.id,'new_revision_id',target,'content_hash',${literal(release.new_content_hash)},'review_reference','Feedback queue item 12, owner-directed spoken story context fix, 2026-10-28'),'Inilathala ang binagong salaysay na may konteksto.','Published the revised story narration with case context.');
end $item12$;
commit;`;
}
