// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { loadLessonMap, validateRelease } from '../lib/chapter1-assessment-content.mjs';
import { buildApprovedResourceMonitorRelease, publishResourceMonitorSql } from '../lib/feedback-resource-monitor-publication.mjs';
import { releaseHash } from '../lib/feedback-uhc-proposal.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dir = join(root, 'content/training/day1-basic-competencies/learner-assessment-v2');
const read = path => JSON.parse(readFileSync(join(dir, path), 'utf8'));
const base = read('releases/chapter1-feedback-stock-count-v5/release.json');
const target = 'releases/chapter1-feedback-resource-monitor-v6';
const proposal = JSON.parse(readFileSync(join(root, 'docs/feedback-remediation/proposals/fb-2.2g-resource-monitor.json'), 'utf8'));
const approval = read(`${target}/approval-record.json`);
const release = read(`${target}/release.json`);
const context = { ...loadLessonMap(root), orientation: read('orientation.json') };

it('reconstructs the owner-approved stem without changing options, scoring or any other item', () => {
  expect(buildApprovedResourceMonitorRelease(base, proposal, approval, context)).toEqual(release);
  expect(validateRelease(release, context)).toEqual([]);
  const old = base.forms.pretest.items[29], current = release.forms.pretest.items[29];
  expect(old.slot).toBe('T30');
  expect(current.item_id).not.toBe(old.item_id);
  expect(current.stem).toEqual(proposal.stem);
  for (const key of ['options', 'correct_option_id', 'rationale', 'lesson_keys', 'source'])
    expect(current[key]).toEqual(old[key]);
  expect(release.forms.pretest.items.filter(q => q.slot !== 'T30')).toEqual(base.forms.pretest.items.filter(q => q.slot !== 'T30'));
  expect(release.forms.posttest.items).toEqual(base.forms.posttest.items);
  expect(release.forms.posttest.hash).toBe(base.forms.posttest.hash);
  expect(release.checkpoints).toEqual(base.checkpoints);
  expect(release.curriculum_revisions).toEqual(base.curriculum_revisions);
  expect(release.comparability_status).toBe('unvalidated');
  expect(approval.independent_specialist_review).toBe('not_claimed');
  const changed = structuredClone(proposal); changed.stem.fil += ' Iba';
  expect(() => buildApprovedResourceMonitorRelease(base, changed, approval, context)).toThrow('Approved proposal drift');
  expect(() => buildApprovedResourceMonitorRelease(base, proposal, {...approval,reviewer:null}, context)).toThrow('approving owner');
});

it('activates atomically, keeps enrolled attempts intact and is safe to rerun', async () => {
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
      await db.query('insert into public.course_lessons values(1,$1,$2)', [rev.lesson_key, rev.revision_id]);
      await db.query('insert into public.course_lesson_revisions values($1,$2)', [rev.revision_id, rev.sha256]);
    }
    await db.query(`insert into learner_assessment_private.releases(id,content_hash,status,program_key,chapter_key)
      values($1,$2,'active','bhw-reference-manual','chapter-1')`, [base.release_id, releaseHash(base)]);
    for (const [phase, form] of Object.entries(base.forms)) await db.query(
      'insert into learner_assessment_private.forms values($1,$2,$3,$4,$5)',
      [form.form_id, base.release_id, phase, JSON.stringify(form.items), form.hash]);
    await db.query('insert into learner_assessment_private.enrollments values(1,$1)', [base.release_id]);
    await db.query(`insert into learner_assessment_private.attempts values
      (1,$1,'draft',$2,null),(2,$1,'submitted',$2,80)`, [base.release_id, JSON.stringify(base.forms.pretest.items)]);
    await db.exec("insert into learner_assessment_private.responses values(1,'o1'),(2,'o2')");
    const history = async () => (await db.query(`select jsonb_build_object(
      'enrollments',(select jsonb_agg(to_jsonb(e)) from learner_assessment_private.enrollments e),
      'attempts',(select jsonb_agg(to_jsonb(a)) from learner_assessment_private.attempts a),
      'responses',(select jsonb_agg(to_jsonb(r)) from learner_assessment_private.responses r),
      'forms',(select jsonb_agg(to_jsonb(f)) from learner_assessment_private.forms f where release_id='${base.release_id}')) as history`)).rows[0];
    const before = await history();
    const sql = publishResourceMonitorSql(base, release);
    await db.exec("update public.training_program_chapters set availability='unavailable'");
    await expect(db.exec(sql)).rejects.toThrow('pinned revisions');
    await db.exec('rollback');
    expect(await history()).toEqual(before);
    await db.exec("update public.training_program_chapters set availability='available'");
    await db.exec(sql);
    await db.exec(sql);
    expect(await history()).toEqual(before);
    expect((await db.query("select id from learner_assessment_private.releases where status='active'")).rows)
      .toEqual([{id:release.release_id}]);
    expect((await db.query('select count(*) from learner_assessment_private.forms')).rows[0].count).toBe(4);
    expect((await db.query('select count(*) from learner_assessment_private.checkpoints')).rows[0].count).toBe(12);
  } finally { await db.close(); }
}, 30000);
