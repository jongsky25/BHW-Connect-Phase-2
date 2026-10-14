// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,beforeEach,afterEach,describe,it,expect} from 'vitest';

const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const v={alex:id(1),other:id(2),program:id(3),otherProgram:id(4),c1:id(5),c2:id(6),c3:id(7),otherChapter:id(8),
  course1:id(9),course2:id(10),course3:id(11),otherCourse:id(12),combined:id(20)};
const rule={
  'chapter-1':{kind:'combined',requirementsVersion:'chapter-1:v1',awardRuleVersion:'chapter-rule-v1'},
  'chapter-2':{kind:'legacy',curriculumVersion:'curr-v1',rubricVersion:'rubric-v1',orientationVersion:'orient-v1'},
  'chapter-3':{kind:'legacy',curriculumVersion:'curr-v1',rubricVersion:'rubric-v1',orientationVersion:'orient-v1'},
};
let db;
const sql=(query,args=[])=>db.query(query,args).then(r=>r.rows);
const count=async()=>Number((await sql('select count(*) n from assessor_rollout_private.overall_awards'))[0].n);
const award=async()=>((await sql('select id from assessor_rollout_private.overall_awards'))[0]?.id);
const status=async()=>((await sql('select assessor_rollout_private.overall_award_current_status($1) result',[await award()]))[0]?.result);
async function call(actor,fn,program=v.program){
  await db.exec('savepoint rpc_call');
  try{
    await db.exec('set local role authenticated');
    await sql("select set_config('test.actor',$1,true)",[actor]);
    const result=(await sql(`select public.${fn}($1) result`,[program]))[0].result;
    await db.exec('reset role');
    await sql("select set_config('test.actor',$1,true)",[v.alex]);
    await db.exec('release savepoint rpc_call');
    return result;
  }catch(error){await db.exec('rollback to savepoint rpc_call');throw error;}
}
async function configure(){
  await sql('insert into assessor_rollout_private.overall_award_contracts values($1,$2,$3,$4,true)',
    [v.program,'overall-v1',JSON.stringify(rule),'LOCAL SYNTHETIC REVIEW']);
}
async function combined(actor=v.alex,requirements='chapter-1:v1',chapter=v.c1,program=v.program){
  const key=id(20+(await sql('select count(*) n from assessor_rollout_private.chapter_awards'))[0].n);
  await sql('insert into assessor_rollout_private.chapter_awards values($1,$2,$3,$4,$5,$6,$7,now())',
    [key,actor,chapter,program,requirements,'active',id(300+(await count()))]);
  return key;
}
async function legacy(chapter,actor=v.alex,version='curr-v1'){
  const key=id(100+Number((await sql('select count(*) n from public.assessor_chapter_qualifications'))[0].n));
  await sql('insert into public.assessor_chapter_qualifications values($1,$2,$3,$4,$5,$6,$7,now())',
    [key,actor,chapter,version,'rubric-v1','orient-v1','active']);
  return key;
}

beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`
    create role authenticated; create role anon;
    create schema assessor_rollout_private;
    create table public.users(id uuid primary key,role text,status text);
    create function public.current_app_user() returns public.users language sql stable security definer set search_path='' as $$
      select u from public.users u where u.id::text=nullif(current_setting('test.actor',true),'') $$;
    create table public.super_admin_personas(persona_user_id uuid);
    create table public.training_programs(id uuid primary key,status text);
    create table public.courses(id uuid primary key,status text);
    create table public.training_program_chapters(id uuid primary key,program_id uuid,chapter_key text,availability text,course_id uuid);
    create table public.assessor_chapter_qualifications(id uuid primary key,assessor_user_id uuid,chapter_id uuid,
      curriculum_version text,rubric_version text,orientation_version text,status text,issued_at timestamptz);
    create table assessor_rollout_private.award_contracts(requirements_version text primary key,award_rule_version text);
    create table assessor_rollout_private.chapter_awards(id uuid primary key,actor_id uuid,chapter_id uuid,program_id uuid,
      requirements_version text,status text,certificate_id uuid,issued_at timestamptz);
    create table assessor_rollout_private.chapter_status_overrides(award_id uuid primary key,current_status text);
    create function assessor_rollout_private.certificate_current_status(p_award_id uuid) returns text
      language sql stable security definer set search_path='' as $$
        select coalesce(o.current_status,w.status) from assessor_rollout_private.chapter_awards w
        left join assessor_rollout_private.chapter_status_overrides o on o.award_id=w.id where w.id=p_award_id $$;
    create table public.audit_events(id uuid primary key default gen_random_uuid(),actor_user_id uuid,event_type text,
      subject_type text,subject_id uuid,metadata jsonb,plain_summary_fil text,plain_summary_en text);
  `);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261014073710_c1af21_overall_award.sql',import.meta.url),'utf8'));
  await sql("insert into public.users values($1,'assessor','active'),($2,'assessor','active')",[v.alex,v.other]);
  await sql("insert into public.training_programs values($1,'published'),($2,'published')",[v.program,v.otherProgram]);
  await sql("insert into public.courses values($1,'published'),($2,'published'),($3,'published'),($4,'published')",
    [v.course1,v.course2,v.course3,v.otherCourse]);
  for(const [chapter,program,key,course] of [[v.c1,v.program,'chapter-1',v.course1],[v.c2,v.program,'chapter-2',v.course2],
    [v.c3,v.program,'chapter-3',v.course3],[v.otherChapter,v.otherProgram,'chapter-2',v.otherCourse]])
    await sql("insert into public.training_program_chapters values($1,$2,$3,'available',$4)",[chapter,program,key,course]);
  await sql("insert into assessor_rollout_private.award_contracts values('chapter-1:v1','chapter-rule-v1'),('chapter-1:v2','chapter-rule-v2')");
});
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{await db.exec('begin');await sql("select set_config('test.actor',$1,true)",[v.alex]);});
afterEach(async()=>{await db.exec('rollback');});

describe('C1AF-21 overall issuance',()=>{
  it('requires reviewed enablement and exactly all three compatible chapters; the final insert issues once',async()=>{
    await combined();await legacy(v.c2);await legacy(v.c3);
    expect(await count()).toBe(0);
    await configure();
    expect(await count()).toBe(0); // enabling never backfills from a read
    const recovered=await call(v.alex,'rpc_assessor_overall_award_ensure');
    expect(recovered).toBe(await award());
    expect(await call(v.alex,'rpc_assessor_overall_award_ensure')).toBe(recovered);
    const sources=await sql('select chapter_key from assessor_rollout_private.overall_award_sources order by chapter_key');
    expect(sources.map(s=>s.chapter_key)).toEqual(['chapter-1','chapter-2','chapter-3']);
    expect(await status()).toBe('active');
  });
  it('does not issue at zero, one or two chapters; final completion triggers once',async()=>{
    await configure();expect(await count()).toBe(0);
    await combined();expect(await count()).toBe(0);
    await legacy(v.c2);expect(await count()).toBe(0);
    await legacy(v.c3);expect(await count()).toBe(1);
    expect(await call(v.alex,'rpc_assessor_overall_award_ensure')).toBe(await award());
  });
  it('rejects missing Chapter 3, duplicate Chapter 2, another program, another actor and wrong versions',async()=>{
    await configure();await combined();
    await legacy(v.otherChapter);await legacy(v.c2,v.other);await legacy(v.c2,v.alex,'curr-old');
    expect(await count()).toBe(0);
    await legacy(v.c2);await legacy(v.c2);
    expect(await count()).toBe(0);
    await sql("update public.training_program_chapters set availability='unavailable' where id=$1",[v.c3]);
    await legacy(v.c3);expect(await count()).toBe(0);
    await sql("update public.training_program_chapters set availability='available' where id=$1",[v.c3]);
    expect(await call(v.alex,'rpc_assessor_overall_award_ensure')).toBe(await award());
  });
  it('keeps historical identity but blocks current validity after source or overall suspension',async()=>{
    await configure();await combined();await legacy(v.c2);const third=await legacy(v.c3);
    expect(await status()).toBe('active');
    await sql("update public.assessor_chapter_qualifications set status='suspended' where id=$1",[third]);
    expect(await status()).toBe('suspended');
    await sql("update public.assessor_chapter_qualifications set status='active' where id=$1",[third]);
    await sql("update assessor_rollout_private.overall_awards set status='revoked',status_changed_at=now() where id=$1",[await award()]);
    expect(await status()).toBe('revoked');
    expect(await count()).toBe(1);
  });
  it('rejects a revised chapter whose own certificate needs an update',async()=>{
    await configure();const first=await combined();await legacy(v.c2);
    await sql("insert into assessor_rollout_private.chapter_status_overrides values($1,'update_required')",[first]);
    await legacy(v.c3);expect(await count()).toBe(0);
    await expect(call(v.alex,'rpc_assessor_overall_award_ensure')).rejects.toThrow(/prerequisites incomplete/);
    await sql('delete from assessor_rollout_private.chapter_status_overrides where award_id=$1',[first]);
    await call(v.alex,'rpc_assessor_overall_award_ensure');
    await sql("insert into assessor_rollout_private.chapter_status_overrides values($1,'update_required')",[first]);
    expect(await status()).toBe('update_required');
  });
  it('requires explicit recovery for earlier eligibility and reports update required under a new rule',async()=>{
    await combined();await legacy(v.c2);await legacy(v.c3);
    await configure();
    const before=(await call(v.alex,'rpc_assessor_overall_award_state')).awards;
    expect(before).toEqual([]);expect(await count()).toBe(0);
    await call(v.alex,'rpc_assessor_overall_award_ensure');
    await sql("update assessor_rollout_private.overall_award_contracts set enabled=false where program_id=$1",[v.program]);
    expect(await status()).toBe('update_required');
    await sql('insert into assessor_rollout_private.overall_award_contracts values($1,$2,$3,$4,true)',
      [v.program,'overall-v2',JSON.stringify(rule),'LOCAL SYNTHETIC REVIEW V2']);
    expect(await status()).toBe('update_required');
    await call(v.alex,'rpc_assessor_overall_award_ensure');
    expect(await count()).toBe(2);
  });
  it('scopes reads and recovery to the signed-in assessor',async()=>{
    await configure();await combined();await legacy(v.c2);await legacy(v.c3);
    expect((await call(v.other,'rpc_assessor_overall_award_state')).awards).toEqual([]);
    await expect(call(v.other,'rpc_assessor_overall_award_ensure')).rejects.toThrow(/prerequisites incomplete/);
    expect(await count()).toBe(1);
  });
  it('rejects malformed three-chapter rules',async()=>{
    await expect(sql('insert into assessor_rollout_private.overall_award_contracts values($1,$2,$3,$4,true)',
      [v.program,'bad',JSON.stringify({'chapter-1':rule['chapter-1']}),'LOCAL'])).rejects.toThrow(/exactly three/);
  });
});
