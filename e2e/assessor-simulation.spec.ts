import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import {storyScenes} from '../src/lib/assessor/simulation-storyboard';
import {expect,test} from '@playwright/test';
import {STABLE_CITY_ADMIN,createThrowawayAssessor,getAccessToken,onboardThroughLogin,restGet} from './fixtures/auth';

// Fixture SQL can only reach the disposable local stack. Never the pilot or a hosted preview.
function localSql(sql:string) {
  const url=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??'');
  if(!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='54321')throw new Error('Local Supabase required');
  return execFileSync('docker',['exec','-i','supabase_db_bhw-connect-phase-2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],
    {input:sql,encoding:'utf8',timeout:15000});
}

test.use({actionTimeout:15000});

test('simulation validates authenticated saves, recovers, resumes and retains one receipt without changing passes',async({page,request})=>{
  test.setTimeout(240000);
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

  const snapshot=()=>localSql(`select jsonb_build_object(
    'study',(select jsonb_agg(to_jsonb(p) order by lesson_id) from assessor_lesson_progress p where chapter_id='${chapter}'),
    'exam',(select jsonb_agg(to_jsonb(p) order by id) from assessor_exam_attempts p where chapter_id='${chapter}'),
    'orientation',(select jsonb_agg(to_jsonb(p) order by id) from assessor_orientation_attempts p where chapter_id='${chapter}'),
    'qualification',(select jsonb_agg(to_jsonb(p) order by id) from assessor_chapter_qualifications p where chapter_id='${chapter}'),
    'practice',(select count(*) from assessor_rollout_private.practice_attempts where chapter_id='${chapter}'),
    'requests',(select count(*) from assessor_rollout_private.component_requests where program_id='${program}'),
    'formal',(select count(*) from assessor_rollout_private.formal_attempts where program_id='${program}'),
    'reviews',(select count(*) from assessor_rollout_private.bhw_chapter_reviews where program_id='${program}'),
    'assessments',(select count(*) from public.assessments where course_id='${course}'),
    'certificates',(select count(*) from public.certificates where course_id='${course}'),
    'notifications',(select count(*) from public.notifications));`).trim();
  try {
    await onboardThroughLogin(page,assessor.username,assessor.tempPassword,'AssessorPrepPw2026!');
    const base=`/training/${program}/assessor/chapter-1`;
    await page.goto(`${base}/briefing`);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Itala ang aking pagkilala'}).click();
    await expect(page.getByRole('link',{name:'Magpatuloy sa aking pag-aaral sa Kabanata 1'})).toBeVisible();
    // Local fixture establishes real prerequisite records, without replacing any validation functions.
    localSql(`
      do $$ declare r jsonb; m uuid; l uuid; rev uuid; pos integer:=0; begin
      for r in select value from assessor_private.exam_requirements, jsonb_array_elements(required_lessons) where chapter_key='chapter-1' loop
        select id into m from course_modules where course_id='${course}' and position=(r->>'position')::int;
        if m is null then insert into course_modules(course_id,position,type,title_fil,title_en) values('${course}',(r->>'position')::int,'text','E2E fixture','E2E fixture') returning id into m; end if;
        insert into course_lessons(module_id,lesson_key,position,title_fil,title_en,objectives_fil,objectives_en) values(m,r->>'key',pos,r->>'key',r->>'key',array['Fixture'],array['Fixture']) returning id into l;
        insert into course_lesson_revisions(lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,created_by)
          values(l,'e2e',repeat('0',64),'[{}]','[{}]','[]','[]','${actor.id}') returning id into rev;
        update course_lessons set published_revision_id=rev where id=l;
        insert into assessor_lesson_progress(assessor_user_id,chapter_id,lesson_id,revision_id) values('${actor.id}','${chapter}',l,rev);
        pos:=pos+1;
      end loop; end $$;
      insert into assessor_exam_attempts(assessor_user_id,chapter_id,curriculum_version,exam_id,phase,status,question_set_hash,question_count,passing_percent,score_percent,passed,answers,submitted_at)
        select '${actor.id}','${chapter}',curriculum_version,'chapter-1:'||phase,phase,'submitted',repeat('0',32),38,80,100,true,'[]',now()
        from assessor_private.exam_requirements cross join unnest(array['pretest','posttest']) phase where chapter_key='chapter-1';
      insert into assessor_orientation_lesson_progress(assessor_user_id,chapter_id,curriculum_version,orientation_version,lesson_id)
        select '${actor.id}','${chapter}',curriculum_version,orientation_version,l->>'id' from assessor_private.orientation_units,jsonb_array_elements(lessons) l where chapter_key='chapter-1';
      select set_config('request.jwt.claim.sub',(select auth_user_id::text from users where id='${actor.id}'),false);
      insert into assessor_orientation_attempts(assessor_user_id,chapter_id,curriculum_version,orientation_version,answers,correct_count,question_count,passed)
        select '${actor.id}','${chapter}',curriculum_version,orientation_version,'[]',8,8,true from assessor_private.orientation_units where chapter_key='chapter-1';
    `);
    const preserved=snapshot();
    await page.goto(`${base}/simulation`);await expect(page).toHaveURL(base); // default off
    localSql('update assessor_rollout_private.simulation_control set enabled=true');
    const learnerWrites:string[]=[];
    page.on('request',r=>{if(r.method()==='POST'&&/rpc_.*(observation|assessment|certificate|notification|message)/.test(r.url()))learnerWrites.push(r.url());});
    for(const locale of ['en','fil'] as const){
      await page.setViewportSize({width:locale==='en'?1024:390,height:900});
      await page.goto(`${base}/simulation`);
      await page.getByRole('button',{name:locale==='en'?'English':'Filipino',exact:true}).click();
      if(locale==='fil'){
        await page.getByRole('button',{name:'Ulitin nang hindi binubura ang completion'}).click();
        await expect(page.getByRole('heading',{name:`1. ${storyScenes[0].title.fil}`,exact:true})).toBeFocused();
      }
      for(let i=0;i<storyScenes.length;i++){
        const scene=storyScenes[i];
        await expect(page.getByRole('heading',{name:`${i+1}. ${scene.title[locale]}`,exact:true})).toBeVisible();
        if(i===0&&locale==='en'){
          // Commit the request, then lose its response: recovery must read, not duplicate it.
          await page.route('**/rpc/rpc_assessor_simulation_act',async route=>{await route.fetch();await route.abort();},{times:1});
          await page.getByRole('button',{name:scene.choices.find(c=>!c.correct)!.text.en,exact:true}).click();
          await expect(page.getByRole('alert').filter({hasText:'Save/status'})).toBeVisible();
          await page.getByRole('button',{name:'Check saved status'}).click();
          await expect(page.getByRole('alert').filter({hasText:'Save/status'})).toHaveCount(0);
        }
        if(i===1){
          for(const name of locale==='en'?['Open Prepare','Show BHW presentation','Back to Prepare']:['Buksan ang Ihanda','Ipakita sa BHW','Bumalik sa Ihanda'])await page.getByRole('button',{name,exact:true}).click();
        }
        if(i===3){
          for(const box of await page.getByRole('checkbox').all())await box.check();
          await page.getByRole('textbox').fill('Fictional P1: neutral clarification needed a prompt.');
          await page.getByRole('button',{name:locale==='en'?'Save evidence / pause':'I-save ang ebidensya / huminto'}).click();
          await expect(page.getByRole('button',{name:scene.choices.find(c=>c.correct)!.text[locale],exact:true})).toBeEnabled();
          await page.reload();
          await page.getByRole('button',{name:locale==='en'?'English':'Filipino',exact:true}).click();
          await expect(page.getByRole('textbox')).toHaveValue('Fictional P1: neutral clarification needed a prompt.');
          const wrong=scene.choices.find(c=>!c.correct)!;
          await page.getByRole('button',{name:wrong.text[locale],exact:true}).click();
          await expect(page.getByRole('status').first()).toContainText(wrong.explanation[locale]);
        }
        const correct=page.getByRole('button',{name:scene.choices.find(c=>c.correct)!.text[locale],exact:true});
        await expect(correct).toBeEnabled();await correct.focus();await page.keyboard.press('Enter');
        if(i<10){
          await page.getByRole('button',{name:locale==='en'?'Next checkpoint':'Susunod na checkpoint',exact:true}).click();
          await expect(page.getByRole('heading',{name:`${i+2}. ${storyScenes[i+1].title[locale]}`,exact:true})).toBeFocused();
        }
      }
      if(locale==='en'){
        await expect(page.getByRole('button',{name:'Finish debrief and save completion receipt'})).toBeVisible();
        const pending=JSON.parse(localSql(`select state from assessor_rollout_private.simulation_runs where actor_id='${actor.id}' and program_id='${program}';`).trim());
        const token=await getAccessToken(request,assessor.username,'AssessorPrepPw2026!');
        const calls=await Promise.all([0,1].map(()=>request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_assessor_simulation_act`,{
          headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,Authorization:`Bearer ${token}`},
          data:{p_program_id:program,p_actor_id:actor.id,p_version:'1.0.0',p_requirements:pending.requirementsVersion,
            p_chapter:'chapter-1',p_scenario:pending.scenarioId,p_revision:pending.revision,p_checkpoint:'debrief',
            p_checkpoint_version:1,p_request_id:randomUUID(),p_action:{type:'finish'}},
        })));
        for(const call of calls)expect(call.ok(),await call.text()).toBe(true);
        expect((await calls[0].json()).receipt).toEqual((await calls[1].json()).receipt);
        await page.getByRole('button',{name:'Finish debrief and save completion receipt'}).click();
      }
      await expect(page.getByRole('status').last()).toContainText(locale==='en'?'Personal familiarization completion recorded':'Naitala ang pagkumpleto');
      expect((await new AxeBuilder({page}).include('main').analyze()).violations).toEqual([]);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.screenshot({path:`/tmp/c1af-runner-${locale}.png`,fullPage:true});
    }
    expect(learnerWrites).toEqual([]);expect(snapshot()).toBe(preserved);
    await expect(page.getByRole('link',{name:/Open the real Chapter 1 working area|Buksan ang tunay na working area ng Kabanata 1/})).toHaveAttribute('href',`/training/${program}/assessor/workspace`);
    const saved=JSON.parse(localSql(`select state from assessor_rollout_private.simulation_runs where actor_id='${actor.id}' and program_id='${program}';`).trim());
    expect(saved.receipt.checkpointIds).toEqual(storyScenes.map(s=>s.id));
    expect(saved.attempts.observe).toEqual(['independent','prompted','independent','prompted']);
    expect(localSql(`select writes_enabled or awards_enabled or authority_cutover_at is not null from assessor_flow_cohorts where id='${cohort}'`).trim()).toBe('f');
  } finally {
    localSql(`begin;
      -- Fixture disposal only: immutable content is never altered during the journey.
      alter table course_lesson_revisions disable trigger training_revision_immutable;
      update assessor_rollout_private.simulation_control set enabled=false;
      update feature_flags set enabled=false where key='assessor_flow_ui';
      delete from assessor_rollout_private.simulation_requests where program_id='${program}';
      delete from assessor_rollout_private.simulation_runs where program_id='${program}';
      delete from assessor_chapter_qualifications where chapter_id='${chapter}';
      delete from assessor_orientation_attempts where chapter_id='${chapter}';
      delete from assessor_orientation_lesson_progress where chapter_id='${chapter}';
      delete from assessor_exam_attempts where chapter_id='${chapter}';
      delete from assessor_lesson_progress where chapter_id='${chapter}';
      update course_lessons set published_revision_id=null where module_id in(select id from course_modules where course_id='${course}');
      delete from course_lesson_revisions where lesson_id in(select l.id from course_lessons l join course_modules m on m.id=l.module_id where m.course_id='${course}');
      delete from course_lessons where module_id in(select id from course_modules where course_id='${course}');
      delete from assessor_briefing_acknowledgements where program_id='${program}';
      delete from assessor_flow_cohort_members where cohort_id='${cohort}';
      delete from assessor_flow_cohorts where id='${cohort}';
      delete from training_program_chapters where id='${chapter}';
      delete from training_programs where id='${program}';
      delete from courses where id='${course}';
      alter table course_lesson_revisions enable trigger training_revision_immutable;
      commit;`);
  }
});
