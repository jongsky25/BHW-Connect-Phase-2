// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,beforeEach,afterEach,describe,it,expect} from 'vitest';
import manifest from '../../content/assessor/bhw-reference-manual.v1.json';
import orientation from '../../content/assessor/chapter-1-orientation.v1.json';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const ids={self:uuid(1),other:uuid(2),bhw:uuid(3),inactive:uuid(4),admin:uuid(5),outsideAdmin:uuid(6),city:uuid(21),away:uuid(22),program:uuid(30),chapter:uuid(31),chapter2:uuid(33),course:uuid(32),course2:uuid(34)};
const requirements=manifest.chapters[0].modules.flatMap((m,position)=>m.required_lesson_keys.map(key=>({position,key})));
let db;
function migrationFunction(file,name){
  const sql=read(`supabase/migrations/${file}`),start=sql.indexOf(`create or replace function public.${name}(`);
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
const call=(id,name,...args)=>actor(id,()=>db.query(`select ${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) as result`,args));
const answers=()=>orientation.cases.map(c=>({id:c.id,rating:c.correct}));
async function prerequisites(){
  for(let i=0;i<requirements.length;i++)await db.query('insert into assessor_lesson_progress(assessor_user_id,chapter_id,lesson_id,revision_id) values($1,$2,$3,$4)',[ids.self,ids.chapter,uuid(200+i),uuid(300+i)]);
  for(const phase of ['pretest','posttest'])await db.query(`insert into assessor_exam_attempts
    (assessor_user_id,chapter_id,curriculum_version,exam_id,phase,status,question_set_hash,question_count,passing_percent,score_percent,passed,answers,submitted_at)
    values($1,$2,'2026-09-28.1',$3,$4,'submitted','00000000000000000000000000000000',38,$5,$6,$7,'[]',now())`,
    [ids.self,ids.chapter,`chapter-1:${phase}`,phase,phase==='posttest'?80:null,phase==='posttest'?80:0,phase==='posttest']);
}
async function pass(){
  await prerequisites();
  for(const lesson of orientation.lessons)await call(ids.self,'rpc_assessor_orientation_lesson_complete',ids.chapter,lesson.id);
  return actor(ids.self,()=>db.query('select rpc_assessor_orientation_submit($1,$2::jsonb,true) as result',[ids.chapter,JSON.stringify(answers())]));
}
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(read('scripts/tests/fixtures/assessor-study-platform.sql'));
  await db.exec('grant select on public.users,public.org_units to authenticated');
  await db.exec('alter table course_modules add column position integer; alter table course_lessons add column lesson_key text,add column required boolean default true;');
  await db.exec(`create table course_test_questions(id uuid primary key,course_id uuid,position integer,prompt_fil text,prompt_en text,options jsonb,correct_option_index integer,active boolean default true);
    create table course_test_attempts(id uuid primary key default gen_random_uuid());
    create view course_test_questions_current as select id,course_id,position,prompt_fil,prompt_en,options,correct_option_index from course_test_questions where active;
    create table audit_events(id uuid primary key default gen_random_uuid(),actor_user_id uuid,event_type text,subject_type text,subject_id uuid,metadata jsonb default '{}',plain_summary_fil text,plain_summary_en text,created_at timestamptz default now());`);
  for(const name of ['current_app_user','current_org_path'])await db.exec(migrationFunction('20260720000000_baseline_captured_from_remote.sql',name));
  await db.exec(migrationFunction('20260727000000_inc10_announcements.sql','org_unit_path'));
  for(const name of ['org_visible_to_actor','assessor_catchment_includes','training_lesson_visible'])await db.exec(migrationFunction('20261002000100_assessor_catchment_bhw_barangay.sql',name));
  for(const file of ['20260928080043_assessor_candidate_learning.sql','20260928093110_assessor_candidate_exams.sql','20260929050611_assessor_scoring_orientation.sql','20260929054250_assessor_chapter_qualification.sql'])await db.exec(read(`supabase/migrations/${file}`));
  await db.query('insert into org_units values($1,$3),($2,$4)',[ids.city,ids.away,`${ids.city}.`,`${ids.away}.`]);
  for(const [id,role,status,org] of [[ids.self,'assessor','active',ids.city],[ids.other,'assessor','active',ids.away],[ids.bhw,'bhw','active',ids.city],[ids.inactive,'assessor','deactivated',ids.city],[ids.admin,'admin','active',ids.city],[ids.outsideAdmin,'admin','active',ids.away]])
    await db.query('insert into users values($1,$1,$2,$3,$4)',[id,role,status,org]);
  await db.query("insert into training_programs values($1,'bhw-reference-manual','published',$2)",[ids.program,ids.city]);
  await db.query("insert into courses values($1,'published',$3),($2,'published',$3)",[ids.course,ids.course2,ids.city]);
  await db.query("insert into training_program_chapters values($1,$3,'chapter-1',$4,'available'),($2,$3,'chapter-2',$5,'available')",[ids.chapter,ids.chapter2,ids.program,ids.course,ids.course2]);
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

describe('AF-05 qualification migration',()=>{
  it('automatically issues once from the full verified sequence and stays chapter scoped',async()=>{
    expect((await call(ids.self,'rpc_assessor_qualification_state',ids.chapter)).rows[0].result).toMatchObject({status:'in_progress',next_step:'pretest'});
    expect((await pass()).rows[0].result.passed).toBe(true);
    const state=(await call(ids.self,'rpc_assessor_qualification_state',ids.chapter)).rows[0].result;
    expect(state).toMatchObject({status:'active',curriculum_version:'2026-09-28.1',rubric_version:'2026-09-28.1',orientation_version:'2026-09-29.1'});
    expect((await call(ids.self,'rpc_assessor_chapter_qualified',ids.chapter)).rows[0].result).toBe(true);
    expect((await call(ids.self,'rpc_assessor_chapter_qualified',ids.chapter2)).rows[0].result).toBe(false);
    expect((await call(ids.self,'rpc_assessor_qualification_state',ids.chapter2)).rows[0].result).toMatchObject({status:'unavailable'});
    expect((await call(ids.self,'rpc_assessor_qualification_ensure',ids.chapter)).rows[0].result).toBe(state.qualification_id);
    expect((await db.query('select count(*)::integer n from assessor_chapter_qualifications')).rows[0].n).toBe(1);
    expect((await db.query("select count(*)::integer n from audit_events where event_type='assessor.qualification.issued'")).rows[0].n).toBe(1);
  });
  it('rejects early, forged, cross-role, and client-issued qualifications',async()=>{
    await expect(call(ids.self,'rpc_assessor_qualification_ensure',ids.chapter)).rejects.toThrow(/prerequisites incomplete/);
    await expect(call(ids.self,'rpc_assessor_qualification_ensure',ids.chapter2)).rejects.toThrow(/unavailable/);
    for(const id of [ids.other,ids.bhw,ids.inactive,null])await expect(call(id,'rpc_assessor_qualification_ensure',ids.chapter)).rejects.toThrow(/authorized|unavailable|permission denied/);
    await expect(call(ids.admin,'rpc_assessor_qualification_ensure',ids.chapter)).rejects.toThrow(/authorized/);
    await expect(actor(ids.self,()=>db.exec(`insert into assessor_chapter_qualifications(assessor_user_id,chapter_id,curriculum_version,rubric_version,orientation_version,orientation_attempt_id)
      values('${ids.self}','${ids.chapter}','x','x','x','${uuid(999)}')`))).rejects.toThrow(/permission denied/);
    await expect(actor(ids.self,()=>db.exec('select * from assessor_private.orientation_units'))).rejects.toThrow(/permission denied/);
  });
  it('admin suspends and revokes with an audit reason; candidate cannot reactivate',async()=>{
    await pass();
    const id=(await db.query('select id from assessor_chapter_qualifications')).rows[0].id;
    await expect(call(ids.self,'rpc_admin_assessor_qualification_set_status',id,'suspended','Safety review pending')).rejects.toThrow(/authorized/);
    await expect(call(ids.outsideAdmin,'rpc_admin_assessor_qualification_set_status',id,'suspended','Safety review pending')).rejects.toThrow(/out of scope/);
    await expect(call(ids.admin,'rpc_admin_assessor_qualification_set_status',id,'suspended','short')).rejects.toThrow(/reason/);
    await call(ids.admin,'rpc_admin_assessor_qualification_set_status',id,'suspended','Safety review pending');
    expect((await call(ids.self,'rpc_assessor_chapter_qualified',ids.chapter)).rows[0].result).toBe(false);
    await call(ids.self,'rpc_assessor_qualification_ensure',ids.chapter);
    expect((await call(ids.self,'rpc_assessor_qualification_state',ids.chapter)).rows[0].result.status).toBe('suspended');
    await call(ids.admin,'rpc_admin_assessor_qualification_set_status',id,'revoked','Evidence review completed');
    expect((await call(ids.self,'rpc_assessor_qualification_state',ids.chapter)).rows[0].result.status).toBe('revoked');
    expect((await db.query("select metadata->>'reason' reason from audit_events where event_type='assessor.qualification.revoked'")).rows[0].reason).toBe('Evidence review completed');
    await db.exec('alter table audit_events enable row level security');
    expect((await actor(ids.admin,()=>db.query("select count(*)::integer n from audit_events where subject_type='assessor_chapter_qualification'"))).rows[0].n).toBe(3);
    expect((await actor(ids.outsideAdmin,()=>db.query("select count(*)::integer n from audit_events where subject_type='assessor_chapter_qualification'"))).rows[0].n).toBe(0);
  });
  it('does not issue after an incorrect safety rating or a stale lesson revision',async()=>{
    await prerequisites();
    for(const lesson of orientation.lessons)await call(ids.self,'rpc_assessor_orientation_lesson_complete',ids.chapter,lesson.id);
    const wrong=answers().map(a=>a.id==='safety-stop'?{...a,rating:'kaya_na'}:a);
    expect((await actor(ids.self,()=>db.query('select rpc_assessor_orientation_submit($1,$2::jsonb,true) as result',[ids.chapter,JSON.stringify(wrong)]))).rows[0].result.passed).toBe(false);
    expect((await db.query('select count(*)::integer n from assessor_chapter_qualifications')).rows[0].n).toBe(0);
    await db.query('update course_lessons set published_revision_id=null where id=$1',[uuid(200)]);
    await expect(actor(ids.self,()=>db.query('select rpc_assessor_orientation_submit($1,$2::jsonb,true)',[ids.chapter,JSON.stringify(answers())]))).rejects.toThrow(/finish chapter study/);
  });
});
