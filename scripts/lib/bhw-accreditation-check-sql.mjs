import {readFileSync} from 'node:fs';
import {loadReferenceModule,contentHash} from './reference-content.mjs';
import {applyBhwAccreditationCheckRelease} from './bhw-accreditation-check-release.mjs';

const root='content/training/day1-basic-competencies';
const approval=JSON.parse(readFileSync(`${root}/lesson-releases/bhw-accreditation-fb-2.2l-v2/approval-record.json`));
const proposal=JSON.parse(readFileSync('docs/feedback-remediation/proposals/fb-2.2l-accreditation-check.json'));
const moduleId='5b638e25-76e2-4bc7-a997-8ce47531fa60';
const lessonId='648d2168-74dd-4451-958c-e4e5d8724a17';
const json=value=>`convert_from(decode('${Buffer.from(JSON.stringify(value)).toString('hex')}','hex'),'UTF8')::jsonb`;

export function accreditationCheckPublicationSql(){
  const trainingModule=loadReferenceModule(`${root}/modules/04-ra7883`,'public');
  const base=trainingModule.lessons.find(l=>l.manifest.lesson_key===approval.lesson_key);
  const next=applyBhwAccreditationCheckRelease(base);
  if(contentHash(base)!==approval.base_content_hash||contentHash(next)!==approval.new_content_hash)
    throw new Error('Accreditation release hash drift');
  const oldCheck=base.revision.read_sections[5].check;
  const newCheck=proposal.proposed_check;
  if(JSON.stringify(oldCheck)!==JSON.stringify(base.revision.slides[5].check)||
     JSON.stringify(newCheck)!==JSON.stringify(next.revision.slides[5].check))
    throw new Error('Accreditation Read/Slides check drift');
  return `-- Exact owner-approved FB-2.2l accreditation check; one guarded transaction.
-- Historical lesson progress, assessment enrollments, answers and scores are never rewritten.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $release$
declare
  v_module constant uuid := '${moduleId}';
  v_lesson constant uuid := '${lessonId}';
  v_old constant uuid := '${approval.base_revision_id}';
  v_old_hash constant text := '${approval.base_content_hash}';
  v_new_hash constant text := '${approval.new_content_hash}';
  v_old_check constant jsonb := ${json(oldCheck)};
  v_new_check constant jsonb := ${json(newCheck)};
  v_revision public.course_lesson_revisions%rowtype;
  v_new uuid;
  v_course uuid;
  v_actor uuid;
  v_count integer;
begin
  select course_id into strict v_course from public.course_modules where id=v_module for update;
  select id into strict v_actor from public.users where username='training.loader' and role='admin' and status='active';
  perform 1 from public.course_lessons where module_id=v_module for update;
  if (select count(*) from public.course_lessons where module_id=v_module)<>5 or
     (select count(*) from public.course_lessons where module_id=v_module and published_revision_id is not null)<>5 then
    raise exception 'Accreditation subchapter membership or publication drift';
  end if;
  if (select published_revision_id from public.course_lessons where id=v_lesson and module_id=v_module)<>v_old then
    raise exception 'Accreditation lesson published pointer drift';
  end if;
  select * into strict v_revision from public.course_lesson_revisions
    where id=v_old and lesson_id=v_lesson and content_hash=v_old_hash;
  if jsonb_array_length(v_revision.read_sections)<>6 or jsonb_array_length(v_revision.slides)<>6 or
     v_revision.read_sections->5->>'id'<>'accreditation-application-check' or
     v_revision.slides->5->>'id'<>'slide-accreditation-application-check' or
     v_revision.read_sections->5->'check'<>v_old_check or v_revision.slides->5->'check'<>v_old_check or
     (v_new_check->>'correct_option_index')::integer<>0 or jsonb_array_length(v_new_check->'options')<>3 or
     v_new_check->>'prompt_en'<>v_old_check->>'prompt_en' or
     v_new_check->>'prompt_fil'<>v_old_check->>'prompt_fil' or
     v_new_check->'options'->0<>v_old_check->'options'->0 then
    raise exception 'Accreditation check copy or answer key drift';
  end if;
  if exists(select 1 from public.course_lesson_revisions where lesson_id=v_lesson and content_hash=v_new_hash) then
    raise exception 'New accreditation revision already exists; reconcile before retry';
  end if;
  if (select count(*) from assessor_rollout_private.practice_criteria
      where lesson_id=v_lesson and lesson_revision_id=v_old and enabled)<>1 or
     exists(select 1 from assessor_rollout_private.practice_attempts a
       join assessor_rollout_private.practice_criteria c
         on (c.chapter_id,c.criterion_id,c.criterion_version)=(a.chapter_id,a.criterion_id,a.criterion_version)
       where c.lesson_id=v_lesson) then
    raise exception 'Accreditation criterion or historical attempts need separate review';
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
    set lesson_revision_id=v_new,review_reference='FB-2.2l approved accreditation check, 2026-10-27'
    where lesson_id=v_lesson and lesson_revision_id=v_old and enabled;
  get diagnostics v_count=row_count;
  if v_count<>1 then raise exception 'Accreditation criterion link drift'; end if;
  update public.course_lessons set published_revision_id=v_new
    where id=v_lesson and module_id=v_module and published_revision_id=v_old;
  get diagnostics v_count=row_count;
  if v_count<>1 then raise exception 'Accreditation publication drift'; end if;
  insert into public.audit_events(actor_user_id,event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
  values(v_actor,'course.lessons_published','course',v_course,
    jsonb_build_object('module_id',v_module,'lesson_id',v_lesson,'old_revision_id',v_old,'new_revision_id',v_new,
      'content_hash',v_new_hash,'review_reference','FB-2.2l approved accreditation check, 2026-10-27'),
    'Inilathala ang binagong pagsasanay sa pagtiyak ng akreditasyon.',
    'Published the revised accreditation verification check.');
end
$release$;
commit;
`;
}
