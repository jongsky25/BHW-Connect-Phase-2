// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';

const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const v={org:id(1),awayOrg:id(2),alex:id(3),other:id(4),maria:id(5),away:id(6),
  program:id(7),chapter:id(8),course:id(9),module:id(10),otherModule:id(11),
  lesson:id(12),revision:id(13),newRevision:id(14),cohort:id(15),progress:id(16),
  release:'reviewed-v1',attempt:id(17),assignment:id(18)};
let db;
async function as(actor,sql,args=[]){
  await db.exec('begin');
  try{
    await db.exec(`set local role ${actor?'authenticated':'anon'}`);
    await db.query("select set_config('test.actor',$1,true)",[actor??'']);
    const rows=(await db.query(sql,args)).rows;
    await db.exec('commit');return rows[0]?.result;
  }catch(error){await db.exec('rollback');throw error;}
}
const readiness=(actor=v.alex,learner=v.maria)=>as(actor,
  'select rpc_assessor_component_readiness($1,$2) result',[v.program,learner]);
const item=async(actor=v.alex)=>((await readiness(actor))[0]);

beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`
    create role authenticated; create role anon;
    create schema assessor_rollout_private; create schema learner_assessment_private;
    grant usage on schema assessor_rollout_private to authenticated;
    create table org_units(id uuid primary key,path text);
    create table users(id uuid primary key,role text,status text,org_unit_id uuid,full_name text);
    create function current_app_user() returns users language sql stable security definer set search_path=public as $$
      select u from users u where u.id::text=nullif(current_setting('test.actor',true),'') $$;
    create function org_unit_path(p_id uuid) returns text language sql stable security definer set search_path=public as $$
      select path from org_units where id=p_id $$;
    create table super_admin_personas(persona_user_id uuid);
    create table feature_flags(key text,enabled boolean,disabled_roles text[]);
    create table training_programs(id uuid primary key,content_key text,status text);
    create table courses(id uuid primary key,status text);
    create table training_program_chapters(id uuid primary key,program_id uuid,chapter_key text,availability text,course_id uuid);
    create table course_modules(id uuid primary key,course_id uuid,position int,title_fil text,title_en text);
    create table course_lessons(id uuid primary key,module_id uuid,published_revision_id uuid);
    create table course_progress(id uuid primary key,course_id uuid,bhw_user_id uuid);
    create table course_lesson_progress(course_progress_id uuid,lesson_id uuid,revision_id uuid);
    create table assessor_flow_cohorts(id uuid primary key,program_id uuid,chapter_key text,
      requirements_version text,ui_enabled boolean,writes_enabled boolean,authority_cutover_at timestamptz);
    create table assessor_flow_cohort_members(cohort_id uuid,user_id uuid);
    create table assessor_rollout_private.award_contracts(requirements_version text primary key,
      rubric_version text,enabled boolean);
    create table assessor_rollout_private.chapter_awards(actor_id uuid,chapter_id uuid,
      requirements_version text,status text);
    create table assessor_rollout_private.practice_criteria(chapter_id uuid,criterion_id text,
      criterion_version text,lesson_id uuid,lesson_revision_id uuid,requirements_version text,
      rubric_version text,enabled boolean,primary key(chapter_id,criterion_id,criterion_version));
    create table learner_assessment_private.releases(id text primary key,status text,
      comparability_status text,program_key text,chapter_key text);
    create table learner_assessment_private.enrollments(learner_id uuid,course_id uuid,release_id text);
    create table learner_assessment_private.attempts(learner_id uuid,course_id uuid,release_id text,
      phase text,state text);
  `);
  await db.query('insert into org_units values($1,$2),($3,$4)',[v.org,'city.',v.awayOrg,'away.']);
  for(const [person,role,org] of [[v.alex,'assessor',v.org],[v.other,'assessor',v.org],
    [v.maria,'bhw',v.org],[v.away,'bhw',v.awayOrg]])
    await db.query('insert into users values($1,$2,$3,$4,$5)',[person,role,'active',org,person]);
  await db.query("insert into feature_flags values('elearning',true,'{}'),('assessor_flow_ui',true,'{}'),('assessor_flow_writes',false,'{}')");
  await db.query("insert into training_programs values($1,'bhw-reference-manual','published')",[v.program]);
  await db.query("insert into courses values($1,'published')",[v.course]);
  await db.query("insert into training_program_chapters values($1,$2,'chapter-1','available',$3)",[v.chapter,v.program,v.course]);
  await db.query("insert into course_modules values($1,$3,0,'Bahagi 1','Component 1'),($2,$3,1,'Bahagi 2','Component 2')",
    [v.module,v.otherModule,v.course]);
  await db.query('insert into course_lessons values($1,$2,$3)',[v.lesson,v.module,v.revision]);
  await db.query("insert into assessor_flow_cohorts values($1,$2,'chapter-1','req1',true,false,null)",[v.cohort,v.program]);
  await db.query('insert into assessor_flow_cohort_members values($1,$2),($1,$3),($1,$4)',
    [v.cohort,v.alex,v.other,v.maria]);
  await db.query("insert into assessor_rollout_private.award_contracts values('req1','rubric1',true)");
  await db.query("insert into assessor_rollout_private.practice_criteria values($1,'clarify','v1',$2,$3,'req1','rubric1',true)",
    [v.chapter,v.lesson,v.revision]);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261014002817_c1af16_component_readiness.sql',import.meta.url),'utf8'));
},30000);
afterAll(async()=>db?.close());

describe('C1AF-16 read-only component readiness',()=>{
  it('denies direct tables, wrong actor and out-of-scope learner',async()=>{
    await expect(as(v.alex,'select count(*) from assessor_rollout_private.component_requirements')).rejects.toThrow(/permission denied/);
    await expect(readiness(null)).rejects.toThrow(/permission denied/);
    await expect(readiness(v.maria)).rejects.toThrow(/not authorized/);
    await expect(readiness(v.alex,v.away)).rejects.toThrow(/learner unavailable/);
    await expect(readiness(v.alex,v.alex)).rejects.toThrow(/learner unavailable/);
    await db.query("update users set status='inactive' where id=$1",[v.alex]);
    await expect(readiness()).rejects.toThrow(/not authorized/);
    await db.query("update users set status='active' where id=$1",[v.alex]);
  });
  it('reports each unmapped component as closed without creating work',async()=>{
    const rows=await readiness();
    expect(rows).toHaveLength(2);
    expect(rows.every(row=>!row.canArrange&&row.learnerBlockers.includes('component_contract_unavailable'))).toBe(true);
    expect((await db.query('select count(*)::int n from assessor_rollout_private.component_assignments')).rows[0].n).toBe(0);
  });
  it('uses this component only and separates learner readiness from assessor authority',async()=>{
    await db.query(`insert into assessor_rollout_private.component_requirements
      values($1,$2,'req1','rubric1','{}','review-1',$3,true)`,[v.module,v.chapter,v.alex]);
    await db.query('insert into assessor_rollout_private.component_required_lessons values($1,$2)',[v.module,v.lesson]);
    await db.query("insert into assessor_rollout_private.component_required_criteria values($1,$2,'clarify','v1')",
      [v.module,v.chapter]);
    expect((await item()).learnerBlockers).toContain('required_lessons_incomplete');
    await db.query('insert into course_progress values($1,$2,$3)',[v.progress,v.course,v.maria]);
    await db.query('insert into course_lesson_progress values($1,$2,$3)',[v.progress,v.lesson,v.revision]);
    expect(await item()).toMatchObject({learnerReady:true,actorAuthorized:false,canArrange:false});
    await db.query("insert into assessor_rollout_private.chapter_awards values($1,$2,'req1','active')",[v.alex,v.chapter]);
    await db.query("update feature_flags set enabled=true where key='assessor_flow_writes'");
    await db.query('update assessor_flow_cohorts set writes_enabled=true,authority_cutover_at=now() where id=$1',[v.cohort]);
    expect(await item()).toMatchObject({learnerReady:true,actorAuthorized:true,canArrange:true});
    expect((await readiness())[1].learnerBlockers).toContain('component_contract_unavailable');
  });
  it('blocks stale evidence, unapproved rubric, wrong award and competing assignment',async()=>{
    await db.query('update course_lessons set published_revision_id=$1 where id=$2',[v.newRevision,v.lesson]);
    expect((await item()).learnerBlockers).toContain('stale_learning_evidence');
    await db.query('update course_lessons set published_revision_id=$1 where id=$2',[v.revision,v.lesson]);
    await db.query('update assessor_rollout_private.practice_criteria set enabled=false');
    expect((await item()).learnerBlockers).toContain('approved_rubric_unavailable');
    await db.query('update assessor_rollout_private.practice_criteria set enabled=true');
    await db.query("update assessor_rollout_private.chapter_awards set status='revoked'");
    expect((await item()).authorityBlockers).toContain('chapter_award_required');
    await db.query("update assessor_rollout_private.chapter_awards set status='active'");
    await db.query("insert into assessor_rollout_private.component_assignments values($1,$2,$3,$4,'active',now())",
      [v.assignment,v.module,v.maria,v.other]);
    expect((await item()).authorityBlockers).toContain('assigned_to_other');
  });
  it('requires only explicitly mapped tests and a current validated release',async()=>{
    await db.query("update assessor_rollout_private.component_assignments set status='released'");
    await db.query("update assessor_rollout_private.component_requirements set required_test_phases=array['posttest']");
    expect((await item()).learnerBlockers).toContain('test_release_unavailable');
    await db.query("insert into learner_assessment_private.releases values($1,'active','validated','bhw-reference-manual','chapter-1')",[v.release]);
    await db.query('insert into learner_assessment_private.enrollments values($1,$2,$3)',[v.maria,v.course,v.release]);
    expect((await item()).missingTestPhases).toEqual(['posttest']);
    await db.query("insert into learner_assessment_private.attempts values($1,$2,$3,'posttest','submitted')",
      [v.maria,v.course,v.release]);
    expect(await item()).toMatchObject({learnerReady:true,canArrange:true});
    await db.query("update learner_assessment_private.releases set status='withdrawn'");
    expect((await item()).learnerBlockers).toContain('test_release_unavailable');
  });
  it('blocks partial publication, a wrong-chapter award, and a catchment transfer',async()=>{
    await db.query("update assessor_rollout_private.component_requirements set required_test_phases='{}'");
    await db.query('update course_lessons set published_revision_id=null where id=$1',[v.lesson]);
    expect((await item()).learnerBlockers).toContain('required_content_unavailable');
    await db.query('update course_lessons set published_revision_id=$1 where id=$2',[v.revision,v.lesson]);
    await db.query('update assessor_rollout_private.chapter_awards set chapter_id=$1',[v.otherModule]);
    expect((await item()).authorityBlockers).toContain('chapter_award_required');
    await db.query('update assessor_rollout_private.chapter_awards set chapter_id=$1',[v.chapter]);
    await db.query('update users set org_unit_id=$1 where id=$2',[v.awayOrg,v.maria]);
    await expect(readiness()).rejects.toThrow(/learner unavailable/);
  });
});
