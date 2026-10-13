// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';

const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const v={org:id(1),awayOrg:id(2),assessor:id(3),other:id(4),bhw:id(5),awayBhW:id(6),
  program:id(7),chapter:id(8),course:id(9),module:id(10),lesson:id(11),revision:id(12),
  contract:id(13),cohort:id(14),activity:id(15),session:id(16)};
let db;
async function as(actor,query,args=[]){
  await db.exec('begin');
  try{
    await db.exec(`set local role ${actor?'authenticated':'anon'}`);
    await db.query("select set_config('test.actor',$1,true)",[actor??'']);
    const result=await db.query(query,args);
    await db.exec('commit');
    return result;
  }catch(error){await db.exec('rollback');throw error;}
}
const record=(actor,overrides={})=>{
  const p={request:id(100),bhw:v.bhw,chapter:v.chapter,criterion:'chapter-1:1.6.2:clarify',
    version:'reviewed-v1',sufficiency:'sufficient',rating:'kaya_na',
    facts:'Observed the learner clarify and confirm the corrected concern.',
    prompts:'',privateNotes:'Keep internal coaching note private.',feedback:'Clear confirmation.',
    nextStep:'Continue practice.',release:true,activity:null,prior:null,link:null,...overrides};
  return as(actor,`select rpc_assessor_practice_record($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) id`,
    [p.request,p.bhw,p.chapter,p.criterion,p.version,p.sufficiency,p.rating,p.facts,
      p.prompts,p.privateNotes,p.feedback,p.nextStep,p.release,p.activity,p.prior,p.link]);
};

beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`
    create role authenticated; create role anon;
    create schema assessor_rollout_private;
    grant usage on schema assessor_rollout_private to authenticated;
    create table org_units(id uuid primary key,path text);
    create table users(id uuid primary key,role text,status text,org_unit_id uuid);
    create function current_app_user() returns users language sql stable security definer set search_path=public as $$
      select u from users u where u.id::text=nullif(current_setting('test.actor',true),'') $$;
    create function current_org_path() returns text language sql stable security definer set search_path=public as $$
      select o.path from org_units o join users u on u.org_unit_id=o.id
      where u.id::text=nullif(current_setting('test.actor',true),'') $$;
    create function org_unit_path(p_id uuid) returns text language sql stable security definer set search_path=public as $$
      select path from org_units where id=p_id $$;
    create table super_admin_personas(persona_user_id uuid);
    create table training_programs(id uuid primary key,content_key text,status text);
    create table courses(id uuid primary key,org_unit_id uuid,status text);
    create table training_program_chapters(id uuid primary key,program_id uuid,course_id uuid,
      chapter_key text,availability text);
    create table course_modules(id uuid primary key,course_id uuid);
    create table course_lessons(id uuid primary key,module_id uuid,published_revision_id uuid);
    create table course_lesson_revisions(id uuid primary key,lesson_id uuid,
      unique(id,lesson_id));
    create table course_sessions(id uuid primary key,course_id uuid,facilitator_user_id uuid,status text);
    create table course_session_activities(id uuid primary key,session_id uuid,module_id uuid,
      status text,activity_snapshot jsonb);
    create table course_session_enrollments(session_id uuid,bhw_user_id uuid,status text);
    create table feature_flags(key text,enabled boolean,disabled_roles text[]);
    create table assessor_flow_cohorts(id uuid primary key,program_id uuid,chapter_key text,
      writes_enabled boolean,authority_cutover_at timestamptz);
    create table assessor_flow_cohort_members(cohort_id uuid,user_id uuid);
    create table assessor_rollout_private.award_contracts(requirements_version text primary key,
      rubric_version text,enabled boolean);
    create table assessor_rollout_private.chapter_awards(actor_id uuid,chapter_id uuid,
      requirements_version text,status text);
    create table audit_events(actor_user_id uuid,event_type text,subject_type text,subject_id uuid,
      metadata jsonb,plain_summary_fil text,plain_summary_en text);
  `);
  await db.query('insert into org_units values($1,$2),($3,$4)',[v.org,'city.',v.awayOrg,'elsewhere.']);
  for(const [person,role,org] of [[v.assessor,'assessor',v.org],[v.other,'assessor',v.org],
    [v.bhw,'bhw',v.org],[v.awayBhW,'bhw',v.awayOrg]])
    await db.query('insert into users values($1,$2,$3,$4)',[person,role,'active',org]);
  await db.query("insert into training_programs values($1,'bhw-reference-manual','published')",[v.program]);
  await db.query("insert into courses values($1,$2,'published')",[v.course,v.org]);
  await db.query("insert into training_program_chapters values($1,$2,$3,'chapter-1','available')",
    [v.chapter,v.program,v.course]);
  await db.query('insert into course_modules values($1,$2)',[v.module,v.course]);
  await db.query('insert into course_lessons values($1,$2,$3)',[v.lesson,v.module,v.revision]);
  await db.query('insert into course_lesson_revisions values($1,$2)',[v.revision,v.lesson]);
  await db.query("insert into assessor_rollout_private.award_contracts values('approved-v1','rubric-v1',true)");
  await db.query("insert into assessor_rollout_private.chapter_awards values($1,$2,'approved-v1','active')",
    [v.assessor,v.chapter]);
  await db.query('insert into assessor_flow_cohorts values($1,$2,\'chapter-1\',false,null)',[v.cohort,v.program]);
  await db.query('insert into assessor_flow_cohort_members values($1,$2),($1,$3)',[v.cohort,v.assessor,v.bhw]);
  await db.query("insert into feature_flags values('elearning',true,'{}'),('assessor_flow_writes',false,'{}')");
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261013062524_c1af13_practice_evidence.sql',import.meta.url),'utf8'));
  await db.query(`insert into assessor_rollout_private.practice_criteria
    (chapter_id,lesson_id,lesson_revision_id,criterion_id,criterion_version,requirements_version,
      rubric_version,source_fingerprint,rubric_snapshot,review_reference,approved_by,enabled)
    values($1,$2,$3,'chapter-1:1.6.2:clarify','reviewed-v1','approved-v1','rubric-v1',
      repeat('a',64),'{"fil":"anchor","en":"anchor"}','review-1',$4,true)`,
    [v.chapter,v.lesson,v.revision,v.assessor]);
},30000);
afterAll(async()=>db?.close());

describe('C1AF-13 practice evidence boundary',()=>{
  it('keeps writes closed until rollout controls are explicitly enabled',async()=>{
    await expect(record(v.assessor)).rejects.toThrow(/unavailable/);
    await db.query(`update assessor_flow_cohorts set writes_enabled=true,authority_cutover_at=now() where id=$1`,[v.cohort]);
    await db.query("update feature_flags set enabled=true where key='assessor_flow_writes'");
  });
  it('enforces actor, learner, approved criterion and evidence state',async()=>{
    await expect(record(null)).rejects.toThrow();
    await expect(record(v.other)).rejects.toThrow(/chapter authority/);
    await expect(record(v.assessor,{bhw:v.awayBhW})).rejects.toThrow();
    await expect(record(v.assessor,{criterion:'unknown'})).rejects.toThrow(/criterion unavailable/);
    await expect(record(v.assessor,{sufficiency:'insufficient',rating:'hindi_pa'})).rejects.toThrow(/invalid evidence state/);
    await expect(record(v.assessor,{request:id(103),sufficiency:'not_observed',rating:null,release:false,
      facts:'The practice was interrupted before a skill was observed.'})).resolves.toBeDefined();
    await db.query("update assessor_rollout_private.chapter_awards set status='suspended' where actor_id=$1",[v.assessor]);
    await expect(record(v.assessor,{request:id(110)})).rejects.toThrow(/chapter authority/);
    await db.query("update assessor_rollout_private.chapter_awards set status='active' where actor_id=$1",[v.assessor]);
    await db.query('update assessor_rollout_private.practice_criteria set enabled=false where chapter_id=$1',[v.chapter]);
    await expect(record(v.assessor,{request:id(110)})).rejects.toThrow(/criterion unavailable/);
    await db.query('update assessor_rollout_private.practice_criteria set enabled=true where chapter_id=$1',[v.chapter]);
  });
  it('links only an attended, run activity and copies its snapshot',async()=>{
    await db.query("insert into course_sessions values($1,$2,$3,'scheduled')",[v.session,v.course,v.assessor]);
    await db.query("insert into course_session_activities values($1,$2,$3,'run',$4)",
      [v.activity,v.session,v.module,JSON.stringify({id:'role-play',version:1})]);
    await db.query("insert into course_session_enrollments values($1,$2,'enrolled')",[v.session,v.bhw]);
    await expect(record(v.assessor,{request:id(104),activity:v.activity})).rejects.toThrow(/activity unavailable/);
    await db.query("update course_session_enrollments set status='attended' where session_id=$1",[v.session]);
    const saved=(await record(v.assessor,{request:id(104),activity:v.activity})).rows[0].id;
    await db.query("update course_session_activities set activity_snapshot=$1 where id=$2",
      [JSON.stringify({id:'role-play',version:2}),v.activity]);
    expect((await db.query('select activity_snapshot from assessor_rollout_private.practice_attempts where id=$1',
      [saved])).rows[0].activity_snapshot.version).toBe(1);
  });
  it('preserves retry identity, snapshots, corrections and private feedback',async()=>{
    const first=(await record(v.assessor)).rows[0].id;
    expect((await record(v.assessor)).rows[0].id).toBe(first);
    await expect(record(v.assessor,{facts:'Changed facts for the same request.'})).rejects.toThrow(/request ID reused/);
    await expect(as(v.assessor,'select * from assessor_rollout_private.practice_attempts')).rejects.toThrow();
    await expect(db.query('update assessor_rollout_private.practice_attempts set facts=$1 where id=$2',
      ['Changed facts after save.',first])).rejects.toThrow(/immutable/);
    const correction=(await record(v.assessor,{request:id(101),prior:first,link:'correction',
      sufficiency:'insufficient',rating:null,facts:'The later review found the observation incomplete.',release:false})).rows[0].id;
    expect(correction).not.toBe(first);
    await expect(record(v.assessor,{request:id(102),prior:first,link:'correction'})).rejects.toThrow();
    const staff=(await as(v.assessor,'select rpc_practice_evidence_history($1,1) rows',[v.bhw])).rows[0].rows;
    const learner=(await as(v.bhw,'select rpc_practice_evidence_history($1,1) rows',[v.bhw])).rows[0].rows;
    expect(staff).toHaveLength(4);
    expect(staff[0].privateNotes).toBeDefined();
    expect(learner).toHaveLength(2);
    expect(JSON.stringify(learner)).not.toContain('privateNotes');
    await expect(as(v.other,'select rpc_practice_evidence_history($1,1)',[v.bhw])).resolves.toBeDefined();
    await expect(as(v.bhw,'select rpc_practice_evidence_history($1,1)',[v.awayBhW])).rejects.toThrow();
    expect((await db.query('select count(*)::integer n from audit_events')).rows[0].n).toBe(4);
  });
});
