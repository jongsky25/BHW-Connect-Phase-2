// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {expect,it} from 'vitest';
import {releaseReportSql} from '../c1af28-release-report.mjs';
it('counts actual eligible accounts separately from personas, inactive and out-of-scope accounts',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create table public.assessor_flow_cohorts(id int,program_id int,chapter_key text,authority_cutover_decision_id text);
  create table public.training_programs(id int,org_unit_id int,content_key text);
  create table public.users(id int,role text,status text,org_unit_id int);
  create table public.super_admin_personas(persona_user_id int);
  create table public.assessor_flow_cohort_members(cohort_id int,user_id int);
  create function public.org_unit_path(int) returns text language sql immutable as $$select case $1 when 1 then 'root.city.' when 2 then 'root.city.barangay.' else 'root.other.' end$$;
  insert into public.training_programs values(1,1,'bhw-reference-manual');
  insert into public.assessor_flow_cohorts values(1,1,'chapter-1','c1af28-all-pilot-2026-10-16');
  insert into public.users values(1,'assessor','active',1),(2,'assessor','active',1),(3,'bhw','active',2),
  (4,'bhw','active',2),(5,'bhw','deactivated',2),(6,'bhw','active',3),(7,'admin','active',1);
  insert into public.super_admin_personas values(2);
  insert into public.assessor_flow_cohort_members values(1,1),(1,3);`);
  expect((await db.query(releaseReportSql)).rows).toEqual([
   {role:'assessor',eligible:1,enrolled:1,excluded_personas:1,missing_eligible:0,unexpected_persona_members:0},
   {role:'bhw',eligible:2,enrolled:1,excluded_personas:0,missing_eligible:1,unexpected_persona_members:0},
  ]);
  await db.exec('insert into public.assessor_flow_cohort_members values(1,2)');
  expect((await db.query(releaseReportSql)).rows[0].unexpected_persona_members).toBe(1);
 }finally{await db.close();}
});
