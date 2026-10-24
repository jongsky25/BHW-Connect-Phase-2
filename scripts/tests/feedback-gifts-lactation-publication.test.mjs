// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { loadLessonMap, validateRelease } from '../lib/chapter1-assessment-content.mjs';
import { buildApprovedGiftsLactationRelease, publishGiftsLactationSql } from '../lib/feedback-gifts-lactation-publication.mjs';
import { releaseHash } from '../lib/feedback-uhc-proposal.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const dir = join(root, 'content/training/day1-basic-competencies/learner-assessment-v2');
const read = p => JSON.parse(readFileSync(join(dir, p), 'utf8'));
const base = read('releases/chapter1-feedback-accreditation-csc-v3/release.json');
const proposal = read('proposals/fb-2.4-gifts-lactation/proposal.json');
const approval = read('releases/chapter1-feedback-gifts-lactation-v4/approval-record.json');
const release = read('releases/chapter1-feedback-gifts-lactation-v4/release.json');
const context = { ...loadLessonMap(root), orientation: read('orientation.json') };

it('reconstructs the approved bilingual copy and preserves every unrelated item and curriculum pin', () => {
  expect(buildApprovedGiftsLactationRelease(base, proposal, approval, context)).toEqual(release);
  expect(validateRelease(release, context)).toEqual([]);
  expect(approval.independent_specialist_review).toBe('not_claimed');
  for (const replacement of proposal.replacements) {
    const item = release.forms[replacement.phase].items.find(q => q.slot === replacement.slot);
    for (const key of ['item_id','editorial_key','version','stem','options','rationale','correct_option_id'])
      expect(item[key]).toEqual(replacement.item[key]);
  }
  for (const phase of ['pretest','posttest']) expect(release.forms[phase].items.filter(q => !['T08','T09'].includes(q.slot)))
    .toEqual(base.forms[phase].items.filter(q => !['T08','T09'].includes(q.slot)));
  expect(release.checkpoints).toEqual(base.checkpoints);
  expect(release.curriculum_revisions).toEqual(base.curriculum_revisions);
  expect(release.comparability_status).toBe('unvalidated');
});

it('refuses unapproved copy, missing owner identity and the wrong release lineage', () => {
  const changed = structuredClone(proposal); changed.replacements[0].item.stem.fil += ' changed';
  expect(() => buildApprovedGiftsLactationRelease(base, changed, approval, context)).toThrow('Approved proposal drift');
  expect(() => buildApprovedGiftsLactationRelease(base, proposal, {...approval,reviewer:null}, context)).toThrow('approving owner');
  expect(() => publishGiftsLactationSql({...base,release_id:'wrong'},release)).toThrow();
  expect(() => publishGiftsLactationSql(base,{...release,publication_status:'draft'})).toThrow();
});

it('publishes atomically and idempotently while preserving pinned enrollments, snapshots, answers and scores', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema learner_assessment_private;
      create table public.training_programs(id int,content_key text,status text);
      create table public.training_program_chapters(program_id int,chapter_key text,availability text,course_id int);
      create table public.course_modules(id int,course_id int);
      create table public.course_lessons(module_id int,lesson_key text,published_revision_id uuid);
      create table public.course_lesson_revisions(id uuid,content_hash text);
      create table learner_assessment_private.releases(id text primary key,blueprint_id text,source_commit text,
        program_key text,chapter_key text,curriculum_revisions jsonb,content_hash text,status text default 'draft');
      create unique index one_active on learner_assessment_private.releases(program_key,chapter_key) where status='active';
      create table learner_assessment_private.forms(id text primary key,release_id text,phase text,items jsonb,form_hash text);
      create table learner_assessment_private.checkpoints(release_id text,group_key text,after_lesson_key text,
        first_items jsonb,alternate_items jsonb,primary key(release_id,group_key));
      create table learner_assessment_private.enrollments(learner_id int,release_id text);
      create table learner_assessment_private.attempts(id int,release_id text,state text,form_snapshot jsonb,score_percent numeric);
      create table learner_assessment_private.responses(attempt_id int,answer text);
      insert into public.training_programs values(1,'bhw-reference-manual','published');
      insert into public.training_program_chapters values(1,'chapter-1','available',1);
      insert into public.course_modules values(1,1);`);
    for (const rev of base.curriculum_revisions) {
      await db.query('insert into public.course_lessons values(1,$1,$2)', [rev.lesson_key,rev.revision_id]);
      await db.query('insert into public.course_lesson_revisions values($1,$2)', [rev.revision_id,rev.sha256]);
    }
    await db.query(`insert into learner_assessment_private.releases(id,content_hash,status,program_key,chapter_key)
      values($1,$2,'active','bhw-reference-manual','chapter-1')`, [base.release_id,releaseHash(base)]);
    for (const [phase,form] of Object.entries(base.forms)) await db.query(
      'insert into learner_assessment_private.forms values($1,$2,$3,$4,$5)',
      [form.form_id,base.release_id,phase,JSON.stringify(form.items),form.hash]);
    await db.query('insert into learner_assessment_private.enrollments values(1,$1)', [base.release_id]);
    await db.query(`insert into learner_assessment_private.attempts values
      (1,$1,'draft',$2,null),(2,$1,'submitted',$2,80)`, [base.release_id,JSON.stringify(base.forms.pretest.items)]);
    await db.exec("insert into learner_assessment_private.responses values(1,'o1'),(2,'o2')");
    const history = async () => (await db.query(`select jsonb_build_object(
      'enrollments',(select jsonb_agg(to_jsonb(e)) from learner_assessment_private.enrollments e),
      'attempts',(select jsonb_agg(to_jsonb(a)) from learner_assessment_private.attempts a),
      'responses',(select jsonb_agg(to_jsonb(r)) from learner_assessment_private.responses r),
      'forms',(select jsonb_agg(to_jsonb(f)) from learner_assessment_private.forms f where release_id='${base.release_id}')) as history`)).rows[0];
    const before = await history();
    const sql = publishGiftsLactationSql(base, release);
    // Failed curriculum guard leaves both active assignment and history intact.
    await db.exec("update public.training_program_chapters set availability='unavailable'");
    await expect(db.exec(sql)).rejects.toThrow('pinned revisions');
    await db.exec('rollback');
    expect(await history()).toEqual(before);
    expect((await db.query('select count(*) from learner_assessment_private.releases')).rows[0].count).toBe(1);
    await db.exec("update public.training_program_chapters set availability='available'");
    await db.exec("update learner_assessment_private.releases set status='draft'; insert into learner_assessment_private.releases(id,status,program_key,chapter_key) values('unexpected','active','bhw-reference-manual','chapter-1')");
    await expect(db.exec(sql)).rejects.toThrow('unexpected active release');
    await db.exec('rollback');
    expect(await history()).toEqual(before);
    await db.exec("delete from learner_assessment_private.releases where id='unexpected'; update learner_assessment_private.releases set status='active'");
    await db.exec(sql);
    await db.exec(sql);
    expect(await history()).toEqual(before);
    expect((await db.query("select id from learner_assessment_private.releases where status='active'")).rows).toEqual([{id:release.release_id}]);
    expect((await db.query(`select r.id,r.status from learner_assessment_private.enrollments e
      join learner_assessment_private.releases r on r.id=e.release_id`)).rows).toEqual([{id:base.release_id,status:'draft'}]);
    expect((await db.query('select count(*) from learner_assessment_private.forms')).rows[0].count).toBe(4);
    expect((await db.query('select count(*) from learner_assessment_private.checkpoints')).rows[0].count).toBe(12);
  } finally { await db.close(); }
}, 30000);
