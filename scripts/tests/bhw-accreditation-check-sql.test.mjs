// @vitest-environment node
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {test,expect} from 'vitest';
import {loadReferenceModule} from '../lib/reference-content.mjs';
import {accreditationCheckPublicationSql} from '../lib/bhw-accreditation-check-sql.mjs';

const root='content/training/day1-basic-competencies';
const dir=`${root}/lesson-releases/bhw-accreditation-fb-2.2l-v2/`;
const approval=JSON.parse(readFileSync(dir+'approval-record.json'));
const proposal=JSON.parse(readFileSync('docs/feedback-remediation/proposals/fb-2.2l-accreditation-check.json'));
const sql=readFileSync(dir+'publish.sql','utf8');
const lesson=loadReferenceModule(`${root}/modules/04-ra7883`,'public').lessons.find(l=>l.manifest.lesson_key===approval.lesson_key);
const moduleId='5b638e25-76e2-4bc7-a997-8ce47531fa60';
const lessonId='648d2168-74dd-4451-958c-e4e5d8724a17';
const actor='11111111-1111-4111-8111-111111111111';

test('guarded publication rejects drift and preserves completed learner evidence',async()=>{
  expect(sql).toBe(accreditationCheckPublicationSql());
  const db=new PGlite();
  try{
    await db.exec(`create schema assessor_rollout_private;
      create table public.course_modules(id uuid primary key,course_id uuid not null);
      create table public.users(id uuid primary key,username text,role text,status text);
      create table public.course_lessons(id uuid primary key,module_id uuid,lesson_key text,published_revision_id uuid);
      create table public.course_lesson_revisions(id uuid primary key default gen_random_uuid(),lesson_id uuid,revision_key text,content_hash text,read_sections jsonb,slides jsonb,coverage jsonb,sources jsonb,assets jsonb,featured_asset_id text,created_by uuid);
      create table public.course_lesson_facilitator_notes(revision_id uuid,notes_fil jsonb,notes_en jsonb,observation_indicators jsonb);
      create table assessor_rollout_private.practice_criteria(chapter_id uuid,criterion_id text,criterion_version text,lesson_id uuid,lesson_revision_id uuid,enabled boolean,review_reference text);
      create table assessor_rollout_private.practice_attempts(chapter_id uuid,criterion_id text,criterion_version text);
      create table public.audit_events(actor_user_id uuid,event_type text,subject_type text,subject_id uuid,metadata jsonb,plain_summary_fil text,plain_summary_en text);
      create table public.course_lesson_progress(lesson_id uuid,revision_id uuid,completed_at timestamptz);
      create table public.assessor_lesson_progress(lesson_id uuid,revision_id uuid,completed_at timestamptz);
      create table public.course_lesson_resume(lesson_id uuid,revision_id uuid,position_key text);`);
    await db.query('insert into public.course_modules values($1,$2)',[moduleId,'22222222-2222-4222-8222-222222222222']);
    await db.query("insert into public.users values($1,'training.loader','admin','active')",[actor]);
    for(let n=0;n<5;n++){
      await db.query('insert into public.course_lessons values($1,$2,$3,$4)',[
        n===4?lessonId:`00000000-0000-4000-8000-00000000000${n}`,moduleId,n===4?approval.lesson_key:`sibling-${n}`,n===4?approval.base_revision_id:actor]);
    }
    await db.query('insert into public.course_lesson_revisions(id,lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,featured_asset_id,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[
      approval.base_revision_id,lessonId,approval.base_content_hash,approval.base_content_hash,
      JSON.stringify(lesson.revision.read_sections),JSON.stringify(lesson.revision.slides),JSON.stringify(lesson.revision.coverage),
      JSON.stringify(lesson.revision.sources),JSON.stringify(lesson.revision.assets),lesson.revision.featured_asset_id,actor]);
    await db.query('insert into public.course_lesson_facilitator_notes values($1,$2,$3,$4)',[approval.base_revision_id,'{}','{}','[]']);
    await db.query('insert into assessor_rollout_private.practice_criteria values($1,$2,$3,$4,$5,true,null)',[
      '33333333-3333-4333-8333-333333333333','accreditation-check','1',lessonId,approval.base_revision_id]);
    await db.query('insert into public.course_lesson_progress values($1,$2,now())',[lessonId,approval.base_revision_id]);
    await db.query('insert into public.assessor_lesson_progress values($1,$2,now())',[lessonId,approval.base_revision_id]);
    await db.query("insert into public.course_lesson_resume values($1,$2,'section-5')",[lessonId,approval.base_revision_id]);
    await db.query('update public.course_lessons set published_revision_id=$1 where id=$2',[actor,lessonId]);
    await expect(db.exec(sql)).rejects.toThrow(/published pointer drift/);
    await db.exec('rollback;');
    expect((await db.query('select count(*)::int n from public.course_lesson_revisions where lesson_id=$1',[lessonId])).rows[0].n).toBe(1);
    await db.query('update public.course_lessons set published_revision_id=$1 where id=$2',[approval.base_revision_id,lessonId]);
    await db.exec(sql);
    const {rows:[published]}=await db.query('select r.* from public.course_lessons l join public.course_lesson_revisions r on r.id=l.published_revision_id where l.id=$1',[lessonId]);
    expect(published.content_hash).toBe(approval.new_content_hash);
    expect(published.read_sections[5].check).toEqual(proposal.proposed_check);
    expect(published.slides[5].check).toEqual(proposal.proposed_check);
    expect((await db.query('select count(*)::int n from public.course_lesson_revisions where lesson_id=$1',[lessonId])).rows[0].n).toBe(2);
    expect((await db.query('select count(*)::int n from public.course_lesson_progress where lesson_id=$1 and revision_id=$2',[lessonId,approval.base_revision_id])).rows[0].n).toBe(1);
    expect((await db.query('select count(*)::int n from public.assessor_lesson_progress where lesson_id=$1 and revision_id=$2',[lessonId,approval.base_revision_id])).rows[0].n).toBe(1);
    expect((await db.query('select count(*)::int n from public.course_lesson_resume where lesson_id=$1 and revision_id=$2',[lessonId,approval.base_revision_id])).rows[0].n).toBe(1);
    expect((await db.query('select count(*)::int n from public.course_lesson_facilitator_notes where revision_id=$1',[published.id])).rows[0].n).toBe(1);
    expect((await db.query('select count(*)::int n from assessor_rollout_private.practice_criteria where lesson_revision_id=$1',[published.id])).rows[0].n).toBe(1);
    expect((await db.query('select count(*)::int n from public.audit_events')).rows[0].n).toBe(1);
    await expect(db.exec(sql)).rejects.toThrow(/published pointer drift/);
    await db.exec('rollback;');
  }finally{await db.close();}
});
