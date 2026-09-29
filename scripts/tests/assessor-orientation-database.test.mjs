// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,beforeEach,afterEach,describe,it,expect} from 'vitest';
import manifest from '../../content/assessor/bhw-reference-manual.v1.json';
import orientation from '../../content/assessor/chapter-1-orientation.v1.json';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const ids={self:uuid(1),other:uuid(2),bhw:uuid(3),inactive:uuid(4),city:uuid(21),away:uuid(22),program:uuid(30),chapter:uuid(31),course:uuid(32)};
const requirements=manifest.chapters[0].modules.flatMap((m,position)=>m.required_lesson_keys.map(key=>({position,key})));
let db;
function migrationFunction(file,name){
  const sql=read(`supabase/migrations/${file}`);
  const start=sql.indexOf(`create or replace function public.${name}(`);
  if(start<0)throw new Error(`Missing real helper ${name}`);
  return sql.slice(start,sql.indexOf('$$;',start)+3);
}
async function actor(id,fn){
  await db.exec('savepoint actor_call');
  await db.exec(`set role ${id?'authenticated':'anon'}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??'']);
  try{const result=await fn();await db.exec('reset role; release savepoint actor_call');return result;}
  catch(error){await db.exec('rollback to savepoint actor_call; reset role; release savepoint actor_call');throw error;}
}
const state=(id=ids.self)=>actor(id,()=>db.query('select rpc_assessor_orientation_state($1) as result',[ids.chapter]));
const completeLesson=(lessonId,id=ids.self)=>actor(id,()=>db.query('select rpc_assessor_orientation_lesson_complete($1,$2)',[ids.chapter,lessonId]));
const submit=(answers,ack=true,id=ids.self)=>actor(id,()=>db.query('select rpc_assessor_orientation_submit($1,$2::jsonb,$3) as result',[ids.chapter,JSON.stringify(answers),ack]));
const ratings=['kaya_na','kailangan_practice','hindi_pa','kailangan_practice','kaya_na','kailangan_practice','hindi_pa','hindi_pa'];
const answers=()=>['roles-independent','roles-prompted','roles-one','records-purpose','records-priority','listening-prompted','problem-guess','safety-stop']
  .map((id,i)=>({id,rating:ratings[i]}));

beforeAll(async()=>{
  db=new PGlite();
  await db.exec(read('scripts/tests/fixtures/assessor-study-platform.sql'));
  await db.exec('alter table course_modules add column position integer; alter table course_lessons add column lesson_key text,add column required boolean default true;');
  await db.exec(`create table course_test_questions(id uuid primary key,course_id uuid,position integer,prompt_fil text,prompt_en text,options jsonb,correct_option_index integer,active boolean default true);
    create table course_test_attempts(id uuid primary key default gen_random_uuid());
    create view course_test_questions_current as select id,course_id,position,prompt_fil,prompt_en,options,correct_option_index from course_test_questions where active;`);
  for(const name of ['current_app_user','current_org_path'])await db.exec(migrationFunction('20260720000000_baseline_captured_from_remote.sql',name));
  await db.exec(migrationFunction('20260727000000_inc10_announcements.sql','org_unit_path'));
  for(const name of ['org_visible_to_actor','assessor_catchment_includes','training_lesson_visible'])
    await db.exec(migrationFunction('20261002000100_assessor_catchment_bhw_barangay.sql',name));
  await db.exec(read('supabase/migrations/20260928080043_assessor_candidate_learning.sql'));
  await db.exec(read('supabase/migrations/20260928093110_assessor_candidate_exams.sql'));
  await db.exec(read('supabase/migrations/20260929050611_assessor_scoring_orientation.sql'));
  await db.query('insert into org_units values($1,$3),($2,$4)',[ids.city,ids.away,`${ids.city}.`,`${ids.away}.`]);
  for(const [id,role,status,org] of [[ids.self,'assessor','active',ids.city],[ids.other,'assessor','active',ids.away],[ids.bhw,'bhw','active',ids.city],[ids.inactive,'assessor','deactivated',ids.city]])
    await db.query('insert into users values($1,$1,$2,$3,$4)',[id,role,status,org]);
  await db.query("insert into training_programs values($1,'bhw-reference-manual','published',$2)",[ids.program,ids.city]);
  await db.query("insert into courses values($1,'published',$2)",[ids.course,ids.city]);
  await db.query("insert into training_program_chapters values($1,$2,'chapter-1',$3,'available')",[ids.chapter,ids.program,ids.course]);
  for(let i=0;i<9;i++)await db.query('insert into course_modules values($1,$2,$3)',[uuid(100+i),ids.course,i]);
  for(let i=0;i<requirements.length;i++){
    const req=requirements[i],lesson=uuid(200+i),revision=uuid(300+i);
    await db.query('insert into course_lessons values($1,$2,$3,$4,true)',[lesson,uuid(100+req.position),revision,req.key]);
    await db.query('insert into course_lesson_revisions values($1,$2,$3,$4)',[revision,lesson,JSON.stringify([{id:'read',concept_ids:['c']}]),JSON.stringify([{id:'slide',concept_ids:['c']}])]);
  }
},30000);
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{await db.exec('begin');});
afterEach(async()=>{await db.exec('rollback');});

async function completePrerequisites(){
  for(let i=0;i<requirements.length;i++)await db.query('insert into assessor_lesson_progress(assessor_user_id,chapter_id,lesson_id,revision_id) values($1,$2,$3,$4)',
    [ids.self,ids.chapter,uuid(200+i),uuid(300+i)]);
  for(const phase of ['pretest','posttest'])await db.query(`insert into assessor_exam_attempts
    (assessor_user_id,chapter_id,curriculum_version,exam_id,phase,status,question_set_hash,question_count,passing_percent,score_percent,passed,answers,submitted_at)
    values($1,$2,'2026-09-28.1',$3,$4,'submitted','00000000000000000000000000000000',38,$5,$6,$7,'[]',now())`,
    [ids.self,ids.chapter,`chapter-1:${phase}`,phase,phase==='posttest'?80:null,phase==='posttest'?80:0,phase==='posttest']);
}
async function completeOrientationLessons(){
  for(const lesson of orientation.lessons)await completeLesson(lesson.id);
}

describe('AF-04 exact migration against isolated PostgreSQL schema',()=>{
  it('loads the reviewed bilingual lesson and case source without drift',async()=>{
    const unit=(await db.query("select title,guide,lessons,cases,passing_count from assessor_private.orientation_units where chapter_key='chapter-1'")).rows[0];
    for(const key of ['title','guide','lessons','cases','passing_count'])expect(unit[key]).toEqual(orientation[key]);
    expect(new Set(unit.lessons.map(l=>l.id)).size).toBe(6);
    expect(new Set(unit.cases.map(c=>c.id)).size).toBe(8);
    const indicators=new Set(manifest.chapters[0].modules.flatMap(m=>m.indicators.map(i=>i.id)));
    expect(unit.cases.every(c=>indicators.has(c.indicator))).toBe(true);
  });
  it('locks the guide until every current prerequisite is complete',async()=>{
    expect((await state()).rows[0].result).toMatchObject({ready:false,passed:false});
    await expect(submit(answers())).rejects.toThrow(/finish chapter study/);
    await completePrerequisites();
    const ready=(await state()).rows[0].result;
    expect(ready).toMatchObject({ready:true,passed:false,passing_count:7});
    expect(ready.cases).toHaveLength(8);
    expect(ready.cases[0]).not.toHaveProperty('correct');
    expect(ready.cases[0]).not.toHaveProperty('reason');
    expect(ready.lessons).toHaveLength(6);
    expect(ready.completed_lessons).toEqual([]);
    await expect(completeLesson('fabricated')).rejects.toThrow(/unknown orientation lesson/);
    await completeLesson('eligibility');
    expect((await state()).rows[0].result.completed_lessons).toEqual(['eligibility']);
  });
  it('saves failed practice, accepts a retake, and never issues qualification',async()=>{
    await completePrerequisites();
    await expect(submit(answers())).rejects.toThrow(/complete every orientation lesson/);
    await completeOrientationLessons();
    const wrong=answers().map(a=>({...a,rating:'kaya_na'}));
    expect((await submit(wrong)).rows[0].result).toMatchObject({correct_count:2,passed:false});
    expect((await submit(answers())).rows[0].result).toMatchObject({correct_count:8,passed:true});
    expect((await state()).rows[0].result).toMatchObject({passed:true,attempts:2});
    await expect(submit(answers())).rejects.toThrow(/already passed/);
    expect((await db.query("select count(*)::integer as n from information_schema.tables where table_name='assessor_qualifications'")).rows[0].n).toBe(0);
  });
  it('rejects invalid or duplicate ratings and requires guide acknowledgement',async()=>{
    await completePrerequisites();
    await completeOrientationLessons();
    await expect(submit(answers(),false)).rejects.toThrow(/review the scoring guide/);
    await expect(submit([...answers().slice(1),answers()[1]])).rejects.toThrow(/duplicate case/);
    await expect(submit(answers().map((a,i)=>i? a:{...a,rating:'unknown'}))).rejects.toThrow(/invalid rating/);
    expect((await db.query('select count(*)::integer as n from assessor_orientation_attempts')).rows[0].n).toBe(0);
  });
  it('requires the safety decision even when seven other ratings are correct',async()=>{
    await completePrerequisites();
    await completeOrientationLessons();
    const unsafe=answers().map(a=>a.id==='safety-stop'?{...a,rating:'kaya_na'}:a);
    expect((await submit(unsafe)).rows[0].result).toMatchObject({correct_count:7,critical_correct:false,passed:false});
  });
  it('denies other roles, inactive assessors, outsiders and direct writes',async()=>{
    await completePrerequisites();
    for(const id of [ids.other,ids.bhw,ids.inactive,null])await expect(state(id)).rejects.toThrow(/authorized|unavailable|permission denied/);
    for(const id of [ids.other,ids.bhw,ids.inactive,null])await expect(completeLesson('eligibility',id)).rejects.toThrow(/authorized|unavailable|permission denied/);
    await expect(actor(ids.self,()=>db.exec("insert into assessor_orientation_attempts(assessor_user_id,chapter_id,curriculum_version,orientation_version,answers,correct_count,question_count,passed) values ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000031','x','y','[]',5,5,true)"))).rejects.toThrow(/permission denied/);
    await expect(actor(ids.self,()=>db.exec('select * from assessor_private.orientation_units'))).rejects.toThrow(/permission denied/);
    await expect(actor(ids.self,()=>db.exec("insert into assessor_orientation_lesson_progress(assessor_user_id,chapter_id,curriculum_version,orientation_version,lesson_id) values ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000031','x','y','eligibility')"))).rejects.toThrow(/permission denied/);
  });
  it('rechecks current revision before another submission',async()=>{
    await completePrerequisites();
    await db.query('update course_lessons set published_revision_id=null where id=$1',[uuid(200)]);
    expect((await state()).rows[0].result.ready).toBe(false);
    await expect(submit(answers())).rejects.toThrow(/finish chapter study/);
  });
});
