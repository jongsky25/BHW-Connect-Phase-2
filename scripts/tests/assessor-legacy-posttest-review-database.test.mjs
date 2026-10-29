// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, afterEach, expect, it } from 'vitest';
const read = p => readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const extract = (file,name) => { const s=read('supabase/migrations/'+file),start=s.indexOf('create or replace function '+name+'('); if(start<0)throw Error(name);return s.slice(start,s.indexOf('$$;',start)+3); };
let db;
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema learner_assessment_private; create schema assessor_private;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.users(id uuid,auth_user_id uuid,role text,status text);
    create table public.courses(id uuid,title_en text,title_fil text);
    create table public.training_program_chapters(id uuid,course_id uuid,program_id uuid,chapter_key text);
    create table public.course_test_attempts(id uuid,course_id uuid,bhw_user_id uuid,phase text,score_percent numeric,taken_at timestamptz);
    create table public.assessor_exam_attempts(id uuid,assessor_user_id uuid,chapter_id uuid,phase text,status text,score_percent numeric,question_count integer,submitted_at timestamptz,question_set_hash text,answers jsonb);
    create table assessor_private.exam_snapshots(attempt_id uuid,questions jsonb);
    create table learner_assessment_private.attempts(id uuid,learner_id uuid,course_id uuid,phase text,state text,score_percent numeric,submitted_at timestamptz,form_id text,release_id text,form_snapshot jsonb,legacy_attempt_id uuid,assessor_exam_attempt_id uuid);
    create table learner_assessment_private.responses(attempt_id uuid,item_id uuid,kind text,option_id text);`);
  await db.exec(extract('20260720000000_baseline_captured_from_remote.sql','public.current_app_user'));
  await db.exec(extract('20261012152647_assessor_chapter1_shared_assessment.sql','learner_assessment_private.owner_id'));
  await db.exec(read('supabase/migrations/20261024070200_fb32_personal_test_history.sql'));
  await db.exec(read('supabase/migrations/20261029011353_assessor_legacy_posttest_review.sql'));
});
afterAll(async()=>db.close());
beforeEach(async()=>{
  await db.exec('begin');
  for(const [n,role] of [[1,'assessor'],[2,'assessor'],[3,'bhw']])
    await db.query('insert into public.users values($1,$1,$2,$3)',[uuid(n),role,'active']);
  await db.query('insert into public.courses values($1,$2,$2)',[uuid(10),'Chapter One']);
  await db.query('insert into public.training_program_chapters values($1,$2,$3,$4)',[uuid(20),uuid(10),uuid(50),'chapter-1']);
  const questions=[1,2].map(n=>({id:uuid(100+n),prompt_en:`Question ${n}`,prompt_fil:`Tanong ${n}`,
    options:[{en:'Wrong',fil:'Mali'},{en:'Right',fil:'Tama'}],correct_option_index:1}));
  const answers=[{question_id:uuid(101),selected_option_index:1},{question_id:uuid(102),selected_option_index:0}];
  for(const [attempt,actor,phase] of [[201,1,'posttest'],[202,2,'posttest'],[203,1,'pretest']]){
    await db.query(`insert into public.assessor_exam_attempts
      (id,assessor_user_id,chapter_id,phase,status,score_percent,question_count,submitted_at,question_set_hash,answers)
      values($1,$2,$3,$4,'submitted',50,2,now(),md5($5::jsonb::text),$6::jsonb)`,
      [uuid(attempt),uuid(actor),uuid(20),phase,JSON.stringify(questions),JSON.stringify(answers)]);
    await db.query('insert into assessor_private.exam_snapshots values($1,$2::jsonb)',[uuid(attempt),JSON.stringify(questions)]);
  }
});
afterEach(async()=>db.exec('rollback'));
async function call(name,who,id){
  await db.exec('savepoint actor_call');
  await db.exec(`set role ${who?'authenticated':'anon'}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[who?uuid(who):'']);
  try {const value=(await db.query(`select public.${name}($1) as result`,[uuid(id)])).rows[0].result;
    await db.exec('reset role;release savepoint actor_call');return value;
  }catch(e){await db.exec('rollback to savepoint actor_call;reset role;release savepoint actor_call');throw e;}
}
it('links a verified own posttest and returns its exact frozen choices and keys without rationales',async()=>{
  await db.exec('savepoint history_call;set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uuid(1)]);
  const rows=(await db.query('select public.rpc_my_test_history() as result')).rows[0].result.items;
  await db.exec('reset role;release savepoint history_call');
  expect(rows.find(r=>r.id===uuid(201)).review_attempt_id).toBe(uuid(201));
  expect(rows.find(r=>r.id===uuid(203)).review_attempt_id).toBeNull();
  expect(JSON.stringify(rows)).not.toContain('correct_option_index');
  const review=await call('rpc_legacy_assessor_posttest_review',1,201);
  expect(review).toMatchObject({generation:'legacy_assessor',score_percent:50,form_membership_known:true,explanations_available:false});
  expect(review.entries).toHaveLength(2);
  expect(review.entries.map(e=>e.matches_stored_key)).toEqual([true,false]);
  expect(review.entries[0]).toMatchObject({prompt_en:'Question 1',selected_option_index:1,correct_option_index:1});
  expect(JSON.stringify(review)).not.toContain('rationale');
});
it('denies other owners, baseline attempts, and anonymous callers',async()=>{
  await expect(call('rpc_legacy_assessor_posttest_review',2,201)).rejects.toThrow('post-test review unavailable');
  await expect(call('rpc_legacy_assessor_posttest_review',1,203)).rejects.toThrow('post-test review unavailable');
  await expect(call('rpc_legacy_assessor_posttest_review',null,201)).rejects.toThrow();
});
it('withholds a changed snapshot and removes its history review link without changing the saved score',async()=>{
  await db.query("update assessor_private.exam_snapshots set questions=jsonb_set(questions,'{0,prompt_en}','\"Changed\"'::jsonb) where attempt_id=$1",[uuid(201)]);
  await expect(call('rpc_legacy_assessor_posttest_review',1,201)).rejects.toThrow('verified post-test snapshot unavailable');
  await db.exec('savepoint history_call;set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uuid(1)]);
  const rows=(await db.query('select public.rpc_my_test_history() as result')).rows[0].result.items;
  await db.exec('reset role;release savepoint history_call');
  expect(rows.find(r=>r.id===uuid(201)).review_attempt_id).toBeNull();
  expect((await db.query('select score_percent from public.assessor_exam_attempts where id=$1',[uuid(201)])).rows[0].score_percent).toBe('50');
});
