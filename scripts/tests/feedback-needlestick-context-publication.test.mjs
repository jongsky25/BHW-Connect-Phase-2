// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {expect,it} from 'vitest';
import {loadLessonMap,validateRelease} from '../lib/chapter1-assessment-content.mjs';
import {buildApprovedNeedlestickContextRelease,publishNeedlestickContextSql} from '../lib/feedback-needlestick-context-publication.mjs';
import {releaseHash} from '../lib/feedback-uhc-proposal.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const dir=join(root,'content/training/day1-basic-competencies/learner-assessment-v2');
const read=path=>JSON.parse(readFileSync(join(dir,path),'utf8'));
const base=read('releases/chapter1-feedback-communication-clarify-v7/release.json');
const proposal=JSON.parse(readFileSync(join(root,'docs/feedback-remediation/proposals/fb-2.2k-needlestick-context.json'),'utf8'));
const approval=read('releases/chapter1-feedback-needlestick-context-v8/approval-record.json');
const release=read('releases/chapter1-feedback-needlestick-context-v8/release.json');
const context={...loadLessonMap(root),orientation:read('orientation.json')};

it('reconstructs only the exact reviewed T27 stems and two current approved lesson pins',()=>{
  const packet=readFileSync(join(root,approval.review_record),'utf8');
  for(const language of ['en','fil'])expect(packet).toContain(proposal.stem[language]);
  expect(buildApprovedNeedlestickContextRelease(base,proposal,approval,context)).toEqual(release);
  expect(validateRelease(release,context)).toEqual([]);
  const old=base.forms.pretest.items[26],current=release.forms.pretest.items[26];
  expect(current.slot).toBe('T27');
  expect(current.item_id).toBe(proposal.new_item_id);
  expect(current.item_id).not.toBe(old.item_id);
  expect(current.stem).toEqual(proposal.stem);
  const unchanged=structuredClone(old);
  unchanged.item_id=current.item_id;
  unchanged.editorial_key=current.editorial_key;
  unchanged.version=current.version;
  unchanged.stem=current.stem;
  unchanged.reviewer=current.reviewer;
  unchanged.safety_privacy_reviewer=current.safety_privacy_reviewer;
  expect(current).toEqual(unchanged);
  expect(release.forms.pretest.items.filter(q=>q.slot!=='T27')).toEqual(base.forms.pretest.items.filter(q=>q.slot!=='T27'));
  expect(release.forms.posttest.items).toEqual(base.forms.posttest.items);
  expect(release.forms.posttest.hash).toBe(base.forms.posttest.hash);
  expect(release.checkpoints).toEqual(base.checkpoints);
  const changedPins=release.curriculum_revisions.filter((pin,i)=>JSON.stringify(pin)!==JSON.stringify(base.curriculum_revisions[i]));
  expect(changedPins.map(pin=>pin.lesson_key)).toEqual(['bhw-roles-application','safety-identify']);
  expect(approval.independent_specialist_review).toBe('not_claimed');
  const drift=structuredClone(proposal);drift.stem.fil+=' Iba';
  expect(()=>buildApprovedNeedlestickContextRelease(base,drift,approval,context)).toThrow('Approved proposal drift');
  expect(()=>buildApprovedNeedlestickContextRelease(base,proposal,{...approval,reviewer:null},context)).toThrow('approving owner');
});

it('activates against live curriculum pins and preserves enrolled forms, responses and scores',async()=>{
  const db=new PGlite();
  try{
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
    for(const pin of release.curriculum_revisions){
      await db.query('insert into public.course_lessons values(1,$1,$2)',[pin.lesson_key,pin.revision_id]);
      await db.query('insert into public.course_lesson_revisions values($1,$2)',[pin.revision_id,pin.sha256]);
    }
    await db.query("insert into learner_assessment_private.releases(id,content_hash,status,program_key,chapter_key) values($1,$2,'active','bhw-reference-manual','chapter-1')",[base.release_id,releaseHash(base)]);
    for(const [phase,form] of Object.entries(base.forms))await db.query('insert into learner_assessment_private.forms values($1,$2,$3,$4,$5)',[form.form_id,base.release_id,phase,JSON.stringify(form.items),form.hash]);
    await db.query('insert into learner_assessment_private.enrollments values(1,$1)',[base.release_id]);
    await db.query("insert into learner_assessment_private.attempts values(1,$1,'draft',$2,null),(2,$1,'submitted',$2,80)",[base.release_id,JSON.stringify(base.forms.pretest.items)]);
    await db.exec("insert into learner_assessment_private.responses values(1,'o1'),(2,'o2')");
    const history=async()=>(await db.query(`select jsonb_build_object(
      'enrollments',(select jsonb_agg(to_jsonb(e)) from learner_assessment_private.enrollments e),
      'attempts',(select jsonb_agg(to_jsonb(a)) from learner_assessment_private.attempts a),
      'responses',(select jsonb_agg(to_jsonb(r)) from learner_assessment_private.responses r),
      'forms',(select jsonb_agg(to_jsonb(f)) from learner_assessment_private.forms f where release_id='${base.release_id}')) history`)).rows[0];
    const before=await history();
    const sql=publishNeedlestickContextSql(base,release);
    await db.exec("update public.course_lessons set published_revision_id='2897e8f8-7c63-4307-b7b3-bd01ad50fade' where lesson_key='bhw-roles-application'");
    await expect(db.exec(sql)).rejects.toThrow('pinned revisions');
    await db.exec('rollback');
    expect(await history()).toEqual(before);
    await db.exec("update public.course_lessons set published_revision_id='7582aca1-9635-4df5-956d-8ea3d49c3425' where lesson_key='bhw-roles-application'");
    await db.exec(sql);
    await db.exec(sql);
    expect(await history()).toEqual(before);
    expect((await db.query("select id from learner_assessment_private.releases where status='active'")).rows).toEqual([{id:release.release_id}]);
    expect((await db.query('select count(*) from learner_assessment_private.forms')).rows[0].count).toBe(4);
    expect((await db.query('select count(*) from learner_assessment_private.checkpoints')).rows[0].count).toBe(12);
    expect((await db.query('select count(*) from learner_assessment_private.enrollments where release_id=$1',[release.release_id])).rows[0].count).toBe(0);
  }finally{await db.close();}
},30000);
