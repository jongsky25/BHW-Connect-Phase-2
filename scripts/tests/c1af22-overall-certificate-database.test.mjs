// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,beforeEach,afterEach,describe,it,expect} from 'vitest';

const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const v={org:id(1),otherOrg:id(2),alex:id(3),admin:id(4),other:id(5),program:id(6),c1:id(7),c2:id(8),c3:id(9),
  course1:id(10),course2:id(11),course3:id(12),combined:id(13)};
const rule={'chapter-1':{kind:'combined',requirementsVersion:'c1-v1',awardRuleVersion:'rule-v1'},
  'chapter-2':{kind:'legacy',curriculumVersion:'curr-v1',rubricVersion:'rubric-v1',orientationVersion:'orient-v1'},
  'chapter-3':{kind:'legacy',curriculumVersion:'curr-v1',rubricVersion:'rubric-v1',orientationVersion:'orient-v1'}};
let db;
const sql=(query,args=[])=>db.query(query,args).then(r=>r.rows);
const read=file=>readFileSync(new URL(`../../supabase/migrations/${file}`,import.meta.url),'utf8');
async function call(actor,fn,args=[],role='authenticated'){
  await db.exec('savepoint rpc_call');
  try{
    await db.exec(`set local role ${role}`);
    await sql("select set_config('test.actor',$1,true)",[actor??'']);
    const result=(await sql(`select public.${fn}(${args.map((_,i)=>`$${i+1}`).join(',')}) result`,args))[0].result;
    await db.exec('reset role');
    await sql("select set_config('test.actor',$1,true)",[v.alex]);
    await db.exec('release savepoint rpc_call');
    return result;
  }catch(error){await db.exec('rollback to savepoint rpc_call');throw error;}
}
async function contract(){
  await sql('insert into assessor_rollout_private.overall_award_contracts values($1,$2,$3,$4,true,$5)',
    [v.program,'overall-v1',JSON.stringify(rule),'LOCAL TEST REVIEW',JSON.stringify({organization:'LOCAL TEST ONLY',signatory:'Fixture',title:'Test issuer'})]);
}
async function combined(){
  await sql("insert into assessor_rollout_private.chapter_awards values($1,$2,$3,$4,'c1-v1','active',$5,now())",
    [v.combined,v.alex,v.c1,v.program,id(90)]);
}
async function legacy(chapter,key){
  await sql("insert into public.assessor_chapter_qualifications values($1,$2,$3,'curr-v1','rubric-v1','orient-v1','active',now())",
    [key,v.alex,chapter]);
}
const issued=async()=>((await sql('select id,certificate_id from assessor_rollout_private.overall_awards'))[0]);
async function complete(){await contract();await combined();await legacy(v.c2,id(91));await legacy(v.c3,id(92));return issued();}

beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`
    create role authenticated; create role anon;
    create schema assessor_rollout_private;
    grant usage on schema assessor_rollout_private to authenticated,anon;
    create table public.org_units(id uuid primary key,path text);
    create table public.users(id uuid primary key,role text,status text,org_unit_id uuid,full_name text);
    create function public.current_app_user() returns public.users language sql stable security definer set search_path='' as $$
      select u from public.users u where u.id::text=nullif(current_setting('test.actor',true),'') $$;
    create function public.org_unit_path(p_id uuid) returns text language sql stable security definer set search_path='' as $$
      select path from public.org_units where id=p_id $$;
    create function public.current_org_path() returns text language sql stable security definer set search_path='' as $$
      select o.path from public.org_units o join public.users u on u.org_unit_id=o.id
      where u.id::text=nullif(current_setting('test.actor',true),'') $$;
    create table public.super_admin_personas(persona_user_id uuid);
    create table public.training_programs(id uuid primary key,content_key text,status text,org_unit_id uuid,title_fil text,title_en text);
    create table public.courses(id uuid primary key,status text);
    create table public.training_program_chapters(id uuid primary key,program_id uuid,chapter_key text,availability text,course_id uuid);
    create table public.assessor_chapter_qualifications(id uuid primary key,assessor_user_id uuid,chapter_id uuid,
      curriculum_version text,rubric_version text,orientation_version text,status text,issued_at timestamptz);
    create table assessor_rollout_private.award_contracts(requirements_version text primary key,award_rule_version text);
    create table assessor_rollout_private.chapter_awards(id uuid primary key,actor_id uuid,chapter_id uuid,program_id uuid,
      requirements_version text,status text,certificate_id uuid,issued_at timestamptz);
    create function assessor_rollout_private.certificate_current_status(p_award_id uuid) returns text
      language sql stable security definer set search_path='' as $$
        select status from assessor_rollout_private.chapter_awards where id=p_award_id $$;
    create function assessor_rollout_private.require_award_admin() returns public.users
      language plpgsql stable security definer set search_path='' as $$
      declare a public.users; begin a:=public.current_app_user();
      if a.id is null or a.role<>'admin' or a.status<>'active' then raise exception 'not authorized'; end if;
      return a; end $$;
    create table public.audit_events(id uuid primary key default gen_random_uuid(),actor_user_id uuid,event_type text,
      subject_type text,subject_id uuid,metadata jsonb,plain_summary_fil text,plain_summary_en text);
  `);
  await db.exec(read('20261014073710_c1af21_overall_award.sql'));
  await db.exec(read('20261014092418_c1af22_overall_certificate.sql'));
  await sql('insert into public.org_units values($1,$2),($3,$4)',[v.org,'city.',v.otherOrg,'away.']);
  for(const [person,role,org] of [[v.alex,'assessor',v.org],[v.admin,'admin',v.org],[v.other,'assessor',v.otherOrg]])
    await sql("insert into public.users values($1,$2,'active',$3,$4)",[person,role,org,person+' Fixture']);
  await sql("insert into public.training_programs values($1,'bhw-reference-manual','published',$2,'Manwal na Pagsasanay','Training Manual')",[v.program,v.org]);
  for(const [course,chapter,key] of [[v.course1,v.c1,'chapter-1'],[v.course2,v.c2,'chapter-2'],[v.course3,v.c3,'chapter-3']]){
    await sql("insert into public.courses values($1,'published')",[course]);
    await sql("insert into public.training_program_chapters values($1,$2,$3,'available',$4)",[chapter,v.program,key,course]);
  }
  await sql("insert into assessor_rollout_private.award_contracts values('c1-v1','rule-v1')");
});
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{await db.exec('begin');await sql("select set_config('test.actor',$1,true)",[v.alex]);});
afterEach(async()=>{await db.exec('rollback');});

describe('C1AF-22 overall certificate',()=>{
  it('shows exact compatible progress and the missing next step without issuing on reads',async()=>{
    const absent=await call(v.alex,'rpc_assessor_overall_progress',[v.program]);
    expect(absent).toMatchObject({qualifiedCount:0,requiredCount:3,ruleAvailable:false,nextStep:'await_rule',awards:[]});
    await contract();await combined();await legacy(v.c2,id(91));
    const partial=await call(v.alex,'rpc_assessor_overall_progress',[v.program]);
    expect(partial).toMatchObject({qualifiedCount:2,nextStep:'complete_chapter-3'});
    expect(partial.chapters.map(c=>c.status)).toEqual(['qualified','qualified','missing']);
    expect((await sql('select count(*) n from assessor_rollout_private.overall_awards'))[0].n).toBe(0);
    await legacy(v.c3,id(92));
    const done=await call(v.alex,'rpc_assessor_overall_progress',[v.program]);
    expect(done.qualifiedCount).toBe(3);expect(done.nextStep).toBeNull();expect(done.awards).toHaveLength(1);
  });
  it('captures owner display and exact source links, while protecting foreign records',async()=>{
    const award=await complete();
    const c=await call(v.alex,'rpc_assessor_overall_certificate_owner',[award.certificate_id]);
    expect(c).toMatchObject({certificateId:award.certificate_id,displayVersion:1,status:'active',currentPermission:false,
      programTitleEn:'Training Manual',issuerOrganization:'LOCAL TEST ONLY'});
    expect(c.sources.map(s=>s.chapterKey)).toEqual(['chapter-1','chapter-2','chapter-3']);
    expect(c.sources[0].chapterCertificateId).toBe(id(90));
    expect(await call(v.other,'rpc_assessor_overall_certificate_owner',[award.certificate_id])).toBeNull();
    await expect(call(v.other,'rpc_assessor_overall_progress',[v.program])).rejects.toThrow(/program unavailable/);
  });
  it('gates public verification and returns only approved fields after synthetic disclosure',async()=>{
    const award=await complete();
    expect(await call(null,'rpc_assessor_overall_certificate_verify',[award.certificate_id],'anon')).toEqual({available:false});
    await sql('update assessor_rollout_private.overall_certificate_output_control set public_verification_enabled=true');
    const result=await call(null,'rpc_assessor_overall_certificate_verify',[award.certificate_id],'anon');
    expect(result).toMatchObject({available:true,found:true,status:'active',certificateType:'assessor_facilitator_overall',currentPermission:false});
    expect(JSON.stringify(result)).not.toMatch(/Fixture|holderName|signatory|sourceId|actorId|catchment/);
    expect(await call(null,'rpc_assessor_overall_certificate_verify',['SAMPLE'],'anon')).toEqual({available:true,found:false});
  });
  it('propagates source status and keeps explicit overall suspension until deliberate restoration',async()=>{
    const award=await complete();
    await sql("update public.assessor_chapter_qualifications set status='suspended' where id=$1",[id(92)]);
    expect((await call(v.alex,'rpc_assessor_overall_certificate_owner',[award.certificate_id])).status).toBe('suspended');
    await sql("update public.assessor_chapter_qualifications set status='active' where id=$1",[id(92)]);
    expect((await call(v.alex,'rpc_assessor_overall_certificate_owner',[award.certificate_id])).status).toBe('active');
    await expect(call(v.admin,'rpc_admin_assessor_overall_award_set_status',[award.id,'active',null,'suspended','Local synthetic policy reason'])).rejects.toThrow(/policy is not enabled/);
    await sql("update assessor_rollout_private.overall_lifecycle_control set mutations_enabled=true,policy_reference='LOCAL TEST POLICY'");
    expect(await call(v.admin,'rpc_admin_assessor_overall_award_set_status',[award.id,'active',null,'suspended','Local synthetic policy reason'])).toBe(true);
    await sql("update public.assessor_chapter_qualifications set status='suspended' where id=$1",[id(92)]);
    await sql("update public.assessor_chapter_qualifications set status='active' where id=$1",[id(92)]);
    expect((await call(v.alex,'rpc_assessor_overall_certificate_owner',[award.certificate_id])).status).toBe('suspended');
    const changed=(await sql('select status_changed_at from assessor_rollout_private.overall_awards where id=$1',[award.id]))[0].status_changed_at;
    expect(await call(v.admin,'rpc_admin_assessor_overall_award_set_status',[award.id,'suspended',changed,'active','Local synthetic restoration reason'])).toBe(true);
    expect((await call(v.alex,'rpc_assessor_overall_certificate_owner',[award.certificate_id])).status).toBe('active');
  });
  it('revokes terminally and preserves historical identity and display',async()=>{
    const award=await complete();
    await sql("update assessor_rollout_private.overall_lifecycle_control set mutations_enabled=true,policy_reference='LOCAL TEST POLICY'");
    await call(v.admin,'rpc_admin_assessor_overall_award_set_status',[award.id,'active',null,'revoked','Local synthetic revocation reason']);
    expect((await call(v.alex,'rpc_assessor_overall_certificate_owner',[award.certificate_id])).status).toBe('revoked');
    expect((await call(v.alex,'rpc_assessor_overall_progress',[v.program])).awards[0].certificateId).toBe(award.certificate_id);
    expect((await sql('select count(*) n from assessor_rollout_private.overall_lifecycle_events'))[0].n).toBe(1);
    const changed=(await sql('select status_changed_at from assessor_rollout_private.overall_awards where id=$1',[award.id]))[0].status_changed_at;
    await expect(call(v.admin,'rpc_admin_assessor_overall_award_set_status',[award.id,'revoked',changed,'active','Local synthetic restoration reason'])).rejects.toThrow(/transition not permitted/);
  });
});
