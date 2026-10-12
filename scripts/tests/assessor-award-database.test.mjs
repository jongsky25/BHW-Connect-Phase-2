// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import manifest from '../../content/assessor/bhw-reference-manual.v1.json';
import orientation from '../../content/assessor/chapter-1-orientation.v1.json';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const ids={self:uuid(1),other:uuid(2),bhw:uuid(3),inactive:uuid(4),admin:uuid(5),outsideAdmin:uuid(6),city:uuid(21),away:uuid(22),program:uuid(30),chapter:uuid(31),chapter2:uuid(33),course:uuid(32),course2:uuid(34)};
const requirements=manifest.chapters[0].modules.flatMap((m,position)=>m.required_lesson_keys.map(key=>({position,key})));
vi.setConfig({testTimeout:20000});
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
  await db.query('insert into assessor_lesson_progress(assessor_user_id,chapter_id,lesson_id,revision_id) select $1,$2,l.id,l.published_revision_id from course_lessons l join course_modules m on m.id=l.module_id where m.course_id=$3',[ids.self,ids.chapter,ids.course]);
  for(const phase of ['pretest','posttest'])await db.query(`insert into assessor_exam_attempts
    (assessor_user_id,chapter_id,curriculum_version,exam_id,phase,status,question_set_hash,question_count,passing_percent,score_percent,passed,answers,submitted_at)
    values($1,$2,'2026-09-28.1',$3,$4,'submitted','00000000000000000000000000000000',38,$5,$6,$7,'[]',now())`,
    [ids.self,ids.chapter,`chapter-1:${phase}`,phase,phase==='posttest'?80:null,phase==='posttest'?80:0,phase==='posttest']);
}
async function pass(){
  await prerequisites();
  await db.query(`insert into assessor_orientation_lesson_progress(assessor_user_id,chapter_id,curriculum_version,orientation_version,lesson_id) select $1,$2,curriculum_version,orientation_version,l->>'id' from assessor_private.orientation_units,jsonb_array_elements(lessons) l where chapter_key='chapter-1'`,[ids.self,ids.chapter]);
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
  await db.exec(read('supabase/migrations/20260929063731_assessor_chapter2_exams_orientation.sql'));
  await db.exec(`alter table training_program_chapters add unique(program_id,chapter_key);
    create table feature_flags(key text primary key,enabled boolean default false,description text,disabled_roles text[] default '{}');
    create table super_admins(user_id uuid primary key);
    create table super_admin_personas(persona_user_id uuid primary key,super_admin_user_id uuid);
    create function current_super_admin() returns public.users language sql stable security definer set search_path=public as $$select u.* from users u join super_admins s on s.user_id=u.id where u.auth_user_id=auth.uid() and u.status='active'$$;
    create table competency_observations(id uuid primary key,module_id uuid,bhw_user_id uuid,observer_user_id uuid);
    create table assessments(id uuid primary key,course_id uuid,bhw_user_id uuid,assessor_user_id uuid);
    create table certificates(id uuid primary key,course_id uuid,bhw_user_id uuid);
    create table course_sessions(id uuid primary key,course_id uuid,facilitator_user_id uuid);
    create table course_session_enrollments(id uuid primary key,session_id uuid,bhw_user_id uuid);
    create table course_session_deliveries(id uuid primary key,session_id uuid,module_id uuid,recorded_by uuid);
    create table course_session_activities(id uuid primary key,session_id uuid,module_id uuid,recorded_by uuid);`);
  for(const file of ['20261010145729_assessor_flow_rollout_controls.sql','20261011120608_assessor_briefing_acknowledgement.sql',
    '20261012051057_assessor_simulation_runner.sql','20261012064708_assessor_combined_chapter_issuance.sql'])await db.exec(read(`supabase/migrations/${file}`));

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

const checkpointIds=['find-maria','prepare','brief','observe','feedback','missing','readiness','arrange','formal','chapter-gap','final-review'];
const choices=['maria','cards','practice','prompted','private','no-grade','resolve','new-task','bounded','gap','sample'];
const version='chapter-1:c1af.draft-1';
const ensure=()=>call(ids.self,'rpc_assessor_chapter_award_ensure',ids.chapter).then(r=>r.rows[0].result);
const state=()=>call(ids.self,'rpc_assessor_chapter_award_state',ids.chapter).then(r=>r.rows[0].result);
const rows=()=>db.query('select * from assessor_rollout_private.chapter_awards').then(r=>r.rows);
async function configure(cutover=true){
 await db.query(`insert into assessor_flow_cohorts(id,program_id,chapter_key,cohort_key,requirements_version,ui_enabled,awards_enabled,authority_cutover_at,authority_cutover_by)
  values($1,$2,'chapter-1','local-fixture',$3,true,true,$4,$5)`,[uuid(900),ids.program,version,cutover?new Date():null,cutover?ids.admin:null]);
 await db.query("insert into assessor_flow_cohort_members(program_id,chapter_key,user_id,cohort_id) values($1,'chapter-1',$2,$3)",[ids.program,ids.self,uuid(900)]);
 await db.exec("insert into feature_flags(key,enabled) values('elearning',true) on conflict(key) do update set enabled=true; update feature_flags set enabled=true where key in ('assessor_flow_ui','assessor_flow_awards'); update assessor_rollout_private.simulation_control set enabled=true;");
 await call(ids.self,'rpc_assessor_briefing_acknowledge',ids.program,ids.self,version,'chapter-1:briefing.v1',true,'en');
}
async function approve(){
 const decisions=Object.fromEntries(['requirements','mapping','evidence','orientation','simulation','issuer','award'].map(k=>[k,`LOCAL TEST ONLY: ${k}`]));
 await db.query(`insert into assessor_rollout_private.award_contracts values($1,'2026-09-28.1','local-rubric','2026-09-29.1','local-award',
  'chapter-1-maria-communication-storyboard','1.0.0',$2,$3,$4,$5,true,true)`,
 [version,JSON.stringify(checkpointIds),JSON.stringify(Array(11).fill(1)),JSON.stringify(decisions),JSON.stringify({organization:'LOCAL TEST ONLY',signatory:'Fixture',title:'Test issuer'})]);
}
async function act(action,saved){
 const s=saved??(await call(ids.self,'rpc_assessor_simulation_state',ids.program)).rows[0].result;
 return (await call(ids.self,'rpc_assessor_simulation_act',ids.program,ids.self,'1.0.0',version,'chapter-1',
  'chapter-1-maria-communication-storyboard',s.revision,checkpointIds[s.next]??'debrief',1,crypto.randomUUID(),JSON.stringify(action))).rows[0].result;
}
async function simulation(){
 let s=(await call(ids.self,'rpc_assessor_simulation_state',ids.program)).rows[0].result;
 for(let i=0;i<11;i++){
  if(i===1)for(const value of ['guide','learner','return'])s=await act({type:'view',value},s);
  if(i===3)s=await act({type:'evidence',facts:[0,1,2],note:'Fictional observation.'},s);
  s=await act({type:'choice',value:choices[i]},s);
 }
 return act({type:'finish'},s);
}
const snapshot=async()=>{
 const result={};
 for(const table of ['assessor_lesson_progress','assessor_exam_attempts','assessor_orientation_attempts','assessor_chapter_qualifications'])
  result[table]=(await db.query(`select to_jsonb(t) row from ${table} t order by to_jsonb(t)::text`)).rows;
 result.receipts=(await db.query("select state->'receipt' receipt from assessor_rollout_private.simulation_runs order by actor_id,program_id")).rows;
 return result;
};

// Generate the prior-pass fixture once through the unchanged real runner.
// Negative issuance tests reuse that stored receipt; the simulation-last test
// below still executes every checkpoint and the final completion transaction.
let priorRun;
beforeAll(async()=>{
 await db.exec('begin');
 try{await configure(false);await pass();priorRun=await simulation();}
 finally{await db.exec('rollback');}
},30000);
async function recordedSimulation(){
 await db.query('insert into assessor_rollout_private.simulation_runs values($1,$2,$3)',[ids.self,ids.program,JSON.stringify(priorRun)]);
 return act({type:'finish'},priorRun);
}

describe('C1AF-07 transactional combined award',()=>{
 it('seeds no approvals or awards and keeps all production activation controls off',async()=>{
  expect(await rows()).toEqual([]);
  expect((await db.query('select * from assessor_rollout_private.award_contracts')).rows).toEqual([]);
  expect((await db.query("select enabled from feature_flags where key like 'assessor_flow_%'")).rows.every(r=>r.enabled===false)).toBe(true);
  expect((await db.query('select enabled from assessor_rollout_private.simulation_control')).rows).toEqual([{enabled:false}]);
 });
 it('preserves legacy issuance before cutover, including explicit recovery and lifecycle',async()=>{
  await configure(false);await pass();
  const old=(await db.query('select * from assessor_chapter_qualifications')).rows[0];
  expect(old.status).toBe('active');
  expect((await call(ids.self,'rpc_assessor_qualification_ensure',ids.chapter)).rows[0].result).toBe(old.id);
  await recordedSimulation();expect(await rows()).toEqual([]);
  await expect(ensure()).rejects.toThrow('unavailable');
 });
 it('orientation alone cannot award; simulation last issues once with immutable certificate and evidence snapshots',async()=>{
  await configure();await approve();await pass();
  expect(await rows()).toEqual([]);
  expect((await db.query('select * from assessor_chapter_qualifications')).rows).toEqual([]);
  await expect(ensure()).rejects.toThrow('incomplete');
  await expect(call(ids.self,'rpc_assessor_qualification_ensure',ids.chapter)).rejects.toThrow('incomplete');
  const run=await simulation();const before=await snapshot();const [award]=await rows();
  expect(award.simulation_receipt).toEqual(run.receipt);
  expect(award.certificate_id).toMatch(/^[a-f0-9-]{36}$/);
  expect(award.evidence_snapshot.study).toHaveLength(42);
  expect(award.evidence_snapshot.orientationLessons).toHaveLength(6);
  expect(award.contract_snapshot.rubric_version).toBe('local-rubric');
  expect(await ensure()).toBe(award.id);
  expect((await call(ids.self,'rpc_assessor_qualification_ensure',ids.chapter)).rows[0].result).toBe(award.id);
  await act({type:'finish'});
  expect(await rows()).toHaveLength(1);expect(await snapshot()).toEqual(before);
  expect((await state()).awards[0]).toMatchObject({awardId:award.id,currentPermission:false});
  await db.exec('savepoint changed_contract');
  await expect(db.exec(`update assessor_rollout_private.award_contracts set rubric_version='redefined'`)).rejects.toThrow('immutable');
  await db.exec('rollback to changed_contract; release changed_contract');
  await expect(db.exec(`update assessor_rollout_private.chapter_awards set issuer_snapshot='{}'`)).rejects.toThrow('immutable');
 });
 it('recovers prior recorded evidence only explicitly with approved reuse, retaining old IDs and evidence',async()=>{
  await pass();await configure();await approve();await recordedSimulation();
  expect(await rows()).toEqual([]);const before=await snapshot();
  await db.exec('update assessor_rollout_private.award_contracts set allow_prior_evidence=false');
  await expect(ensure()).rejects.toThrow('incomplete');
  await db.exec('update assessor_rollout_private.award_contracts set allow_prior_evidence=true');
  const id=await ensure();expect(await ensure()).toBe(id);
  expect((await rows())[0].legacy_qualification_id).toBe(before.assessor_chapter_qualifications[0].row.id);
  expect(await snapshot()).toEqual(before);
 });
 it('uses the same issuer when compatible orientation completes last',async()=>{
  await configure();await pass();await recordedSimulation();expect(await rows()).toEqual([]);
  // A later reviewed orientation version can reuse the immutable rehearsal only
  // when its explicit contract says so; valid earlier passes are retained.
  await approve();
  await db.exec("update assessor_private.orientation_units set orientation_version='local-next' where chapter_key='chapter-1'; update assessor_rollout_private.award_contracts set orientation_version='local-next';");
  await db.query(`insert into assessor_orientation_lesson_progress(assessor_user_id,chapter_id,curriculum_version,orientation_version,lesson_id) select $1,$2,curriculum_version,orientation_version,l->>'id' from assessor_private.orientation_units,jsonb_array_elements(lessons) l where chapter_key='chapter-1'`,[ids.self,ids.chapter]);
  await actor(ids.self,()=>db.query('select rpc_assessor_orientation_submit($1,$2::jsonb,true)',[ids.chapter,JSON.stringify(answers())]));
  expect(await rows()).toHaveLength(1);
  expect((await rows())[0].evidence_snapshot.orientation.orientation_version).toBe('local-next');
 });
 it.each(['requirements','mapping','evidence','orientation','simulation','issuer','award'])('refuses missing %s approval while retaining valid completion',async key=>{
  await configure();await approve();
  await db.query('update assessor_rollout_private.award_contracts set approvals=approvals-$1',[key]);
  await pass();const run=await recordedSimulation();expect(run.receipt.serverValidated).toBe(true);
  expect(await rows()).toEqual([]);await expect(ensure()).rejects.toThrow('incomplete');
 });
 it.each([{actorId:ids.other},{programInstanceId:uuid(800)},{requirementsVersion:'stale'},{version:'stale'},
  {checkpointIds:[]},{checkpointVersions:[2]},{serverValidated:false},{chapterKey:'chapter-2'},{scenarioId:'foreign'}])('rejects incompatible stored receipt %j',async patch=>{
  await configure();await pass();await recordedSimulation();await approve();
  await db.query("update assessor_rollout_private.simulation_runs set state=jsonb_set(state,'{receipt}',(state->'receipt')||$1::jsonb)",[JSON.stringify(patch)]);
  await expect(ensure()).rejects.toThrow('incomplete');expect(await rows()).toEqual([]);
 });
 it('rechecks gates and current lesson evidence; reads and renderer failures do not write',async()=>{
  await configure();await pass();await recordedSimulation();await approve();
  const before=await snapshot();expect((await state()).awards).toEqual([]);expect(await snapshot()).toEqual(before);
  await db.exec("update feature_flags set enabled=false where key='assessor_flow_awards'");await expect(ensure()).rejects.toThrow();
  await db.exec("update feature_flags set enabled=true,disabled_roles=array['assessor'] where key='assessor_flow_awards'");await expect(ensure()).rejects.toThrow();
  await db.exec("update feature_flags set disabled_roles='{}' where key='assessor_flow_awards'; update assessor_flow_cohorts set awards_enabled=false");await expect(ensure()).rejects.toThrow();
  await db.exec('update assessor_flow_cohorts set awards_enabled=true');
  await db.exec('savepoint stale');await db.exec('delete from assessor_lesson_progress');await expect(ensure()).rejects.toThrow();await db.exec('rollback to stale; release stale');
  const id=await ensure();const earned=await rows();
  // An independent failed output request cannot roll back the committed award.
  await expect(call(ids.self,'no_such_renderer',id)).rejects.toThrow();
  expect(await rows()).toEqual(earned);expect(await snapshot()).toEqual(before);
 });
 it.each(['suspended','revoked'])('never restores %s awards or linked historical qualifications',async status=>{
  await pass();await configure();await approve();await recordedSimulation();const before=await snapshot();
  await db.query('update assessor_chapter_qualifications set status=$1',[status]);
  await expect(ensure()).rejects.toThrow();expect(await rows()).toEqual([]);
  await db.exec("update assessor_chapter_qualifications set status='active'");await ensure();
  await db.query('update assessor_rollout_private.chapter_awards set status=$1,status_changed_at=now()',[status]);
  await expect(ensure()).rejects.toThrow();await act({type:'finish'});
  expect((await rows())[0].status).toBe(status);
  expect((await state()).awards[0]).toMatchObject({status,currentPermission:false});
  expect(await snapshot()).toEqual(before);
 });
 it('denies foreign actors, roles, direct writes, internal helpers and browser-supplied authority',async()=>{
  await configure();await approve();await pass();await recordedSimulation();
  for(const id of [ids.other,ids.bhw,ids.inactive,ids.admin,null])await expect(call(id,'rpc_assessor_chapter_award_ensure',ids.chapter)).rejects.toThrow();
  for(const table of ['chapter_awards','award_contracts'])await expect(actor(ids.self,()=>db.exec(`select * from assessor_rollout_private.${table}`))).rejects.toThrow('permission denied');
  await expect(call(ids.self,'assessor_rollout_private.issue_chapter_award',ids.chapter,true)).rejects.toThrow('permission denied');
  await expect(call(ids.self,'assessor_private.issue_legacy_chapter_qualification',ids.chapter)).rejects.toThrow('permission denied');
  await expect(call(ids.self,'rpc_assessor_chapter_award_ensure',ids.chapter,ids.other,100)).rejects.toThrow();
  expect((await call(ids.other,'rpc_assessor_chapter_award_state',ids.chapter)).rows[0].result.awards).toEqual([]);
  await expect(call(ids.self,'rpc_assessor_chapter_award_ensure',ids.chapter2)).rejects.toThrow('unavailable');
 });
});
