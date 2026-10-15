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
sql.push(`select assessor_rollout_private.install_chapter1_policy('${chapter}');
do $$ begin
 if (select count(*) from assessor_rollout_private.practice_criteria where chapter_id='${chapter}' and not enabled)<>42
 or (select count(*) from assessor_rollout_private.component_requirements where chapter_id='${chapter}' and not enabled)<>9
 or exists(select 1 from assessor_rollout_private.award_contracts where requirements_version='${p.requirements_version}' and enabled)
 then raise exception 'disabled registry counts differ'; end if;
 if exists((select row from before_legacy except select to_jsonb(q) from public.assessor_chapter_qualifications q)
 union all (select to_jsonb(q) from public.assessor_chapter_qualifications q except select row from before_legacy)) then raise exception 'legacy qualifications changed'; end if;
end; $$;
select jsonb_build_object('criteria',42,'components',9,'enabled',false,'legacy_unchanged',true) as c1af27_rehearsal;
rollback;`);
const output=execFileSync('docker',['exec','-i','supabase_db_bhw-connect-phase-2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-Atq'],
 {input:sql.join('\n'),encoding:'utf8',timeout:90000,maxBuffer:2*1024*1024});
process.stdout.write(output);
