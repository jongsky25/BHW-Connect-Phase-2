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
 await db.exec(`create function public.rpc_assessor_orientation_state(uuid) returns jsonb language sql stable as $$select coalesce(current_setting('test.orientation',true),'{}')::jsonb$$;`);
 await db.exec(readFileSync(new URL('../../supabase/migrations/20261012051057_assessor_simulation_runner.sql',import.meta.url),'utf8'));
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


const checkpointIds=['find-maria','prepare','brief','observe','feedback','missing','readiness','arrange','formal','chapter-gap','final-review'];
const answers=['maria','cards','practice','prompted','private','no-grade','resolve','new-task','bounded','gap','sample'];
const read=(id=ids.alex,program=ids.program)=>rpc(id,'rpc_assessor_simulation_state',program).then(r=>r.rows[0].result);
async function act(action,options={}) {
 const state=options.state??await read();
 return (await rpc(options.actor??ids.alex,'rpc_assessor_simulation_act',options.program??ids.program,options.expectedActor??ids.alex,
 options.version??'1.0.0',options.requirements??CHAPTER1_REQUIREMENTS_VERSION,options.chapter??'chapter-1',
 options.scenario??'chapter-1-maria-communication-storyboard',options.revision??state.revision,
 options.checkpoint??checkpointIds[state.next]??'debrief',options.checkpointVersion??1,options.request??crypto.randomUUID(),action)).rows[0].result;
}
async function finishCheckpoints(){
 for(let i=0;i<11;i++){
  if(i===1)for(const value of ['guide','learner','return'])await act({type:'view',value});
  if(i===3)await act({type:'evidence',facts:[0,1,2],note:'Fictional observation after prompt.'});
  await act({type:'choice',value:answers[i]});
 }
}
describe('isolated simulation server boundary',()=>{
 beforeEach(async()=>{
  await config(ids.super,true,false,false,CHAPTER1_REQUIREMENTS_VERSION);
  await db.exec("insert into feature_flags(key,enabled) values('elearning',true) on conflict(key) do update set enabled=true; update feature_flags set enabled=true where key='assessor_flow_ui'; update assessor_rollout_private.simulation_control set enabled=true;");
  await rpc(ids.alex,'rpc_assessor_briefing_acknowledge',ids.program,ids.alex,CHAPTER1_REQUIREMENTS_VERSION,CHAPTER1_BRIEFING_VERSION,true,'en');
  await db.query("select set_config('test.orientation',$1,false)",[JSON.stringify({ready:true,passed:true})]);
 });
 it('read is write-free and cannot access private storage directly',async()=>{
  expect(await read()).toMatchObject({next:0,receipt:null,revision:0});
  expect((await db.query('select * from assessor_rollout_private.simulation_runs')).rows).toEqual([]);
  await expect(actor(ids.alex,()=>db.exec('select * from assessor_rollout_private.simulation_runs'))).rejects.toThrow();
  await act({type:'choice',value:'maria'});
  await enroll(ids.other);
  await rpc(ids.other,'rpc_assessor_briefing_acknowledge',ids.program,ids.other,CHAPTER1_REQUIREMENTS_VERSION,CHAPTER1_BRIEFING_VERSION,true,'en');
  expect(await read(ids.other)).toMatchObject({actorId:ids.other,next:0,receipt:null});
  await expect(act({type:'choice',value:'cards'},{actor:ids.other})).rejects.toThrow('simulation identity changed');
 });
 it.each([null,ids.admin,ids.super,ids.maria,ids.persona,ids.inactive,ids.other])('rejects foreign and noncandidate actor %s',async id=>{await expect(read(id)).rejects.toThrow();const state=await read();await expect(rpc(id,'rpc_assessor_simulation_act',ids.program,ids.alex,'1.0.0',CHAPTER1_REQUIREMENTS_VERSION,'chapter-1','chapter-1-maria-communication-storyboard',state.revision,'find-maria',1,crypto.randomUUID(),{type:'choice',value:'maria'})).rejects.toThrow();});
 it.each([{expectedActor:ids.other},{program:ids.awayProgram},{version:'old'},{requirements:'old'},{chapter:'chapter-2'},{scenario:'foreign'},{checkpoint:'formal'},{checkpointVersion:2}])('rejects identity/order mismatch %j',async options=>{await expect(act({type:'choice',value:'maria'},options)).rejects.toThrow();});
 it('rechecks default-off control, cohort, flags and prerequisites',async()=>{
  const allowed=await read();
  await db.exec('update assessor_rollout_private.simulation_control set enabled=false');await expect(read()).rejects.toThrow();
  await expect(act({type:'choice',value:'maria'},{state:allowed})).rejects.toThrow();
  await db.exec('update assessor_rollout_private.simulation_control set enabled=true');
  for(const value of [{ready:false,passed:true},{ready:true,passed:false},{}]){
   await db.query("select set_config('test.orientation',$1,false)",[JSON.stringify(value)]);await expect(read()).rejects.toThrow();
  }
  await db.query("select set_config('test.orientation',$1,false)",[JSON.stringify({ready:true,passed:true})]);
  await config(ids.super,false,false,false,CHAPTER1_REQUIREMENTS_VERSION);await expect(read()).rejects.toThrow();
  await config(ids.super,true,false,false,CHAPTER1_REQUIREMENTS_VERSION);
  await db.exec("update feature_flags set disabled_roles=array['assessor'] where key='assessor_flow_ui'");await expect(read()).rejects.toThrow();
 });
 it('rejects completion forgery, missing actions, skipped views, duplicate facts and blank/oversized notes',async()=>{
  await expect(act({type:'finish'})).rejects.toThrow();
  await expect(act({type:'choice',value:'maria',completed:true})).rejects.toThrow();
  await act({type:'choice',value:'maria'});
  await expect(act({type:'choice',value:'cards'})).rejects.toThrow();
  await expect(act({type:'view',value:'return'})).rejects.toThrow();
  for(const value of ['guide','learner','return'])await act({type:'view',value});
  await act({type:'choice',value:'cards'});await act({type:'choice',value:'practice'});
  await expect(act({type:'choice',value:'prompted'})).rejects.toThrow();
  for(const evidence of [{facts:[0,0,2],note:'x'},{facts:[0,1,3],note:'x'},{facts:[0,1,2],note:'x'.repeat(1201)}])await expect(act({type:'evidence',...evidence})).rejects.toThrow();
  await act({type:'evidence',facts:[0,1,2],note:'  '});await expect(act({type:'choice',value:'prompted'})).rejects.toThrow();
 });
 it('recovers ambiguous saves without duplicates and rejects reused request IDs and stale tabs',async()=>{
  const state=await read(),request=crypto.randomUUID();
  const saved=await act({type:'choice',value:'rosa'},{state,request});
  expect(await act({type:'choice',value:'rosa'},{state,request})).toEqual(saved);
  expect(await read()).toEqual(saved);
  await expect(act({type:'choice',value:'maria'},{state,request})).rejects.toThrow();
  await expect(act({type:'choice',value:'maria'},{state})).rejects.toThrow();
  expect(saved.attempts['find-maria']).toEqual(['rosa']);
 });
 it('keeps corrections, pauses at first unfinished checkpoint, issues once and retains receipt on replay',async()=>{
  for(let i=0;i<12;i++)await act({type:'choice',value:'rosa'});
  await finishCheckpoints();const before=await read();expect(before.next).toBe(11);expect(before.receipt).toBeNull();
  const first=await act({type:'finish'});expect(first.receipt).toMatchObject({actorId:ids.alex,programInstanceId:ids.program,serverValidated:true,version:'1.0.0',checkpointIds});
  expect((await act({type:'finish'},{state:before})).receipt).toEqual(first.receipt);
  const replay=await act({type:'replay'});expect(replay.next).toBe(0);expect(replay.receipt).toEqual(first.receipt);
  expect(replay.attempts['find-maria']).toEqual([...Array(12).fill('rosa'),'maria']);
  await finishCheckpoints();expect((await act({type:'finish'})).receipt).toEqual(first.receipt);
  expect((await db.query('select * from assessor_chapter_qualifications')).rows).toEqual([]);
  expect((await db.query('select * from competency_observations')).rows).toEqual([]);
  expect((await db.query('select * from certificates')).rows).toEqual([]);
  expect((await db.query('select writes_enabled,awards_enabled,authority_cutover_at from assessor_flow_cohorts')).rows[0]).toEqual({writes_enabled:false,awards_enabled:false,authority_cutover_at:null});
 });
});
