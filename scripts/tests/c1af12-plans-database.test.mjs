// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';

const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const v={org:id(1),awayOrg:id(2),owner:id(3),other:id(4),away:id(5),inactive:id(6),
  program:id(7),chapter:id(8),course:id(9),otherCourse:id(10),module:id(11),otherModule:id(12),
  lesson:id(13),otherLesson:id(14),revision:id(15),scheduled:id(16),closed:id(17)};
let db;
async function as(who,sql,args=[]){
  await db.exec('begin');
  try{
    await db.exec(`set local role ${who?'authenticated':'anon'}`);
    await db.query("select set_config('test.actor',$1,true)",[who??'']);
    const result=await db.query(sql,args);
    await db.exec('commit');return result;
  }catch(error){await db.exec('rollback');throw error;}
}
const create=who=>as(who,'select rpc_course_lesson_plan_create($1) plan_id',[v.lesson]);
const save=(who,session,lesson=v.lesson,version=1,replace=false)=>as(who,
  'select rpc_course_lesson_plan_activity_save($1,$2,$3,$4,$5) activity_id',
  [session,lesson,'role-play',version,replace]);

beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role authenticated;create role anon;
    create table org_units(id uuid primary key,path text);
    create table users(id uuid primary key,role text,status text,org_unit_id uuid);
    create function current_app_user() returns users language sql stable security definer as $$
      select u from users u where u.id::text=nullif(current_setting('test.actor',true),'') $$;
    create function current_org_path() returns text language sql stable security definer as $$
      select o.path from org_units o join users u on u.org_unit_id=o.id
      where u.id::text=nullif(current_setting('test.actor',true),'') $$;
    create table training_programs(id uuid primary key,content_key text);
    create table courses(id uuid primary key,org_unit_id uuid,status text);
    create table training_program_chapters(id uuid primary key,program_id uuid,course_id uuid,chapter_key text);
    create table course_modules(id uuid primary key,course_id uuid,type text default 'lesson');
    create table course_lessons(id uuid primary key,module_id uuid,lesson_key text,published_revision_id uuid);
    create table course_sessions(id uuid primary key default gen_random_uuid(),course_id uuid,org_unit_id uuid,
      facilitator_user_id uuid,scheduled_at timestamptz not null,location_note text default '',status text not null
      default 'scheduled' constraint course_sessions_status_check check(status in ('scheduled','completed','cancelled')));
    create table course_module_facilitator_notes(module_id uuid,activities jsonb);
    create table course_session_activities(id uuid primary key default gen_random_uuid(),session_id uuid,module_id uuid,
      activity_id text,activity_snapshot jsonb,status text,duration_minutes integer,note text,recorded_by uuid,
      recorded_at timestamptz default now(),unique(session_id,module_id,activity_id));
    create table course_session_enrollments(session_id uuid,bhw_user_id uuid);
    create table audit_events(actor_user_id uuid,event_type text,subject_type text,subject_id uuid,metadata jsonb,
      plain_summary_fil text,plain_summary_en text);
    create function course_session_facilitator_guard(p_session_id uuid) returns course_sessions
      language plpgsql security definer as $$declare s course_sessions;u users:=current_app_user();begin
      select * into s from course_sessions where id=p_session_id;
      if u.id is null or u.role<>'assessor' or u.status<>'active' or s.facilitator_user_id<>u.id
        or s.status<>'scheduled' then raise exception 'not authorized';end if;return s;end $$;
  `);
  await db.query('insert into org_units values($1,$2),($3,$4)',[v.org,'city.',v.awayOrg,'away.']);
  for(const [person,role,status,org] of [[v.owner,'assessor','active',v.org],[v.other,'assessor','active',v.org],
    [v.away,'assessor','active',v.awayOrg],[v.inactive,'assessor','inactive',v.org]])
    await db.query('insert into users values($1,$2,$3,$4)',[person,role,status,org]);
  await db.query("insert into training_programs values($1,'bhw-reference-manual')",[v.program]);
  await db.query("insert into courses values($1,$3,'published'),($2,$3,'published')",[v.course,v.otherCourse,v.org]);
  await db.query("insert into training_program_chapters values($1,$2,$3,'chapter-1')",[v.chapter,v.program,v.course]);
  await db.query('insert into course_modules(id,course_id) values($1,$3),($2,$4)',[v.module,v.otherModule,v.course,v.otherCourse]);
  await db.query("insert into course_lessons values($1,$3,'communication-clarify',$5),($2,$4,'communication-clarify',$5)",
    [v.lesson,v.otherLesson,v.module,v.otherModule,v.revision]);
  await db.query('insert into course_module_facilitator_notes values($1,$2)',[v.module,JSON.stringify([{id:'role-play',version:1,lesson_keys:['communication-clarify'],title:{en:'First',fil:'Una'}}])]);
  await db.query(`insert into course_sessions(id,course_id,org_unit_id,facilitator_user_id,scheduled_at,status) values
    ($1,$3,$4,$5,now(),'scheduled'),($2,$3,$4,$5,now(),'completed')`,
    [v.scheduled,v.closed,v.course,v.org,v.owner]);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261013044457_c1af12_activity_plans.sql',import.meta.url),'utf8'));
},30000);
afterAll(async()=>db?.close());

describe('C1AF-12 draft and activity contracts',()=>{
  it('creates one real draft on retry and rejects unauthorized or wrong-course lessons',async()=>{
    const first=(await create(v.owner)).rows[0].plan_id;
    expect((await create(v.owner)).rows[0].plan_id).toBe(first);
    expect((await db.query('select status,scheduled_at from course_sessions where id=$1',[first])).rows[0])
      .toMatchObject({status:'draft',scheduled_at:null});
    for(const who of [v.away,v.inactive,null])await expect(create(who)).rejects.toThrow();
    await expect(as(v.owner,'select rpc_course_lesson_plan_create($1)',[v.otherLesson])).rejects.toThrow();
    await expect(save(v.other,first)).rejects.toThrow();
    await expect(save(v.owner,first,v.otherLesson)).rejects.toThrow();
    await expect(as(v.owner,'insert into course_session_enrollments values($1,$2)',[first,v.other])).rejects.toThrow();
  });
  it('keeps one immutable snapshot until explicit replacement, and never records delivery',async()=>{
    const draft=(await create(v.owner)).rows[0].plan_id;
    const first=(await save(v.owner,draft)).rows[0].activity_id;
    expect((await save(v.owner,draft)).rows[0].activity_id).toBe(first);
    const legacy=(status,version)=>as(v.owner,
      'select rpc_course_session_activity_record($1,$2,$3,$4,$5,$6,$7) activity_id',
      [v.scheduled,v.module,'role-play',version,status,null,'']);
    await legacy('planned',1);
    await db.query('update course_module_facilitator_notes set activities=$1 where module_id=$2',
      [JSON.stringify([{id:'role-play',version:2,lesson_keys:['communication-clarify'],title:{en:'Second',fil:'Ikalawa'}}]),v.module]);
    await expect(save(v.owner,draft,v.lesson,1)).rejects.toThrow();
    expect((await save(v.owner,draft,v.lesson,2)).rows[0].activity_id).toBe(first);
    expect((await db.query('select activity_snapshot from course_session_activities where id=$1',[first])).rows[0].activity_snapshot.version).toBe(1);
    await legacy('planned',2);
    expect((await db.query('select activity_snapshot from course_session_activities where session_id=$1',[v.scheduled])).rows[0].activity_snapshot.version).toBe(1);
    await save(v.owner,draft,v.lesson,2,true);
    expect((await db.query('select activity_snapshot from course_session_activities where id=$1',[first])).rows[0].activity_snapshot.version).toBe(2);
    expect((await db.query('select count(*)::integer n from course_session_activities where session_id=$1',[draft])).rows[0].n).toBe(1);
    await legacy('run',2);
    expect((await db.query('select activity_snapshot from course_session_activities where session_id=$1',[v.scheduled])).rows[0].activity_snapshot.version).toBe(2);
    await expect(save(v.owner,v.closed,v.lesson,2)).rejects.toThrow();
    await expect(save(v.other,v.scheduled,v.lesson,2)).rejects.toThrow();
  });
  it('schedules only an owned draft and keeps closed sessions immutable',async()=>{
    const draft=(await create(v.owner)).rows[0].plan_id;
    const date=new Date(Date.now()+86400000).toISOString();
    await expect(as(v.other,'select rpc_course_lesson_plan_schedule($1,$2,$3)',[draft,date,'Hall'])).rejects.toThrow();
    await as(v.owner,'select rpc_course_lesson_plan_schedule($1,$2,$3)',[draft,date,'Hall']);
    expect((await db.query('select status from course_sessions where id=$1',[draft])).rows[0].status).toBe('scheduled');
    await expect(as(v.owner,'select rpc_course_lesson_plan_schedule($1,$2,$3)',[draft,date,'Hall'])).rejects.toThrow();
    await expect(db.query("update course_sessions set status='scheduled' where id=$1",[v.closed])).rejects.toThrow();
  });
});
