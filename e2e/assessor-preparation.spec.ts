import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {expect,test} from '@playwright/test';
import {STABLE_CITY_ADMIN,createThrowawayAssessor,getAccessToken,onboardThroughLogin,restGet} from './fixtures/auth';

// Fixture SQL can only reach the disposable local stack. Never the pilot or a hosted preview.
function assertLocalSupabase() {
  const url=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??'');
  if(!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='54321')throw new Error('Local Supabase required');
}
function localSql(sql:string) {
  assertLocalSupabase();
  return execFileSync('docker',['exec','-i','supabase_db_bhw-connect-phase-2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],
    {input:sql,encoding:'utf8',timeout:15000});
}

test('assessor briefing explicitly saves once, survives replay/reload and opens the personal checklist',async({page,request})=>{
  test.setTimeout(120000);
  assertLocalSupabase();
  const cityToken=await getAccessToken(request,STABLE_CITY_ADMIN.username,STABLE_CITY_ADMIN.password);
  const assessor=await createThrowawayAssessor(request,cityToken,'00000000-0000-0000-0000-000000000004');
  const [actor]=await restGet(request,cityToken,`users?select=id&username=eq.${assessor.username}`) as Array<{id:string}>;
  expect(actor.id).toMatch(/^[a-f0-9-]{36}$/);
  const course=randomUUID(),program=randomUUID(),chapter=randomUUID(),cohort=randomUUID();
  localSql(`
    insert into public.courses(id,org_unit_id,author_user_id,title_fil,title_en,status)
      select '${course}','00000000-0000-0000-0000-000000000006',id,'E2E assessor chapter','E2E assessor chapter','published' from public.users where username='admin.city.stable';
    insert into public.training_programs(id,content_key,org_unit_id,author_user_id,title_fil,title_en,status)
      select '${program}','bhw-reference-manual','00000000-0000-0000-0000-000000000006',id,'E2E assessor manual','E2E assessor manual','published' from public.users where username='admin.city.stable';
    insert into public.training_program_chapters(id,program_id,chapter_key,position,title_fil,title_en,course_id,availability)
      values('${chapter}','${program}','chapter-1',0,'Kabanata I','Chapter I','${course}','available');
    insert into public.assessor_flow_cohorts(id,program_id,chapter_key,cohort_key,requirements_version,ui_enabled,writes_enabled,awards_enabled)
      values('${cohort}','${program}','chapter-1','e2e-preparation','chapter-1:c1af.draft-1',true,false,false);
    insert into public.assessor_flow_cohort_members(program_id,chapter_key,user_id,cohort_id)
      values('${program}','chapter-1','${actor.id}','${cohort}');
    update public.feature_flags set enabled=true,disabled_roles='{}' where key in ('elearning','assessor_flow_ui');
  `);
  try {
    await onboardThroughLogin(page,assessor.username,assessor.tempPassword,'AssessorPrepPw2026!');
    const base=`/training/${program}/assessor/chapter-1`;
    await page.goto(base);
    await expect(page).toHaveURL(`${base}/briefing`);
    const save=page.getByRole('button',{name:'Itala ang aking pagkilala'});
    await expect(save).toBeDisabled();
    expect(localSql(`select count(*) from public.assessor_briefing_acknowledgements where assessor_user_id='${actor.id}' and program_id='${program}';`).trim()).toBe('0');
    await page.getByRole('checkbox').check();
    await save.click();
    const proceed=page.getByRole('link',{name:'Magpatuloy sa aking pag-aaral sa Kabanata 1'});
    await expect(proceed).toBeVisible();
    await page.getByRole('button',{name:'Ulitin ang paglilibot'}).click();
    await expect(proceed).toBeVisible();
    await page.reload();
    await expect(proceed).toBeVisible();
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await proceed.click();
    const checklist=page.getByRole('region',{name:'Aking paghahanda sa Kabanata 1'});
    await expect(checklist).toBeVisible();
    await expect(checklist.getByRole('link',{name:'Kunin ang diagnostic pretest'})).toBeVisible();
    localSql(`insert into public.assessor_exam_attempts(assessor_user_id,chapter_id,curriculum_version,exam_id,phase,status,question_set_hash,question_count,score_percent,passed,answers,submitted_at)
      values('${actor.id}','${chapter}','2026-09-28.1','chapter-1:pretest','pretest','submitted',repeat('0',32),1,0,false,'[]',now());`);
    await page.reload();
    await expect(checklist.getByText('Sariling pag-aaral · 0 sa 42 aralin')).toBeVisible();
    await expect(page.locator('section[aria-labelledby^="study-subchapter-"]')).toHaveCount(9);
    await expect(checklist.getByRole('link',{name:'Kunin ang diagnostic pretest'})).toHaveCount(0);
    const evidenceSnapshot=()=>localSql(`select jsonb_build_object(
      'study',(select jsonb_agg(to_jsonb(p)) from assessor_lesson_progress p where assessor_user_id='${actor.id}' and chapter_id='${chapter}'),
      'attempts',(select jsonb_agg(to_jsonb(p)) from assessor_exam_attempts p where assessor_user_id='${actor.id}' and chapter_id='${chapter}'),
      'qualifications',(select jsonb_agg(to_jsonb(p)) from assessor_chapter_qualifications p where assessor_user_id='${actor.id}' and chapter_id='${chapter}'),
      'awards',(select jsonb_agg(to_jsonb(p)) from assessor_rollout_private.chapter_awards p where actor_id='${actor.id}' and chapter_id='${chapter}'));`).trim();
    const beforeNavigation=evidenceSnapshot();
    await page.getByRole('link',{name:'Progreso sa pag-aaral at listahan ng mga aralin'}).click();
    await expect(page).toHaveURL(`${base}#assessor-study-progress`);
    await expect(page.locator('#assessor-study-progress')).toBeVisible();
    await page.getByRole('link',{name:'Aking mga sertipikasyon',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Saan makikita ang progreso at susunod na hakbang?'})).toBeVisible();
    const personal=page.getByRole('navigation',{name:'Progreso sa pag-aaral ayon sa kabanata'});
    await personal.getByRole('link',{name:'Kabanata I',exact:true}).click();
    await expect(page).toHaveURL(`${base}#assessor-study-progress`);
    await expect(checklist.getByText('Sariling pag-aaral · 0 sa 42 aralin')).toBeVisible();
    expect(evidenceSnapshot()).toBe(beforeNavigation);
    expect(localSql(`select count(*) from public.assessor_briefing_acknowledgements where assessor_user_id='${actor.id}' and program_id='${program}';`).trim()).toBe('1');
    expect(localSql(`select count(*) from public.audit_events where actor_user_id='${actor.id}' and event_type='assessor_briefing.acknowledged';`).trim()).toBe('1');
  } finally {
    localSql(`update public.feature_flags set enabled=false where key='assessor_flow_ui';
      delete from public.assessor_exam_attempts where chapter_id='${chapter}';
      delete from public.assessor_briefing_acknowledgements where program_id='${program}';
      delete from public.assessor_flow_cohort_members where cohort_id='${cohort}';
      delete from public.assessor_flow_cohorts where id='${cohort}';
      delete from public.training_program_chapters where id='${chapter}';
      delete from public.training_programs where id='${program}';
      delete from public.courses where id='${course}';`);
  }
});
