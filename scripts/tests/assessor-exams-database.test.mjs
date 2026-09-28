// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,beforeEach,afterEach,describe,it,expect} from 'vitest';
import manifest from '../../content/assessor/bhw-reference-manual.v1.json';

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
const open=(phase='pretest',id=ids.self)=>actor(id,()=>db.query('select rpc_assessor_exam_open($1,$2) as result',[ids.chapter,phase]));
const submit=(attempt,answers,id=ids.self)=>actor(id,()=>db.query('select rpc_assessor_exam_submit($1,$2::jsonb) as result',[attempt,JSON.stringify(answers)]));
const state=()=>actor(ids.self,()=>db.query('select rpc_assessor_candidate_exam_state($1) as result',[ids.chapter]));
const answer=(questions,correctCount=questions.length)=>questions.map((q,i)=>({question_id:q.id,selected_option_index:i<correctCount?0:1}));

beforeAll(async()=>{
  db=new PGlite();
  await db.exec(read('scripts/tests/fixtures/assessor-study-platform.sql'));
  await db.exec('alter table course_modules add column position integer; alter table course_lessons add column lesson_key text,add column required boolean default true;');
  await db.exec(`create table course_test_questions(id uuid primary key,course_id uuid,position integer,prompt_fil text,prompt_en text,options jsonb,correct_option_index integer,active boolean default true);
    create table course_test_attempts(id uuid primary key default gen_random_uuid());
    create view course_test_questions_current as select id,course_id,position,prompt_fil,prompt_en,options,correct_option_index from course_test_questions where active;
    grant select on course_test_questions_current to authenticated;`);
  for(const name of ['current_app_user','current_org_path'])await db.exec(migrationFunction('20260720000000_baseline_captured_from_remote.sql',name));
  await db.exec(migrationFunction('20260727000000_inc10_announcements.sql','org_unit_path'));
  for(const name of ['org_visible_to_actor','assessor_catchment_includes','training_lesson_visible'])
    await db.exec(migrationFunction('20261002000100_assessor_catchment_bhw_barangay.sql',name));
  await db.exec(read('supabase/migrations/20260928080043_assessor_candidate_learning.sql'));
  await db.exec(read('supabase/migrations/20260928093110_assessor_candidate_exams.sql'));
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
  for(let i=0;i<40;i++)await db.query('insert into course_test_questions(id,course_id,position,prompt_fil,prompt_en,options,correct_option_index) values($1,$2,$3,$4,$4,$5,0)',
    [uuid(500+i),ids.course,i,`Question ${i+1}`,JSON.stringify([{fil:'Tama',en:'Correct'},{fil:'Mali',en:'Wrong'}])]);
},30000);
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{await db.exec('begin');});
afterEach(async()=>{await db.exec('rollback');});

describe('AF-03 exact migration against isolated PostgreSQL schema',()=>{
  it('pins the complete approved chapter inventory in the database rule',async()=>{
    const row=(await db.query("select required_lessons,passing_percent from assessor_private.exam_requirements where chapter_key='chapter-1'")).rows[0];
    expect(row.required_lessons).toEqual(requirements);
    expect(Number(row.passing_percent)).toBe(80);
  });
  it('records one diagnostic without a pass mark and gates new lesson completion',async()=>{
    await expect(actor(ids.self,()=>db.query('select rpc_assessor_lesson_complete($1,$2,$3)',[ids.chapter,uuid(200),uuid(300)]))).rejects.toThrow(/diagnostic pretest/);
    const started=(await open()).rows[0].result;
    expect(started.questions).toHaveLength(40);
    expect(started.questions[0]).not.toHaveProperty('correct_option_index');
    const result=(await submit(started.attempt_id,answer(started.questions,0))).rows[0].result;
    expect(result).toMatchObject({score_percent:0,passed:false,phase:'pretest'});
    await actor(ids.self,()=>db.query('select rpc_assessor_lesson_complete($1,$2,$3)',[ids.chapter,uuid(200),uuid(300)]));
    await expect(open()).rejects.toThrow(/already submitted/);
  });
  it('requires all current chapter lessons, then preserves failed and passing retakes',async()=>{
    const diagnostic=(await open()).rows[0].result;
    await submit(diagnostic.attempt_id,answer(diagnostic.questions,0));
    await expect(open('posttest')).rejects.toThrow(/full chapter/);
    for(let i=0;i<requirements.length;i++)await actor(ids.self,()=>db.query('select rpc_assessor_lesson_complete($1,$2,$3)',[ids.chapter,uuid(200+i),uuid(300+i)]));
    const first=(await open('posttest')).rows[0].result;
    const failed=(await submit(first.attempt_id,answer(first.questions,31))).rows[0].result;
    expect(failed).toMatchObject({score_percent:77.5,passed:false});
    const second=(await open('posttest')).rows[0].result;
    const passed=(await submit(second.attempt_id,answer(second.questions,32))).rows[0].result;
    expect(passed).toMatchObject({score_percent:80,passed:true});
    expect((await state()).rows[0].result.orientation_ready).toBe(true);
    await expect(open('posttest')).rejects.toThrow(/already passed/);
    await db.query('update course_lessons set published_revision_id=null where id=$1',[uuid(200)]);
    expect((await state()).rows[0].result.orientation_ready).toBe(false);
    expect((await actor(ids.self,()=>db.query("select score_percent,passed from assessor_exam_attempts where phase='posttest' order by started_at"))).rows).toHaveLength(2);
    expect((await db.query('select count(*)::integer as n from course_test_attempts')).rows[0].n).toBe(0);
  });
  it('resumes an immutable snapshot after a bank edit and rejects duplicate answers',async()=>{
    const first=(await open()).rows[0].result;
    const resumed=(await open()).rows[0].result;
    expect(resumed.attempt_id).toBe(first.attempt_id);
    await db.query('update course_test_questions set active=false where id=$1',[first.questions[0].id]);
    await expect(submit(first.attempt_id,[...answer(first.questions).slice(1),answer(first.questions)[1]])).rejects.toThrow(/duplicate question/);
    expect((await submit(first.attempt_id,answer(first.questions))).rows[0].result.score_percent).toBe(100);
  });
  it.each([[ids.other,'catchment'],[ids.bhw,'role'],[ids.inactive,'inactive'],[null,'anonymous']])('denies %s %s',async(id)=>{
    await expect(open('pretest',id)).rejects.toThrow(/unavailable|authorized|permission denied/);
  });
  it('denies direct attempt writes and private answer snapshots',async()=>{
    const started=(await open()).rows[0].result;
    await expect(actor(ids.self,()=>db.exec("update assessor_exam_attempts set score_percent=100"))).rejects.toThrow(/permission denied/);
    await expect(actor(ids.self,()=>db.exec('select * from assessor_private.exam_snapshots'))).rejects.toThrow(/permission denied/);
    await expect(submit(started.attempt_id,answer(started.questions),ids.other)).rejects.toThrow(/unavailable/);
  });
});
