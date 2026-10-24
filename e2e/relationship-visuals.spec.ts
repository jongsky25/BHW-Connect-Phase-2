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

test('relationship diagrams preserve roles, local verification and pre-answer boundaries in training and assessor study',async({page,request})=>{
  test.setTimeout(120000);
  const admin=await getAccessToken(request,STABLE_CITY_ADMIN.username,STABLE_CITY_ADMIN.password);
  const assessor=await createThrowawayAssessor(request,admin,'00000000-0000-0000-0000-000000000004');
  const [actor]=await restGet(request,admin,`users?select=id&username=eq.${assessor.username}`) as {id:string}[];
  const [course,program,chapter,module,lesson,revision]=Array.from({length:6},()=>randomUUID());
  const source=loadReferenceModule('content/training/day1-basic-competencies/modules/05-bhw-at-barangay','public').lessons.find(l=>l.manifest.lesson_key==='bhw-relationships')!;
  const flags=JSON.parse(localSql("select json_agg(json_build_object('key',key,'enabled',enabled)) from feature_flags where key in ('chapter1_assessment_v2','assessor_flow_ui');")) as {key:string;enabled:boolean}[];
  const jsonSql=(value:unknown)=>`'${JSON.stringify(value).replaceAll("'","''")}'::jsonb`;
  localSql(`
    insert into courses(id,org_unit_id,author_user_id,title_fil,title_en,status) values('${course}','00000000-0000-0000-0000-000000000006','${actor.id}','E2E ugnayan','E2E relationships','published');
    insert into training_programs(id,content_key,org_unit_id,author_user_id,title_fil,title_en,status) values('${program}','bhw-reference-manual','00000000-0000-0000-0000-000000000006','${actor.id}','E2E manual','E2E manual','published');
    insert into training_program_chapters(id,program_id,chapter_key,position,title_fil,title_en,course_id,availability) values('${chapter}','${program}','chapter-1',0,'BHW sa barangay','BHW in the barangay','${course}','available');
    insert into course_modules(id,course_id,position,type,title_fil,title_en) values('${module}','${course}',4,'text','BHW sa barangay','BHW in the barangay');
    insert into course_lessons(id,module_id,lesson_key,position,title_fil,title_en,objectives_fil,objectives_en) values('${lesson}','${module}','bhw-relationships',0,'Apat na ugnayan','Four working relationships',array['Pagsasanay'],array['Practice']);
    insert into course_lesson_revisions(id,lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,featured_asset_id,created_by) values('${revision}','${lesson}','e2e-relationships','${contentHash(source)}',${jsonSql(source.revision.read_sections)},${jsonSql(source.revision.slides)},${jsonSql(source.revision.coverage)},${jsonSql(source.revision.sources)},${jsonSql(source.revision.assets)},'bhw-relationships-story','${actor.id}');
    update course_lessons set published_revision_id='${revision}' where id='${lesson}';
    insert into assessor_exam_attempts(assessor_user_id,chapter_id,curriculum_version,exam_id,phase,status,question_set_hash,question_count,score_percent,passed,answers,submitted_at) values('${actor.id}','${chapter}','2026-09-28.1','chapter-1:pretest','pretest','submitted',repeat('0',32),1,0,false,'[]',now());
    update feature_flags set enabled=false where key in ('chapter1_assessment_v2','assessor_flow_ui');
  `);
  try{
    const password='RelationshipVisualPw2026!';
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
        await expect(reader.locator('article[data-scene="section-1"]')).toBeVisible();
        const next=reader.getByRole('button',{name:locale==='en'?'Next':'Susunod',exact:true});
        for(const [index,kind]of ['roles','known','contacts','image','practice'].entries()){
          await next.click();
          if(kind==='image'){await expect(reader.locator('article img')).toBeVisible();continue;}
          const visual=reader.locator(`[data-relationship-visual="${kind}"]`);
          await expect(visual).toBeVisible();
          if(kind==='roles'||kind==='practice')await expect(visual.getByRole('listitem')).toHaveCount(4);
          await reader.getByRole('button',{name:'Slides',exact:true}).click();
          await expect(visual).toBeVisible();
          expect(await visual.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
          if(index===0){
            for(const theme of ['light','dark']){
              await page.locator('html').evaluate((html,t)=>html.setAttribute('data-theme',t),theme);
              expect((await new AxeBuilder({page}).include('[data-relationship-visual]').analyze()).violations).toEqual([]);
            }
          }
          await reader.getByRole('button',{name:locale==='en'?'Read':'Basahin',exact:true}).click();
        }
        await expect(reader.locator('.reference-check-feedback')).toHaveCount(0);
        const check=source.revision.read_sections.at(-1)!.check!;
        const practice=reader.locator('[data-relationship-visual="practice"]');
        for(const option of check.options)await expect(practice).not.toContainText(option[locale]);
        await page.getByRole('button',{name:locale==='en'?'Full screen':'Buong screen',exact:true}).click();
        const dialog=page.getByRole('dialog',{name:locale==='en'?'Full-screen lesson':'Buong screen na aralin',exact:true});
        await expect(dialog.locator('[data-relationship-visual="practice"]')).toBeVisible();
        await expect(dialog.locator('.reference-check-feedback')).toHaveCount(0);
        expect((await new AxeBuilder({page}).include('dialog[open]').analyze()).violations).toEqual([]);
        await dialog.getByRole('button',{name:locale==='en'?'Close':'Isara',exact:true}).click();
        await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBe(true);
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
