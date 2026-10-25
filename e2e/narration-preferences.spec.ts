import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {loadReferenceModule,contentHash} from '../scripts/lib/reference-content.mjs';
import {STABLE_CITY_ADMIN,createThrowawayAssessor,getAccessToken,onboardThroughLogin,restGet} from './fixtures/auth';

function localSql(sql:string){
  const url=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??'');
  if(!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='54321')throw Error('Disposable local Supabase required');
  return execFileSync('docker',['exec','-i','supabase_db_bhw-connect-phase-2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input:sql,encoding:'utf8',timeout:15000});
}

test('Narration speed persists and opt-in listening respects pause, checks and mode changes',async({page,request})=>{
  test.setTimeout(120000);
  const admin=await getAccessToken(request,STABLE_CITY_ADMIN.username,STABLE_CITY_ADMIN.password);
  const assessor=await createThrowawayAssessor(request,admin,'00000000-0000-0000-0000-000000000004');
  const [actor]=await restGet(request,admin,`users?select=id&username=eq.${assessor.username}`) as {id:string}[];
  const [course,program,chapter,module,lesson,revision]=Array.from({length:6},()=>randomUUID());
  const source=loadReferenceModule('content/training/day1-basic-competencies/modules/07-problema','public').lessons.find(l=>l.manifest.lesson_key==='problem-define')!;
  const flags=JSON.parse(localSql("select json_agg(json_build_object('key',key,'enabled',enabled)) from feature_flags where key in ('chapter1_assessment_v2','assessor_flow_ui');")) as {key:string;enabled:boolean}[];
  const jsonSql=(value:unknown)=>`'${JSON.stringify(value).replaceAll("'","''")}'::jsonb`;
  localSql(`
    insert into courses(id,org_unit_id,author_user_id,title_fil,title_en,status) values('${course}','00000000-0000-0000-0000-000000000006','${actor.id}','E2E Health Educator','E2E Health Educator','published');
    insert into training_programs(id,content_key,org_unit_id,author_user_id,title_fil,title_en,status) values('${program}','bhw-reference-manual','00000000-0000-0000-0000-000000000006','${actor.id}','E2E manual','E2E manual','published');
    insert into training_program_chapters(id,program_id,chapter_key,position,title_fil,title_en,course_id,availability) values('${chapter}','${program}','chapter-1',0,'BHW sa barangay','BHW in the barangay','${course}','available');
    insert into course_modules(id,course_id,position,type,title_fil,title_en) values('${module}','${course}',6,'text','BHW sa barangay','BHW in the barangay');
    insert into course_lessons(id,module_id,lesson_key,position,title_fil,title_en,objectives_fil,objectives_en) values('${lesson}','${module}','problem-define',0,'Tukuyin ang problema','Define the problem',array['Pagsasanay'],array['Practice']);
    insert into course_lesson_revisions(id,lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,featured_asset_id,created_by) values('${revision}','${lesson}','e2e-definition-slides','${contentHash(source)}',${jsonSql(source.revision.read_sections)},${jsonSql(source.revision.slides)},${jsonSql(source.revision.coverage)},${jsonSql(source.revision.sources)},${jsonSql(source.revision.assets)},'problem-define-story','${actor.id}');
    update course_lessons set published_revision_id='${revision}' where id='${lesson}';
    insert into assessor_exam_attempts(assessor_user_id,chapter_id,curriculum_version,exam_id,phase,status,question_set_hash,question_count,score_percent,passed,answers,submitted_at) values('${actor.id}','${chapter}','2026-09-28.1','chapter-1:pretest','pretest','submitted',repeat('0',32),1,0,false,'[]',now());
    update feature_flags set enabled=false where key in ('chapter1_assessment_v2','assessor_flow_ui');
  `);
  try{
    const password='DefinitionSlidesPw2026!';
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
        const next=reader.getByRole('button',{name:locale==='en'?'Next':'Susunod',exact:true});
        for(let i=0;i<6&&await previous.isEnabled();i++)await previous.click();
        const audio=reader.locator('audio');
        const controls=reader.getByRole('group',{name:locale==='en'?'Listen to this section':'Pakinggan ang bahaging ito'});
        const speed=controls.getByRole('combobox');
        const automatic=reader.getByRole('checkbox',{name:locale==='en'?'Play next sections automatically':'Awtomatikong pakinggan ang mga susunod na bahagi'});
        await speed.selectOption('1.5');
        await expect.poll(()=>audio.evaluate(el=>(el as HTMLAudioElement).playbackRate)).toBe(1.5);
        expect(await audio.evaluate(el=>(el as HTMLAudioElement).paused)).toBe(true);
        await automatic.check();
        expect(await audio.evaluate(el=>(el as HTMLAudioElement).paused)).toBe(true);
        await reader.getByRole('button',{name:locale==='en'?'Listen':'Pakinggan',exact:true}).click();
        await expect.poll(()=>audio.evaluate(el=>(el as HTMLAudioElement).paused)).toBe(false);
        await next.click();
        await expect(reader.locator('article')).toHaveAttribute('data-scene','worked-example');
        await expect(speed).toHaveValue('1.5');
        await expect.poll(()=>audio.evaluate(el=>(el as HTMLAudioElement).paused)).toBe(false);
        await expect.poll(()=>audio.evaluate(el=>(el as HTMLAudioElement).playbackRate)).toBe(1.5);
        await reader.getByRole('button',{name:locale==='en'?'Pause':'I-pause',exact:true}).click();
        await next.click();
        await expect(reader.locator('article')).toHaveAttribute('data-scene','source-gap');
        expect(await audio.evaluate(el=>(el as HTMLAudioElement).paused)).toBe(true);
        await expect(speed).toHaveValue('1.5');
        expect(await controls.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
        for(const theme of ['light','dark']){
          await page.locator('html').evaluate((html,t)=>html.setAttribute('data-theme',t),theme);
          expect((await new AxeBuilder({page}).include('[role="group"][aria-label="'+(locale==='en'?'Listen to this section':'Pakinggan ang bahaging ito')+'"]').analyze()).violations).toEqual([]);
        }
        // Start again, then leave Read. Slides must not inherit listening intent.
        await reader.getByRole('button',{name:locale==='en'?'Listen':'Pakinggan',exact:true}).click();
        await reader.getByRole('button',{name:'Slides',exact:true}).click();
        await reader.getByRole('button',{name:locale==='en'?'Read':'Basahin',exact:true}).click();
        expect(await audio.evaluate(el=>(el as HTMLAudioElement).paused)).toBe(true);
        await expect(automatic).not.toBeChecked();
        // Re-enable and move to the final check: no player or takeaway before response.
        await automatic.check();
        await reader.getByRole('button',{name:locale==='en'?'Listen':'Pakinggan',exact:true}).click();
        for(let i=0;i<3;i++)await next.click();
        await expect(reader.locator('article')).toHaveAttribute('data-scene','check');
        await expect(audio).toHaveCount(0);
        await expect(reader.locator('.reference-check-feedback')).toHaveCount(0);
        const check=source.revision.read_sections.at(-1)!.check!;
        await reader.getByRole('button',{name:check.options[0][locale],exact:true}).click();
        await expect(audio).toHaveCount(1);
        expect(await audio.evaluate(el=>(el as HTMLAudioElement).paused)).toBe(true);
        // A full reload retains speed but never starts audio.
        await page.reload();
        await expect(page.locator('[data-lesson-heading]')).toBeVisible();
        // Assessor study may restore Slides; speed persistence is independent
        // of its initial format. Choose Read without changing the saved speed.
        await reader.getByRole('button',{name:locale==='en'?'Read':'Basahin',exact:true}).click();
        for(let i=0;i<6&&await previous.isEnabled();i++)await previous.click();
        await expect(reader.locator('article')).toHaveAttribute('data-scene','missed-visits');
        await expect(speed).toHaveValue('1.5');
        await expect(automatic).not.toBeChecked();
        expect(await audio.evaluate(el=>(el as HTMLAudioElement).paused)).toBe(true);
      }
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
