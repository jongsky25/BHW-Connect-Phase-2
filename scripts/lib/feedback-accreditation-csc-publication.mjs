import assert from 'node:assert/strict';
import { contentHash, canonical, validateReferenceLesson } from './reference-content.mjs';
import { buildAccreditationCscProposal } from './feedback-accreditation-csc-proposal.mjs';
import { releaseHash } from './feedback-uhc-proposal.mjs';
import { fullFormHash, validateRelease } from './chapter1-assessment-content.mjs';
import { activateAssessmentSql } from './feedback-uhc-publication.mjs';

const literal = s => `'${String(s).replaceAll("'", "''")}'`;
const json = v => `convert_from(decode('${Buffer.from(JSON.stringify(v)).toString('hex')}','hex'),'UTF8')::jsonb`;

export function buildApprovedAccreditationCscRelease(inputs, approval, lesson, identity) {
  assert.equal(approval.authorization, 'approved then do next');
  assert.equal(approval.approval_type, 'owner_content_and_publication');
  assert.equal(approval.proposal_sha256, releaseHash(inputs.proposal), 'Approved proposal drift');
  assert.equal(approval.release_id, inputs.proposal.proposed_release_id);
  assert(approval.reviewer?.trim());
  assert(/^[a-f0-9]{40}$/.test(approval.source_commit));
  assert.equal(approval.publication_account, 'training.loader');
  const bundle = buildAccreditationCscProposal(inputs);
  // The sole implementation addition is the optional story's scope caption.
  const expected = structuredClone(bundle.lesson);
  const story = expected.revision.assets.find(a => a.id === 'bhw-eligibility-story');
  story.caption_en = 'Optional story about BHWE qualification conditions. See the lesson for filing and certificate receipt.';
  story.caption_fil = 'Opsyonal na kuwento tungkol sa mga kondisyon ng BHWE. Basahin sa aralin ang pag-file at pagtanggap ng certificate.';
  assert.equal(canonical(lesson), canonical(expected), 'Published lesson differs from approved copy');
  validateReferenceLesson(lesson);
  assert.equal(identity.lesson_id, 'f1f527f1-aec9-48a8-933b-79fecf63bfb4');
  assert.equal(identity.module_id, '5b638e25-76e2-4bc7-a997-8ce47531fa60');
  assert(/^[a-f0-9-]{36}$/.test(identity.revision_id));
  assert.equal(identity.content_hash, contentHash(lesson));
  assert.notEqual(identity.revision_id, inputs.proposal.base_lesson_revision_id);
  const release = bundle.assessment;
  release.publication_status = 'approved'; release.source_commit = approval.source_commit;
  for (const phase of ['pretest', 'posttest']) {
    const item = release.forms[phase].items.find(q => q.slot === 'T11');
    item.review_status = 'approved'; item.reviewer = approval.reviewer;
    item.safety_privacy_reviewer = approval.reviewer;
    release.forms[phase].hash = fullFormHash(release.forms[phase].items);
  }
  release.curriculum_revisions = release.curriculum_revisions.map(r => r.lesson_key === 'bhw-eligibility'
    ? { ...r, revision_id: identity.revision_id, sha256: identity.content_hash } : r);
  assert.deepEqual(validateRelease(release, { ...inputs.context, lessonHashes: { 'bhw-eligibility': identity.content_hash } }), []);
  return release;
}

/** Data-only publication: new immutable lesson/notes, full-module pointer guard,
 * new assessment identities and assignment switch in one rollback-safe transaction. */
export function accreditationCscPublicationSql(inputs, approval, lesson, identity, release, criterionBaseline) {
  assert.deepEqual(buildApprovedAccreditationCscRelease(inputs, approval, lesson, identity), release);
  assert.equal(releaseHash(criterionBaseline),approval.criterion_baseline_sha256,'Practice criterion baseline drift');
  assert.equal(criterionBaseline.lesson_id,identity.lesson_id);
  assert.equal(criterionBaseline.lesson_revision_id,inputs.proposal.base_lesson_revision_id);
  assert.equal(criterionBaseline.criterion_version,'1');
  assert.equal(approval.criterion_binding.new_version,'2');
  assert.equal(approval.criterion_binding.owner_decision_id,'fb-2.3-owner-2026-10-24');
  const criterion={...criterionBaseline,lesson_revision_id:identity.revision_id,criterion_version:'2',approved_by:null,
    owner_decision_id:approval.criterion_binding.owner_decision_id,
    review_reference:'content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-accreditation-csc-v3/approval-record.json'};
  const r = lesson.revision, old = inputs.proposal;
  const lessonSql = `do $lesson$
declare v_loader uuid;
begin
  select id into v_loader from public.users where username = 'training.loader' and role = 'admin' and status = 'active';
  if v_loader is null then raise exception 'designated publication account unavailable'; end if;
  perform 1 from public.course_modules where id = '${identity.module_id}' for update;
  if (select count(*) from public.course_lessons where module_id = '${identity.module_id}') <> 5 then
    raise exception 'module membership changed'; end if;
  if not exists(select 1 from public.course_lessons l join public.course_lesson_revisions r on r.id=l.published_revision_id
    where l.id='${identity.lesson_id}' and l.module_id='${identity.module_id}' and
      ((r.id='${old.base_lesson_revision_id}' and r.content_hash='${old.base_lesson_hash}') or
       (r.id='${identity.revision_id}' and r.content_hash='${identity.content_hash}'))) then
    raise exception 'published lesson baseline drift'; end if;
  if exists(select 1 from public.course_lesson_revisions where id='${identity.revision_id}'
    and (lesson_id<>'${identity.lesson_id}' or content_hash<>'${identity.content_hash}'
      or read_sections<>${json(r.read_sections)} or slides<>${json(r.slides)}
      or coverage<>${json(r.coverage)} or sources<>${json(r.sources)} or assets<>${json(r.assets)}
      or featured_asset_id is distinct from ${literal(r.featured_asset_id)})) then
    raise exception 'lesson revision identity conflict'; end if;
  insert into public.course_lesson_revisions(id,lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,featured_asset_id,created_by)
    values('${identity.revision_id}','${identity.lesson_id}','fb-2.3-${identity.content_hash.slice(0,12)}','${identity.content_hash}',
      ${json(r.read_sections)},${json(r.slides)},${json(r.coverage)},${json(r.sources)},${json(r.assets)},${literal(r.featured_asset_id)},v_loader)
    on conflict(id) do nothing;
  if exists(select 1 from public.course_lesson_facilitator_notes where revision_id='${identity.revision_id}'
    and (notes_fil<>${literal(lesson.notes.notes_fil)} or notes_en<>${literal(lesson.notes.notes_en)}
      or observation_indicators<>${json(lesson.notes.observation_indicators)})) then
    raise exception 'facilitator notes identity conflict'; end if;
  insert into public.course_lesson_facilitator_notes(revision_id,notes_fil,notes_en,observation_indicators)
    values('${identity.revision_id}',${literal(lesson.notes.notes_fil)},${literal(lesson.notes.notes_en)},${json(lesson.notes.observation_indicators)})
    on conflict(revision_id) do nothing;
  -- New binding to the unchanged rubric; original criterion/evidence stay immutable.
  if not exists(select 1 from assessor_rollout_private.practice_criteria c
    where to_jsonb(c)=${json(criterionBaseline)}) then raise exception 'practice criterion baseline changed'; end if;
  if exists(select 1 from assessor_rollout_private.owner_policy_decisions
    where id='${criterion.owner_decision_id}' and package<>${json(approval)}) then
    raise exception 'owner decision identity conflict'; end if;
  insert into assessor_rollout_private.owner_policy_decisions(id,package)
    values('${criterion.owner_decision_id}',${json(approval)}) on conflict(id) do nothing;
  if exists(select 1 from assessor_rollout_private.practice_criteria c
    where c.chapter_id='${criterion.chapter_id}' and c.criterion_id=${literal(criterion.criterion_id)} and c.criterion_version='2'
      and to_jsonb(c)<>${json(criterion)}) then raise exception 'criterion successor identity conflict'; end if;
  insert into assessor_rollout_private.practice_criteria
    select * from jsonb_populate_record(null::assessor_rollout_private.practice_criteria,${json(criterion)})
    on conflict(chapter_id,criterion_id,criterion_version) do nothing;
  if not exists(select 1 from assessor_rollout_private.component_required_criteria
    where module_id='${identity.module_id}' and chapter_id='${criterion.chapter_id}'
      and criterion_id=${literal(criterion.criterion_id)} and criterion_version in ('1','2')) then
    raise exception 'component criterion mapping changed'; end if;
  update assessor_rollout_private.component_required_criteria set criterion_version='2'
    where module_id='${identity.module_id}' and chapter_id='${criterion.chapter_id}'
      and criterion_id=${literal(criterion.criterion_id)} and criterion_version='1';
  if exists(select 1 from public.course_lessons where id='${identity.lesson_id}' and published_revision_id<>'${identity.revision_id}') then
    update public.course_lessons set published_revision_id='${identity.revision_id}' where id='${identity.lesson_id}';
    insert into public.audit_events(actor_user_id,event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
      select v_loader,'course.lessons_published','course',m.course_id,
        jsonb_build_object('module_id',m.id,'revision_ids',(select jsonb_agg(published_revision_id order by position) from public.course_lessons where module_id=m.id),
          'owner_approval',${json(approval)},'publication','FB-2.3'),
        'Inilathala ang aprubadong paglilinaw sa CSC.','Published the owner-approved CSC clarification.'
      from public.course_modules m where m.id='${identity.module_id}';
  end if;
end;
$lesson$;`;
  return activateAssessmentSql(inputs.base, release).replace('do $import$', lessonSql + '\ndo $import$');
}
