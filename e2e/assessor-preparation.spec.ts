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
  const course=randomUUID(),program=randomUUID(),chapter=randomUUID(),cohort=randomUUID(),guideModuleId=randomUUID(),reviewLessonId=randomUUID(),reviewRevisionId=randomUUID();
  localSql(`
    insert into public.courses(id,org_unit_id,author_user_id,title_fil,title_en,status)
      select '${course}','00000000-0000-0000-0000-000000000006',id,'E2E assessor chapter','E2E assessor chapter','published' from public.users where username='admin.city.stable';
    insert into public.training_programs(id,content_key,org_unit_id,author_user_id,title_fil,title_en,status)
      select '${program}','bhw-reference-manual','00000000-0000-0000-0000-000000000006',id,'E2E assessor manual','E2E assessor manual','published' from public.users where username='admin.city.stable';
    insert into public.training_program_chapters(id,program_id,chapter_key,position,title_fil,title_en,course_id,availability)
      values('${chapter}','${program}','chapter-1',0,'Kabanata I','Chapter I','${course}','available');
    insert into public.course_modules(id,course_id,position,type,title_fil,title_en)
      values('${guideModuleId}','${course}',0,'text','Gabay para sa paghahanda','Preparation guide');
    insert into public.course_module_facilitator_notes(module_id,competency_statement_fil,competency_statement_en,observation_indicators)
      select '${guideModuleId}','Kathang-isip na pamantayan para sa pagsusuri lamang.','Fictional criteria for verification only.',jsonb_agg(jsonb_build_object(
        'objective_index',i,'observable_fil','Kathang halimbawa '||(i+1)::text,'observable_en','Fictional example '||(i+1)::text,
        'not_yet_fil','Kailangan pa ng halimbawa.','not_yet_en','An example is still needed.',
        'levels',jsonb_build_object('kaya_na_fil','Kusang halimbawa.','kaya_na_en','Unprompted example.',
          'kailangan_practice_fil','Halimbawa na may tulong.','kailangan_practice_en','Example with help.',
          'hindi_pa_fil','Wala pang halimbawa.','hindi_pa_en','No example yet.')) order by i) from generate_series(0,1) i;
    insert into public.assessor_flow_cohorts(id,program_id,chapter_key,cohort_key,requirements_version,ui_enabled,writes_enabled,awards_enabled)
      values('${cohort}','${program}','chapter-1','e2e-preparation','chapter-1:c1af.draft-1',true,false,false);
    insert into public.assessor_flow_cohort_members(program_id,chapter_key,user_id,cohort_id)
      values('${program}','chapter-1','${actor.id}','${cohort}');
    update public.feature_flags set enabled=true,disabled_roles='{}' where key in ('elearning','assessor_flow_ui');
  `);
  try {
    await onboardThroughLogin(page,assessor.username,assessor.tempPassword,'AssessorPrepPw2026!');
    const base=`/training/${program}/assessor/chapter-1`;
    // Candidates may inspect the guide before training. That read creates no
    // progress/qualification and links into the existing briefing gate.
    const guideEvidence=()=>localSql(`select jsonb_build_object(
      'observations',(select jsonb_agg(to_jsonb(p)) from competency_observations p where observer_user_id='${actor.id}' and module_id='${guideModuleId}'),
      'study',(select jsonb_agg(to_jsonb(p)) from assessor_lesson_progress p where assessor_user_id='${actor.id}' and chapter_id='${chapter}'),
      'attempts',(select jsonb_agg(to_jsonb(p)) from assessor_exam_attempts p where assessor_user_id='${actor.id}' and chapter_id='${chapter}'),
      'qualifications',(select jsonb_agg(to_jsonb(p)) from assessor_chapter_qualifications p where assessor_user_id='${actor.id}' and chapter_id='${chapter}'),
      'awards',(select jsonb_agg(to_jsonb(p)) from assessor_rollout_private.chapter_awards p where actor_id='${actor.id}' and chapter_id='${chapter}'));`).trim();
    const beforeGuide=guideEvidence();
    await page.goto(`/training/${program}/chapter-1/${guideModuleId}`);
    await expect(page.getByRole('heading',{name:'Pagbukas ng gabay at pahintulot sa pagtatasa'})).toBeVisible();
    await expect(page.getByRole('link',{name:'Tingnan ang mga kailangan sa aking sertipikasyon'})).toHaveAttribute('href',`/training/${program}/assessor/qualifications#chapter-1`);
    expect(guideEvidence()).toBe(beforeGuide);
    await page.getByRole('navigation',{name:'Mga bahagi ng gabay'}).getByRole('link',{name:'Kakayahang hahanapin',exact:true}).click();
    await expect(page).toHaveURL(`/training/${program}/chapter-1/${guideModuleId}?view=competency`);
    await page.getByRole('navigation',{name:'Pumunta sa indicator'}).getByRole('link',{name:'Indicator 2',exact:true}).click();
    const criterion=page.locator('#competency-indicator-2');
    await expect(criterion).toBeFocused();
    await expect(criterion.getByText('Kathang halimbawa 2',{exact:true})).toBeVisible();
    const comparison=criterion.getByText('Ihambing ang tatlong antas',{exact:true});
    await expect(comparison.locator('..')).toHaveJSProperty('open',false);
    await comparison.focus();await comparison.press('Enter');
    await expect(criterion.getByText('Halimbawa na may tulong.',{exact:true})).toBeVisible();
    expect(guideEvidence()).toBe(beforeGuide);
    await page.getByRole('link',{name:'Buksan ang sarili kong paghahanda sa kabanata'}).click();
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
    await expect(page.getByRole('link',{name:'Balik-aral at bilis ng pag-aaral'})).toHaveCount(0);
    localSql(`insert into public.assessor_exam_attempts(assessor_user_id,chapter_id,curriculum_version,exam_id,phase,status,question_set_hash,question_count,score_percent,passed,answers,submitted_at)
      values('${actor.id}','${chapter}','2026-09-28.1','chapter-1:pretest','pretest','submitted',repeat('0',32),1,0,false,'[]',now());`);
    await page.reload();
    await expect(checklist.getByText('Sariling pag-aaral · 0 sa 42 aralin')).toBeVisible();
    await expect(page.locator('section[aria-labelledby^="study-subchapter-"]')).toHaveCount(9);
    await expect(checklist.getByRole('link',{name:'Kunin ang diagnostic pretest'})).toHaveCount(0);
    const beforeNavigation=guideEvidence();
    await page.getByRole('link',{name:'Progreso sa pag-aaral at listahan ng mga aralin'}).click();
    await expect(page).toHaveURL(`${base}#assessor-study-progress`);
    await expect(page.locator('#assessor-study-progress')).toBeVisible();
    const progressClearance=await page.evaluate(()=>({target:document.getElementById('assessor-study-progress')!.getBoundingClientRect().top,header:document.querySelector('header.sticky')!.getBoundingClientRect().bottom}));
    expect(progressClearance.target).toBeGreaterThanOrEqual(progressClearance.header);
    await page.getByRole('link',{name:'Aking mga sertipikasyon',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Saan makikita ang progreso at susunod na hakbang?'})).toBeVisible();
    const personal=page.getByRole('navigation',{name:'Progreso sa pag-aaral ayon sa kabanata'});
    await personal.getByRole('link',{name:'Kabanata I',exact:true}).click();
    await expect(page).toHaveURL(`${base}#assessor-study-progress`);
    await expect(checklist.getByText('Sariling pag-aaral · 0 sa 42 aralin')).toBeVisible();
    expect(guideEvidence()).toBe(beforeNavigation);
    await page.getByRole('link',{name:'Balik-aral at bilis ng pag-aaral'}).click();
    await expect(page).toHaveURL(`${base}#assessor-refresher-review`);
    const refresher=page.getByRole('region',{name:'Opsyonal na balik-aral'});
    await expect(refresher.getByText(/Makikita rito ang mga natapos na aralin/)).toBeVisible();
    expect(guideEvidence()).toBe(beforeNavigation);
    // One clearly fictional, completed lesson in the disposable stack exercises
    // reopening through the real reader. No assessment/award is issued.
    localSql(`
      insert into course_lessons(id,module_id,lesson_key,position,title_fil,title_en,objectives_fil,objectives_en)
        values('${reviewLessonId}','${guideModuleId}','bhw-roles-hepo',0,'E2E refresher lesson','E2E refresher lesson',array['Kathang-isip na pagsasanay'],array['Fictional practice']);
      insert into course_lesson_revisions(id,lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,created_by)
        values('${reviewRevisionId}','${reviewLessonId}','e2e-refresher',repeat('0',64),
          '[{"id":"intro","concept_ids":["fixture"],"heading_fil":"Kathang-isip na pagsasanay","heading_en":"Fictional practice","body_fil":"Halimbawa lamang para sa pagsusuri.","body_en":"Example for verification only.","asset_ids":[],"takeaway_fil":"Balikan ang aralin.","takeaway_en":"Review the lesson.","check":null}]',
          '[{"id":"intro","concept_ids":["fixture"],"layout":"takeaway","heading_fil":"Pagsasanay","heading_en":"Practice","display_fil":"Halimbawa lamang.","display_en":"Example only.","asset_ids":[],"check":null}]','[]','[]','${actor.id}');
      update course_lessons set published_revision_id='${reviewRevisionId}' where id='${reviewLessonId}';
      insert into course_lesson_facilitator_notes(revision_id,notes_fil,notes_en)
        values('${reviewRevisionId}',E'## [opening] Pambungad\n\nKathang halimbawa lamang.\n\n## [steps] Mga hakbang\n\nTalakayin ang halimbawa.\n\n## [practice] Pagsasanay ng pangkat\n\nSubukang muli na may suporta.\n\n## [support] Follow-up\n\nBalikan ang paliwanag.',
          E'## [opening] Opening\n\nFictional example only.\n\n## [steps] Steps\n\nDiscuss the example.\n\n## [practice] Group practice\n\nTry again with support.\n\n## [support] Follow-up\n\nRevisit the explanation.');
      insert into assessor_lesson_progress(assessor_user_id,chapter_id,lesson_id,revision_id)
        values('${actor.id}','${chapter}','${reviewLessonId}','${reviewRevisionId}');
    `);
    const beforeReview=guideEvidence();
    await page.reload();
    const completedReview=refresher.locator('summary');
    await expect(completedReview).toHaveText('Balikan ang natapos na mga aralin (1)');
    await completedReview.click();
    await refresher.getByRole('link',{name:'E2E refresher lesson'}).click();
    await expect(page.getByRole('heading',{level:1,name:'E2E refresher lesson'})).toBeVisible();
    const studyLesson=`${base}/${guideModuleId}/${reviewLessonId}`;
    await page.getByRole('navigation',{name:'Mga gabay sa pag-aaral ng pangkat'}).getByRole('link',{name:'Gabay ng facilitator sa araling ito'}).click();
    await expect(page).toHaveURL(`/training/${program}/chapter-1/${guideModuleId}/${reviewLessonId}`);
    const groupSteps=page.getByRole('navigation',{name:'Talakayan, pagsasanay at follow-up'});
    await expect(page.locator('#lesson-guide-practice')).toHaveJSProperty('open',false);
    await groupSteps.getByRole('link',{name:'Pagsasanay ng pangkat'}).click();
    await expect(page.locator('#lesson-guide-practice')).toHaveJSProperty('open',true);
    await expect(page.locator('#lesson-guide-practice-content')).toBeFocused();
    await expect(page.locator('#lesson-guide-practice-content')).toHaveText('Subukang muli na may suporta.');
    expect(guideEvidence()).toBe(beforeReview);
    await page.goto(studyLesson);
    await page.getByRole('navigation',{name:'Mga gabay sa pag-aaral ng pangkat'}).getByRole('link',{name:'Paano patakbuhin ang subchapter'}).click();
    await expect(page).toHaveURL(`/training/${program}/chapter-1/${guideModuleId}?view=run`);
    await page.getByRole('navigation',{name:'Mga gabay ng facilitator sa bawat aralin'}).getByRole('link',{name:'E2E refresher lesson'}).click();
    await expect(page.getByRole('heading',{name:'Gabay ng facilitator sa araling ito',exact:true})).toBeVisible();
    expect(guideEvidence()).toBe(beforeReview);
    await page.goto(studyLesson);
    await page.getByRole('link',{name:'Balik-aral at bilis ng pag-aaral'}).click();
    await expect(page).toHaveURL(`${base}#assessor-refresher-review`);
    await expect(refresher).toBeVisible();
    const reviewClearance=await refresher.evaluate(n=>({target:n.getBoundingClientRect().top,header:document.querySelector('header.sticky')!.getBoundingClientRect().bottom}));
    expect(reviewClearance.target).toBeGreaterThanOrEqual(reviewClearance.header);
    expect(guideEvidence()).toBe(beforeReview);
    await expect(checklist.getByText('Sariling pag-aaral · 1 sa 42 aralin')).toBeVisible();
    expect(localSql(`select count(*) from public.assessor_briefing_acknowledgements where assessor_user_id='${actor.id}' and program_id='${program}';`).trim()).toBe('1');
    expect(localSql(`select count(*) from public.audit_events where actor_user_id='${actor.id}' and event_type='assessor_briefing.acknowledged';`).trim()).toBe('1');
  } finally {
    localSql(`begin;
      update public.feature_flags set enabled=false where key='assessor_flow_ui';
      delete from public.assessor_exam_attempts where chapter_id='${chapter}';
      delete from public.assessor_lesson_resume where chapter_id='${chapter}';
      delete from public.assessor_lesson_progress where chapter_id='${chapter}';
      update public.course_lessons set published_revision_id=null where id='${reviewLessonId}';
      alter table public.course_lesson_facilitator_notes disable trigger training_notes_immutable;
      delete from public.course_lesson_facilitator_notes where revision_id='${reviewRevisionId}';
      alter table public.course_lesson_facilitator_notes enable trigger training_notes_immutable;
      alter table public.course_lesson_revisions disable trigger training_revision_immutable;
      delete from public.course_lesson_revisions where id='${reviewRevisionId}';
      alter table public.course_lesson_revisions enable trigger training_revision_immutable;
      delete from public.course_lessons where id='${reviewLessonId}';
      delete from public.assessor_briefing_acknowledgements where program_id='${program}';
      delete from public.assessor_flow_cohort_members where cohort_id='${cohort}';
      delete from public.assessor_flow_cohorts where id='${cohort}';
      delete from public.training_program_chapters where id='${chapter}';
      delete from public.training_programs where id='${program}';
      delete from public.courses where id='${course}';
      commit;`);
  }
});
