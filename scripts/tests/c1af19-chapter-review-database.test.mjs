// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';

const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const v={org:id(1),awayOrg:id(2),alex:id(3),other:id(4),maria:id(5),away:id(6),
  program:id(7),chapter:id(8),course:id(9),module:id(10),otherModule:id(11),
  lesson:id(12),revision:id(13),newRevision:id(14),cohort:id(15),progress:id(16),
  release:'reviewed-v1',attempt:id(17),assignment:id(18),otherLesson:id(19),otherRevision:id(20)};
let db;
let attempt;let secondAttempt;
async function as(actor,sql,args=[]){
  await db.exec('begin');
  try{
    await db.exec(`set local role ${actor?'authenticated':'anon'}`);
    await db.query("select set_config('test.actor',$1,true)",[actor??'']);
    const rows=(await db.query(sql,args)).rows;
    await db.exec('commit');return rows[0]?.result;
  }catch(error){await db.exec('rollback');throw error;}
}
async function asOwner(actor,sql,args=[]){
  await db.exec('begin');
  try{await db.query("select set_config('test.actor',$1,true)",[actor]);
    const rows=(await db.query(sql,args)).rows;await db.exec('commit');return rows[0]?.result;
  }catch(error){await db.exec('rollback');throw error;}
}
const create=(actor=v.alex,key=id(101),learner=v.maria,module=v.module)=>as(actor,
  'select rpc_assessor_component_request_create($1,$2,$3,$4) result',[key,v.program,learner,module]);
const claim=(actor,request,key=id(102))=>as(actor,
  'select rpc_assessor_component_request_claim($1,$2) result',[key,request]);
const arrange=(actor,request,key=id(103),date='2030-01-01T12:00:00Z')=>as(actor,
  'select rpc_assessor_component_arrangement_set($1,$2,$3,$4,$5) result',
  [key,request,date,'Barangay hall','Quiet room']);

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
    create table courses(id uuid primary key,status text,title_fil text,title_en text);
    create table training_program_chapters(id uuid primary key,program_id uuid,chapter_key text,availability text,course_id uuid);
    create table course_modules(id uuid primary key,course_id uuid,position int,title_fil text,title_en text);
    create table course_lessons(id uuid primary key,module_id uuid,published_revision_id uuid);
    create table course_progress(id uuid primary key,course_id uuid,bhw_user_id uuid,status text default 'in_progress');
    create table course_sessions(id uuid primary key,course_id uuid,facilitator_user_id uuid,status text);
    create table course_session_enrollments(id uuid primary key,session_id uuid,bhw_user_id uuid,status text);
    create table course_session_deliveries(id uuid primary key,session_id uuid,module_id uuid,recorded_by uuid);
    create table course_session_activities(id uuid primary key,session_id uuid,module_id uuid,recorded_by uuid);
    create table competency_observations(id uuid primary key,bhw_user_id uuid,observer_user_id uuid,module_id uuid);
    create table assessor_chapter_qualifications(id uuid primary key,assessor_user_id uuid,chapter_id uuid,
      status text,status_changed_at timestamptz);
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
    create table assessor_rollout_private.practice_attempts(id uuid primary key,bhw_user_id uuid,module_id uuid,
      criterion_id text,criterion_version text,recorded_at timestamptz);
    create table assessments(id uuid primary key default gen_random_uuid(),course_id uuid,bhw_user_id uuid,
      org_unit_id uuid,status text,assessor_user_id uuid,notes text,decided_at timestamptz);
    create table certificates(id uuid primary key default gen_random_uuid(),assessment_id uuid references assessments(id),
      course_id uuid,bhw_user_id uuid,verification_code text unique,bhw_full_name_snapshot text,
      course_title_fil_snapshot text,course_title_en_snapshot text,issued_at timestamptz default now());
    create function assessor_rollout_private.assert_legacy_allowed(p_course_id uuid,p_subjects uuid[]) returns void
      language plpgsql security definer set search_path='' as $$ begin
      if exists(select 1 from public.training_program_chapters ch
        join public.assessor_flow_cohorts c on c.program_id=ch.program_id
        where ch.course_id=p_course_id and c.authority_cutover_at is not null) then
        raise exception 'revised assessor authority required'; end if; end $$;
    create function assessor_rollout_private.legacy_guard() returns trigger
      language plpgsql security definer set search_path='' as $$ begin return new; end $$;
    create trigger assessor_flow_legacy_guard before insert or update or delete on assessments
      for each row execute function assessor_rollout_private.legacy_guard();
    create trigger assessor_flow_legacy_guard before insert or update or delete on certificates
      for each row execute function assessor_rollout_private.legacy_guard();
    create trigger assessor_flow_legacy_guard before insert or update or delete on course_sessions
      for each row execute function assessor_rollout_private.legacy_guard();
    create trigger assessor_flow_legacy_guard before insert or update or delete on course_session_enrollments
      for each row execute function assessor_rollout_private.legacy_guard();
    create trigger assessor_flow_legacy_guard before insert or update or delete on course_session_deliveries
      for each row execute function assessor_rollout_private.legacy_guard();
    create trigger assessor_flow_legacy_guard before insert or update or delete on course_session_activities
      for each row execute function assessor_rollout_private.legacy_guard();
    create trigger assessor_flow_legacy_guard before insert or update or delete on competency_observations
      for each row execute function assessor_rollout_private.legacy_guard();
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
  await db.query("insert into courses values($1,'published','Kabanata 1','Chapter 1')",[v.course]);
  await db.query("insert into training_program_chapters values($1,$2,'chapter-1','available',$3)",[v.chapter,v.program,v.course]);
  await db.query("insert into course_modules values($1,$3,0,'Bahagi 1','Component 1'),($2,$3,1,'Bahagi 2','Component 2')",
    [v.module,v.otherModule,v.course]);
  await db.query('insert into course_lessons values($1,$2,$3),($4,$5,$6)',[v.lesson,v.module,v.revision,v.otherLesson,v.otherModule,v.otherRevision]);
  await db.query("insert into assessor_flow_cohorts values($1,$2,'chapter-1','req1',true,false,null)",[v.cohort,v.program]);
  await db.query('insert into assessor_flow_cohort_members values($1,$2),($1,$3),($1,$4)',
    [v.cohort,v.alex,v.other,v.maria]);
  await db.query("insert into assessor_rollout_private.award_contracts values('req1','rubric1',true)");
  await db.query("insert into assessor_rollout_private.practice_criteria values($1,'clarify','v1',$2,$3,'req1','rubric1',true,repeat('a',64),'{\"observable\":{\"fil\":\"Linawin\",\"en\":\"Clarify\"},\"levels\":{\"kaya_na\":{\"fil\":\"Kaya na\",\"en\":\"Can do\"},\"kailangan_practice\":{\"fil\":\"Kailangan\",\"en\":\"Needs practice\"},\"hindi_pa\":{\"fil\":\"Hindi pa\",\"en\":\"Not yet\"}}}'::jsonb)",
    [v.chapter,v.lesson,v.revision]);
  await db.query("insert into assessor_rollout_private.practice_criteria values($1,'refer','v1',$2,$3,'req1','rubric1',true,repeat('b',64),'{\"observable\":{\"fil\":\"I-refer\",\"en\":\"Refer\"},\"levels\":{\"kaya_na\":{\"fil\":\"Kaya na\",\"en\":\"Can do\"},\"kailangan_practice\":{\"fil\":\"Kailangan\",\"en\":\"Needs practice\"},\"hindi_pa\":{\"fil\":\"Hindi pa\",\"en\":\"Not yet\"}}}'::jsonb)",[v.chapter,v.otherLesson,v.otherRevision]);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261014002817_c1af16_component_readiness.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261014021413_c1af17_requests_arrangements.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261014025937_c1af18_formal_attempts.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261014033519_c1af19_reassessment_chapter_review.sql',import.meta.url),'utf8'));
},30000);
afterAll(async()=>db?.close());

const criterionEvidence=(criterion,sufficiency='sufficient',rating='kaya_na')=>[{
  id:criterion,sufficiency,rating:sufficiency==='sufficient'?rating:null,
  facts:'The learner explained and demonstrated the required steps.',nextStep:'Continue supervised work.'}];
const release=(attemptId,key)=>as(v.alex,'select rpc_assessor_formal_feedback_release($1,$2,$3,$4) result',
  [key,attemptId,'Nakita ang ebidensya. Ipagpatuloy ang gabay.','Evidence reviewed. Continue guided work.']);
const review=()=>as(v.alex,'select rpc_assessor_chapter_review_state($1,$2) result',[v.program,v.maria]);
const decide=(key=id(500),actor=v.alex)=>as(actor,
  'select rpc_assessor_chapter_review_decide($1,$2,$3,$4,$5) result',
  [key,v.program,v.maria,'Sinuri ang lahat ng bahagi at susunod na hakbang.',
    'All components and next steps have been reviewed.']);
const retry=(prior,key,note='Further supervised practice was completed before reassessment.',practiceId=null)=>as(v.alex,
  'select rpc_assessor_formal_retry_request($1,$2,$3,$4) result',[key,prior,note,practiceId]);
async function formalFor(module,criterion,keys,rating='kaya_na',sufficiency='sufficient'){
  const req=await create(v.alex,id(keys),v.maria,module);
  await claim(v.alex,req,id(keys+1));
  await arrange(v.alex,req,id(keys+2));
  const att=await as(v.alex,'select rpc_assessor_formal_start($1,$2) result',[id(keys+3),req]);
  await as(v.alex,'select rpc_assessor_formal_save($1,0,$2::jsonb) result',
    [att,JSON.stringify(criterionEvidence(criterion,sufficiency,rating))]);
  await as(v.alex,'select rpc_assessor_formal_submit($1,$2,1) result',[id(keys+4),att]);
  return {req,att};
}

describe('C1AF-19 exact reassessment and chapter review migration',()=>{
  it('installs while write controls remain closed',async()=>{
    expect((await db.query('select count(*)::int n from assessor_rollout_private.bhw_chapter_reviews')).rows[0].n).toBe(0);
    await expect(as(v.alex,'select count(*) from assessor_rollout_private.bhw_chapter_reviews'))
      .rejects.toThrow(/permission denied/);
    await expect(decide()).rejects.toThrow(/chapter decision unavailable/);
  });
  it('keeps mixed or missing component evidence pending and releases only own feedback',async()=>{
    for(const [module,criterion,lesson] of [[v.module,'clarify',v.lesson],
      [v.otherModule,'refer',v.otherLesson]]){
      await db.query(`insert into assessor_rollout_private.component_requirements
        (module_id,chapter_id,requirements_version,rubric_version,review_reference,approved_by,
         enabled,purpose_fil,purpose_en) values($1,$2,'req1','rubric1','review-1',$3,true,
         'Suriin ang kakayahan sa bahagi ng kabanata.','Assess the chapter component skills.')`,
        [module,v.chapter,v.alex]);
      await db.query('insert into assessor_rollout_private.component_required_lessons values($1,$2)',[module,lesson]);
      await db.query(`insert into assessor_rollout_private.component_required_criteria
        values($1,$2,$3,'v1','Naobserbahang gawain','Observed skill')`,[module,v.chapter,criterion]);
    }
    await db.query('insert into course_progress values($1,$2,$3)',[v.progress,v.course,v.maria]);
    await db.query("insert into assessments(id,course_id,bhw_user_id,org_unit_id,status) values($1,$2,$3,$4,'passed')",
      [id(950),v.course,v.away,v.awayOrg]);
    await db.query("insert into certificates(id,assessment_id,course_id,bhw_user_id,verification_code,bhw_full_name_snapshot,course_title_fil_snapshot,course_title_en_snapshot) values($1,$2,$3,$4,'HISTORICAL1','Historical learner','Kabanata 1','Chapter 1')",
      [id(951),id(950),v.course,v.away]);
    await db.query('insert into course_lesson_progress values($1,$2,$3),($1,$4,$5)',
      [v.progress,v.lesson,v.revision,v.otherLesson,v.otherRevision]);
    await db.query("insert into assessor_rollout_private.chapter_awards values($1,$3,'req1','active'),($2,$3,'req1','active')",
      [v.alex,v.other,v.chapter]);
    await db.query("update feature_flags set enabled=true where key='assessor_flow_writes'");
    await db.query('update assessor_flow_cohorts set writes_enabled=true,authority_cutover_at=now() where id=$1',[v.cohort]);
    const first=await formalFor(v.module,'clarify',401);
    attempt=first.att;
    const second=await formalFor(v.otherModule,'refer',411,'kaya_na','insufficient');
    secondAttempt=second.att;
    expect((await review()).suggestedOutcome).toBe('insufficient_evidence');
    await expect(as(v.maria,'select rpc_bhw_formal_results($1) result',[v.program]))
      .resolves.toMatchObject({attempts:[],reviews:[]});
    await expect(retry(secondAttempt,id(418))).rejects.toThrow(/reassessment unavailable/);
    await release(attempt,id(420));
    await release(secondAttempt,id(421));
    expect((await as(v.maria,'select rpc_bhw_formal_results($1) result',[v.program])).attempts).toHaveLength(2);
    expect((await as(v.away,'select rpc_bhw_formal_results($1) result',[v.program])).attempts).toEqual([]);
    await db.query("update feature_flags set enabled=false where key='assessor_flow_writes'");
    await expect(decide(id(419))).rejects.toThrow(/chapter decision unavailable/);
    await db.query("update feature_flags set enabled=true where key='assessor_flow_writes'");
    const pending=await decide(id(422));
    expect(pending).toBeTruthy();
    expect((await review()).suggestedOutcome).toBe('insufficient_evidence');
    expect((await db.query('select count(*)::int n from certificates')).rows[0].n).toBe(1);
  });
  it('links further practice to fresh evidence and issues one certificate after every component is complete',async()=>{
    await expect(retry(secondAttempt,id(430),'Brief note')).rejects.toThrow(/reassessment unavailable/);
    await expect(retry(secondAttempt,id(431),undefined,id(900))).rejects.toThrow(/practice evidence unavailable/);
    await db.query('insert into assessor_rollout_private.practice_attempts values($1,$2,$3,$4,$5,clock_timestamp())',
      [id(902),v.maria,v.module,'clarify','v1']);
    await expect(retry(secondAttempt,id(429),undefined,id(902))).rejects.toThrow(/practice evidence unavailable/);
    await db.query('insert into assessor_rollout_private.practice_attempts values($1,$2,$3,$4,$5,clock_timestamp())',
      [id(901),v.maria,v.otherModule,'refer','v1']);
    const retryRequest=await retry(secondAttempt,id(432),undefined,id(901));
    expect(await retry(secondAttempt,id(432),undefined,id(901))).toBe(retryRequest);
    expect(await release(secondAttempt,id(421))).toBe(secondAttempt);
    await claim(v.alex,retryRequest,id(433));
    await arrange(v.alex,retryRequest,id(434));
    const nextAttempt=await as(v.alex,'select rpc_assessor_formal_start($1,$2) result',[id(435),retryRequest]);
    const fresh=await as(v.alex,'select rpc_assessor_formal_state($1) result',[retryRequest]);
    expect(fresh.attempt.evidence).toEqual([]);
    await as(v.alex,'select rpc_assessor_formal_save($1,0,$2::jsonb) result',
      [nextAttempt,JSON.stringify(criterionEvidence('refer','sufficient','kailangan_practice'))]);
    await as(v.alex,'select rpc_assessor_formal_submit($1,$2,1) result',[id(436),nextAttempt]);
    await release(nextAttempt,id(437));
    expect((await review()).components.find(c=>c.moduleId===v.otherModule).reassessment.practiceAttemptId).toBe(id(901));
    expect((await review()).suggestedOutcome).toBe('needs_practice');
    await decide(id(438));
    expect((await db.query('select count(*)::int n from certificates')).rows[0].n).toBe(1);
    const lastRequest=await retry(nextAttempt,id(440));
    await claim(v.alex,lastRequest,id(441));
    await arrange(v.alex,lastRequest,id(442));
    const lastAttempt=await as(v.alex,'select rpc_assessor_formal_start($1,$2) result',[id(443),lastRequest]);
    await as(v.alex,'select rpc_assessor_formal_save($1,0,$2::jsonb) result',
      [lastAttempt,JSON.stringify(criterionEvidence('refer'))]);
    await as(v.alex,'select rpc_assessor_formal_submit($1,$2,1) result',[id(444),lastAttempt]);
    await release(lastAttempt,id(445));
    expect((await review()).suggestedOutcome).toBe('complete');
    await db.query("update assessor_rollout_private.practice_criteria set rubric_snapshot=jsonb_set(rubric_snapshot,'{levels,kaya_na,en}','\"Changed anchor\"') where criterion_id='refer'");
    expect((await review()).suggestedOutcome).toBe('insufficient_evidence');
    await decide(id(449));
    expect((await db.query('select count(*)::int n from certificates')).rows[0].n).toBe(1);
    await db.query("update assessor_rollout_private.practice_criteria set rubric_snapshot=jsonb_set(rubric_snapshot,'{levels,kaya_na,en}','\"Can do\"') where criterion_id='refer'");
    await db.query('update course_lessons set published_revision_id=$1 where id=$2',[v.newRevision,v.otherLesson]);
    expect((await review()).suggestedOutcome).toBe('insufficient_evidence');
    await db.query('update course_lessons set published_revision_id=$1 where id=$2',[v.otherRevision,v.otherLesson]);
    await expect(asOwner(v.alex,"insert into assessments(course_id,bhw_user_id,org_unit_id,status) values($1,$2,$3,'passed') returning id result",
      [v.course,v.maria,v.org])).rejects.toThrow(/revised assessor authority required/);
    const award=await decide(id(446));
    expect(await decide(id(446))).toBe(award);
    expect(await decide(id(447),v.other)).toBe(award);
    expect((await db.query('select count(*)::int n from certificates')).rows[0].n).toBe(2);
    expect((await db.query('select verification_code from certificates where id=$1',[id(951)])).rows[0].verification_code).toBe('HISTORICAL1');
    expect((await db.query('select status from course_progress where id=$1',[v.progress])).rows[0].status).toBe('certified');
    expect((await as(v.maria,'select rpc_bhw_formal_results($1) result',[v.program])).reviews[0].verificationCode).toBeTruthy();
  });
  it('C1AF-20 shares live award scope across legacy writes and closes binary awards',async()=>{
    await db.exec(readFileSync(new URL('../../supabase/migrations/20261014044033_c1af20_legacy_authorization.sql',import.meta.url),'utf8'));
    const session=id(970),awaySession=id(971),otherCourse=id(972);
    expect(await asOwner(v.alex,'select assessor_rollout_private.chapter_write_scope($1,$2,$3) result',
      [v.course,v.alex,v.maria])).toBe(true);
    expect(await asOwner(v.alex,'select assessor_rollout_private.chapter_write_scope($1,$2,$3) result',
      [v.course,v.alex,v.away])).toBe(false);
    await expect(asOwner(v.other,'insert into course_sessions values($1,$2,$3,$4)',
      [id(969),v.course,v.alex,'scheduled'])).rejects.toThrow(/session owner required/);
    await asOwner(v.alex,'insert into course_sessions values($1,$2,$3,$4)',
      [session,v.course,v.alex,'scheduled']);
    await asOwner(v.alex,'insert into course_session_enrollments values($1,$2,$3,$4)',
      [id(973),session,v.maria,'enrolled']);
    await expect(asOwner(v.alex,'insert into course_session_enrollments values($1,$2,$3,$4)',
      [id(974),session,v.away,'enrolled'])).rejects.toThrow(/revised assessor authority required/);
    // Historical or imported rosters must be checked in full on later writes.
    await db.query('alter table course_session_enrollments disable trigger assessor_flow_legacy_guard');
    await db.query('insert into course_session_enrollments values($1,$2,$3,$4)',
      [id(974),session,v.away,'enrolled']);
    await db.query('alter table course_session_enrollments enable trigger assessor_flow_legacy_guard');
    await expect(asOwner(v.alex,'insert into course_session_deliveries values($1,$2,$3,$4)',
      [id(985),session,v.module,v.alex])).rejects.toThrow(/revised assessor authority required/);
    await db.query('alter table course_session_enrollments disable trigger assessor_flow_legacy_guard');
    await db.query('delete from course_session_enrollments where id=$1',[id(974)]);
    await db.query('alter table course_session_enrollments enable trigger assessor_flow_legacy_guard');
    await asOwner(v.alex,'insert into course_session_deliveries values($1,$2,$3,$4)',
      [id(975),session,v.module,v.alex]);
    await asOwner(v.alex,'insert into competency_observations values($1,$2,$3,$4)',
      [id(976),v.maria,v.alex,v.module]);
    await expect(asOwner(v.alex,'insert into competency_observations values($1,$2,$3,$4)',
      [id(977),v.away,v.alex,v.module])).rejects.toThrow(/revised assessor authority required/);
    await db.query("update assessor_rollout_private.chapter_awards set status='revoked' where actor_id=$1",[v.alex]);
    await expect(asOwner(v.alex,'insert into course_session_activities values($1,$2,$3,$4)',
      [id(978),session,v.module,v.alex])).rejects.toThrow(/revised assessor authority required/);
    await db.query("update assessor_rollout_private.chapter_awards set status='active' where actor_id=$1",[v.alex]);
    await db.query("update users set status='inactive' where id=$1",[v.maria]);
    await expect(asOwner(v.alex,'insert into course_session_activities values($1,$2,$3,$4)',
      [id(979),session,v.module,v.alex])).rejects.toThrow(/revised assessor authority required/);
    await db.query("update users set status='active' where id=$1",[v.maria]);
    await db.query('insert into assessor_chapter_qualifications values($1,$2,$3,$4,null)',
      [id(980),v.alex,v.chapter,'revoked']);
    await expect(asOwner(v.alex,'insert into course_session_activities values($1,$2,$3,$4)',
      [id(981),session,v.module,v.alex])).rejects.toThrow(/revised assessor authority required/);
    await db.query('delete from assessor_chapter_qualifications where id=$1',[id(980)]);
    await db.query('insert into super_admin_personas values($1)',[v.alex]);
    await expect(asOwner(v.alex,'insert into course_session_activities values($1,$2,$3,$4)',
      [id(982),session,v.module,v.alex])).rejects.toThrow(/revised assessor authority required/);
    await db.query('delete from super_admin_personas where persona_user_id=$1',[v.alex]);
    await db.query('alter table assessments disable trigger assessor_flow_legacy_guard');
    await db.query("insert into assessments(id,course_id,bhw_user_id,org_unit_id,status) values($1,$2,$3,$4,'pending')",
      [id(983),v.course,v.maria,v.org]);
    await db.query('alter table assessments enable trigger assessor_flow_legacy_guard');
    await expect(asOwner(v.alex,"update assessments set status='assigned',assessor_user_id=$1 where id=$2",
      [v.alex,id(983)])).rejects.toThrow(/Chapter 1 decision requires formal review/);
    await expect(asOwner(v.alex,"update assessments set status='passed' where id=$1",
      [id(983)])).rejects.toThrow(/Chapter 1 decision requires formal review/);
    await expect(asOwner(v.alex,"insert into certificates(id,assessment_id,course_id,bhw_user_id) values($1,$2,$3,$4)",
      [id(984),id(983),v.course,v.maria])).rejects.toThrow(/Chapter 1 decision requires formal review/);
    await expect(asOwner(v.alex,"update course_progress set status='failed_assessment' where id=$1",
      [v.progress])).rejects.toThrow(/Chapter 1 progress requires formal review/);
    await expect(asOwner(v.alex,"update course_progress set status='in_progress' where id=$1",
      [v.progress])).rejects.toThrow(/Chapter 1 progress requires formal review/);
    await expect(asOwner(v.alex,'update course_progress set course_id=$1 where id=$2',
      [otherCourse,v.progress])).rejects.toThrow(/Chapter 1 progress binding is immutable/);
    await db.query("insert into courses values($1,'published','Gabay','Gabay')",[otherCourse]);
    await db.query("insert into course_modules values($1,$2,0,'Gabay bahagi','Gabay component')",
      [id(995),otherCourse]);
    await expect(asOwner(v.alex,'insert into course_session_activities values($1,$2,$3,$4)',
      [id(996),session,id(995),v.alex])).rejects.toThrow(/session module must belong to course/);
    await asOwner(v.alex,'insert into course_sessions values($1,$2,$3,$4)',
      [awaySession,otherCourse,v.alex,'scheduled']);
    await asOwner(v.alex,"insert into assessments(id,course_id,bhw_user_id,org_unit_id,status) values($1,$2,$3,$4,'pending')",
      [id(988),otherCourse,v.maria,v.org]);
    await asOwner(v.alex,"update assessments set status='passed',assessor_user_id=$1 where id=$2",
      [v.alex,id(988)]);
    await asOwner(v.alex,"insert into certificates(id,assessment_id,course_id,bhw_user_id,verification_code) values($1,$2,$3,$4,'GABAY1')",
      [id(989),id(988),otherCourse,v.maria]);
    const learner=id(986),progress=id(987);
    await db.query("insert into users values($1,'bhw','active',$2,'Second learner')",[learner,v.org]);
    await db.query('insert into assessor_flow_cohort_members values($1,$2)',[v.cohort,learner]);
    await db.query('insert into course_progress values($1,$2,$3)',[progress,v.course,learner]);
    await db.query('insert into course_lesson_progress values($1,$2,$3),($1,$4,$5)',
      [progress,v.lesson,v.revision,v.otherLesson,v.otherRevision]);
    for(const [module,criterion,key] of [[v.module,'clarify',990],[v.otherModule,'refer',1000]]){
      const req=await create(v.alex,id(key),learner,module);
      await claim(v.alex,req,id(key+1));
      await arrange(v.alex,req,id(key+2));
      const att=await as(v.alex,'select rpc_assessor_formal_start($1,$2) result',[id(key+3),req]);
      if(key===990){
        await db.query("update assessor_rollout_private.chapter_awards set status='revoked' where actor_id=$1",[v.alex]);
        await expect(as(v.alex,'select rpc_assessor_formal_save($1,0,$2::jsonb) result',
          [att,JSON.stringify(criterionEvidence(criterion))])).rejects.toThrow(/unavailable/);
        await db.query("update assessor_rollout_private.chapter_awards set status='active' where actor_id=$1",[v.alex]);
      }
      await as(v.alex,'select rpc_assessor_formal_save($1,0,$2::jsonb) result',
        [att,JSON.stringify(criterionEvidence(criterion))]);
      await as(v.alex,'select rpc_assessor_formal_submit($1,$2,1) result',[id(key+4),att]);
      await release(att,id(key+5));
    }
    const issued=await as(v.alex,'select rpc_assessor_chapter_review_decide($1,$2,$3,$4,$5) result',
      [id(1010),v.program,learner,'Napatunayan ang lahat ng bahagi ng kabanata.',
        'All chapter components have been verified.']);
    expect(issued).toBeTruthy();
    expect((await db.query('select status from course_progress where id=$1',[progress])).rows[0].status).toBe('certified');
    expect((await db.query('select count(*)::int n from certificates')).rows[0].n).toBe(4);
  });
});
