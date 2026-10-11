// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {CHAPTER1_BRIEFING_VERSION,CHAPTER1_REQUIREMENTS_VERSION} from '../../src/lib/assessor/briefing';
vi.setConfig({testTimeout:20000,hookTimeout:30000});
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const ids={alex:uuid(1),maria:uuid(2),other:uuid(3),admin:uuid(4),super:uuid(5),inactive:uuid(6),persona:uuid(7),program:uuid(20),chapter:uuid(21),course:uuid(22),awayProgram:uuid(23),awayChapter:uuid(24),awayCourse:uuid(25),module:uuid(26),session:uuid(27)};
let db,cohort;
const migration=readFileSync(new URL('../../supabase/migrations/20261010145729_assessor_flow_rollout_controls.sql',import.meta.url),'utf8');
async function actor(id,fn){
 await db.exec('savepoint actor_call');
 await db.exec(`set role ${id?'authenticated':'anon'}`);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??'']);
 try{const result=await fn();await db.exec('reset role; release savepoint actor_call');return result;}
 catch(error){await db.exec('rollback to savepoint actor_call; reset role; release savepoint actor_call');throw error;}
}
const rpc=(id,name,...args)=>actor(id,()=>db.query(`select ${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) as result`,args));
const config=(id=ids.super,ui=false,writes=false,awards=false,version='v1')=>rpc(id,'rpc_admin_assessor_flow_cohort_configure',ids.program,'chapter-1','test-cohort',version,ui,writes,awards,'local test');
const enroll=id=>rpc(ids.super,'rpc_admin_assessor_flow_cohort_enroll',cohort,id,'local test');
const cutover=()=>db.query('update assessor_flow_cohorts set authority_cutover_at=now(),authority_cutover_by=$2 where id=$1',[cohort,ids.super]);
beforeAll(async()=>{
 db=new PGlite();
 await db.exec(readFileSync(new URL('./fixtures/assessor-study-platform.sql',import.meta.url),'utf8'));
 await db.exec(`alter table training_program_chapters add unique(program_id,chapter_key);
 create table feature_flags(key text primary key,enabled boolean default false,description text,disabled_roles text[] default '{}');
 create table audit_events(id uuid primary key default gen_random_uuid(),actor_user_id uuid,event_type text,subject_type text,subject_id uuid,metadata jsonb,plain_summary_fil text,plain_summary_en text);
 create table super_admins(user_id uuid primary key);
 create table super_admin_personas(persona_user_id uuid primary key,super_admin_user_id uuid);
 create function current_app_user() returns public.users language sql stable security definer set search_path=public as $$select u.* from users u where u.auth_user_id=auth.uid()$$;
 create function current_super_admin() returns public.users language sql stable security definer set search_path=public as $$select u.* from users u join super_admins s on s.user_id=u.id where u.auth_user_id=auth.uid() and u.status='active'$$;
 create table competency_observations(id uuid primary key default gen_random_uuid(),module_id uuid,bhw_user_id uuid,observer_user_id uuid,note text);
 create table assessments(id uuid primary key default gen_random_uuid(),course_id uuid,bhw_user_id uuid,assessor_user_id uuid,status text);
 create table certificates(id uuid primary key default gen_random_uuid(),course_id uuid,bhw_user_id uuid,assessment_id uuid);
 create table course_sessions(id uuid primary key,course_id uuid,facilitator_user_id uuid,status text);
 create table course_session_enrollments(id uuid primary key default gen_random_uuid(),session_id uuid,bhw_user_id uuid,status text);
 create table course_session_deliveries(id uuid primary key default gen_random_uuid(),session_id uuid,module_id uuid,recorded_by uuid);
 create table course_session_activities(id uuid primary key default gen_random_uuid(),session_id uuid,module_id uuid,recorded_by uuid);
 create table assessor_chapter_qualifications(id uuid primary key default gen_random_uuid(),chapter_id uuid,assessor_user_id uuid,curriculum_version text,status text,status_changed_at timestamptz);
 grant select on users to authenticated;`);
 await db.exec(migration);
 await db.exec(readFileSync(new URL('../../supabase/migrations/20261011120608_assessor_briefing_acknowledgement.sql',import.meta.url),'utf8'));
 await db.query('insert into org_units values($1,$2)',[uuid(10),'local.']);
 for(const [id,role,status] of [[ids.alex,'assessor','active'],[ids.maria,'bhw','active'],[ids.other,'assessor','active'],[ids.admin,'admin','active'],[ids.super,'admin','active'],[ids.inactive,'assessor','deactivated'],[ids.persona,'assessor','active']]) await db.query('insert into users values($1,$1,$2,$3,$4)',[id,role,status,uuid(10)]);
 await db.query('insert into super_admins values($1)',[ids.super]);
 await db.query('insert into super_admin_personas values($1,$2)',[ids.persona,ids.super]);
 await db.query("insert into training_programs values($1,'bhw-reference-manual','published',$3),($2,'other-program','published',$3)",[ids.program,ids.awayProgram,uuid(10)]);
 await db.query("insert into courses values($1,'published',$3),($2,'published',$3)",[ids.course,ids.awayCourse,uuid(10)]);
 await db.query("insert into training_program_chapters values($1,$3,'chapter-1',$5,'available'),($2,$4,'chapter-1',$6,'available')",[ids.chapter,ids.awayChapter,ids.program,ids.awayProgram,ids.course,ids.awayCourse]);
 await db.query('insert into course_modules values($1,$2)',[ids.module,ids.course]);
 await db.query("insert into course_sessions values($1,$2,$3,'scheduled')",[ids.session,ids.course,ids.other]);
},30000);
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{
 await db.exec('begin');
 cohort=(await config()).rows[0].result;
 await enroll(ids.alex); await enroll(ids.maria);
});
afterEach(async()=>{await db.exec('rollback');});

describe('explicit versioned briefing acknowledgement',()=>{
 const read=(id=ids.alex,program=ids.program)=>rpc(id,'rpc_assessor_briefing_state',program);
 const save=(id=ids.alex,options={})=>rpc(id,'rpc_assessor_briefing_acknowledge',options.program??ids.program,
  options.actor??id,options.requirements??CHAPTER1_REQUIREMENTS_VERSION,options.version??CHAPTER1_BRIEFING_VERSION,
  options.confirmed===undefined?true:options.confirmed,options.language??'en');
 beforeEach(async()=>{
  await config(ids.super,true,false,false,CHAPTER1_REQUIREMENTS_VERSION);
  await db.exec("insert into feature_flags(key,enabled) values('elearning',true) on conflict(key) do update set enabled=true; update feature_flags set enabled=true where key='assessor_flow_ui';");
 });
 it('returns actor-bound current state without creating a receipt or audit event',async()=>{
  const state=(await read()).rows[0].result;
  expect(state).toMatchObject({actorId:ids.alex,programInstanceId:ids.program,chapterKey:'chapter-1',
   requirementsVersion:CHAPTER1_REQUIREMENTS_VERSION,briefingVersion:CHAPTER1_BRIEFING_VERSION,acknowledgedAt:null});
  expect((await db.query('select * from assessor_briefing_acknowledgements')).rows).toEqual([]);
  expect((await db.query("select * from audit_events where event_type='assessor_briefing.acknowledged'")).rows).toEqual([]);
 });
 it('saves once with a server timestamp; retries preserve the receipt and audit once',async()=>{
  const first=(await save()).rows[0].result;
  const second=(await save(ids.alex,{language:'fil'})).rows[0].result;
  expect(first.acknowledgedAt).toBeTruthy(); expect(second).toEqual(first);
  expect((await read()).rows[0].result).toEqual(first);
  expect((await db.query('select language from assessor_briefing_acknowledgements')).rows).toEqual([{language:'en'}]);
  expect((await db.query("select actor_user_id from audit_events where event_type='assessor_briefing.acknowledged'")).rows).toEqual([{actor_user_id:ids.alex}]);
 });
 it.each([null,ids.admin,ids.super,ids.maria,ids.persona,ids.inactive,ids.other])('denies non-candidate or non-member identity %s',async id=>{
  await expect(read(id)).rejects.toThrow();await expect(save(id)).rejects.toThrow();
  expect((await db.query('select * from assessor_briefing_acknowledgements')).rows).toEqual([]);
 });
 it.each(['elearning','assessor_flow_ui'])('rechecks master and role controls for %s',async key=>{
  await db.query('update feature_flags set enabled=false where key=$1',[key]);
  await expect(save()).rejects.toThrow('briefing unavailable');
  await db.query("update feature_flags set enabled=true,disabled_roles=array['assessor'] where key=$1",[key]);
  await expect(read()).rejects.toThrow('briefing unavailable');await expect(save()).rejects.toThrow('briefing unavailable');
 });
 it('rechecks cohort enablement and requirements version',async()=>{
  await config(ids.super,false,false,false,CHAPTER1_REQUIREMENTS_VERSION);await expect(save()).rejects.toThrow('briefing unavailable');
  await config(ids.super,true,false,false,'old-version');await expect(save()).rejects.toThrow('briefing unavailable');
 });
 it.each([
  {confirmed:false},{confirmed:null},{language:'invalid'},{version:'old-version'},
  {requirements:'other-version'},{actor:ids.other},{program:ids.awayProgram},
 ])('rejects missing consent, stale versions, switched actors or foreign scope %#',async options=>{
  await expect(save(ids.alex,options)).rejects.toThrow();
  expect((await db.query('select * from assessor_briefing_acknowledgements')).rows).toEqual([]);
 });
 it.each(["update training_programs set status='draft'", "update courses set status='draft'", "update training_program_chapters set availability='unavailable'"])
  ('does not acknowledge unavailable publication: %s',async sql=>{
   await db.exec(sql);await expect(save()).rejects.toThrow('briefing unavailable');
  });
 it('ignores historical versions and isolates receipts between assessors',async()=>{
  await db.query("insert into assessor_briefing_acknowledgements values($1,$2,'chapter-1',$3,'historical','fil',now())",[ids.alex,ids.program,CHAPTER1_REQUIREMENTS_VERSION]);
  expect((await read()).rows[0].result.acknowledgedAt).toBeNull();
  await save();await enroll(ids.other);
  expect((await read(ids.other)).rows[0].result.acknowledgedAt).toBeNull();
  await save(ids.other);
  expect((await db.query('select distinct assessor_user_id from assessor_briefing_acknowledgements')).rows).toHaveLength(2);
 });
 it.each(['select * from assessor_briefing_acknowledgements','delete from assessor_briefing_acknowledgements',
  "update assessor_briefing_acknowledgements set briefing_version='forged'"])
  ('denies direct receipt access: %s',async sql=>{
   await save();await expect(actor(ids.alex,()=>db.exec(sql))).rejects.toThrow('permission denied');
  });
});

describe('persisted cohort controls and RPC boundaries',()=>{
 it('seeds only three off switches; no automatic cohort enrollment',async()=>{
  expect((await db.query('select enabled from feature_flags order by key')).rows).toEqual([{enabled:false},{enabled:false},{enabled:false}]);
  expect((await rpc(ids.other,'rpc_assessor_flow_policy',ids.program,'chapter-1')).rows[0].result).toBeNull();
  expect((await rpc(ids.alex,'rpc_assessor_flow_policy',ids.program,'chapter-1')).rows[0].result).toMatchObject({actorId:ids.alex,uiEnabled:false,writesEnabled:false,awardsEnabled:false,authorityCutoverAt:null});
 });
 it.each([ids.alex,ids.maria,ids.admin,ids.inactive,ids.persona,null])('denies non-super-admin configuration %s',async id=>{
  await expect(config(id,true,true,true)).rejects.toThrow(/not authorized|permission denied/);
 });
 it.each([ids.admin,ids.super,ids.maria,ids.inactive,ids.persona,null])('denies admin, BHW, inactive and persona policy reads %s',async id=>{
  await expect(rpc(id,'rpc_assessor_flow_policy',ids.program,'chapter-1')).rejects.toThrow(/not authorized|permission denied/);
 });
 it('does not read another program/chapter or infer membership from role',async()=>{
  expect((await rpc(ids.alex,'rpc_assessor_flow_policy',ids.awayProgram,'chapter-1')).rows[0].result).toBeNull();
  expect((await rpc(ids.alex,'rpc_assessor_flow_policy',ids.program,'chapter-2')).rows[0].result).toBeNull();
 });
 it('allows only explicit scoped super-admin controls and audits configuration',async()=>{
  await config(ids.super,true,false,true);
  expect((await rpc(ids.alex,'rpc_assessor_flow_policy',ids.program,'chapter-1')).rows[0].result).toMatchObject({uiEnabled:true,writesEnabled:false,awardsEnabled:true,authorityCutoverAt:null});
  expect((await db.query("select count(*)::int as count from audit_events where event_type='assessor_flow.configured'")).rows[0].count).toBe(2);
  await expect(rpc(ids.super,'rpc_admin_assessor_flow_cohort_configure',ids.awayProgram,'chapter-1','test','v1',true,true,true,'test')).rejects.toThrow('program chapter unavailable');
 });
 it('rejects duplicate enrollment into another cohort and inactive members',async()=>{
  const other=(await rpc(ids.super,'rpc_admin_assessor_flow_cohort_configure',ids.program,'chapter-1','other','v1',false,false,false,'test')).rows[0].result;
  await expect(rpc(ids.super,'rpc_admin_assessor_flow_cohort_enroll',other,ids.alex,'test')).rejects.toThrow('member already assigned');
  await expect(enroll(ids.inactive)).rejects.toThrow('active assessor or BHW required');
 });
 it('denies direct table writes, reads and private guard invocation',async()=>{
  await expect(actor(ids.super,()=>db.query('update assessor_flow_cohorts set authority_cutover_at=now() where id=$1',[cohort]))).rejects.toThrow('permission denied');
  await expect(actor(ids.alex,()=>db.query('select * from assessor_flow_cohort_members'))).rejects.toThrow('permission denied');
  await expect(actor(ids.alex,()=>db.query('select assessor_rollout_private.assert_legacy_allowed($1,$2::uuid[])',[ids.course,[ids.alex]]))).rejects.toThrow('permission denied');
 });
 it('hiding UI or all controls preserves cutover and blocks version reset/deletion',async()=>{
  await cutover(); await config(ids.super,false,false,false);
  const policy=(await rpc(ids.alex,'rpc_assessor_flow_policy',ids.program,'chapter-1')).rows[0].result;
  expect(policy).toMatchObject({uiEnabled:false,writesEnabled:false,awardsEnabled:false}); expect(policy.authorityCutoverAt).toBeTruthy();
  for(const sql of ['update assessor_flow_cohorts set authority_cutover_at=null,authority_cutover_by=null where id=$1','delete from assessor_flow_cohorts where id=$1',"update assessor_flow_cohorts set requirements_version='other' where id=$1"]){
   await db.exec('savepoint rejected'); await expect(db.query(sql,[cohort])).rejects.toThrow('authority cutover is permanent'); await db.exec('rollback to savepoint rejected');
  }
 });
 it('prevents removing or moving cohort membership after cutover',async()=>{
  await cutover(); await db.exec('savepoint rejected');
  await expect(db.query('delete from assessor_flow_cohort_members where user_id=$1',[ids.alex])).rejects.toThrow('cutover membership cannot be removed');
  await db.exec('rollback to savepoint rejected');
 });
 it('prevents remapping the delivery course after cutover',async()=>{
  await cutover();
  await expect(db.query('update training_program_chapters set course_id=$2 where id=$1',[ids.chapter,ids.awayCourse])).rejects.toThrow('cutover chapter binding is permanent');
 });
});

describe('legacy mutation backstop',()=>{
 const writes=[
  ['observations','insert into competency_observations(module_id,bhw_user_id,observer_user_id) values($1,$2,$3)',()=>[ids.module,ids.maria,ids.other]],
  ['assessments',"insert into assessments(course_id,bhw_user_id,assessor_user_id,status) values($1,$2,$3,'pending')",()=>[ids.course,ids.maria,ids.other]],
  ['BHW certificates','insert into certificates(course_id,bhw_user_id) values($1,$2)',()=>[ids.course,ids.maria]],
  ['sessions',"insert into course_sessions values($1,$2,$3,'scheduled')",()=>[uuid(200),ids.course,ids.alex]],
  ['attendance',"insert into course_session_enrollments(session_id,bhw_user_id,status) values($1,$2,'attended')",()=>[ids.session,ids.maria]],
  ['delivery','insert into course_session_deliveries(session_id,module_id,recorded_by) values($1,$2,$3)',()=>[ids.session,ids.module,ids.alex]],
  ['activities','insert into course_session_activities(session_id,module_id,recorded_by) values($1,$2,$3)',()=>[ids.session,ids.module,ids.alex]],
  ['staff qualifications',"insert into assessor_chapter_qualifications(chapter_id,assessor_user_id,curriculum_version,status) values($1,$2,'v1','active')",()=>[ids.chapter,ids.alex]],
 ];
 it.each(writes)('preserves pre-cutover %s behavior even while new switches are off',async(_,sql,args)=>{
  await expect(db.query(sql,args())).resolves.toBeDefined();
 });
 it.each(writes)('blocks cutover %s with all UI/write/award switches off',async(_,sql,args)=>{
  await cutover(); await expect(db.query(sql,args())).rejects.toThrow('revised assessor authority required');
 });
 it('blocks changes to old protected evidence even if moved to an unrelated course',async()=>{
  const id=(await db.query("insert into assessments(course_id,bhw_user_id,assessor_user_id,status) values($1,$2,$3,'pending') returning id",[ids.course,ids.maria,ids.other])).rows[0].id;
  await cutover(); await expect(db.query("update assessments set course_id=$2,bhw_user_id=$3 where id=$1",[id,ids.awayCourse,ids.other])).rejects.toThrow('revised assessor authority required');
 });
 it('keeps unrelated programs and non-enrolled legacy actors unaffected',async()=>{
  await cutover();
  await expect(db.query("insert into assessments(course_id,bhw_user_id,assessor_user_id,status) values($1,$2,$3,'pending')",[ids.awayCourse,ids.maria,ids.alex])).resolves.toBeDefined();
  await expect(db.query("insert into course_sessions values($1,$2,$3,'scheduled')",[uuid(200),ids.course,ids.other])).resolves.toBeDefined();
 });
 it('guards the new course binding when moving a session into the cutover chapter',async()=>{
  const id=uuid(201);
  await db.query("insert into course_sessions values($1,$2,$3,'scheduled')",[id,ids.awayCourse,ids.alex]);
  await cutover();
  await expect(db.query('update course_sessions set course_id=$2 where id=$1',[id,ids.course])).rejects.toThrow('revised assessor authority required');
 });
 it('protects pre-existing sessions with cutover learners even if facilitator is outside the cohort',async()=>{
  await db.query("insert into course_session_enrollments(session_id,bhw_user_id,status) values($1,$2,'enrolled')",[ids.session,ids.maria]);
  await cutover(); await expect(db.query("update course_sessions set status='completed' where id=$1",[ids.session])).rejects.toThrow('revised assessor authority required');
 });
 it('preserves historical qualification lifecycle while rejecting new legacy awards',async()=>{
  const id=(await db.query("insert into assessor_chapter_qualifications(chapter_id,assessor_user_id,curriculum_version,status) values($1,$2,'v1','active') returning id",[ids.chapter,ids.alex])).rows[0].id;
  await cutover(); await expect(db.query("update assessor_chapter_qualifications set status='suspended',status_changed_at=now() where id=$1",[id])).resolves.toBeDefined();
 });
});
