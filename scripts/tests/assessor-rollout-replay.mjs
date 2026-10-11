// Full public migration replay on a disposable loopback PostgreSQL database.
// Uses the repository's Supabase-owned infrastructure fixture, not a hosted DB.
// This does not substitute for the separately required `supabase start` replay.
import {createRequire} from 'node:module';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const resolve=createRequire(import.meta.url).resolve;
const {default:pg}=await import(pathToFileURL(resolve(process.env.PG_TEST_MODULE || 'pg')).href);
const root=new URL('../../',import.meta.url);
const database=`bhw_assessor_rollout_${Date.now()}`;
const config={host:'127.0.0.1',port:55432,user:'postgres',database:'postgres'};
const master=new pg.Client(config);await master.connect();await master.query(`create database ${database}`);await master.end();
const db=new pg.Client({...config,database});await db.connect();
const checks=[];
const check=async(name,fn)=>{await fn();checks.push(name);};
try {
 let platform=await readFile(new URL('training-foundation-platform.sql',import.meta.url),'utf8');
 for(const role of ['anon','authenticated','service_role'])if((await db.query('select 1 from pg_roles where rolname=$1',[role])).rowCount)platform=platform.replace(new RegExp(`create role ${role}[^;]*;`),'');
 await db.query(platform);
 // Supabase Storage infrastructure added since the original replay fixture.
 // Public application migrations below are still replayed byte-for-byte.
 await db.query(`alter table storage.buckets add column file_size_limit bigint,add column allowed_mime_types text[];
 create function storage.foldername(text) returns text[] language sql immutable set search_path='' as $$
  select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;`);
 const files=(await readdir(new URL('supabase/migrations/',root))).filter(file=>file.endsWith('.sql')).sort();
 const {seedLegacy}=await import('./training-foundation-scenarios.mjs');
 let fixture;
 for(const file of files){
  if(file==='20260924000000_training_lesson_foundation.sql')fixture=await seedLegacy(db);
  try{await db.query(await readFile(new URL(`supabase/migrations/${file}`,root),'utf8'));}
  catch(error){throw new Error(`Migration ${file}: ${error.message}`,{cause:error});}
 }
 const {users,org,course}=fixture;
 const q=async(user,sql,args=[],client=db)=>{
  await client.query('begin');
  try{
   await client.query(`set local role ${user?'authenticated':'anon'}`);
   await client.query("select set_config('request.jwt.claim.sub',$1,true)",[user?.auth??'']);
   const result=await client.query(sql,args);await client.query('commit');return result;
  }catch(error){await client.query('rollback');throw error;}
 };
 await db.query('insert into super_admins(user_id) values($1) on conflict do nothing',[users.root.id]);
 const program=(await db.query("insert into training_programs(content_key,org_unit_id,author_user_id,title_fil,title_en,status) values('bhw-reference-manual',$1,$2,'Pagsubok','Test','published') returning id",[org.city,users.root.id])).rows[0].id;
 await db.query("insert into training_program_chapters(program_id,chapter_key,position,title_fil,title_en,course_id,availability) values($1,'chapter-1',0,'Pagsubok','Test',$2,'available')",[program,course]);
 let cohort;
 await check('new switches default off and migration seeds no cohort',async()=>{
  assert.equal((await db.query('select count(*)::int count from assessor_flow_cohorts')).rows[0].count,0);
  assert.deepEqual((await db.query("select enabled from feature_flags where key like 'assessor_flow_%' order by key")).rows,[{enabled:false},{enabled:false},{enabled:false}]);
  assert.equal((await q(users.facilitator,'select rpc_assessor_flow_policy($1,$2) result',[program,'chapter-1'])).rows[0].result,null);
 });
 const configure=(key='test-cohort',ui=false)=>q(users.root,'select rpc_admin_assessor_flow_cohort_configure($1,$2,$3,$4,$5,false,false,$6) result',[program,'chapter-1',key,'test-v1',ui,'local rehearsal']);
 cohort=(await configure()).rows[0].result;
 for(const member of [users.facilitator,users.new])await q(users.root,'select rpc_admin_assessor_flow_cohort_enroll($1,$2,$3)',[cohort,member.id,'local rehearsal']);
 const protectedAssessment=(await db.query("insert into assessments(course_id,bhw_user_id,org_unit_id,status) values($1,$2,$3,'pending') returning id",[course,users.new.id,org.barangay])).rows[0].id;
 await check('RPC policy is scoped to actual actor and plain admins cannot configure',async()=>{
  const policy=(await q(users.facilitator,'select rpc_assessor_flow_policy($1,$2) result',[program,'chapter-1'])).rows[0].result;
  assert.equal(policy.actorId,users.facilitator.id);assert.equal(policy.authorityCutoverAt,null);
  await assert.rejects(()=>q(users.admin,'select rpc_admin_assessor_flow_cohort_configure($1,$2,$3,$4,false,false,false,$5)',[program,'chapter-1','bad','v1','test']),/not authorized/);
  await assert.rejects(()=>q(users.admin,'select rpc_assessor_flow_policy($1,$2)',[program,'chapter-1']),/not authorized/);
  await assert.rejects(()=>q(null,'select rpc_assessor_flow_policy($1,$2)',[program,'chapter-1']),/permission denied/);
  await assert.rejects(()=>q(users.facilitator,'select * from assessor_flow_cohorts'),/permission denied/);
 });
 await check('briefing acknowledgement is actor-bound and concurrent retries audit once',async()=>{
  await q(users.root,'select rpc_admin_assessor_flow_cohort_configure($1,$2,$3,$4,true,false,false,$5)',
   [program,'chapter-1','test-cohort','chapter-1:c1af.draft-1','local briefing rehearsal']);
  await db.query("update feature_flags set enabled=true,disabled_roles='{}' where key in ('elearning','assessor_flow_ui')");
  const state=(await q(users.facilitator,'select rpc_assessor_briefing_state($1) result',[program])).rows[0].result;
  assert.equal(state.acknowledgedAt,null);assert.equal(state.actorId,users.facilitator.id);
  const sql='select rpc_assessor_briefing_acknowledge($1,$2,$3,$4,$5,$6) result';
  const args=[program,users.facilitator.id,'chapter-1:c1af.draft-1','chapter-1:briefing.v1',true,'en'];
  await assert.rejects(()=>q(users.admin,sql,args),/not authorized/);
  await assert.rejects(()=>q(users.facilitator,sql,[program,users.root.id,...args.slice(2)]),/actor changed/);
  await assert.rejects(()=>q(users.facilitator,sql,[...args.slice(0,3),'old',true,'en']),/briefing version changed/);
  const clients=[new pg.Client({...config,database}),new pg.Client({...config,database})];
  await Promise.all(clients.map(client=>client.connect()));
  let results;
  try{results=await Promise.all(clients.map(client=>q(users.facilitator,sql,args,client)));}
  finally{await Promise.all(clients.map(client=>client.end()));}
  const receipt=results[0].rows[0].result;
  assert.ok(receipt.acknowledgedAt);assert.deepEqual(results[1].rows[0].result,receipt);
  assert.deepEqual((await q(users.facilitator,'select rpc_assessor_briefing_state($1) result',[program])).rows[0].result,receipt);
  assert.equal((await db.query("select count(*)::int count from audit_events where event_type='assessor_briefing.acknowledged'")).rows[0].count,1);
  await assert.rejects(()=>q(users.facilitator,'select * from assessor_briefing_acknowledgements'),/permission denied/);
  // Return this disposable cohort to the pre-existing cutover scenarios.
  await configure();await db.query("update feature_flags set enabled=false where key='assessor_flow_ui'");
 });
 await check('real legacy session RPC still works before cutover',async()=>{
  const result=await q(users.facilitator,"select * from rpc_course_session_create($1,now(),'Local test')",[course]);
  assert.equal(result.rowCount,1);
 });
 async function locked(client) {
  for(let attempt=0;attempt<80;attempt++){
   const row=(await db.query('select wait_event_type from pg_stat_activity where pid=$1',[client.processID])).rows[0];
   if(row?.wait_event_type==='Lock')return;
   await new Promise(resolve=>setTimeout(resolve,25));
  }
  throw new Error('Expected PostgreSQL lock wait did not occur');
 }
 await check('cutover waits for an existing pre-cutover legacy write transaction',async()=>{
  const writer=new pg.Client({...config,database});const cut=new pg.Client({...config,database});
  await writer.connect();await cut.connect();
  try{
   await writer.query('begin');await writer.query('set local role authenticated');
   await writer.query("select set_config('request.jwt.claim.sub',$1,true)",[users.facilitator.auth]);
   await writer.query("select * from rpc_course_session_create($1,now(),'Before cutover')",[course]);
   const update=cut.query('update assessor_flow_cohorts set authority_cutover_at=now(),authority_cutover_by=$2 where id=$1',[cohort,users.root.id]);
   await locked(cut);await writer.query('commit');await update;
  }finally{await writer.query('rollback');await writer.end();await cut.end();}
 });
 await check('UI/global toggles cannot reopen the real legacy session RPC after cutover',async()=>{
  await configure('test-cohort',false);
  await q(users.root,"select rpc_flag_toggle('assessor_flow_ui',false)");
  await assert.rejects(()=>q(users.facilitator,"select * from rpc_course_session_create($1,now(),'Blocked')",[course]),/revised assessor authority required/);
  const policy=(await q(users.facilitator,'select rpc_assessor_flow_policy($1,$2) result',[program,'chapter-1'])).rows[0].result;
  assert.equal(policy.uiEnabled,false);assert.ok(policy.authorityCutoverAt);
 });
 await check('direct legacy mutations cannot move a protected assessment outside the cohort',async()=>{
  await assert.rejects(()=>db.query("update assessments set bhw_user_id=$2 where id=$1",[protectedAssessment,users.outside.id]),/revised assessor authority required/);
  await assert.rejects(()=>db.query("insert into assessments(course_id,bhw_user_id,org_unit_id,status) values($1,$2,$3,'pending')",[course,users.new.id,org.barangay]),/revised assessor authority required/);
 });
 await check('cutover and chapter/course binding cannot be reset',async()=>{
  await assert.rejects(()=>db.query('update assessor_flow_cohorts set authority_cutover_at=null,authority_cutover_by=null where id=$1',[cohort]),/authority cutover is permanent/);
  await assert.rejects(()=>db.query("update training_program_chapters set availability='unavailable',course_id=null where program_id=$1",[program]),/cutover chapter binding is permanent/);
 });
 const second=(await configure('test-cohort-two')).rows[0].result;
 await q(users.root,'select rpc_admin_assessor_flow_cohort_enroll($1,$2,$3)',[second,users.otherFacilitator.id,'local rehearsal']);
 await check('a legacy write waiting behind cutover rechecks the committed boundary',async()=>{
  const writer=new pg.Client({...config,database});const cut=new pg.Client({...config,database});
  await writer.connect();await cut.connect();
  try{
   await cut.query('begin');await cut.query('update assessor_flow_cohorts set authority_cutover_at=now(),authority_cutover_by=$2 where id=$1',[second,users.root.id]);
   const pending=q(users.otherFacilitator,"select * from rpc_course_session_create($1,now(),'Must recheck')",[course],writer).then(result=>({result}),error=>({error}));
   await locked(writer);await cut.query('commit');
   const outcome=await pending;assert.match(outcome.error?.message??'',/revised assessor authority required/);
  }finally{await cut.query('rollback');await writer.end();await cut.end();}
 });
 await check('new API wrappers are invokers; private helpers and tables have the intended ACL/RLS',async()=>{
  const wrappers=(await db.query("select prosecdef from pg_proc where proname in ('rpc_assessor_flow_policy','rpc_admin_assessor_flow_cohort_configure','rpc_admin_assessor_flow_cohort_enroll','rpc_assessor_briefing_state','rpc_assessor_briefing_acknowledge')")).rows;
  assert.equal(wrappers.length,5);assert.ok(wrappers.every(row=>row.prosecdef===false));
  assert.equal((await db.query("select count(*)::int count from pg_class where relname in ('assessor_flow_cohorts','assessor_flow_cohort_members','assessor_briefing_acknowledgements') and relrowsecurity")).rows[0].count,3);
  assert.equal((await db.query("select has_function_privilege('anon','rpc_assessor_flow_policy(uuid,text)','EXECUTE') allowed")).rows[0].allowed,false);
  assert.equal((await db.query("select has_function_privilege('anon','rpc_assessor_briefing_acknowledge(uuid,uuid,text,text,boolean,text)','EXECUTE') allowed")).rows[0].allowed,false);
  assert.equal((await db.query("select has_function_privilege('anon','rpc_assessor_briefing_state(uuid)','EXECUTE') allowed")).rows[0].allowed,false);
  assert.equal((await db.query("select has_function_privilege('authenticated','assessor_rollout_private.assert_legacy_allowed(uuid,uuid[])','EXECUTE') allowed")).rows[0].allowed,false);
 });
 const report={database,postgres:(await db.query('select version()')).rows[0].version,migrations:files.length,
  migration:'20261011120608_assessor_briefing_acknowledgement.sql',rolloutMigration:'20261010145729_assessor_flow_rollout_controls.sql',passed:checks,failures:0,
  supabaseOwnedInfrastructure:'repository fixture; full supabase start remains separately required'};
 if(process.env.PG_TEST_REPORT)await writeFile(process.env.PG_TEST_REPORT,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
} finally {await db.end();}
