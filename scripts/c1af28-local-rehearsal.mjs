// Full-schema, rollback-only rehearsal. Never runs against a hosted project.
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {loadReferenceModule,contentHash} from './lib/reference-content.mjs';
import {registryPackage} from './c1af27-registry.mjs';
const url=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??'http://127.0.0.1:54321');
if(!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='54321')throw Error('Disposable local Supabase required');
const q=v=>"'"+String(v).replaceAll("'","''")+"'";
const json=v=>q(JSON.stringify(v))+'::jsonb';
const p=registryPackage(),course=randomUUID(),program=randomUUID(),chapter=randomUUID();
const sql=[`begin;
create temp table before_legacy as select to_jsonb(q) row from public.assessor_chapter_qualifications q;
insert into public.courses(id,org_unit_id,author_user_id,title_fil,title_en,status)
select '${course}',org_unit_id,id,'LOCAL C1AF-27','LOCAL C1AF-27','published' from public.users where username='admin.city.stable';
insert into public.training_programs(id,content_key,org_unit_id,author_user_id,title_fil,title_en,status)
select '${program}','bhw-reference-manual',org_unit_id,id,'LOCAL C1AF-27','LOCAL C1AF-27','published' from public.users where username='admin.city.stable';
insert into public.training_program_chapters(id,program_id,chapter_key,position,title_fil,title_en,course_id,availability)
values('${chapter}','${program}','chapter-1',0,'Kabanata I','Chapter I','${course}','available');`];
let modulePosition=0;
for(const folder of new Set(p.lessons.map(l=>l.module_key))){
 const m=loadReferenceModule('content/training/day1-basic-competencies/modules/'+folder,'public');
 const moduleId=randomUUID();
 sql.push(`insert into public.course_modules(id,course_id,position,type,title_fil,title_en) values('${moduleId}','${course}',${modulePosition++},'text','LOCAL C1AF-27','LOCAL C1AF-27');`);
 for(const l of m.lessons){const lesson=randomUUID(),revision=randomUUID();
  sql.push(`insert into public.course_lessons(id,module_id,lesson_key,position,title_fil,title_en,objectives_fil,objectives_en,required)
 values('${lesson}','${moduleId}',${q(l.manifest.lesson_key)},${l.manifest.position},${q(l.manifest.title_fil)},${q(l.manifest.title_en)},
 array[${l.manifest.objectives_fil.map(q)}],array[${l.manifest.objectives_en.map(q)}],true);
 insert into public.course_lesson_revisions(id,lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,featured_asset_id,created_by)
 select '${revision}','${lesson}','c1af27-local',${q(contentHash(l))},${json(l.revision.read_sections)},${json(l.revision.slides)},${json(l.revision.coverage)},
 ${json(l.revision.sources)},${json(l.revision.assets)},${l.revision.featured_asset_id?q(l.revision.featured_asset_id):'null'},id from public.users where username='admin.city.stable';
 insert into public.course_lesson_facilitator_notes(revision_id,notes_fil,notes_en,observation_indicators)
 values('${revision}',${q(l.notes.notes_fil)},${q(l.notes.notes_en)},${json(l.notes.observation_indicators)});
 update public.course_lessons set published_revision_id='${revision}' where id='${lesson}';`);
 }
}
const assessor=randomUUID(),auth=randomUUID(),future=randomUUID(),futureAuth=randomUUID();
sql.push(`select assessor_rollout_private.install_chapter1_policy('${chapter}');
insert into auth.users(id,email) values('${auth}','c1af28-local@bhw.local'),('${futureAuth}','c1af28-future@bhw.local');
insert into public.users(id,auth_user_id,username,full_name,role,org_unit_id,status)
select '${assessor}','${auth}','c1af28.local','Local Assessor','assessor',org_unit_id,'active' from public.users where username='admin.city.stable';
insert into public.assessor_flow_cohorts(program_id,chapter_key,cohort_key,requirements_version,ui_enabled)
values('${program}','chapter-1','preparation','chapter-1:c1af.draft-1',true);
insert into public.assessor_flow_cohort_members(program_id,chapter_key,user_id,cohort_id)
select '${program}','chapter-1','${assessor}',id from public.assessor_flow_cohorts where program_id='${program}';
insert into assessor_rollout_private.simulation_runs values('${assessor}','${program}','{"requirementsVersion":"chapter-1:c1af.draft-1","draftMarker":true}');
insert into assessor_rollout_private.simulation_requests values('${assessor}','${program}',gen_random_uuid(),'{"draftRequest":true}');
-- A drifted publication must leave controls, membership and evidence untouched.
do $$ declare rev uuid; lesson uuid; begin
 select r.id,l.id into rev,lesson from public.course_lesson_revisions r
 join public.course_lessons l on l.published_revision_id=r.id join public.course_modules m on m.id=l.module_id where m.course_id='${course}' limit 1;
 update public.course_lessons set published_revision_id=null where id=lesson;
 begin
  perform assessor_rollout_private.release_chapter1_pilot('${chapter}');
  raise exception 'drift accepted';
 exception when others then if sqlerrm not like 'published registry drift:%' then raise; end if; end;
 if not exists(select 1 from assessor_rollout_private.simulation_runs where actor_id='${assessor}' and program_id='${program}')
 or exists(select 1 from public.assessor_flow_cohorts where program_id='${program}' and authority_cutover_at is not null)
 then raise exception 'drift rejection mutated release'; end if;
 update public.course_lessons set published_revision_id=rev where id=lesson;
end $$;
select assessor_rollout_private.release_chapter1_pilot('${chapter}');
insert into public.users(id,auth_user_id,username,full_name,role,org_unit_id,status)
select '${future}','${futureAuth}','c1af28.future','Future BHW','bhw',org_unit_id,'invited' from public.users where username='admin.city.stable';
do $$ begin
 if exists(select 1 from public.assessor_flow_cohort_members where user_id='${future}') then raise exception 'inactive account enrolled'; end if;
end $$;
update public.users set status='active' where id='${future}';
select set_config('request.jwt.claim.sub','${auth}',true);
do $$ begin
 if not exists(select 1 from public.assessor_flow_cohort_members where program_id='${program}' and user_id='${future}') then raise exception 'future activation not enrolled'; end if;
 if exists(select 1 from public.users u where u.role in ('bhw','assessor') and u.status='active'
 and public.org_unit_path(u.org_unit_id) like public.org_unit_path((select org_unit_id from public.training_programs where id='${program}'))||'%'
 and not exists(select 1 from public.super_admin_personas where persona_user_id=u.id)
 and not exists(select 1 from public.assessor_flow_cohort_members where user_id=u.id and program_id='${program}')) then raise exception 'eligible user missing'; end if;
 if (select count(*) from assessor_rollout_private.practice_criteria where chapter_id='${chapter}' and enabled)<>42
 or (select count(*) from assessor_rollout_private.component_requirements where chapter_id='${chapter}' and enabled)<>9
 or not exists(select 1 from assessor_rollout_private.award_contracts where requirements_version='${p.requirements_version}' and enabled)
 then raise exception 'registry not enabled'; end if;
 if (select count(*) from public.feature_flags where key in ('elearning','assessor_flow_ui','assessor_flow_writes','assessor_flow_awards') and enabled)<>4 then raise exception 'global gates not enabled'; end if;
 if not exists(select 1 from public.assessor_flow_cohorts where program_id='${program}' and requirements_version='${p.requirements_version}'
 and ui_enabled and writes_enabled and awards_enabled and authority_cutover_at is not null
 and authority_cutover_by is null and authority_cutover_decision_id='c1af28-all-pilot-2026-10-16') then raise exception 'cutover identity/gates wrong'; end if;
 if not exists(select 1 from assessor_rollout_private.preparation_simulation_archive where actor_id='${assessor}' and program_id='${program}'
 and state->>'draftMarker'='true' and jsonb_array_length(requests)=1)
 or exists(select 1 from assessor_rollout_private.simulation_runs where actor_id='${assessor}' and program_id='${program}') then raise exception 'draft not preserved and freed'; end if;
 if assessor_rollout_private.policy('${program}','chapter-1')->>'requirementsVersion'<>'${p.requirements_version}' then raise exception 'policy not visible'; end if;
 if assessor_rollout_private.chapter_write_scope('${course}','${assessor}',null) then raise exception 'unqualified assessor gained authority'; end if;
 begin
  update public.assessor_flow_cohorts set authority_cutover_decision_id='c1af27-owner-2026-10-15' where program_id='${program}';
  raise exception 'cutover decision mutable';
 exception when others then if sqlerrm<>'authority cutover is permanent' then raise; end if; end;
 begin
  delete from public.assessor_flow_cohort_members where program_id='${program}' and user_id='${future}';
  raise exception 'cutover member removable';
 exception when others then if sqlerrm<>'cutover membership cannot be removed or reassigned' then raise; end if; end;
 if has_function_privilege('authenticated','assessor_rollout_private.release_chapter1_pilot(uuid)','execute')
 or has_function_privilege('anon','assessor_rollout_private.release_chapter1_pilot(uuid)','execute')
 then raise exception 'release callable by app'; end if;
 if exists((select row from before_legacy except select to_jsonb(q) from public.assessor_chapter_qualifications q)
 union all (select to_jsonb(q) from public.assessor_chapter_qualifications q except select row from before_legacy)) then raise exception 'legacy qualifications changed'; end if;
 if exists(select 1 from assessor_rollout_private.chapter_awards where program_id='${program}') then raise exception 'award fabricated'; end if;
end $$;
select jsonb_build_object('criteria',42,'components',9,'enabled',true,'future_enrollment',true,'draft_archived',true,'qualification_guard',true,'legacy_unchanged',true) as c1af28_rehearsal;
rollback;`);
const output=execFileSync('docker',['exec','-i','supabase_db_bhw-connect-phase-2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-Atq'],
 {input:sql.join('\n'),encoding:'utf8',timeout:90000,maxBuffer:2*1024*1024});
process.stdout.write(output);
