// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {registryPackage,buildRegistryMigration} from '../c1af27-registry.mjs';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const p=registryPackage();let db;
const table=(file,name)=>readFileSync('supabase/migrations/'+file,'utf8').match(new RegExp('create table '+name.replaceAll('.','\\.')+' \\([\\s\\S]*?\\n\\);'))[0];
beforeAll(async()=>{
 db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema assessor_rollout_private;
 create table public.users(id uuid primary key);create table public.training_programs(id uuid primary key,content_key text,status text);
 create table public.courses(id uuid primary key,status text);
 create table public.training_program_chapters(id uuid primary key,program_id uuid,course_id uuid,chapter_key text,availability text);
 create table public.course_modules(id uuid primary key,course_id uuid);
 create table public.course_lessons(id uuid primary key,module_id uuid,lesson_key text,required boolean,published_revision_id uuid);
 create table public.course_lesson_revisions(id uuid primary key,lesson_id uuid references public.course_lessons,content_hash text,unique(id,lesson_id));
 create table public.assessor_flow_cohorts(id uuid primary key,program_id uuid,writes_enabled boolean,awards_enabled boolean,authority_cutover_at timestamptz);
 create table public.assessor_flow_cohort_members(cohort_id uuid,user_id uuid);
 create table assessor_rollout_private.chapter_awards(actor_id uuid,program_id uuid);
 create table assessor_rollout_private.simulation_runs(actor_id uuid,program_id uuid,state jsonb);
 create table assessor_rollout_private.simulation_requests(actor_id uuid,program_id uuid,request_id uuid,payload jsonb);
 create table public.assessor_chapter_qualifications(id uuid,status text);
 create table public.assessor_briefing_acknowledgements(assessor_user_id uuid,program_id uuid,chapter_key text,requirements_version text,briefing_version text,acknowledged_at timestamptz);
 create table public.feature_flags(key text,enabled boolean,disabled_roles text[]);
 insert into public.feature_flags values('elearning',true,'{}'),('assessor_flow_ui',true,'{}');
 create table assessor_rollout_private.simulation_control(enabled boolean);
 insert into assessor_rollout_private.simulation_control values(true);
 create function assessor_rollout_private.policy(uuid,text) returns jsonb language sql as $f$
 select jsonb_build_object('actorId','${id(500)}','uiEnabled',true,'requirementsVersion',coalesce(current_setting('test.version',true),'chapter-1:c1af.draft-1')) $f$;
 create function public.rpc_assessor_orientation_state(uuid) returns jsonb language sql as $f$ select '{"ready":true,"passed":true}'::jsonb $f$;
 `);
 await db.exec(table('20261012064708_assessor_combined_chapter_issuance.sql','assessor_rollout_private.award_contracts'));
 await db.exec(table('20261013062524_c1af13_practice_evidence.sql','assessor_rollout_private.practice_criteria'));
 for(const name of ['component_requirements','component_required_lessons','component_required_criteria'])await db.exec(table('20261014002817_c1af16_component_readiness.sql','assessor_rollout_private.'+name));
 await db.exec(`alter table assessor_rollout_private.component_requirements add purpose_fil text,add purpose_en text;
 alter table assessor_rollout_private.component_required_criteria add description_fil text,add description_en text;`);
 await db.exec(buildRegistryMigration());
 await db.query('insert into public.training_programs values($1,$2,$3)',[id(1),'bhw-reference-manual','published']);
 await db.query('insert into public.courses values($1,$2)',[id(2),'published']);
 await db.query('insert into public.training_program_chapters values($1,$2,$3,$4,$5)',[id(3),id(1),id(2),'chapter-1','available']);
 const modules=[...new Set(p.lessons.map(l=>l.module_key))];
 for(let i=0;i<modules.length;i++)await db.query('insert into public.course_modules values($1,$2)',[id(10+i),id(2)]);
 for(let i=0;i<p.lessons.length;i++){
  const l=p.lessons[i];await db.query('insert into public.course_lessons values($1,$2,$3,true,$4)',[id(100+i),id(10+modules.indexOf(l.module_key)),l.lesson_key,id(200+i)]);
  await db.query('insert into public.course_lesson_revisions values($1,$2,$3)',[id(200+i),id(100+i),l.content_hash]);
 }
});
afterAll(async()=>{await db?.close();});
describe('C1AF-27 disabled registry installer',()=>{
 it('is generated from the current approved source and published hashes',()=>{
  expect(readFileSync('supabase/migrations/20261015143503_c1af27_disabled_chapter1_registry.sql','utf8')).toBe(buildRegistryMigration());
 });
 it('rejects publication drift atomically',async()=>{
  await db.query('update public.course_lesson_revisions set content_hash=$1 where id=$2',['drift',id(200)]);
  await expect(db.query('select assessor_rollout_private.install_chapter1_policy($1)',[id(3)])).rejects.toThrow('published revision changed');
  expect((await db.query('select count(*) n from assessor_rollout_private.award_contracts')).rows[0].n).toBe(0);
  await db.query('update public.course_lesson_revisions set content_hash=$1 where id=$2',[p.lessons[0].content_hash,id(200)]);
 });
 it('installs exactly 42 criteria and nine components, all disabled, without impersonating an app user',async()=>{
  const firstModule=(await db.query('select module_id from public.course_lessons where id=$1',[id(100)])).rows[0].module_id;
  await db.query('update public.course_lessons set module_id=$1 where id=$2',[id(11),id(101)]);
  await expect(db.query('select assessor_rollout_private.install_chapter1_policy($1)',[id(3)])).rejects.toThrow('component membership changed');
  expect((await db.query('select count(*) n from assessor_rollout_private.award_contracts')).rows[0].n).toBe(0);
  await db.query('update public.course_lessons set module_id=$1 where id=$2',[firstModule,id(101)]);
  await db.query('select assessor_rollout_private.install_chapter1_policy($1)',[id(3)]);
  for(const [name,total] of [['practice_criteria',42],['component_requirements',9],['award_contracts',1]]){
   const r=(await db.query(`select count(*) n,count(*) filter(where enabled) active from assessor_rollout_private.${name}`)).rows[0];
   expect(r).toEqual({n:total,active:0});
  }
  expect((await db.query('select count(*) n from assessor_rollout_private.practice_criteria where approved_by is null and owner_decision_id is not null')).rows[0].n).toBe(42);
  expect((await db.query('select issuer_snapshot from assessor_rollout_private.award_contracts')).rows[0].issuer_snapshot).toEqual(p.issuer);
  await expect(db.query('select assessor_rollout_private.install_chapter1_policy($1)',[id(3)])).rejects.toThrow('already installed');
  await db.exec('set role authenticated');
  await expect(db.query('select assessor_rollout_private.install_chapter1_policy($1)',[id(3)])).rejects.toThrow('permission denied');
  await db.exec('reset role');
 });
 it('preserves draft simulation requests in an immutable archive and leaves legacy qualifications intact',async()=>{
  await db.query('insert into public.users values($1)',[id(500)]);
  await db.query('insert into public.assessor_chapter_qualifications values($1,$2)',[id(600),'active']);
  const s={requirementsVersion:'chapter-1:c1af.draft-1',receipt:{id:'old-receipt'}};
  await db.query('insert into assessor_rollout_private.simulation_runs values($1,$2,$3)',[id(500),id(1),s]);
  await db.query('insert into assessor_rollout_private.simulation_requests values($1,$2,$3,$4)',[id(500),id(1),id(501),{choice:'sample'}]);
  await db.query('insert into assessor_rollout_private.chapter_awards values($1,$2)',[id(500),id(1)]);
  await expect(db.query('select assessor_rollout_private.archive_preparation_simulation($1,$2)',[id(500),id(1)])).rejects.toThrow('earned simulation cannot be archived');
  await db.exec('delete from assessor_rollout_private.chapter_awards');
  await db.query('select assessor_rollout_private.archive_preparation_simulation($1,$2)',[id(500),id(1)]);
  const archive=(await db.query('select state,requests from assessor_rollout_private.preparation_simulation_archive')).rows[0];
  expect(archive.state).toEqual(s);expect(archive.requests).toHaveLength(1);
  expect((await db.query('select status from public.assessor_chapter_qualifications')).rows[0].status).toBe('active');
  await expect(db.exec('delete from assessor_rollout_private.preparation_simulation_archive')).rejects.toThrow('immutable');
 });
 it('requires fresh pilot acknowledgement and creates a simulation bound to that version',async()=>{
  await db.query('insert into public.assessor_briefing_acknowledgements values($1,$2,$3,$4,$5,now())',
   [id(500),id(1),'chapter-1','chapter-1:c1af.draft-1','chapter-1:briefing.v1']);
  await db.query("select set_config('test.version',$1,false)",[p.requirements_version]);
  let state=(await db.query('select assessor_rollout_private.briefing_state($1) state',[id(1)])).rows[0].state;
  expect(state.requirementsVersion).toBe(p.requirements_version);expect(state.acknowledgedAt).toBeNull();
  await db.query('insert into public.assessor_briefing_acknowledgements values($1,$2,$3,$4,$5,now())',
   [id(500),id(1),'chapter-1',p.requirements_version,'chapter-1:briefing.v1']);
  state=(await db.query('select assessor_rollout_private.simulation_state($1) state',[id(1)])).rows[0].state;
  expect(state.requirementsVersion).toBe(p.requirements_version);expect(state.receipt).toBeNull();
  expect((await db.query('select count(*) n from public.assessor_briefing_acknowledgements')).rows[0].n).toBe(2);
 });
});
