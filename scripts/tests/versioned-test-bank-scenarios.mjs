// Versioned pre/post test bank (20260928000000_versioned_test_bank.sql):
// which questions are served and scored, retirement, and the one-active-row-
// per-position rule. Run by training-foundation-replay.mjs against the seeded
// fixture, on a course of its own so earlier scenarios cannot interfere.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

export async function runVersionedTestBankScenarios(db,fixture){
  const {users,org}=fixture;const checks=[];
  async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
  async function q(user,sql,params=[]){
    await db.query('begin');
    try{
      await db.query(user?'set local role authenticated':'set local role anon');
      if(user)await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[user.auth]);
      const result=await db.query(sql,params);await db.query('commit');return result;
    }catch(e){await db.query('rollback');throw e;}
  }
  const submit='select score_percent from public.rpc_course_test_submit($1,$2,$3::jsonb)';
  const opts=JSON.stringify([{fil:'A',en:'A'},{fil:'B',en:'B'},{fil:'C',en:'C'}]);

  const course=randomUUID();
  await db.query("insert into courses(id,org_unit_id,author_user_id,title_fil,title_en,status) values($1,$2,$3,'Bangko','Bank','published')",[course,org.city,users.admin.id]);
  for(const pos of [0,1])await db.query("insert into course_modules(id,course_id,position,type,title_fil,title_en) values($1,$2,$3,'text','M','M')",[randomUUID(),course,pos]);
  // position, module_position, correct index, retired
  const item={};
  for(const [key,position,modulePosition,correct,retired] of [
    ['a',0,0,0,false],   // module 0: served
    ['b',1,1,1,false],   // module 1: served
    ['c',2,5,2,false],   // module 5: no module row yet, not served
    ['d',3,null,0,false],// course-wide: served
    ['e',4,0,1,true],    // retired version of position 4
    ['f',4,0,2,false],   // its active replacement
  ]){
    item[key]=randomUUID();
    await db.query('insert into course_test_questions(id,course_id,position,prompt_fil,prompt_en,options,correct_option_index,module_position,retired_at) values($1,$2,$3,$4,$4,$5,$6,$7,$8)',
      [item[key],course,position,`Q-${key}`,opts,correct,modulePosition,retired?new Date().toISOString():null]);
  }
  const served=async user=>(await q(user,'select id from course_test_questions_current where course_id=$1 order by position',[course])).rows.map(r=>r.id);
  const answer=(id,selected)=>({question_id:id,selected_option_index:selected});

  await check('only active questions on modules the course contains are served',async()=>{
    assert.deepEqual(await served(users.new),[item.a,item.b,item.d,item.f]);
    assert.deepEqual(await served(users.facilitator),[item.a,item.b,item.d,item.f],'facilitators see the same set for test insights');
    assert.deepEqual(await served(users.admin),[item.a,item.b,item.d,item.f]);
    assert.deepEqual(await served(users.outside),[],'RLS still scopes the view to the course org unit');
    await assert.rejects(()=>q(null,'select id from course_test_questions_current'),/permission denied/);
  });
  await check('the current-questions view is read-only',async()=>{
    await assert.rejects(()=>q(users.admin,"update course_test_questions_current set prompt_en='x' where id=$1",[item.a]),/permission denied/);
    await assert.rejects(()=>q(users.admin,"delete from course_test_questions_current where id=$1",[item.a]),/permission denied/);
  });
  await check('one active question per position; retired rows may share it',async()=>{
    await assert.rejects(()=>db.query("insert into course_test_questions(course_id,position,prompt_fil,prompt_en,options,correct_option_index) values($1,0,'x','x',$2,0)",[course,opts]),/course_test_questions_active_position_key/);
    await db.query("insert into course_test_questions(course_id,position,prompt_fil,prompt_en,options,correct_option_index,retired_at) values($1,0,'old','old',$2,0,now())",[course,opts]);
  });
  await check('scoring counts served questions once and ignores the rest',async()=>{
    // a right, b wrong, d right, f right; c (unavailable) and e (retired) are
    // answered right but not scored; a repeated b answer does not count again.
    const answers=[answer(item.a,0),answer(item.b,0),answer(item.b,1),answer(item.c,2),answer(item.d,0),answer(item.e,1),answer(item.f,2)];
    const {rows}=await q(users.new,submit,[course,'pretest',JSON.stringify(answers)]);
    assert.equal(Number(rows[0].score_percent),75);
    const stored=(await db.query("select answers from course_test_attempts where course_id=$1 and bhw_user_id=$2 and phase='pretest'",[course,users.new.id])).rows[0].answers;
    assert.equal(stored.length,answers.length,'the submitted answers are stored as given');
  });
  await check('an unknown question id is still rejected',async()=>{
    await assert.rejects(()=>q(users.racer,submit,[course,'pretest',JSON.stringify([answer(randomUUID(),0)])]),/invalid question/);
    const foreign=(await db.query('select id from course_test_questions where course_id<>$1 limit 1',[course])).rows[0]?.id;
    if(foreign)await assert.rejects(()=>q(users.racer,submit,[course,'pretest',JSON.stringify([answer(foreign,0)])]),/invalid question/);
  });
  await check('a question joins the test once its module is added',async()=>{
    await db.query("insert into course_modules(id,course_id,position,type,title_fil,title_en) values($1,$2,5,'text','M6','M6')",[randomUUID(),course]);
    assert.deepEqual(await served(users.new),[item.a,item.b,item.c,item.d,item.f]);
    const cp=randomUUID();
    await db.query("insert into course_progress(id,course_id,bhw_user_id,status,content_completed_at) values($1,$2,$3,'content_completed',now())",[cp,course,users.complete.id]);
    const all=[answer(item.a,0),answer(item.b,1),answer(item.c,2),answer(item.d,0),answer(item.f,2)];
    const {rows}=await q(users.complete,submit,[course,'posttest',JSON.stringify(all)]);
    assert.equal(Number(rows[0].score_percent),100);
  });
  await check('a course whose questions are all unavailable cannot be submitted',async()=>{
    const empty=randomUUID();
    await db.query("insert into courses(id,org_unit_id,author_user_id,title_fil,title_en,status) values($1,$2,$3,'Walang','None','published')",[empty,org.city,users.admin.id]);
    const id=randomUUID();
    await db.query("insert into course_test_questions(id,course_id,position,prompt_fil,prompt_en,options,correct_option_index,module_position) values($1,$2,0,'x','x',$3,0,3)",[id,empty,opts]);
    await assert.rejects(()=>q(users.racer,submit,[empty,'pretest',JSON.stringify([answer(id,0)])]),/course has no test questions/);
  });
  return {checks,failures:0};
}
