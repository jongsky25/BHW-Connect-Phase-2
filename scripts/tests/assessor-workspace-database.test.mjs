// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const v = {city:id(1),barangay:id(2),second:id(3),away:id(4),assessor:id(5),admin:id(6),
  inactive:id(7),outsider:id(8),program:id(9),chapter:id(10),course:id(11)};
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
    create table training_programs(id uuid primary key,content_key text,status text);
    create table courses(id uuid primary key,status text);
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
  await db.query("insert into training_programs values($1,'bhw-reference-manual','published')",[v.program]);
  await db.query("insert into courses values($1,'published')",[v.course]);
  await db.query("insert into training_program_chapters values($1,$2,'chapter-1','available',$3)",
    [v.chapter,v.program,v.course]);
  for(let n=0;n<23;n++) {
    const person=id(100+n),unit=n%2 ? v.second : v.barangay;
    await db.query('insert into users values($1,\'bhw\',\'active\',$2,$3)',
      [person,unit,n===0 || n===1 ? 'Maria Santos' : `BHW ${String(n).padStart(2,'0')}`]);
    if(n===0) await db.query("insert into course_progress values($1,$2,'content_completed')",[person,v.course]);
  }
  await db.query("insert into users values($1,'bhw','active',$2,'Maria Santos')",[id(200),v.away]);
  await db.query("insert into users values($1,'bhw','deactivated',$2,'Former BHW')",[id(201),v.barangay]);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261012232945_assessor_chapter1_workspace.sql',import.meta.url),'utf8'));
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
    await expect(read(v.assessor,{status:'anything'})).rejects.toThrow('invalid status filter');
    expect((await read(v.outsider)).total).toBe(1);
  });
});
