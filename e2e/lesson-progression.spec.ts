import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {expect,test} from '@playwright/test';
import {BARANGAY_ANOS_ID,STABLE_CITY_ADMIN,createThrowawayAssessor,createThrowawayBhw,getAccessToken,onboardThroughLogin,restGet} from './fixtures/auth';

function assertLocal() {
  const url=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??'');
  if(!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='54321')throw new Error('Disposable local Supabase required');
}
function sql(value:string) {
  assertLocal();
  return execFileSync('docker',['exec','-i','supabase_db_bhw-connect-phase-2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input:value,encoding:'utf8',timeout:15000}).trim();
}
const jsonSql=(value:unknown)=>`'${JSON.stringify(value).replaceAll("'","''")}'::jsonb`;

// Fictional text, current manifest keys, real routes and real persistence RPCs.
// Nothing connects to the pilot, even if a caller supplies an override flag.
for(const role of ['assessor','bhw'] as const)test(`${role} saves checks, revisits answers and proceeds within and across subchapters`,async({page,request})=>{
  test.setTimeout(180000);
  assertLocal(); // Must precede account creation as well as fixture SQL.
  const admin=await getAccessToken(request,STABLE_CITY_ADMIN.username,STABLE_CITY_ADMIN.password);
  const user=role==='assessor'
    ?await createThrowawayAssessor(request,admin,'00000000-0000-0000-0000-000000000004')
    :await createThrowawayBhw(request,admin,BARANGAY_ANOS_ID);
  const [actor]=await restGet(request,admin,`users?select=id&username=eq.${user.username}`) as {id:string}[];
  expect(actor.id).toMatch(/^[a-f0-9-]{36}$/);
  const course=randomUUID(),program=randomUUID(),chapter=randomUUID(),progress=randomUUID(),modules=[randomUUID(),randomUUID()];
  const lessons=['bhw-health-educator','bhw-community-organizer','uhc-coverage'].map((key,i)=>({id:randomUUID(),revision:randomUUID(),key,module:modules[i<2?0:1],title:`E2E navigation lesson ${i+1}`}));
  const beforeFlags=JSON.parse(sql("select jsonb_agg(jsonb_build_object('key',key,'enabled',enabled,'disabled_roles',disabled_roles)) from feature_flags where key in ('elearning','chapter1_assessment_v2','course_sessions','assessor_flow_ui');")) as {key:string;enabled:boolean;disabled_roles:string[]}[];
  const check={prompt_en:'Which fictional action would you try?',prompt_fil:'Aling kathang hakbang ang susubukan mo?',options:[{en:'Check the source',fil:'Suriin ang sanggunian'},{en:'Guess',fil:'Hulaan'}],correct_option_index:0,feedback_en:'Check the source and try again.',feedback_fil:'Suriin ang sanggunian at subukang muli.'};
  const parts=['intro','check-one','check-two','end'].map(id=>({id,concept_ids:[id],asset_ids:[],heading_en:`Fictional ${id}`,heading_fil:`Kathang ${id}`,body_en:'Example for navigation verification only.',body_fil:'Halimbawa para sa pagsusuri ng nabigasyon lamang.',takeaway_en:'Review the example.',takeaway_fil:'Balikan ang halimbawa.',check:id.startsWith('check')?check:null}));
  const ids=lessons.map(l=>`'${l.id}'`).join(','),revisions=lessons.map(l=>`'${l.revision}'`).join(',');
  const base=`/training/${program}/${role==='assessor'?'assessor/':''}chapter-1`;
  const href=(i:number)=>`${base}/${lessons[i].module}/${lessons[i].id}`;
  const completionRpc=role==='assessor'?'rpc_assessor_lesson_complete':'rpc_course_lesson_complete';
  const count=(i:number)=>Number(sql(role==='assessor'
    ?`select count(*) from assessor_lesson_progress where assessor_user_id='${actor.id}' and chapter_id='${chapter}' and lesson_id='${lessons[i].id}' and revision_id='${lessons[i].revision}';`
    :`select count(*) from course_lesson_progress where course_progress_id='${progress}' and lesson_id='${lessons[i].id}' and revision_id='${lessons[i].revision}';`));
  const evidence=()=>sql(`select jsonb_build_object(
    'assessor_exams',(select jsonb_agg(to_jsonb(p)) from assessor_exam_attempts p where assessor_user_id='${actor.id}' and chapter_id='${chapter}'),
    'bhw_exams',(select jsonb_agg(to_jsonb(p)) from course_test_attempts p where bhw_user_id='${actor.id}' and course_id='${course}'),
    'qualifications',(select jsonb_agg(to_jsonb(p)) from assessor_chapter_qualifications p where assessor_user_id='${actor.id}' and chapter_id='${chapter}'),
    'awards',(select jsonb_agg(to_jsonb(p)) from assessor_rollout_private.chapter_awards p where actor_id='${actor.id}' and chapter_id='${chapter}'),
    'certificates',(select jsonb_agg(to_jsonb(p)) from certificates p where bhw_user_id='${actor.id}' and course_id='${course}'));`);
  try {
    sql(`begin;
      update feature_flags set enabled=(key='elearning'),disabled_roles='{}' where key in ('elearning','chapter1_assessment_v2','course_sessions','assessor_flow_ui');
      insert into courses(id,org_unit_id,author_user_id,title_fil,title_en,status) values('${course}','${BARANGAY_ANOS_ID}','${actor.id}','E2E navigation course','E2E navigation course','published');
      insert into training_programs(id,content_key,org_unit_id,author_user_id,title_fil,title_en,status) values('${program}','bhw-reference-manual','${BARANGAY_ANOS_ID}','${actor.id}','E2E navigation manual','E2E navigation manual','published');
      insert into training_program_chapters(id,program_id,chapter_key,position,title_fil,title_en,course_id,availability) values('${chapter}','${program}','chapter-1',0,'E2E Chapter I','E2E Chapter I','${course}','available');
      insert into course_modules(id,course_id,position,type,title_fil,title_en) values('${modules[0]}','${course}',0,'text','E2E navigation subchapter 1','E2E navigation subchapter 1'),('${modules[1]}','${course}',1,'text','E2E navigation subchapter 2','E2E navigation subchapter 2');
      ${lessons.map((l,i)=>`insert into course_lessons(id,module_id,lesson_key,position,title_fil,title_en,objectives_fil,objectives_en) values('${l.id}','${l.module}','${l.key}',${i<2?i+1:0},'${l.title}','${l.title}',array['Subukang sundan ang kathang aralin.'],array['Follow the fictional lesson.']);
        insert into course_lesson_revisions(id,lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,created_by) values('${l.revision}','${l.id}','e2e-navigation',repeat('0',64),${jsonSql(parts)},${jsonSql(parts.map(p=>({...p,layout:'scene',display_en:p.body_en,display_fil:p.body_fil})))},'[]','[]','[]','${actor.id}');
        update course_lessons set published_revision_id='${l.revision}' where id='${l.id}';`).join('\n')}
      ${role==='assessor'?`insert into assessor_exam_attempts(assessor_user_id,chapter_id,curriculum_version,exam_id,phase,status,question_set_hash,question_count,score_percent,passed,answers,submitted_at) values('${actor.id}','${chapter}','2026-09-28.1','chapter-1:pretest','pretest','submitted',repeat('0',32),1,0,false,'[]',now());`:`insert into course_progress(id,course_id,bhw_user_id) values('${progress}','${course}','${actor.id}');`}
      commit;`);
    const password='NavigationVerifyPw2026!';
    await onboardThroughLogin(page,user.username,user.tempPassword,password);
    const token=await getAccessToken(request,user.username,password);
    const before=evidence();
    for(const lang of ['en','fil']) {
      // Reset only this fixture's own study rows so each language exercises a
      // genuinely unfinished lesson; no historical/pilot records are involved.
      sql(role==='assessor'?`delete from assessor_lesson_resume where assessor_user_id='${actor.id}' and chapter_id='${chapter}';delete from assessor_lesson_progress where assessor_user_id='${actor.id}' and chapter_id='${chapter}';`
        :`delete from course_lesson_resume where course_progress_id='${progress}';delete from course_lesson_progress where course_progress_id='${progress}';delete from course_module_progress where course_progress_id='${progress}';`);
      const settings=await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_update_settings`,{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,Authorization:`Bearer ${token}`},data:{p_language:lang,p_theme:'light',p_font_scale:'xl',p_high_contrast:false}});
      expect(settings.ok()).toBe(true);await page.setViewportSize({width:320,height:844});
      const text=(en:string,fil:string)=>lang==='en'?en:fil;
      await page.goto(href(0));
      const reader=page.getByRole('region',{name:text('Chapter I lessons','Mga aralin sa Kabanata I'),exact:true});
      const button=(en:string,fil:string)=>reader.getByRole('button',{name:text(en,fil),exact:true});
      const next=()=>button('Next','Susunod').click(),previous=()=>button('Previous','Nakaraan').click();
      const mark=()=>button('Mark lesson complete','Markahang tapos ang aralin');
      const nextLesson=()=>reader.getByRole('link',{name:text('Next lesson →','Susunod na aralin →'),exact:true});
      await expect(mark()).toBeDisabled();await expect(nextLesson()).toHaveCount(0);
      await next();await button('Guess','Hulaan').click();await next();await next();
      await expect(mark()).toBeDisabled(); // check two was skipped
      await previous();await button('Check the source','Suriin ang sanggunian').click();await previous();
      await expect(button('Guess','Hulaan')).toHaveAttribute('aria-pressed','true');
      await button('Slides','Slides').click();
      await expect(button('Guess','Hulaan')).toHaveAttribute('aria-pressed','false');
      await button('Read','Basahin').click();
      await expect(button('Guess','Hulaan')).toHaveAttribute('aria-pressed','true');
      await next();await next();await expect(mark()).toBeEnabled();
      const failurePattern=`**/rest/v1/rpc/${completionRpc}`;
      await page.route(failurePattern,route=>route.abort('failed'));
      await mark().click();await expect(reader.getByRole('alert')).toContainText(text('Completion could not be saved.','Hindi nai-save ang pagkumpleto.'));
      expect(count(0)).toBe(0);await expect(nextLesson()).toHaveCount(0);
      await page.unroute(failurePattern);await mark().click();
      await expect(button('Completed','Natapos')).toBeVisible();expect(count(0)).toBe(1);
      await expect(nextLesson()).toHaveAttribute('href',href(1));
      await page.reload();await expect(button('Completed','Natapos')).toBeVisible();
      await nextLesson().click();await expect(page).toHaveURL(href(1));
      await expect(page.getByRole('heading',{level:1,name:lessons[1].title,exact:true})).toBeVisible();
      await button('Slides','Slides').click();await next();await button('Check the source','Suriin ang sanggunian').click();await next();
      await expect.poll(()=>sql(role==='assessor'?`select position_key from assessor_lesson_resume where assessor_user_id='${actor.id}' and chapter_id='${chapter}' and lesson_id='${lessons[1].id}' and modality='slides';`:`select position_key from course_lesson_resume where course_progress_id='${progress}' and lesson_id='${lessons[1].id}' and modality='slides';`),{timeout:10000}).toBe('check-two');
      await page.reload();await expect(button('Slides','Slides')).toHaveAttribute('aria-pressed','true');
      await expect(reader.getByRole('heading',{name:text('Fictional check-two','Kathang check-two'),exact:true})).toBeVisible();
      await button('Check the source','Suriin ang sanggunian').click();await previous();
      await expect(button('Check the source','Suriin ang sanggunian')).toHaveAttribute('aria-pressed','false');
      await button('Check the source','Suriin ang sanggunian').click();await next();await next();
      await mark().click();await expect(button('Completed','Natapos')).toBeVisible();expect(count(1)).toBe(1);
      await expect(nextLesson()).toHaveAttribute('href',href(2));
      await nextLesson().click();await expect(page).toHaveURL(href(2));
      await expect(page.getByRole('heading',{level:1,name:lessons[2].title,exact:true})).toBeVisible();
      await expect(nextLesson()).toHaveCount(0);expect(count(2)).toBe(0);
      await page.goBack();await expect(page).toHaveURL(href(1));await expect(button('Completed','Natapos')).toBeVisible();
      await page.goto(`${base}/${modules[0]}`);
      await page.locator(`a[href="${href(0)}"]`).filter({hasText:lessons[0].title}).click();
      await expect(page).toHaveURL(href(0));await expect(button('Completed','Natapos')).toBeVisible();
      expect(count(0)).toBe(1);expect(count(1)).toBe(1);expect(count(2)).toBe(0);
      expect(evidence()).toBe(before); // Learning does not issue exam/qualification/certificate evidence.
      expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    }
  } finally {
    await page.unrouteAll({behavior:'ignoreErrors'});
    await page.goto('/home'); // Unmount the reader before deleting its fixture.
    sql(`begin;
      delete from assessor_lesson_resume where chapter_id='${chapter}';delete from assessor_lesson_progress where chapter_id='${chapter}';delete from assessor_exam_attempts where chapter_id='${chapter}';
      delete from course_lesson_resume where course_progress_id='${progress}';delete from course_lesson_progress where course_progress_id='${progress}';delete from course_module_progress where course_progress_id='${progress}';delete from course_progress where id='${progress}';
      update course_lessons set published_revision_id=null where id in (${ids});
      alter table course_lesson_revisions disable trigger training_revision_immutable;
      delete from course_lesson_revisions where id in (${revisions});
      alter table course_lesson_revisions enable trigger training_revision_immutable;
      delete from course_lessons where id in (${ids});delete from training_program_chapters where id='${chapter}';delete from training_programs where id='${program}';delete from courses where id='${course}';
      ${beforeFlags.map(f=>`update feature_flags set enabled=${f.enabled},disabled_roles=array(select jsonb_array_elements_text(${jsonSql(f.disabled_roles)})) where key='${f.key}';`).join('\n')}
      commit;`);
  }
});
