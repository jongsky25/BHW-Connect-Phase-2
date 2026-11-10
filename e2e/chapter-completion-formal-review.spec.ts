import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {expect,test} from '@playwright/test';
import {BARANGAY_ANOS_ID,STABLE_CITY_ADMIN,createThrowawayBhw,getAccessToken,restGet} from './fixtures/auth';

// Finishing the lesson that completes Chapter 1 once formal review owns the
// chapter. rpc_course_lesson_complete -> course_progress_maybe_finish used to
// insert a legacy `assessments` row that legacy_guard() rejects with
// 'Chapter 1 decision requires formal review', so the whole save rolled back
// (HTTP 400) and BHWs could not finish the chapter. Real RPC, real BHW session,
// disposable local database only.

function assertLocal() {
  const url=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??'');
  if(!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='54321')throw new Error('Disposable local Supabase required');
}
function sql(value:string) {
  assertLocal();
  return execFileSync('docker',['exec','-i','supabase_db_bhw-connect-phase-2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input:value,encoding:'utf8',timeout:15000}).trim();
}
const jsonSql=(value:unknown)=>`'${JSON.stringify(value).replaceAll("'","''")}'::jsonb`;
// The decision the real release used; it exists on every database built from the migrations.
const CUTOVER_DECISION='c1af28-all-pilot-2026-10-16';

for(const formalReview of [true,false])test(`completing the last lesson of Chapter 1 saves ${formalReview?'under formal review':'without formal review'}`,async({request})=>{
  test.setTimeout(120000);
  assertLocal(); // Must precede account creation as well as fixture SQL.
  const admin=await getAccessToken(request,STABLE_CITY_ADMIN.username,STABLE_CITY_ADMIN.password);
  const bhw=await createThrowawayBhw(request,admin,BARANGAY_ANOS_ID);
  const token=await getAccessToken(request,bhw.username,bhw.tempPassword);
  const [actor]=await restGet(request,admin,`users?select=id&username=eq.${bhw.username}`) as {id:string}[];
  expect(actor.id).toMatch(/^[a-f0-9-]{36}$/);
  const [course,program,chapter,module,lesson,revision,progress]=Array.from({length:7},()=>randomUUID());
  const part={id:'only',concept_ids:['only'],asset_ids:[],heading_en:'Fictional only',heading_fil:'Kathang only',body_en:'Example for chapter completion only.',body_fil:'Halimbawa para sa pagtatapos ng kabanata lamang.',takeaway_en:'Review.',takeaway_fil:'Balikan.',check:null};
  const beforeFlags=JSON.parse(sql("select jsonb_agg(jsonb_build_object('key',key,'enabled',enabled,'disabled_roles',disabled_roles)) from feature_flags where key in ('elearning','chapter1_assessment_v2','course_sessions','assessor_flow_ui');")) as {key:string;enabled:boolean;disabled_roles:string[]}[];
  try {
    sql(`begin;
      update feature_flags set enabled=(key='elearning'),disabled_roles='{}' where key in ('elearning','chapter1_assessment_v2','course_sessions','assessor_flow_ui');
      insert into courses(id,org_unit_id,author_user_id,title_fil,title_en,status) values('${course}','${BARANGAY_ANOS_ID}','${actor.id}','E2E chapter completion','E2E chapter completion','published');
      insert into training_programs(id,content_key,org_unit_id,author_user_id,title_fil,title_en,status) values('${program}','bhw-reference-manual','${BARANGAY_ANOS_ID}','${actor.id}','E2E chapter completion manual','E2E chapter completion manual','published');
      insert into training_program_chapters(id,program_id,chapter_key,position,title_fil,title_en,course_id,availability) values('${chapter}','${program}','chapter-1',0,'E2E Chapter I','E2E Chapter I','${course}','available');
      insert into course_modules(id,course_id,position,type,title_fil,title_en) values('${module}','${course}',0,'text','E2E only subchapter','E2E only subchapter');
      insert into course_lessons(id,module_id,lesson_key,position,title_fil,title_en,objectives_fil,objectives_en) values('${lesson}','${module}','bhw-health-educator',0,'E2E last lesson','E2E last lesson',array['Tapusin ang kabanata.'],array['Finish the chapter.']);
      insert into course_lesson_revisions(id,lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,created_by) values('${revision}','${lesson}','e2e-chapter-completion',repeat('0',64),${jsonSql([part])},${jsonSql([{...part,layout:'scene',display_en:part.body_en,display_fil:part.body_fil}])},'[]','[]','[]','${actor.id}');
      update course_lessons set published_revision_id='${revision}' where id='${lesson}';
      insert into course_progress(id,course_id,bhw_user_id) values('${progress}','${course}','${actor.id}');
      ${formalReview?`insert into assessor_flow_cohorts(program_id,chapter_key,cohort_key,requirements_version) values('${program}','chapter-1','e2e-chapter-completion','e2e');
      update assessor_flow_cohorts set authority_cutover_at=now(),authority_cutover_decision_id='${CUTOVER_DECISION}' where program_id='${program}';`:''}
      commit;`);

    // The exact call the lesson page makes when the BHW taps Mark lesson complete.
    const response=await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_course_lesson_complete`,{
      headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      data:{p_lesson_id:lesson,p_revision_id:revision},
    });
    expect(response.status(),await response.text()).toBe(204);

    // The completion is saved and the chapter is finished.
    expect(sql(`select count(*) from course_lesson_progress where course_progress_id='${progress}' and lesson_id='${lesson}' and revision_id='${revision}';`)).toBe('1');
    expect(sql(`select count(*) from course_module_progress where course_progress_id='${progress}' and module_id='${module}' and completed_at is not null;`)).toBe('1');
    expect(sql(`select status from course_progress where id='${progress}';`)).toBe('content_completed');
    // Formal review owns the decision, so it creates no legacy assessment; without it the old behaviour is unchanged.
    expect(sql(`select count(*) from assessments where course_id='${course}' and bhw_user_id='${actor.id}';`)).toBe(formalReview?'0':'1');

    // Tapping the button again is harmless.
    const again=await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_course_lesson_complete`,{
      headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      data:{p_lesson_id:lesson,p_revision_id:revision},
    });
    expect(again.status(),await again.text()).toBe(204);
    expect(sql(`select count(*) from course_lesson_progress where course_progress_id='${progress}' and lesson_id='${lesson}';`)).toBe('1');
  } finally {
    sql(`begin;
      set local session_replication_role=replica; -- fixture removal, not behaviour under test; skips the cutover immutability triggers
      delete from assessments where course_id='${course}';
      delete from assessor_flow_cohorts where program_id='${program}';
      delete from course_lesson_resume where course_progress_id='${progress}';delete from course_lesson_progress where course_progress_id='${progress}';delete from course_module_progress where course_progress_id='${progress}';delete from course_progress where id='${progress}';
      update course_lessons set published_revision_id=null where id='${lesson}';
      alter table course_lesson_revisions disable trigger training_revision_immutable;
      delete from course_lesson_revisions where id='${revision}';
      alter table course_lesson_revisions enable trigger training_revision_immutable;
      delete from course_lessons where id='${lesson}';delete from training_program_chapters where id='${chapter}';delete from training_programs where id='${program}';delete from courses where id='${course}';
      ${beforeFlags.map(f=>`update feature_flags set enabled=${f.enabled},disabled_roles=array(select jsonb_array_elements_text(${jsonSql(f.disabled_roles)})) where key='${f.key}';`).join('\n')}
      commit;`);
  }
});
