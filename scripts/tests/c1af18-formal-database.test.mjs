// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';

const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const v={org:id(1),awayOrg:id(2),alex:id(3),other:id(4),maria:id(5),away:id(6),
  program:id(7),chapter:id(8),course:id(9),module:id(10),otherModule:id(11),
  lesson:id(12),revision:id(13),newRevision:id(14),cohort:id(15),progress:id(16),
  release:'reviewed-v1',attempt:id(17),assignment:id(18)};
let db;
let request;let attempt;
async function as(actor,sql,args=[]){
  await db.exec('begin');
  try{
    await db.exec(`set local role ${actor?'authenticated':'anon'}`);
    await db.query("select set_config('test.actor',$1,true)",[actor??'']);
    const rows=(await db.query(sql,args)).rows;
    await db.exec('commit');return rows[0]?.result;
  }catch(error){await db.exec('rollback');throw error;}
}
const readiness=(actor=v.alex,learner=v.maria)=>as(actor,
  'select rpc_assessor_component_readiness($1,$2) result',[v.program,learner]);
const item=async(actor=v.alex)=>((await readiness(actor))[0]);
const create=(actor=v.alex,key=id(101),learner=v.maria,module=v.module)=>as(actor,
  'select rpc_assessor_component_request_create($1,$2,$3,$4) result',[key,v.program,learner,module]);
const claim=(actor,request,key=id(102))=>as(actor,
  'select rpc_assessor_component_request_claim($1,$2) result',[key,request]);
const arrange=(actor,request,key=id(103),date='2030-01-01T12:00:00Z')=>as(actor,
  'select rpc_assessor_component_arrangement_set($1,$2,$3,$4,$5) result',
  [key,request,date,'Barangay hall','Quiet room']);
const close=(actor,request,action,key=id(105))=>as(actor,
  'select rpc_assessor_component_request_close($1,$2,$3) result',[key,request,action]);

beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`
    create role authenticated; create role anon;
    create schema assessor_rollout_private; create schema learner_assessment_private;
    grant usage on schema assessor_rollout_private to authenticated;
    create table org_units(id uuid primary key,path text);
    create table users(id uuid primary key,role text,status text,org_unit_id uuid,full_name text);
    create function current_app_user() returns users language sql stable security definer set search_path=public as $$
      select u from users u where u.id::text=nullif(current_setting('test.actor',true),'') $$;
    create function org_unit_path(p_id uuid) returns text language sql stable security definer set search_path=public as $$
      select path from org_units where id=p_id $$;
    create table super_admin_personas(persona_user_id uuid);
    create table feature_flags(key text,enabled boolean,disabled_roles text[]);
    create table training_programs(id uuid primary key,content_key text,status text);
    create table courses(id uuid primary key,status text);
    create table training_program_chapters(id uuid primary key,program_id uuid,chapter_key text,availability text,course_id uuid);
    create table course_modules(id uuid primary key,course_id uuid,position int,title_fil text,title_en text);
    create table course_lessons(id uuid primary key,module_id uuid,published_revision_id uuid);
    create table course_progress(id uuid primary key,course_id uuid,bhw_user_id uuid);
    create table course_lesson_progress(course_progress_id uuid,lesson_id uuid,revision_id uuid);
    create table assessor_flow_cohorts(id uuid primary key,program_id uuid,chapter_key text,
      requirements_version text,ui_enabled boolean,writes_enabled boolean,authority_cutover_at timestamptz);
    create table assessor_flow_cohort_members(cohort_id uuid,user_id uuid);
    create table assessor_rollout_private.award_contracts(requirements_version text primary key,
      rubric_version text,enabled boolean);
    create table assessor_rollout_private.chapter_awards(actor_id uuid,chapter_id uuid,
      requirements_version text,status text);
    create table assessor_rollout_private.practice_criteria(chapter_id uuid,criterion_id text,
      criterion_version text,lesson_id uuid,lesson_revision_id uuid,requirements_version text,
      rubric_version text,enabled boolean,source_fingerprint text,rubric_snapshot jsonb,primary key(chapter_id,criterion_id,criterion_version));
    create table learner_assessment_private.releases(id text primary key,status text,
      comparability_status text,program_key text,chapter_key text);
    create table learner_assessment_private.enrollments(learner_id uuid,course_id uuid,release_id text);
    create table learner_assessment_private.attempts(learner_id uuid,course_id uuid,release_id text,
      phase text,state text);
    create table notifications(recipient_user_id uuid,notification_type text,subject_type text,
      subject_id uuid,title_fil text,title_en text,body_fil text,body_en text,link_path text,
      constraint notifications_notification_type_check check(notification_type in
        ('announcement.created','survey.published','course.published','assessment.decided',
        'forum.reply','flipchart.reviewed','user.transferred','course_session.enrolled',
        'feedback.reply','practice.feedback_released')));
  `);
  await db.query('insert into org_units values($1,$2),($3,$4)',[v.org,'city.',v.awayOrg,'away.']);
  for(const [person,role,org] of [[v.alex,'assessor',v.org],[v.other,'assessor',v.org],
    [v.maria,'bhw',v.org],[v.away,'bhw',v.awayOrg]])
    await db.query('insert into users values($1,$2,$3,$4,$5)',[person,role,'active',org,person]);
  await db.query("insert into feature_flags values('elearning',true,'{}'),('assessor_flow_ui',true,'{}'),('assessor_flow_writes',false,'{}')");
  await db.query("insert into training_programs values($1,'bhw-reference-manual','published')",[v.program]);
  await db.query("insert into courses values($1,'published')",[v.course]);
  await db.query("insert into training_program_chapters values($1,$2,'chapter-1','available',$3)",[v.chapter,v.program,v.course]);
  await db.query("insert into course_modules values($1,$3,0,'Bahagi 1','Component 1'),($2,$3,1,'Bahagi 2','Component 2')",
    [v.module,v.otherModule,v.course]);
  await db.query('insert into course_lessons values($1,$2,$3)',[v.lesson,v.module,v.revision]);
  await db.query("insert into assessor_flow_cohorts values($1,$2,'chapter-1','req1',true,false,null)",[v.cohort,v.program]);
  await db.query('insert into assessor_flow_cohort_members values($1,$2),($1,$3),($1,$4)',
    [v.cohort,v.alex,v.other,v.maria]);
  await db.query("insert into assessor_rollout_private.award_contracts values('req1','rubric1',true)");
  await db.query("insert into assessor_rollout_private.practice_criteria values($1,'clarify','v1',$2,$3,'req1','rubric1',true,repeat('a',64),'{\"observable\":{\"fil\":\"Linawin\",\"en\":\"Clarify\"},\"levels\":{\"kaya_na\":{\"fil\":\"Kaya na\",\"en\":\"Can do\"},\"kailangan_practice\":{\"fil\":\"Kailangan\",\"en\":\"Needs practice\"},\"hindi_pa\":{\"fil\":\"Hindi pa\",\"en\":\"Not yet\"}}}'::jsonb)",
    [v.chapter,v.lesson,v.revision]);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261014002817_c1af16_component_readiness.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261014021413_c1af17_requests_arrangements.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261014025937_c1af18_formal_attempts.sql',import.meta.url),'utf8'));
},30000);
afterAll(async()=>db?.close());

const state=(actor=v.alex)=>as(actor,'select rpc_assessor_formal_state($1) result',[request]);
const start=(actor=v.alex,key=id(301))=>as(actor,
  'select rpc_assessor_formal_start($1,$2) result',[key,request]);
const save=(actor=v.alex,revision=0,evidence=[])=>as(actor,
  'select rpc_assessor_formal_save($1,$2,$3::jsonb) result',[attempt,revision,JSON.stringify(evidence)]);
const submit=(actor=v.alex,key=id(302),revision=1)=>as(actor,
  'select rpc_assessor_formal_submit($1,$2,$3) result',[key,attempt,revision]);
const evidence=(sufficiency='sufficient',rating='kaya_na')=>[{
  id:'clarify',sufficiency,rating:sufficiency==='sufficient'?rating:null,
  facts:'The learner explained the referral steps aloud.',nextStep:'Continue supervised work.'}];

describe('C1AF-18 exact formal attempt migration',()=>{
  it('keeps start closed until arrangement and approved readiness, then resumes one draft',async()=>{
    await expect(as(v.alex,'select count(*) from assessor_rollout_private.formal_attempts'))
      .rejects.toThrow(/permission denied/);
    await expect(start()).rejects.toThrow(/start unavailable/);
    await db.query(`insert into assessor_rollout_private.component_requirements
      (module_id,chapter_id,requirements_version,rubric_version,review_reference,approved_by,
       enabled,purpose_fil,purpose_en) values($1,$2,'req1','rubric1','review-1',$3,true,
       'Suriin ang kakayahan sa malinaw na paliwanag.','Assess the ability to explain clearly.')`,
      [v.module,v.chapter,v.alex]);
    await db.query('insert into assessor_rollout_private.component_required_lessons values($1,$2)',[v.module,v.lesson]);
    await db.query(`insert into assessor_rollout_private.component_required_criteria
      values($1,$2,'clarify','v1','Malinaw na paglilinaw','Clear clarification')`,[v.module,v.chapter]);
    await db.query('insert into course_progress values($1,$2,$3)',[v.progress,v.course,v.maria]);
    await db.query('insert into course_lesson_progress values($1,$2,$3)',[v.progress,v.lesson,v.revision]);
    await db.query("insert into assessor_rollout_private.chapter_awards values($1,$3,'req1','active'),($2,$3,'req1','active')",
      [v.alex,v.other,v.chapter]);
    await db.query("update feature_flags set enabled=true where key='assessor_flow_writes'");
    await db.query('update assessor_flow_cohorts set writes_enabled=true,authority_cutover_at=now() where id=$1',[v.cohort]);
    request=await create();
    await claim(v.alex,request);
    await expect(start()).rejects.toThrow(/start unavailable/);
    await arrange(v.alex,request);
    attempt=await start();
    expect(await start()).toBe(attempt);
    expect((await state()).attempt).toMatchObject({id:attempt,status:'draft',revision:0});
    await expect(start(v.other,id(303))).rejects.toThrow(/start unavailable/);
    await expect(close(v.alex,request,'release',id(304))).rejects.toThrow(/formal assessment already started/);
  });
  it('rejects incomplete checklist, stale edits, changed rubric and closed authority',async()=>{
    await expect(submit(v.alex,id(305),0)).rejects.toThrow(/submission unavailable/);
    await expect(save(v.alex,0,[{...evidence()[0],rating:null}])).rejects.toThrow(/invalid evidence/);
    expect(await save(v.alex,0,evidence())).toBe(1);
    await expect(save(v.alex,0,evidence())).rejects.toThrow(/draft changed/);
    await db.query("update assessor_rollout_private.component_required_criteria set description_en='Changed approved wording' where module_id=$1",[v.module]);
    await expect(submit(v.alex,id(306),1)).rejects.toThrow(/submission unavailable/);
    await db.query("update assessor_rollout_private.component_required_criteria set description_en='Clear clarification' where module_id=$1",[v.module]);
    await db.query("update assessor_rollout_private.practice_criteria set rubric_snapshot=jsonb_set(rubric_snapshot,'{levels,kaya_na,en}','\"Changed anchor\"') where chapter_id=$1",[v.chapter]);
    await expect(submit(v.alex,id(316),1)).rejects.toThrow(/submission unavailable/);
    await db.query("update assessor_rollout_private.practice_criteria set rubric_snapshot=jsonb_set(rubric_snapshot,'{levels,kaya_na,en}','\"Can do\"') where chapter_id=$1",[v.chapter]);
    await db.query('update course_lessons set published_revision_id=$1 where id=$2',[v.newRevision,v.lesson]);
    await expect(submit(v.alex,id(317),1)).rejects.toThrow(/submission unavailable/);
    await db.query('update course_lessons set published_revision_id=$1 where id=$2',[v.revision,v.lesson]);
    await db.query("update feature_flags set enabled=false where key='assessor_flow_writes'");
    await expect(submit(v.alex,id(307),1)).rejects.toThrow(/submission unavailable/);
    await db.query("update feature_flags set enabled=true where key='assessor_flow_writes'");
    await expect(save(v.other,1,evidence())).rejects.toThrow(/draft changed/);
    expect(await save(v.alex,1,evidence('not_observed',null))).toBe(2);
    expect(await submit(v.alex,id(308),2)).toBe('insufficient_evidence');
    expect(await submit(v.alex,id(308),2)).toBe('insufficient_evidence');
    expect((await as(v.maria,'select rpc_bhw_component_requests($1) result',[v.program]))[0].status).toBe('assessed');
    expect(await as(v.alex,'select rpc_assessor_component_request_queue($1) result',[v.program])).toEqual([]);
    await expect(submit(v.alex,id(309),2)).rejects.toThrow(/submission unavailable/);
    await expect(start(v.alex,id(310))).rejects.toThrow(/start unavailable/);
    await expect(create(v.alex,id(318))).rejects.toThrow(/request unavailable/);
    expect((await db.query('select count(*)::int n from assessor_rollout_private.formal_attempts')).rows[0].n).toBe(1);
    expect((await db.query('select count(*)::int n from assessor_rollout_private.chapter_awards')).rows[0].n).toBe(2);
  });
  it('requires explanatory evidence and derives outcomes from the frozen rubric ratings',async()=>{
    await db.query('delete from assessor_rollout_private.formal_attempts');
    await db.query("update assessor_rollout_private.component_requests set status='arranged' where id=$1",[request]);
    attempt=await start(v.alex,id(311));
    expect(await save(v.alex,0,[{...evidence()[0],facts:'short'}])).toBe(1);
    await expect(submit(v.alex,id(312),1)).rejects.toThrow(/required evidence missing/);
    expect(await save(v.alex,1,evidence('sufficient','kailangan_practice'))).toBe(2);
    expect(await submit(v.alex,id(313),2)).toBe('needs_practice');
    await db.query('delete from assessor_rollout_private.formal_attempts');
    await db.query("update assessor_rollout_private.component_requests set status='arranged' where id=$1",[request]);
    attempt=await start(v.alex,id(314));
    expect(await save(v.alex,0,evidence())).toBe(1);
    expect(await submit(v.alex,id(315),1)).toBe('complete');
    expect((await db.query('select count(*)::int n from assessor_rollout_private.chapter_awards')).rows[0].n).toBe(2);
  });
});


