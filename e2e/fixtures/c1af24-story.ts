import {randomUUID} from 'node:crypto';
import {expect,type APIRequestContext,type Browser,type Page} from '@playwright/test';
import {createThrowawayBhw,getAccessToken,onboardThroughLogin,restGet} from './auth';

type Fixture={program:string;chapter:string;course:string;cohort:string};
type Sql=(query:string)=>string;
type Context=Fixture&{page:Page;request:APIRequestContext;browser:Browser;localSql:Sql;
  cityToken:string;assessorToken:string};
const anonKey=()=>process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Every approval below is a synthetic, disposable fixture. The production
// registry and feature controls are deliberately untouched by this PR.
export async function rehearseChapterOne({page,request,browser,localSql,cityToken,assessorToken,
  program,chapter,course,cohort}:Context){
  const language=await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_update_settings`,{
    headers:{apikey:anonKey(),Authorization:`Bearer ${assessorToken}`},
    data:{p_language:'fil',p_theme:'system',p_font_scale:'md',p_high_contrast:false}});
  expect(language.ok(),await language.text()).toBe(true);
  const bhw=await createThrowawayBhw(request,cityToken,'00000000-0000-0000-0000-000000000006');
  const [learner]=await restGet(request,cityToken,`users?select=id&username=eq.${bhw.username}`) as Array<{id:string}>;
  expect(learner?.id).toBeTruthy();
  localSql(`
    insert into public.assessor_flow_cohort_members(program_id,chapter_key,user_id,cohort_id)
      values('${program}','chapter-1','${learner.id}','${cohort}');
    insert into public.course_progress(course_id,bhw_user_id,status,content_completed_at)
      values('${course}','${learner.id}','content_completed',now());
    update public.course_modules set title_fil='E2E bahagi '||position,title_en='E2E component '||position
      where course_id='${course}';
    do $$ declare m record; l record; admin_id uuid; progress_id uuid; rubric jsonb; begin
      select id into admin_id from public.users where username='admin.city.stable';
      select id into progress_id from public.course_progress where course_id='${course}' and bhw_user_id='${learner.id}';
      rubric:=jsonb_build_object('observable',jsonb_build_object('fil','Naipakita ang hakbang sa pagsasanay.',
        'en','Demonstrated the task in practice.'),'levels',jsonb_build_object(
        'kaya_na',jsonb_build_object('fil','Kaya nang gawin','en','Can do independently'),
        'kailangan_practice',jsonb_build_object('fil','Kailangan ng pagsasanay','en','Needs practice'),
        'hindi_pa',jsonb_build_object('fil','Hindi pa kaya','en','Not yet demonstrated')));
      for m in select id,position from public.course_modules where course_id='${course}' order by position loop
        select id,published_revision_id into l from public.course_lessons where module_id=m.id
          order by (lesson_key='communication-clarify') desc,position limit 1;
        insert into public.course_lesson_progress(course_progress_id,lesson_id,revision_id,completed_at,completion_basis)
          values(progress_id,l.id,l.published_revision_id,now(),'learner');
        insert into assessor_rollout_private.practice_criteria
          (chapter_id,lesson_id,lesson_revision_id,criterion_id,criterion_version,requirements_version,
           rubric_version,source_fingerprint,rubric_snapshot,review_reference,approved_by,enabled)
          values('${chapter}',l.id,l.published_revision_id,'e2e-component-'||m.position,'v1',
            'chapter-1:c1af.draft-1','local-rubric',repeat('a',64),rubric,'LOCAL C1AF-24 TEST ONLY',admin_id,true);
        insert into assessor_rollout_private.component_requirements
          (module_id,chapter_id,requirements_version,rubric_version,review_reference,approved_by,
           enabled,purpose_fil,purpose_en)
          values(m.id,'${chapter}','chapter-1:c1af.draft-1','local-rubric',
            'LOCAL C1AF-24 TEST ONLY',admin_id,true,'Suriin ang kakayahan sa bahaging ito.',
            'Assess the skill in this chapter component.');
        insert into assessor_rollout_private.component_required_lessons(module_id,lesson_id) values(m.id,l.id);
        insert into assessor_rollout_private.component_required_criteria
          (module_id,chapter_id,criterion_id,criterion_version,description_fil,description_en)
          values(m.id,'${chapter}','e2e-component-'||m.position,'v1',
            'Naobserbahang hakbang ng BHW','Observed BHW task');
      end loop;
    end $$;
    update public.assessor_flow_cohorts set writes_enabled=true where id='${cohort}';
    update public.feature_flags set enabled=true,disabled_roles='{}' where key='assessor_flow_writes';
  `);
  const count=()=>JSON.parse(localSql(`select jsonb_build_object(
    'practice',(select count(*) from assessor_rollout_private.practice_attempts where program_id='${program}'),
    'requests',(select count(*) from assessor_rollout_private.component_requests where program_id='${program}'),
    'formal',(select count(*) from assessor_rollout_private.formal_attempts where program_id='${program}'),
    'reviews',(select count(*) from assessor_rollout_private.bhw_chapter_reviews where program_id='${program}'),
    'assessments',(select count(*) from public.assessments where course_id='${course}'),
    'certificates',(select count(*) from public.certificates where course_id='${course}'))`).trim()) as Record<string,number>;
  const before=count();
  expect(before).toEqual({practice:0,requests:0,formal:0,reviews:0,assessments:0,certificates:0});
  const rpc=async(name:string,data:Record<string,unknown>,token=assessorToken)=>{
    const response=await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${name}`,{
      headers:{apikey:anonKey(),Authorization:`Bearer ${token}`},data});
    expect(response.ok(),`${name}: ${await response.text()}`).toBe(true);
    return response.json();
  };
  const modules=JSON.parse(localSql(`select jsonb_agg(jsonb_build_object('id',id,'position',position)
    order by position) from public.course_modules where course_id='${course}'`).trim()) as Array<{id:string;position:number}>;
  expect(modules).toHaveLength(9);
  const lesson=localSql(`select l.id from public.course_lessons l join public.course_modules m on m.id=l.module_id
    where m.course_id='${course}' and m.position=5 and l.lesson_key='communication-clarify'`).trim();
  expect(lesson).toMatch(/^[a-f0-9-]{36}$/);
  const learnerContext=await browser.newContext({viewport:{width:390,height:844}});
  const learnerPage=await learnerContext.newPage();
  try{
    await onboardThroughLogin(learnerPage,bhw.username,bhw.tempPassword,'BhwStoryPw2026!');
    await page.setViewportSize({width:768,height:960});
    await page.goto(`/training/${program}/assessor/workspace?q=${encodeURIComponent(bhw.fullName)}&learner=${learner.id}`);
    await expect(page.getByRole('heading',{name:/Kahandaan ni|Readiness for/})).toContainText(bhw.fullName);
    await page.getByRole('link',{name:/Ihanda ang aralin 1\.6\.2 kasama|Prepare lesson 1\.6\.2 with/}).click();
    await expect(page).toHaveURL(/view=prepare/);
    await page.goto(`/training/${program}/assessor/observe?lesson=${lesson}&learner=${learner.id}`);
    const observation=page.getByRole('form',{name:'Itala ang obserbasyon'});
    await expect(observation).toBeVisible();
    await observation.getByLabel('May sapat na direktang ebidensiya').check();
    await observation.getByRole('textbox',{name:/Eksaktong nasaksihang kilos/}).fill('The BHW clarified the fictional household question without prompting.');
    await observation.getByLabel('Kaya nang gawin').check();
    await observation.getByRole('textbox',{name:/Pribadong tala/}).fill('Private C1AF-24 rehearsal note');
    await observation.getByRole('textbox',{name:/Feedback para sa BHW/}).fill('You explained the next step clearly.');
    await observation.getByRole('textbox',{name:/Susunod na hakbang/}).fill('Repeat with another scenario.');
    await observation.getByRole('checkbox',{name:/Ibahagi ang feedback/}).check();
    await observation.getByRole('button',{name:'Itala ang obserbasyon'}).click();
    await expect(observation.getByRole('status')).toContainText('Naitala ang obserbasyon');
    await learnerPage.goto(`/training/${program}/practice-feedback`);
    await expect(learnerPage.getByText('You explained the next step clearly.')).toBeVisible();
    await expect(learnerPage.getByText('Private C1AF-24 rehearsal note')).toHaveCount(0);
    const learnerToken=await getAccessToken(request,bhw.username,'BhwStoryPw2026!');
    const forbidden=await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_assessor_chapter_review_state`,{
      headers:{apikey:anonKey(),Authorization:`Bearer ${learnerToken}`},
      data:{p_program_id:program,p_bhw_user_id:learner.id}});
    expect(forbidden.ok()).toBe(false);
    await page.reload();
    await expect(page.getByText('The BHW clarified the fictional household question without prompting.')).toBeVisible();

    const formal=async(component:{id:string;position:number},rating='kaya_na')=>{
      const key=randomUUID();
      const req=await rpc('rpc_assessor_component_request_create',{
        p_key:key,p_program_id:program,p_bhw_user_id:learner.id,p_module_id:component.id}) as string;
      expect(await rpc('rpc_assessor_component_request_create',{
        p_key:key,p_program_id:program,p_bhw_user_id:learner.id,p_module_id:component.id})).toBe(req);
      await rpc('rpc_assessor_component_request_claim',{p_key:randomUUID(),p_request_id:req});
      await rpc('rpc_assessor_component_arrangement_set',{p_key:randomUUID(),p_request_id:req,
        p_agreed_at:'2030-01-01T12:00:00Z',p_location:'Fictional barangay hall',p_note:'C1AF-24 rehearsal'});
      const attempt=await rpc('rpc_assessor_formal_start',{p_key:randomUUID(),p_request_id:req}) as string;
      await rpc('rpc_assessor_formal_save',{p_attempt_id:attempt,p_expected_revision:0,
        p_evidence:[{id:`e2e-component-${component.position}`,sufficiency:'sufficient',rating,
          facts:'The learner demonstrated the observed step in a fictional supervised exercise.',
          nextStep:'Continue supervised practice.'}]});
      await rpc('rpc_assessor_formal_submit',{p_key:randomUUID(),p_attempt_id:attempt,p_expected_revision:1});
      await rpc('rpc_assessor_formal_feedback_release',{p_key:randomUUID(),p_attempt_id:attempt,
        p_fil:'Nakita ang gawain. Ipagpatuloy ang gabay.',p_en:'Observed the task. Continue guided work.'});
      return attempt;
    };
    // The 1.6.2 refusal is released first. It cannot issue a chapter certificate.
    const conflict=await formal(modules[5],'hindi_pa');
    expect((await rpc('rpc_assessor_chapter_review_state',{
      p_program_id:program,p_bhw_user_id:learner.id})).suggestedOutcome).not.toBe('complete');
    expect(count().certificates).toBe(0);
    await learnerPage.goto(`/training/${program}/assessment-requests`);
    await expect(learnerPage.getByRole('heading',{name:'Aking mga kahilingan sa pagtatasa'})).toBeVisible();
    await expect(learnerPage.getByText('Nakita ang gawain. Ipagpatuloy ang gabay.')).toBeVisible();
    const retry=await rpc('rpc_assessor_formal_retry_request',{p_key:randomUUID(),p_prior_attempt_id:conflict,
      p_practice_note:'The learner repeated the fictional communication exercise with supervision.'}) as string;
    await rpc('rpc_assessor_component_request_claim',{p_key:randomUUID(),p_request_id:retry});
    await rpc('rpc_assessor_component_arrangement_set',{p_key:randomUUID(),p_request_id:retry,
      p_agreed_at:'2030-01-02T12:00:00Z',p_location:'Fictional barangay hall',p_note:'C1AF-24 retry'});
    const fresh=await rpc('rpc_assessor_formal_start',{p_key:randomUUID(),p_request_id:retry}) as string;
    const empty=await rpc('rpc_assessor_formal_state',{p_request_id:retry});
    expect(empty.attempt.evidence).toEqual([]);
    await page.goto(`/training/${program}/assessor/formal?request=${retry}`);
    await expect(page.getByRole('button',{name:'I-save ang draft'})).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button',{name:'I-save ang draft'})).toBeVisible();
    await rpc('rpc_assessor_formal_save',{p_attempt_id:fresh,p_expected_revision:0,
      p_evidence:[{id:'e2e-component-5',sufficiency:'sufficient',rating:'kaya_na',
        facts:'The learner independently clarified a new fictional household question.',
        nextStep:'Apply the same approach in supervised work.'}]});
    await rpc('rpc_assessor_formal_submit',{p_key:randomUUID(),p_attempt_id:fresh,p_expected_revision:1});
    await rpc('rpc_assessor_formal_feedback_release',{p_key:randomUUID(),p_attempt_id:fresh,
      p_fil:'Nagawa sa bagong pagsubok. Ipagpatuloy.',p_en:'Completed in the fresh attempt. Continue.'});
    for(const component of modules.filter(item=>item.position!==5))await formal(component);
    const ready=await rpc('rpc_assessor_chapter_review_state',{
      p_program_id:program,p_bhw_user_id:learner.id});
    expect(ready.suggestedOutcome).toBe('complete');
    await page.setViewportSize({width:1440,height:960});
    const reviewPage=await page.goto(`/training/${program}/assessor/review?learner=${learner.id}`);
    expect(reviewPage?.status(),`${page.url()} · ${(await page.locator('body').innerText()).slice(0,500)}`).toBe(200);
    await expect(page.getByRole('heading',{name:/Pagsusuri ng Kabanata 1|Chapter 1 review/}).first()).toBeVisible();
    await expect(page.locator('p').filter({hasText:/Kasalukuyang resulta:|Current outcome:/}))
      .toContainText(/Kumpleto|Complete/);
    await page.getByRole('textbox',{name:'Buod sa Filipino'}).last().fill('Natapos ang siyam na bahagi batay sa bagong ebidensiya.');
    await page.getByRole('textbox',{name:'Summary in English'}).last().fill('All nine components are complete with fresh evidence.');
    await page.getByRole('button',{name:/Ilabas ang pagsusuri ng Kabanata 1|Release Chapter 1 review/}).click();
    await expect(page.getByText(/May naitalang isang sertipiko ng Kabanata 1|One Chapter 1 certificate is recorded/)).toBeVisible();
    await learnerPage.reload();
    await expect(learnerPage.getByRole('link',{name:'Tingnan ang sertipiko'})).toBeVisible();
    await learnerPage.getByRole('link',{name:'Tingnan ang sertipiko'}).click();
    await expect(learnerPage).toHaveURL(/\/certificates\//);
    const pdfLink=learnerPage.locator('a[href$="/pdf"]');
    await expect(pdfLink).toBeVisible();
    const pdf=await learnerPage.request.get(await pdfLink.getAttribute('href')??'');
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['content-type']).toContain('application/pdf');
    const after=count();
    expect(after).toEqual({practice:1,requests:10,formal:10,reviews:1,assessments:1,certificates:1});
    console.info('C1AF-24 database evidence',JSON.stringify({before,after,program,learner:learner.id}));
  }finally{await learnerContext.close();}
}

export function cleanupChapterOneRehearsal(localSql:Sql,{program,chapter,course,cohort}:Fixture){
  localSql(`begin;
    update public.feature_flags set enabled=false where key='assessor_flow_writes';
    -- Disposal of synthetic records is not a staff action under the live cutover.
    alter table public.assessments disable trigger assessor_flow_legacy_guard;
    alter table public.certificates disable trigger assessor_flow_legacy_guard;
    update assessor_rollout_private.bhw_chapter_reviews set state='issuing',certificate_id=null,
      assessment_id=null where program_id='${program}' and outcome='complete';
    update public.assessments set formal_chapter_review_id=null where course_id='${course}';
    delete from public.certificates where course_id='${course}';
    delete from public.assessments where course_id='${course}';
    alter table public.assessments enable trigger assessor_flow_legacy_guard;
    alter table public.certificates enable trigger assessor_flow_legacy_guard;
    delete from assessor_rollout_private.bhw_chapter_reviews where program_id='${program}';
    delete from assessor_rollout_private.formal_reassessments where next_request_id in
      (select id from assessor_rollout_private.component_requests where program_id='${program}');
    delete from assessor_rollout_private.formal_attempts where program_id='${program}';
    delete from assessor_rollout_private.component_request_events where component_request_id in
      (select id from assessor_rollout_private.component_requests where program_id='${program}');
    delete from assessor_rollout_private.component_assignments where request_id in
      (select id from assessor_rollout_private.component_requests where program_id='${program}');
    delete from assessor_rollout_private.component_requests where program_id='${program}';
    alter table assessor_rollout_private.practice_attempts disable trigger practice_preserve_attempt;
    delete from assessor_rollout_private.practice_attempts where program_id='${program}';
    alter table assessor_rollout_private.practice_attempts enable trigger practice_preserve_attempt;
    delete from assessor_rollout_private.component_required_criteria where chapter_id='${chapter}';
    delete from assessor_rollout_private.component_required_lessons where module_id in
      (select id from public.course_modules where course_id='${course}');
    delete from assessor_rollout_private.component_requirements where chapter_id='${chapter}';
    delete from assessor_rollout_private.practice_criteria where chapter_id='${chapter}';
    delete from public.course_lesson_progress where course_progress_id in
      (select id from public.course_progress where course_id='${course}');
    delete from public.course_progress where course_id='${course}';
    delete from public.notifications where link_path like '/training/${program}/%';
    update public.assessor_flow_cohorts set writes_enabled=false where id='${cohort}';
    commit;`);
}
