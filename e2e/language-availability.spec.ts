import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {translationsForLesson} from '../src/lib/elearning/lesson-translations';
import type {PublishedLesson} from '../src/lib/elearning/reference-navigation';
import {loadReferenceModule,contentHash} from '../scripts/lib/reference-content.mjs';
import {STABLE_CITY_ADMIN,createThrowawayAssessor,getAccessToken,onboardThroughLogin,restGet} from './fixtures/auth';

function localSql(sql:string){
  const url=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??'');
  if(!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='54321')throw Error('Disposable local Supabase required');
  return execFileSync('docker',['exec','-i','supabase_db_bhw-connect-phase-2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input:sql,encoding:'utf8',timeout:15000});
}

for(const target of [{key:'bhw-roles-hepo',module:'01-tungkulin-ng-bhw',position:0},{key:'problem-define',module:'07-problema',position:6}])test(`Language coverage in training and assessor study: ${target.key}`,async({page,request})=>{
  test.setTimeout(180000);
  localSql('select 1;'); // Refuse pilot URLs before even creating a fixture account.
  const admin=await getAccessToken(request,STABLE_CITY_ADMIN.username,STABLE_CITY_ADMIN.password);
  const assessor=await createThrowawayAssessor(request,admin,'00000000-0000-0000-0000-000000000004');
  const [actor]=await restGet(request,admin,`users?select=id&username=eq.${assessor.username}`) as {id:string}[];
  const [course,program,chapter,module,lesson,revision]=Array.from({length:6},()=>randomUUID());
  const source=loadReferenceModule('content/training/day1-basic-competencies/modules/'+target.module,'public').lessons.find(l=>l.manifest.lesson_key===target.key)!;
  const translationOptions=translationsForLesson({...source.manifest,id:lesson,revision:{...source.revision,id:revision,content_hash:contentHash(source)}}as PublishedLesson,false);
  const sqlText=(value:string)=>"'"+value.replaceAll("'","''")+"'";
  const sqlArray=(value:string[])=>"array["+value.map(sqlText).join(',')+"]::text[]";
  const flags=JSON.parse(localSql("select json_agg(json_build_object('key',key,'enabled',enabled)) from feature_flags where key in ('chapter1_assessment_v2','assessor_flow_ui');")) as {key:string;enabled:boolean}[];
  const jsonSql=(value:unknown)=>`'${JSON.stringify(value).replaceAll("'","''")}'::jsonb`;
  localSql(`
    insert into courses(id,org_unit_id,author_user_id,title_fil,title_en,status) values('${course}','00000000-0000-0000-0000-000000000006','${actor.id}','E2E language availability','E2E language availability','published');
    insert into training_programs(id,content_key,org_unit_id,author_user_id,title_fil,title_en,status) values('${program}','bhw-reference-manual','00000000-0000-0000-0000-000000000006','${actor.id}','E2E manual','E2E manual','published');
    insert into training_program_chapters(id,program_id,chapter_key,position,title_fil,title_en,course_id,availability) values('${chapter}','${program}','chapter-1',0,'BHW sa barangay','BHW in the barangay','${course}','available');
    insert into course_modules(id,course_id,position,type,title_fil,title_en) values('${module}','${course}',${target.position},'text','BHW sa barangay','BHW in the barangay');
    insert into course_lessons(id,module_id,lesson_key,position,title_fil,title_en,objectives_fil,objectives_en) values('${lesson}','${module}','${target.key}',${source.manifest.position},${sqlText(source.manifest.title_fil)},${sqlText(source.manifest.title_en)},${sqlArray(source.manifest.objectives_fil)},${sqlArray(source.manifest.objectives_en)});
    insert into course_lesson_revisions(id,lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,featured_asset_id,created_by) values('${revision}','${lesson}','e2e-language-availability','${contentHash(source)}',${jsonSql(source.revision.read_sections)},${jsonSql(source.revision.slides)},${jsonSql(source.revision.coverage)},${jsonSql(source.revision.sources)},${jsonSql(source.revision.assets)},${source.revision.featured_asset_id?"'"+source.revision.featured_asset_id+"'":'null'},'${actor.id}');
    update course_lessons set published_revision_id='${revision}' where id='${lesson}';
    insert into assessor_exam_attempts(assessor_user_id,chapter_id,curriculum_version,exam_id,phase,status,question_set_hash,question_count,score_percent,passed,answers,submitted_at) values('${actor.id}','${chapter}','2026-09-28.1','chapter-1:pretest','pretest','submitted',repeat('0',32),1,0,false,'[]',now());
    update feature_flags set enabled=false where key in ('chapter1_assessment_v2','assessor_flow_ui');
  `);
  try{
    const password='LanguageAvailabilityPw2026!';
    await onboardThroughLogin(page,assessor.username,assessor.tempPassword,password);
    const token=await getAccessToken(request,assessor.username,password);
    for(const locale of ['en','fil']){
      expect((await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_update_settings`,{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,Authorization:`Bearer ${token}`},data:{p_language:locale,p_theme:'light',p_font_scale:'xl',p_high_contrast:false}})).ok()).toBe(true);
      for(const base of [`/training/${program}/chapter-1`,`/training/${program}/assessor/chapter-1`]){
        await page.setViewportSize({width:320,height:844});
        await page.goto(`${base}/${module}/${lesson}?view=lesson`);
        await expect(page.locator('[data-lesson-heading]')).toBeVisible();
        const reader=page.locator('[data-reading-layout] > section');
        await reader.getByRole('button',{name:locale==='en'?'Read':'Basahin',exact:true}).click();
        const previous=reader.getByRole('button',{name:locale==='en'?'Previous':'Nakaraan',exact:true});
        for(let i=0;i<6&&await previous.isEnabled();i++)await previous.click();
        const panel=reader.locator('[data-lesson-language-panel]');await expect(panel).toBeVisible();
        if(target.key==='bhw-roles-hepo'){
          const ceb=translationOptions.find(t=>t.language==='ceb')!,hil=translationOptions.find(t=>t.language==='hil')!;
          await expect(panel.getByRole('option')).toHaveCount(3);
          await panel.getByRole('combobox').selectOption('ceb');
          await expect(reader.locator('article')).toHaveAttribute('lang','ceb');
          await expect(reader.locator('article h2')).toHaveText(ceb.read_sections[0].heading);
          await expect(reader.locator('article audio')).toHaveAttribute('src',ceb.narration![ceb.read_sections[0].id].src);
          const text=(t:typeof ceb,fil:string,en:string)=>t.ui[fil]??(locale==='en'?en:fil);
          const playStory=async(t:typeof ceb)=>{
            await reader.getByRole('button',{name:text(t,'Kuwentong may salaysay','Narrated story'),exact:true}).click();
            const video=reader.locator('video');
            await expect(video.locator('source')).toHaveAttribute('src',t.video!.path);
            await expect(video.locator('track')).toHaveAttribute('srclang',t.language);
            await video.evaluate(e=>(e as HTMLVideoElement).play());
            await expect.poll(()=>video.evaluate(e=>(e as HTMLVideoElement).currentTime)).toBeGreaterThan(.1);
            await video.evaluate(e=>(e as HTMLVideoElement).pause());
          };
          await reader.getByRole('button',{name:text(ceb,'Pakinggan','Listen'),exact:true}).click();
          await expect.poll(()=>reader.locator('article audio').evaluate(e=>(e as HTMLAudioElement).currentTime)).toBeGreaterThan(.1);
          await reader.getByRole('button',{name:text(ceb,'I-pause','Pause'),exact:true}).click();
          await playStory(ceb);
          await reader.getByRole('button',{name:text(ceb,'Slides','Slides'),exact:true}).click();
          await expect(reader.locator('article')).toContainText(ceb.slides[0].display.split('\n')[0]);
          await reader.getByRole('button',{name:text(ceb,'Buong screen','Full screen'),exact:true}).click();
          const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
          const fullPanel=dialog.locator('[data-lesson-language-panel]');
          await expect(fullPanel.getByRole('combobox')).toHaveValue('ceb');
          await fullPanel.getByRole('combobox').selectOption('hil');
          await expect(dialog.locator('article')).toHaveAttribute('lang','hil');
          await expect(dialog.locator('article')).toContainText(hil.slides[0].display.split('\n')[0]);
          expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
          for(const theme of ['light','dark']){
            await page.locator('html').evaluate((html,t)=>html.setAttribute('data-theme',t),theme);
            expect((await new AxeBuilder({page}).include('dialog[open] [data-lesson-language-panel]').analyze()).violations).toEqual([]);
          }
          await dialog.getByRole('button',{name:text(hil,'Isara','Close'),exact:true}).click();
          await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBe(true);
          await expect(panel.getByRole('combobox')).toHaveValue('hil');
          await reader.getByRole('button',{name:text(hil,'Basahin','Read'),exact:true}).click();
          await expect(reader.locator('article audio')).toHaveAttribute('src',hil.narration![hil.read_sections[0].id].src);
          await reader.getByRole('button',{name:text(hil,'Pakinggan','Listen'),exact:true}).click();
          await expect.poll(()=>reader.locator('article audio').evaluate(e=>(e as HTMLAudioElement).currentTime)).toBeGreaterThan(.1);
          await reader.getByRole('button',{name:text(hil,'I-pause','Pause'),exact:true}).click();
          await playStory(hil);
          await panel.getByRole('combobox').selectOption('');
          await reader.getByRole('button',{name:locale==='en'?'Read':'Basahin',exact:true}).click();
          await expect(reader.locator('article')).toHaveAttribute('lang',locale);
        }else{
          await expect(panel.getByRole('combobox')).toHaveCount(0);
          await expect(panel).toContainText(locale==='en'?'Awaiting reviewed translations':'Hinihintay pa ang nasuring salin');
          await expect(panel).toContainText('Bisaya (Cebuano)');await expect(panel).toContainText('Hiligaynon (Ilonggo)');
          await expect(panel.getByRole('link')).toHaveAttribute('href','/settings');
          expect(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
          expect((await new AxeBuilder({page}).include('[data-lesson-language-panel]').analyze()).violations).toEqual([]);
        }
      }
      await page.goto(`/training/${program}/assessor/chapter-1/exam/pretest`);
      await expect(page.locator('[data-assessment-language-notice]')).toBeVisible();
      await expect(page.locator('[data-assessment-language-notice]')).toContainText('English');
      await expect(page.locator('[data-assessment-language-notice]')).toContainText('Filipino');
      await expect(page.locator('[data-assessment-language-notice] a')).toHaveAttribute('href','/settings');
      await expect(page.locator('[data-lesson-language-panel]')).toHaveCount(0);
    }
    await page.goto('/home');
  }finally{
    localSql(`begin;
      ${flags.map(flag=>`update feature_flags set enabled=${flag.enabled?'true':'false'} where key='${flag.key}';`).join('\n')}
      delete from assessor_lesson_resume where chapter_id='${chapter}';delete from assessor_lesson_progress where chapter_id='${chapter}';delete from assessor_exam_attempts where chapter_id='${chapter}';
      update course_lessons set published_revision_id=null where id='${lesson}';alter table course_lesson_revisions disable trigger training_revision_immutable;delete from course_lesson_revisions where id='${revision}';alter table course_lesson_revisions enable trigger training_revision_immutable;
      delete from course_lessons where id='${lesson}';delete from course_modules where id='${module}';delete from training_program_chapters where id='${chapter}';delete from training_programs where id='${program}';delete from courses where id='${course}';commit;`);
  }
});
