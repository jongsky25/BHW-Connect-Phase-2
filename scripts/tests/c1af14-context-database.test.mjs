// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';

const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const v={org:id(1),awayOrg:id(2),assessor:id(3),bhw:id(4),awayBhW:id(5),program:id(6),
  chapter:id(7),course:id(8),module:id(9),lesson:id(10),revision:id(11),cohort:id(12)};
let db;
async function as(actor,learner=v.bhw){
  await db.exec('begin');
  try {
    await db.exec(`set local role ${actor?'authenticated':'anon'}`);
    await db.query("select set_config('test.actor',$1,true)",[actor??'']);
    const result=await db.query('select rpc_assessor_lesson_practice_context($1,$2,$3) result',[v.program,v.lesson,learner]);
    await db.exec('commit');
    return result.rows[0].result;
  } catch(error){await db.exec('rollback');throw error;}
}

beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`
    create role authenticated; create role anon;
    create schema assessor_rollout_private;
    grant usage on schema assessor_rollout_private to authenticated;
    create table org_units(id uuid primary key,path text,name text);
    create table users(id uuid primary key,role text,status text,org_unit_id uuid,full_name text);
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
    create table course_lessons(id uuid primary key,module_id uuid,published_revision_id uuid,lesson_key text);
    create table feature_flags(key text,enabled boolean,disabled_roles text[]);
    create table assessor_flow_cohorts(id uuid primary key,program_id uuid,chapter_key text,
      ui_enabled boolean,writes_enabled boolean,authority_cutover_at timestamptz);
    create table assessor_flow_cohort_members(cohort_id uuid,user_id uuid);
    create table assessor_rollout_private.award_contracts(requirements_version text primary key,
      rubric_version text,enabled boolean);
    create table assessor_rollout_private.chapter_awards(actor_id uuid,chapter_id uuid,
      requirements_version text,status text);
    create table assessor_rollout_private.practice_criteria(chapter_id uuid,lesson_id uuid,
      lesson_revision_id uuid,criterion_id text,criterion_version text,requirements_version text,
      rubric_version text,rubric_snapshot jsonb,enabled boolean);
  `);
  await db.query('insert into org_units values($1,$2,$3),($4,$5,$6)',
    [v.org,'city.','North',v.awayOrg,'away.','Away']);
  for(const [person,role,org,name] of [[v.assessor,'assessor',v.org,'Assessor'],
    [v.bhw,'bhw',v.org,'Ada'],[v.awayBhW,'bhw',v.awayOrg,'Away']])
    await db.query('insert into users values($1,$2,$3,$4,$5)',[person,role,'active',org,name]);
  await db.query("insert into training_programs values($1,'bhw-reference-manual','published')",[v.program]);
  await db.query("insert into courses values($1,$2,'published')",[v.course,v.org]);
  await db.query("insert into training_program_chapters values($1,$2,$3,'chapter-1','available')",
    [v.chapter,v.program,v.course]);
  await db.query('insert into course_modules values($1,$2)',[v.module,v.course]);
  await db.query("insert into course_lessons values($1,$2,$3,'communication-clarify')",[v.lesson,v.module,v.revision]);
  await db.query("insert into assessor_flow_cohorts values($1,$2,'chapter-1',false,false,null)",[v.cohort,v.program]);
  await db.query('insert into assessor_flow_cohort_members values($1,$2),($1,$3)',[v.cohort,v.assessor,v.bhw]);
  await db.query("insert into feature_flags values('assessor_flow_ui',false,'{}'),('assessor_flow_writes',false,'{}'),('elearning',true,'{}')");
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261013093359_c1af14_lesson_observation_context.sql',import.meta.url),'utf8'));
},30000);
afterAll(async()=>db?.close());

describe('C1AF-14 lesson context boundary',()=>{
  it('denies access while the interface gate is closed',async()=>{
    await expect(as(v.assessor)).rejects.toThrow(/unavailable/);
    await db.query("update feature_flags set enabled=true where key='assessor_flow_ui'");
    await db.query('update assessor_flow_cohorts set ui_enabled=true where id=$1',[v.cohort]);
  });
  it('returns no invented criterion or write permission',async()=>{
    const result=await as(v.assessor);
    expect(result).toMatchObject({lessonId:v.lesson,learner:{id:v.bhw,name:'Ada'},criteria:[],canRecord:false});
    await expect(as(null)).rejects.toThrow();
    await expect(as(v.assessor,v.awayBhW)).rejects.toThrow(/catchment/);
  });
  it('shows reviewed bilingual anchor and only enables its matching contract',async()=>{
    const rubric={observable:{fil:'Linawin',en:'Clarify'},levels:{
      kaya_na:{fil:'Kaya',en:'Can do'},kailangan_practice:{fil:'Sanay',en:'Needs practice'},
      hindi_pa:{fil:'Hindi',en:'Not yet'},
    }};
    await db.query(`insert into assessor_rollout_private.practice_criteria values
      ($1,$2,$3,'clarify','v1','req1','rubric1',$4,true)`,[v.chapter,v.lesson,v.revision,JSON.stringify(rubric)]);
    expect((await as(v.assessor)).criteria).toMatchObject([{id:'clarify',recordable:false}]);
    await db.query("insert into assessor_rollout_private.award_contracts values('req1','rubric1',true)");
    await db.query("insert into assessor_rollout_private.chapter_awards values($1,$2,'req1','active')",[v.assessor,v.chapter]);
    await db.query('update assessor_flow_cohorts set writes_enabled=true,authority_cutover_at=now() where id=$1',[v.cohort]);
    await db.query("update feature_flags set enabled=true where key='assessor_flow_writes'");
    expect(await as(v.assessor)).toMatchObject({canRecord:true,criteria:[{recordable:true}]});
  });
});
