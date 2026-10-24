// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { loadAccreditationCscInputs } from '../lib/feedback-accreditation-csc-proposal.mjs';
import { buildApprovedAccreditationCscRelease, accreditationCscPublicationSql } from '../lib/feedback-accreditation-csc-publication.mjs';
import { contentHash, loadReferenceModule } from '../lib/reference-content.mjs';
import { releaseHash } from '../lib/feedback-uhc-proposal.mjs';
import { narrationForLesson } from '../../src/lib/elearning/reference-narration';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dir = join(root, 'content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-accreditation-csc-v3');
const read = p => JSON.parse(readFileSync(join(dir, p + '.json'), 'utf8'));
const inputs = loadAccreditationCscInputs(root), approval = read('approval-record'), lesson = read('lesson');
const identity = read('lesson-identity'), release = read('release');
const criterionBaseline=read('criterion-baseline');
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

it('rebuilds exactly the owner-approved release and pins the actual new lesson identity/hash', () => {
  expect(buildApprovedAccreditationCscRelease(inputs, approval, lesson, identity)).toEqual(release);
  const current = loadReferenceModule(join(root, 'content/training/day1-basic-competencies/modules/04-ra7883'), join(root, 'public'))
    .lessons.find(l => l.manifest.lesson_key === 'bhw-eligibility');
  expect(current).toEqual(lesson); expect(contentHash(current)).toBe(identity.content_hash);
  expect(release.curriculum_revisions.find(r => r.lesson_key === 'bhw-eligibility'))
    .toEqual({lesson_key:'bhw-eligibility',revision_id:identity.revision_id,sha256:identity.content_hash});
  expect(release.curriculum_revisions.filter(r => r.lesson_key !== 'bhw-eligibility'))
    .toEqual(inputs.base.curriculum_revisions.filter(r => r.lesson_key !== 'bhw-eligibility'));
});

it('withholds mismatched/new audio while preserving every old section and the unchanged sections', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'content/training/day1-basic-competencies/narration.json'), 'utf8'));
  for (const lang of ['en','fil']) {
    const old = narrationForLesson(manifest, 'bhw-eligibility', lang, inputs.lesson.revision.read_sections);
    const current = narrationForLesson(manifest, 'bhw-eligibility', lang, lesson.revision.read_sections);
    expect(Object.keys(old)).toHaveLength(6); expect(old['section-4']).toBeDefined();
    expect(old['section-4'].src).toBe(manifest.history['bhw-eligibility'][0].sections['section-4'][lang].src);
    expect(Object.keys(current)).toHaveLength(5); expect(current['section-4']).toBeUndefined();
    expect(current['bhwe-filing-receipt']).toBeUndefined();
    for (const key of Object.keys(current)) expect(current[key]).toEqual(old[key]);
  }
});

it('rejects unapproved copy, approval drift and a fabricated lesson hash', () => {
  const changed = structuredClone(lesson); changed.revision.read_sections[0].body_en += ' changed';
  expect(() => buildApprovedAccreditationCscRelease(inputs,approval,changed,identity)).toThrow('approved copy');
  expect(() => buildApprovedAccreditationCscRelease(inputs,{...approval,proposal_sha256:'0'.repeat(64)},lesson,identity)).toThrow('proposal drift');
  expect(() => buildApprovedAccreditationCscRelease(inputs,approval,lesson,{...identity,content_hash:'0'.repeat(64)})).toThrow();
});

it('publishes lesson and assessment atomically, preserves history, and safely supports repeat execution', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema learner_assessment_private; create schema assessor_rollout_private;
      create table assessor_rollout_private.owner_policy_decisions(id text primary key,package jsonb);
      create table assessor_rollout_private.practice_criteria(chapter_id uuid,lesson_id uuid,lesson_revision_id uuid,
        criterion_id text,criterion_version text,requirements_version text,rubric_version text,source_fingerprint text,
        rubric_snapshot jsonb,review_reference text,approved_by uuid,enabled boolean,owner_decision_id text,
        primary key(chapter_id,criterion_id,criterion_version));
      create table assessor_rollout_private.component_required_criteria(module_id uuid,chapter_id uuid,criterion_id text,criterion_version text);
      create table public.users(id uuid primary key,username text,role text,status text);
      create table public.training_programs(id uuid,content_key text,status text);
      create table public.training_program_chapters(program_id uuid,chapter_key text,availability text,course_id uuid);
      create table public.course_modules(id uuid primary key,course_id uuid);
      create table public.course_lessons(id uuid primary key,module_id uuid,lesson_key text,published_revision_id uuid,position int);
      create table public.course_lesson_revisions(id uuid primary key,lesson_id uuid,revision_key text,content_hash text,
        read_sections jsonb,slides jsonb,coverage jsonb,sources jsonb,assets jsonb,featured_asset_id text,created_by uuid);
      create table public.course_lesson_facilitator_notes(revision_id uuid primary key,notes_fil text,notes_en text,observation_indicators jsonb);
      create table public.audit_events(actor_user_id uuid,event_type text,subject_type text,subject_id uuid,metadata jsonb,plain_summary_fil text,plain_summary_en text);
      create table public.course_lesson_progress(id int,revision_id uuid,completed_at text);
      create table learner_assessment_private.releases(id text primary key,blueprint_id text,source_commit text,
        program_key text,chapter_key text,curriculum_revisions jsonb,content_hash text,status text default 'draft');
      create unique index one_active on learner_assessment_private.releases(program_key,chapter_key) where status='active';
      create table learner_assessment_private.forms(id text primary key,release_id text,phase text,items jsonb,form_hash text);
      create table learner_assessment_private.checkpoints(release_id text,group_key text,after_lesson_key text,first_items jsonb,alternate_items jsonb,primary key(release_id,group_key));
      create table learner_assessment_private.enrollments(learner_id int,release_id text);
      create table learner_assessment_private.attempts(id int,release_id text,state text,form_snapshot jsonb,score_percent numeric);
      create table learner_assessment_private.responses(attempt_id int,answer text);`);
    await db.query("insert into public.users values($1,'training.loader','admin','active')",[uuid(1)]);
    await db.query("insert into public.training_programs values($1,'bhw-reference-manual','published')",[uuid(2)]);
    await db.query("insert into public.training_program_chapters values($1,'chapter-1','available',$2)",[uuid(2),uuid(3)]);
    await db.query('insert into public.course_modules values($1,$2),($3,$2)',[identity.module_id,uuid(3),uuid(4)]);
    const keys = new Set(['bhw-legal-role','bhw-benefits','bhw-eligibility','bhw-accreditation','bhw-follow-up']);
    for (let i=0;i<inputs.base.curriculum_revisions.length;i++) {
      const pin=inputs.base.curriculum_revisions[i], id=pin.lesson_key==='bhw-eligibility'?identity.lesson_id:uuid(100+i);
      await db.query('insert into public.course_lessons values($1,$2,$3,$4,$5)',[id,keys.has(pin.lesson_key)?identity.module_id:uuid(4),pin.lesson_key,pin.revision_id,i]);
      await db.query('insert into public.course_lesson_revisions(id,lesson_id,content_hash) values($1,$2,$3)',[pin.revision_id,id,pin.sha256]);
    }
    await db.query("insert into learner_assessment_private.releases(id,content_hash,status,program_key,chapter_key) values($1,$2,'active','bhw-reference-manual','chapter-1')",[inputs.base.release_id,releaseHash(inputs.base)]);
    for (const [phase,form] of Object.entries(inputs.base.forms)) await db.query('insert into learner_assessment_private.forms values($1,$2,$3,$4,$5)',[form.form_id,inputs.base.release_id,phase,JSON.stringify(form.items),form.hash]);
    await db.query('insert into learner_assessment_private.enrollments values(1,$1)',[inputs.base.release_id]);
    await db.query("insert into learner_assessment_private.attempts values(1,$1,'draft',$2,null),(2,$1,'submitted',$2,80)",[inputs.base.release_id,JSON.stringify(inputs.base.forms.pretest.items)]);
    await db.exec("insert into learner_assessment_private.responses values(1,'o1'),(2,'o2')");
    await db.query("insert into public.course_lesson_progress values(1,$1,'2026-10-23')",[inputs.proposal.base_lesson_revision_id]);
    await db.query('insert into assessor_rollout_private.practice_criteria select * from jsonb_populate_record(null::assessor_rollout_private.practice_criteria,$1::jsonb)',[JSON.stringify(criterionBaseline)]);
    await db.query("insert into assessor_rollout_private.component_required_criteria values($1,$2,$3,'1')",[identity.module_id,criterionBaseline.chapter_id,criterionBaseline.criterion_id]);
    const history = async () => (await db.query(`select jsonb_build_object(
      'enrollments',(select jsonb_agg(to_jsonb(e)) from learner_assessment_private.enrollments e),
      'attempts',(select jsonb_agg(to_jsonb(a)) from learner_assessment_private.attempts a),
      'responses',(select jsonb_agg(to_jsonb(r)) from learner_assessment_private.responses r),
      'progress',(select jsonb_agg(to_jsonb(p)) from public.course_lesson_progress p)) as value`)).rows[0];
    const before=await history(), sql=accreditationCscPublicationSql(inputs,approval,lesson,identity,release,criterionBaseline);
    const other=inputs.base.curriculum_revisions.find(p=>p.lesson_key!=='bhw-eligibility');
    await db.query("update public.course_lesson_revisions set content_hash='drift' where id=$1",[other.revision_id]);
    await expect(db.exec(sql)).rejects.toThrow('pinned revisions'); await db.exec('rollback');
    expect((await db.query('select published_revision_id from public.course_lessons where id=$1',[identity.lesson_id])).rows[0].published_revision_id).toBe(inputs.proposal.base_lesson_revision_id);
    expect((await db.query('select count(*) from public.audit_events')).rows[0].count).toBe(0);
    expect((await db.query('select count(*) from public.course_lesson_revisions where id=$1',[identity.revision_id])).rows[0].count).toBe(0);
    expect((await db.query("select count(*) from assessor_rollout_private.practice_criteria where criterion_version='2'")).rows[0].count).toBe(0);
    expect((await db.query('select criterion_version from assessor_rollout_private.component_required_criteria')).rows[0].criterion_version).toBe('1');
    await db.query('update public.course_lesson_revisions set content_hash=$1 where id=$2',[other.sha256,other.revision_id]);
    await db.exec(sql); await db.exec(sql);
    expect(await history()).toEqual(before);
    expect((await db.query("select id from learner_assessment_private.releases where status='active'")).rows).toEqual([{id:release.release_id}]);
    expect((await db.query('select count(*) from public.audit_events')).rows[0].count).toBe(1);
    expect((await db.query('select count(*) from learner_assessment_private.forms')).rows[0].count).toBe(4);
    expect((await db.query('select count(*) from learner_assessment_private.checkpoints')).rows[0].count).toBe(12);
    expect((await db.query("select to_jsonb(c) as value from assessor_rollout_private.practice_criteria c where criterion_version='1'")).rows[0].value).toEqual(criterionBaseline);
    const newer=(await db.query("select to_jsonb(c) as value from assessor_rollout_private.practice_criteria c where criterion_version='2'")).rows[0].value;
    expect(newer.rubric_snapshot).toEqual(criterionBaseline.rubric_snapshot);
    expect(newer.source_fingerprint).toBe(criterionBaseline.source_fingerprint);
    expect(newer.lesson_revision_id).toBe(identity.revision_id);
    expect((await db.query('select criterion_version from assessor_rollout_private.component_required_criteria')).rows[0].criterion_version).toBe('2');
  } finally { await db.close(); }
},30000);
