// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, afterEach, expect, it } from 'vitest';
const read = p => readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let db;
const extract = (file,name) => { const s=read('supabase/migrations/'+file),start=s.indexOf('create or replace function '+name+'('); if(start<0)throw Error(name);return s.slice(start,s.indexOf('$$;',start)+3); };
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema learner_assessment_private;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.users(id uuid,auth_user_id uuid,role text,status text);
    create table public.courses(id uuid,title_en text,title_fil text);
    create table public.training_program_chapters(id uuid,course_id uuid,program_id uuid,chapter_key text);
    create table public.course_test_attempts(id uuid,course_id uuid,bhw_user_id uuid,phase text,score_percent numeric,taken_at timestamptz);
    create table public.assessor_exam_attempts(id uuid,assessor_user_id uuid,chapter_id uuid,phase text,status text,score_percent numeric,question_count integer,submitted_at timestamptz);
    create table learner_assessment_private.attempts(id uuid,learner_id uuid,course_id uuid,phase text,state text,score_percent numeric,submitted_at timestamptz,form_id text,release_id text,form_snapshot jsonb,legacy_attempt_id uuid,assessor_exam_attempt_id uuid);
    create table learner_assessment_private.responses(attempt_id uuid,item_id uuid,kind text,option_id text,primary key(attempt_id,item_id));`);
  await db.exec(extract('20260720000000_baseline_captured_from_remote.sql','public.current_app_user'));
  await db.exec(extract('20261012152647_assessor_chapter1_shared_assessment.sql','learner_assessment_private.owner_id'));
  await db.exec(read('supabase/migrations/20261024070200_fb32_personal_test_history.sql'));
});
afterAll(async()=>db.close());
beforeEach(async()=>{
  await db.exec('begin');
  for(const [n,role,status] of [[1,'bhw','active'],[2,'assessor','active'],[3,'bhw','active'],[4,'bhw','deactivated'],[5,'admin','active']])
    await db.query('insert into public.users values($1,$1,$2,$3)',[uuid(n),role,status]);
  for(const n of [10,11]){
    await db.query('insert into public.courses values($1,$2,$2)',[uuid(n),'Course '+n]);
    await db.query('insert into public.training_program_chapters values($1,$2,$3,$4)',[uuid(n+10),uuid(n),uuid(50),n===10?'chapter-1':'chapter-2']);
  }
  const items=Array.from({length:30},(_,i)=>({item_id:uuid(1000+i),correct_option_id:'yes'}));
  for(const [id,learner,phase,mirror] of [[100,1,'pretest',200],[101,1,'posttest',201],[102,2,'posttest',202],[103,3,'posttest',203]]){
    await db.query(`insert into learner_assessment_private.attempts values($1,$2,$3,$4,'submitted',80,'2026-10-20T10:00:00Z','form','release',$5,$6,$7)`,
      [uuid(id),uuid(learner),uuid(10),phase,JSON.stringify(items),learner===2?null:uuid(mirror),learner===2?uuid(mirror):null]);
    for(let i=0;i<30;i++)await db.query('insert into learner_assessment_private.responses values($1,$2,$3,$4)',
      [uuid(id),uuid(1000+i),i===29?'unknown':'choice',i===29?null:i<24?'yes':'no']);
    if(learner===2)await db.query("insert into public.assessor_exam_attempts values($1,$2,$3,$4,'submitted',80,30,now())",[uuid(mirror),uuid(learner),uuid(20),phase]);
    else await db.query('insert into public.course_test_attempts values($1,$2,$3,$4,80,now())',[uuid(mirror),uuid(10),uuid(learner),phase]);
  }
  await db.query("insert into public.course_test_attempts values($1,$2,$3,'posttest',72.7,'2026-10-19T10:00:00Z')",[uuid(210),uuid(11),uuid(1)]);
  await db.query("insert into public.assessor_exam_attempts values($1,$2,$3,'posttest','submitted',74,42,'2026-10-18T10:00:00Z')",[uuid(211),uuid(2),uuid(21)]);
});
afterEach(async()=>db.exec('rollback'));
async function call(who,course=null,limit=20,offset=0){
  await db.exec('savepoint actor_call');
  await db.exec(`set role ${who?'authenticated':'anon'}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[who?uuid(who):'']);
  try { const result=(await db.query('select public.rpc_my_test_history($1,$2,$3) as result',[course,limit,offset])).rows[0].result;
    await db.exec('reset role;release savepoint actor_call');return result;
  }catch(e){await db.exec('rollback to savepoint actor_call;reset role;release savepoint actor_call');throw e;}
}
it('returns exact own raw counts without keys and deduplicates BHW mirror records',async()=>{
  const r=await call(1);expect(r.items).toHaveLength(3);
  const pre=r.items.find(i=>i.phase==='pretest');
  expect(pre).toMatchObject({id:uuid(100),correct_count:24,question_count:30,score_percent:80,review_attempt_id:null});
  expect(r.items.find(i=>i.id===uuid(101)).review_attempt_id).toBe(uuid(201));
  expect(r.items.find(i=>i.id===uuid(210))).toMatchObject({correct_count:null,question_count:null,review_attempt_id:null});
  for(const secret of ['correct_option_id','option_id','form_snapshot',uuid(1000),'yes'])expect(JSON.stringify(r)).not.toContain(secret);
});
it('includes assessor results without duplicating shared attempts or guessing older raw counts',async()=>{
  const r=await call(2);expect(r.items).toHaveLength(2);
  expect(r.items.find(i=>i.generation==='versioned')).toMatchObject({correct_count:24,review_attempt_id:uuid(202)});
  expect(r.items.find(i=>i.generation==='legacy_assessor')).toMatchObject({correct_count:null,question_count:42,review_attempt_id:null});
});
it('isolates users and handles pagination/course filters',async()=>{
  expect((await call(3)).items.map(i=>i.id)).toEqual([uuid(103)]);
  const first=await call(1,null,1,0),second=await call(1,null,1,1);
  expect(first.has_more).toBe(true);expect(first.items[0].id).not.toBe(second.items[0].id);
  expect((await call(1,uuid(999))).items).toEqual([]);
  await expect(call(1,null,51)).rejects.toThrow('invalid history page');
  await expect(call(1,null,20,-1)).rejects.toThrow('invalid history page');
});
it.each([null,4,5])('denies anonymous, inactive and non-learner actors (%s)',async who=>{
  await expect(call(who)).rejects.toThrow(who?'not authorized':'permission denied');
});
it('retains stored percentages and suppresses raw counts if evidence is incomplete or inconsistent',async()=>{
  await db.query('update learner_assessment_private.attempts set score_percent=83.3 where id=$1',[uuid(100)]);
  await db.query('delete from learner_assessment_private.responses where attempt_id=$1 and item_id=$2',[uuid(101),uuid(1000)]);
  const r=await call(1);
  expect(r.items.find(i=>i.id===uuid(100))).toMatchObject({score_percent:83.3,correct_count:null});
  expect(r.items.find(i=>i.id===uuid(101)).correct_count).toBeNull();
});
it('performs no learner/history writes and grants no direct private-table access',async()=>{
  const fingerprint=async()=>JSON.stringify((await db.query(`select (select jsonb_agg(to_jsonb(a)) from learner_assessment_private.attempts a) as attempts,(select jsonb_agg(to_jsonb(r)) from learner_assessment_private.responses r) as responses`)).rows);
  const before=await fingerprint();await call(1);await call(2);expect(await fingerprint()).toBe(before);
  await db.exec('savepoint no_access;set role authenticated');
  await expect(db.query('select * from learner_assessment_private.attempts')).rejects.toThrow('permission denied');
  await db.exec('rollback to savepoint no_access;reset role;release savepoint no_access');
});
