// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
let db;
const sql=readFileSync('supabase/migrations/20261016080000_c1af28_all_pilot_release.sql','utf8');
const id='00000000-0000-4000-8000-000000000001';
beforeAll(async()=>{
 db=new PGlite();
 await db.exec(`create schema assessor_rollout_private;
 create table assessor_rollout_private.owner_policy_decisions(id text primary key,package jsonb);
 create table public.users(id uuid primary key);
 insert into public.users values('${id}');
 create table public.assessor_flow_cohorts(id int primary key,program_id uuid,chapter_key text,requirements_version text,
 authority_cutover_at timestamptz,authority_cutover_by uuid references public.users,
 check((authority_cutover_at is null)=(authority_cutover_by is null)));
 insert into public.assessor_flow_cohorts values(1,'${id}','chapter-1','pilot',null,null),
 (2,'${id}','chapter-1','pilot',now(),'${id}');`);
 await db.exec(sql.slice(sql.indexOf('insert into assessor_rollout_private.owner_policy_decisions'),sql.indexOf('-- Privileged migration-only activation')));
 await db.exec(`create trigger preserve_cutover before update or delete on public.assessor_flow_cohorts
 for each row execute function assessor_rollout_private.preserve_cutover();`);
});
afterAll(async()=>{await db?.close();});
describe('C1AF-28 external owner cutover authorization',()=>{
 it('preserves pre-existing app-authorized cutovers',async()=>{
  await expect(db.exec('update public.assessor_flow_cohorts set authority_cutover_by=null where id=2')).rejects.toThrow('authority cutover is permanent');
 });
 it('rejects a decision without cutover and an unauthorized cutover',async()=>{
  await expect(db.exec("update public.assessor_flow_cohorts set authority_cutover_decision_id='c1af28-all-pilot-2026-10-16' where id=1")).rejects.toThrow('cutover_authorization');
  await expect(db.exec('update public.assessor_flow_cohorts set authority_cutover_at=now() where id=1')).rejects.toThrow('cutover_authorization');
 });
 it('rejects fabricated decision references and dual attribution',async()=>{
  await expect(db.exec("update public.assessor_flow_cohorts set authority_cutover_at=now(),authority_cutover_decision_id='missing' where id=1")).rejects.toThrow('foreign key');
  await expect(db.exec(`update public.assessor_flow_cohorts set authority_cutover_at=now(),authority_cutover_by='${id}',authority_cutover_decision_id='c1af28-all-pilot-2026-10-16' where id=1`)).rejects.toThrow('cutover_authorization');
 });
 it('records the owner directly and makes the release identity permanent',async()=>{
  await db.exec("update public.assessor_flow_cohorts set authority_cutover_at=now(),authority_cutover_decision_id='c1af28-all-pilot-2026-10-16' where id=1");
  const {rows}=await db.query('select authority_cutover_by,authority_cutover_decision_id from public.assessor_flow_cohorts where id=1');
  expect(rows[0]).toEqual({authority_cutover_by:null,authority_cutover_decision_id:'c1af28-all-pilot-2026-10-16'});
  for(const change of ["authority_cutover_at=null,authority_cutover_decision_id=null","requirements_version='draft'","authority_cutover_decision_id=null"]){
   await expect(db.exec('update public.assessor_flow_cohorts set '+change+' where id=1')).rejects.toThrow('authority cutover is permanent');
  }
  await expect(db.exec('delete from public.assessor_flow_cohorts where id=1')).rejects.toThrow('authority cutover is permanent');
 });
});
