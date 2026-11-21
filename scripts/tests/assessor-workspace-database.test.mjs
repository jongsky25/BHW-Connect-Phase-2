// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const v = {city:id(1),barangay:id(2),second:id(3),away:id(4),assessor:id(5),admin:id(6),
  inactive:id(7),outsider:id(8),program:id(9),chapter:id(10),course:id(11),
  foreignProgram:id(12),foreignChapter:id(13),foreignCourse:id(14)};
let db;
async function read(actor,args={}) {
  await db.exec('begin');
  try {
    await db.exec(`set local role ${actor ? 'authenticated' : 'anon'}`);
    await db.query("select set_config('test.actor',$1,true)",[actor ?? '']);
    const result=await db.query('select public.rpc_assessor_chapter1_workspace($1,$2,$3,$4,$5) result',[
      args.program ?? v.program,args.search ?? null,args.area ?? null,args.status ?? 'all',args.page ?? 1,
    ]);
    await db.exec('commit');
    return result.rows[0].result;
  } catch(error) {
    await db.exec('rollback');
    throw error;
  }
}
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`
    create role authenticated; create role anon;
    create table org_units(id uuid primary key,name text,level text,path text);
    create table users(id uuid primary key,role text,status text,org_unit_id uuid,full_name text);
    create function current_app_user() returns users language sql stable security definer
      set search_path=public as $$
      select u from public.users u where u.id::text=nullif(current_setting('test.actor',true),'')
    $$;
    create table super_admin_personas(persona_user_id uuid primary key);
    create function org_visible_to_actor(p_org uuid) returns boolean language sql stable security definer
      set search_path=public as $$
      select exists(select 1 from org_units target, org_units own, users actor
        where target.id=p_org and actor.id::text=nullif(current_setting('test.actor',true),'')
          and own.id=actor.org_unit_id and (target.path like own.path || '%'
            or own.path like target.path || '%'))
    $$;
    create table training_programs(id uuid primary key,content_key text,status text,org_unit_id uuid);
    create table courses(id uuid primary key,status text,org_unit_id uuid);
    create table training_program_chapters(id uuid primary key,program_id uuid,chapter_key text,
      availability text,course_id uuid);
    create table course_progress(bhw_user_id uuid,course_id uuid,status text);
  `);
  for(const [unit,name,level,path] of [
    [v.city,'City','city_municipal',`${v.city}.`],
    [v.barangay,'Barangay One','barangay',`${v.city}.${v.barangay}.`],
    [v.second,'Barangay Two','barangay',`${v.city}.${v.second}.`],
    [v.away,'Outside','barangay',`${v.away}.`],
  ]) await db.query('insert into org_units values($1,$2,$3,$4)',[unit,name,level,path]);
  for(const [person,role,status,unit,name] of [
    [v.assessor,'assessor','active',v.city,'Assessor'],[v.admin,'admin','active',v.city,'Admin'],
    [v.inactive,'assessor','deactivated',v.city,'Inactive'],[v.outsider,'assessor','active',v.away,'Outsider'],
  ]) await db.query('insert into users values($1,$2,$3,$4,$5)',[person,role,status,unit,name]);
  await db.query("insert into training_programs values($1,'bhw-reference-manual','published',$2)",[v.program,v.city]);
  await db.query("insert into courses values($1,'published',$2)",[v.course,v.city]);
  await db.query("insert into training_program_chapters values($1,$2,'chapter-1','available',$3)",
    [v.chapter,v.program,v.course]);
  await db.query("insert into training_programs values($1,'bhw-reference-manual','published',$2)",[v.foreignProgram,v.away]);
  await db.query("insert into courses values($1,'published',$2)",[v.foreignCourse,v.away]);
  await db.query("insert into training_program_chapters values($1,$2,'chapter-1','available',$3)",
    [v.foreignChapter,v.foreignProgram,v.foreignCourse]);
  for(let n=0;n<23;n++) {
    const person=id(100+n),unit=n%2 ? v.second : v.barangay;
    await db.query('insert into users values($1,\'bhw\',\'active\',$2,$3)',
      [person,unit,n===0 || n===1 ? 'Maria Santos' : `BHW ${String(n).padStart(2,'0')}`]);
    if(n===0) await db.query("insert into course_progress values($1,$2,'content_completed')",[person,v.course]);
  }
  await db.query("insert into users values($1,'bhw','active',$2,'Maria Santos')",[id(200),v.away]);
  await db.query("insert into users values($1,'bhw','deactivated',$2,'Former BHW')",[id(201),v.barangay]);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261012232945_assessor_chapter1_workspace.sql',import.meta.url),'utf8'));
  await db.exec(`
    alter table course_progress add column id uuid default gen_random_uuid();
    create table course_modules(id uuid primary key,course_id uuid);
    create table course_lessons(id uuid primary key,module_id uuid,lesson_key text,title_fil text,title_en text,required boolean,published_revision_id uuid);
    create table course_lesson_progress(course_progress_id uuid,lesson_id uuid);
    create table course_test_attempts(id uuid primary key,bhw_user_id uuid,course_id uuid,phase text,taken_at timestamptz,score_percent numeric);
    create schema learner_assessment_private;
    create table learner_assessment_private.attempts(id uuid primary key,learner_id uuid,course_id uuid,phase text,state text,submitted_at timestamptz,score_percent numeric,form_id text,release_id text,form_snapshot jsonb,legacy_attempt_id uuid);
    create table learner_assessment_private.responses(attempt_id uuid,item_id uuid,kind text,option_id text);
    create table learner_assessment_private.practice_attempts(learner_id uuid,course_id uuid,state text);
  `);
  await db.query('insert into course_modules values($1,$2)',[id(300),v.course]);
  await db.query("insert into course_lessons values($1,$2,'bhw-roles-hepo','Mga tungkulin','BHW roles',true,$3)",[id(301),id(300),id(302)]);
  await db.query("insert into course_lessons values($1,$2,'unpublished','Hindi nailathala','Unpublished',true,null)",[id(303),id(300)]);
  await db.query('insert into course_lesson_progress select id,$1 from course_progress where bhw_user_id=$2',[id(301),id(100)]);
  const items=[0,1].map(n=>({item_id:id(400+n),lesson_keys:['bhw-roles-hepo','bhw-roles-hepo','unmapped'],correct_option_id:'secret-a',stem:{en:'Secret question'}}));
  for (const [attempt,person,phase,state,score,form,date] of [
    [500,100,'pretest','submitted',40,'pre-v1','2026-10-01'],
    [501,100,'posttest','submitted',50,'post-v1','2026-10-02'],
    [502,100,'posttest','submitted',100,'post-v2','2026-10-03'],
    [503,103,'posttest','draft',null,'post-v2',null],
    [504,200,'posttest','submitted',0,'outside','2026-10-01'],
    [505,100,'posttest','invalidated',null,'invalid',null],
  ]) {
    const legacy=state==='submitted'?id(attempt+100):null;
    if(legacy) await db.query('insert into course_test_attempts values($1,$2,$3,$4,$5,$6)',[legacy,id(person),v.course,phase,date,score]);
    await db.query('insert into learner_assessment_private.attempts values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
      [id(attempt),id(person),v.course,phase,state,date,score,form,'release-'+form,JSON.stringify(items),legacy]);
  }
  await db.query("insert into learner_assessment_private.responses values($1,$2,'choice','secret-a'),($1,$3,'unknown',null)",[id(501),id(400),id(401)]);
  await db.query("insert into learner_assessment_private.responses values($1,$2,'choice','secret-a'),($1,$3,'choice','secret-a')",[id(502),id(400),id(401)]);
  await db.query("insert into course_test_attempts values($1,$2,$3,'posttest','2026-09-01',75)",[id(700),id(101),v.course]);
  await db.query("insert into learner_assessment_private.practice_attempts values($1,$2,'completed'),($1,$2,'in_progress'),($1,$2,'skipped')",[id(100),v.course]);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261121023406_chapter1_workspace_monitoring.sql',import.meta.url),'utf8'));

},20000);
afterAll(async()=>db?.close());

describe('C1AF-10 scoped workspace roster',()=>{
  it('paginates inside catchment, preserves duplicate names with barangay, and excludes inactive people',async()=>{
    const first=await read(v.assessor);
    expect(first.total).toBe(23);
    expect(first.rows).toHaveLength(20);
    expect(first.rows.every(row=>row.barangay!=='Outside')).toBe(true);
    const second=await read(v.assessor,{page:2});
    expect(second.rows).toHaveLength(3);
    expect(new Set([...first.rows,...second.rows].map(row=>row.id)).size).toBe(23);
    const maria=await read(v.assessor,{search:'maria'});
    expect(maria.rows).toHaveLength(2);
    expect(maria.rows.map(row=>row.barangay).sort()).toEqual(['Barangay One','Barangay Two']);
  });
  it('filters by area and learning status without presenting progress as readiness',async()=>{
    const area=await read(v.assessor,{area:v.second});
    expect(area.total).toBe(11);
    expect(area.rows.every(row=>row.area_id===v.second)).toBe(true);
    const completed=await read(v.assessor,{status:'content_completed'});
    expect(completed.total).toBe(1);
    expect(completed.rows[0].learning_status).toBe('content_completed');
    expect((await read(v.assessor,{status:'not_started'})).total).toBe(22);
    expect((await read(v.assessor,{search:'nobody'})).rows).toEqual([]);
  });
  it('denies anonymous, other roles, inactive assessors, foreign areas, and invalid filters',async()=>{
    await expect(read(null)).rejects.toThrow('permission denied');
    for(const person of [v.admin,v.inactive])
      await expect(read(person)).rejects.toThrow('not authorized');
    await expect(read(v.assessor,{area:v.away})).rejects.toThrow('area outside catchment');
    await expect(read(v.assessor,{program:v.foreignProgram})).rejects.toThrow('chapter unavailable');
    await expect(read(v.assessor,{status:'anything'})).rejects.toThrow('invalid status filter');
    await expect(read(v.outsider)).rejects.toThrow('chapter unavailable');
  });
});

describe('C1-PE-4 retained training evidence',()=>{
  it('reconciles post-test states across pages without counting outside or inactive learners',async()=>{
    const pages=[await read(v.assessor),await read(v.assessor,{page:2})];
    const states=pages.flatMap(page=>page.rows.map(row=>row.training.tests.posttest.state));
    expect(states).toHaveLength(23);
    expect(states.filter(state=>state==='submitted')).toHaveLength(2);
    expect(states.filter(state=>state==='incomplete')).toHaveLength(1);
    expect(states.filter(state=>state==='not_started')).toHaveLength(20);
  });
  it('reconciles completions and first retained results, without double-counting final records or mixing practice',async()=>{
    const roster=await read(v.assessor,{search:'maria'});
    const modern=roster.rows.find(row=>row.id===id(100)).training;
    expect(modern).toMatchObject({lessons_done:1,lessons_total:1,practice_completed:1,topics_available:true});
    expect(modern.tests.pretest).toMatchObject({state:'submitted',score:40,submitted_count:1,form_id:'pre-v1'});
    expect(modern.tests.posttest).toMatchObject({state:'submitted',score:50,submitted_count:2,form_id:'post-v1'});
    expect(modern.topics).toEqual([{lesson_key:'bhw-roles-hepo',title_fil:'Mga tungkulin',title_en:'BHW roles',total:2,missed:1}]);
    const historical=roster.rows.find(row=>row.id===id(101)).training;
    expect(historical.tests.posttest).toMatchObject({state:'submitted',score:75,source:'legacy',submitted_count:1});
    expect(historical.topics_available).toBe(false);
    expect(historical.topics).toEqual([]);
    expect(JSON.stringify(roster)).not.toMatch(/secret-a|Secret question|outside|invalid/);
  });
  it('distinguishes draft, not started, zero results, and an empty filtered cohort',async()=>{
    const draft=(await read(v.assessor,{search:'BHW 03'})).rows[0].training;
    expect(draft.tests.posttest).toMatchObject({state:'incomplete',score:null,submitted_count:0});
    expect(draft.topics).toEqual([]);
    expect(draft.tests.pretest).toMatchObject({state:'not_started',score:null,submitted_count:0});
    expect((await read(v.assessor,{search:'absent'})).rows).toEqual([]);
  });
  it('does not grant a BHW or an assessor outside the catchment access to monitoring',async()=>{
    await expect(read(id(100))).rejects.toThrow('not authorized');
    await expect(read(v.outsider)).rejects.toThrow('chapter unavailable');
    const rows=(await read(v.assessor,{area:v.second})).rows;
    expect(rows.some(row=>row.id===id(100))).toBe(false);
    expect(rows.every(row=>row.training.lessons_done===0)).toBe(true);
  });
});
