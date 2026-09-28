// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,beforeEach,afterEach,describe,it,expect} from 'vitest';
const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const ids={self:uuid(1),other:uuid(2),bhw:uuid(3),admin:uuid(4),inactive:uuid(5),outside:uuid(6),national:uuid(20),city:uuid(21),away:uuid(22),program:uuid(30),chapter:uuid(31),course:uuid(32),module:uuid(33),lesson:uuid(34),revision:uuid(35),old:uuid(36),otherChapter:uuid(40),otherCourse:uuid(41)};
let db;
const params=()=>[ids.chapter,ids.lesson,ids.revision];
async function actor(id,fn){
  await db.exec('savepoint actor_call');
  await db.exec(`set role ${id?'authenticated':'anon'}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??'']);
  try{const result=await fn();await db.exec('reset role; release savepoint actor_call');return result;}
  catch(error){await db.exec('rollback to savepoint actor_call; reset role; release savepoint actor_call');throw error;}
}
const complete=(user=ids.self,args=params())=>actor(user,()=>db.query('select rpc_assessor_lesson_complete($1,$2,$3)',args));
const resume=(extra=[],user=ids.self)=>actor(user,()=>db.query('select rpc_assessor_lesson_resume($1,$2,$3,$4,$5,$6,$7)',[...params(),...(extra.length?extra:['read','en','read-one','c1'])]));
function migrationFunction(file,name){
  const sql=read(`supabase/migrations/${file}`);
  const start=sql.indexOf(`create or replace function public.${name}(`);
  if(start<0)throw new Error(`Missing real helper ${name}`);
  return sql.slice(start,sql.indexOf('$$;',start)+3);
}
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(read('scripts/tests/fixtures/assessor-study-platform.sql'));
  for(const name of ['current_app_user','current_org_path'])await db.exec(migrationFunction('20260720000000_baseline_captured_from_remote.sql',name));
  await db.exec(migrationFunction('20260727000000_inc10_announcements.sql','org_unit_path'));
  for(const name of ['org_visible_to_actor','training_lesson_visible'])await db.exec(migrationFunction('20261002000100_assessor_catchment_bhw_barangay.sql',name));
  await db.exec(read('supabase/migrations/20260928080043_assessor_candidate_learning.sql'));
  await db.query('insert into org_units values ($1,$4),($2,$5),($3,$6)',[ids.national,ids.city,ids.away,`${ids.national}.`,`${ids.national}.${ids.city}.`,`${ids.national}.${ids.away}.`]);
  for(const [name,role,status,org] of [['self','assessor','active','city'],['other','assessor','active','city'],['bhw','bhw','active','city'],['admin','admin','active','city'],['inactive','assessor','deactivated','city'],['outside','assessor','active','away']])
    await db.query('insert into users values($1,$1,$2,$3,$4)',[ids[name],role,status,ids[org]]);
  await db.query("insert into training_programs values($1,'bhw-reference-manual','published',$2)",[ids.program,ids.national]);
  await db.query("insert into courses values($1,'published',$3),($2,'published',$3)",[ids.course,ids.otherCourse,ids.city]);
  await db.query("insert into training_program_chapters values($1,$3,'chapter-1',$4,'available'),($2,$3,'chapter-2',$5,'available')",[ids.chapter,ids.otherChapter,ids.program,ids.course,ids.otherCourse]);
  await db.query('insert into course_modules values($1,$2)',[ids.module,ids.course]);
  await db.query('insert into course_lessons values($1,$2,$3)',[ids.lesson,ids.module,ids.revision]);
  for(const id of [ids.revision,ids.old])await db.query('insert into course_lesson_revisions values($1,$2,$3,$4)',[id,ids.lesson,JSON.stringify([{id:'read-one',concept_ids:['c1']},{id:'read-two',concept_ids:['c2']}]),JSON.stringify([{id:'slide-one',concept_ids:['c1']}])]);
},20000);
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{await db.exec('begin');});
afterEach(async()=>{await db.exec('rollback');});
describe('AF-02 actual PostgreSQL functions and RLS (isolated schema)',()=>{
  it('records idempotent completion under the authenticated assessor',async()=>{
    await complete();await complete();
    const rows=(await actor(ids.self,()=>db.query('select * from assessor_lesson_progress'))).rows;
    expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({assessor_user_id:ids.self,chapter_id:ids.chapter,revision_id:ids.revision});
  });
  it.each(['bhw','admin','inactive','outside',null])('rejects %s direct RPC calls',async name=>{
    await expect(complete(name?ids[name]:null)).rejects.toThrow(/not authorized|unavailable|permission denied/);
  });
  it('hides records from another assessor',async()=>{
    await complete();await resume();
    expect((await actor(ids.other,()=>db.query('select * from assessor_lesson_progress'))).rows).toEqual([]);
    expect((await actor(ids.other,()=>db.query('select * from assessor_lesson_resume'))).rows).toEqual([]);
  });
  it.each(['assessor_lesson_progress','assessor_lesson_resume'])('denies all direct %s mutations',async table=>{
    for(const sql of [`insert into ${table}(assessor_user_id,chapter_id,lesson_id,revision_id) values('${ids.self}','${ids.chapter}','${ids.lesson}','${ids.revision}')`,`update ${table} set assessor_user_id='${ids.other}'`,`delete from ${table}`]){
      await db.exec('savepoint denial');
      await expect(actor(ids.self,()=>db.exec(sql))).rejects.toThrow(/permission denied/);
      await db.exec('rollback to savepoint denial; reset role');
    }
  });
  it('denies anonymous reads and internal context access',async()=>{
    await db.exec('savepoint denial');
    await expect(actor(null,()=>db.exec('select * from assessor_lesson_progress'))).rejects.toThrow(/permission denied/);
    await db.exec('rollback to savepoint denial; reset role');
    await expect(actor(ids.self,()=>db.query('select assessor_private.study_context($1,$2,$3)',params()))).rejects.toThrow(/permission denied/);
  });
  it.each(['revision','chapter'])('rejects a mismatched %s',async field=>{
    const args=params();args[field==='revision'?2:0]=field==='revision'?ids.old:ids.otherChapter;
    await expect(complete(ids.self,args)).rejects.toThrow(/unavailable/);
  });
  it.each(['program','course','chapter','lesson'])('rejects unpublished/unavailable %s',async item=>{
    const sql={program:"update training_programs set status='draft'",course:"update courses set status='draft'",chapter:"update training_program_chapters set availability='unavailable'",lesson:'update course_lessons set published_revision_id=null'}[item];
    await db.exec(sql);await expect(complete()).rejects.toThrow(/unavailable/);
  });
  it('rejects a non Reference Manual program',async()=>{
    await db.exec("update training_programs set content_key='another-course'");await expect(complete()).rejects.toThrow(/unavailable/);
  });
  it('persists read/slides separately, validates concepts, and avoids unchanged writes',async()=>{
    await resume();
    const before=(await db.query('select xmin::text,updated_at from assessor_lesson_resume')).rows;
    await resume();expect((await db.query('select xmin::text,updated_at from assessor_lesson_resume')).rows).toEqual(before);
    await resume(['slides','fil','slide-one','c1']);
    expect((await actor(ids.self,()=>db.query('select modality,language from assessor_lesson_resume order by modality'))).rows).toEqual([{modality:'read',language:'en'},{modality:'slides',language:'fil'}]);
    await expect(resume(['read','en','read-one','c2'])).rejects.toThrow(/position and concept/);
  });
  it.each([['video','en','read-one','c1'],['read','xx','read-one','c1'],['read','en','missing','c1']])('rejects invalid resume input %s %s %s',async(...args)=>{
    await expect(resume(args)).rejects.toThrow(/invalid lesson|position and concept/);
  });
  it('keeps historical evidence when a new revision is published',async()=>{
    await complete();await db.query('update course_lessons set published_revision_id=$1',[ids.old]);
    await complete(ids.self,[ids.chapter,ids.lesson,ids.old]);
    expect((await db.query('select revision_id from assessor_lesson_progress')).rows).toHaveLength(2);
  });
});
