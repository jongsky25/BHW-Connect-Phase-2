import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {PDFDocument} from 'pdf-lib';
import AxeBuilder from '@axe-core/playwright';
import {expect,test} from '@playwright/test';
import {STABLE_CITY_ADMIN,createThrowawayAssessor,getAccessToken,onboardThroughLogin,restGet} from './fixtures/auth';

function localSql(sql:string) {
  const url=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??'');
  if(!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='54321')throw new Error('Local Supabase required');
  return execFileSync('docker',['exec','-i','supabase_db_bhw-connect-phase-2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],
    {input:sql,encoding:'utf8',timeout:15000});
}

test('combined award validates real authenticated completion and concurrent recovery without changing earned passes',async({page,request,browser})=>{
  test.setTimeout(240000);
  const cityToken=await getAccessToken(request,STABLE_CITY_ADMIN.username,STABLE_CITY_ADMIN.password);
  const assessor=await createThrowawayAssessor(request,cityToken,'00000000-0000-0000-0000-000000000004');
  const [actor]=await restGet(request,cityToken,`users?select=id&username=eq.${assessor.username}`) as Array<{id:string}>;
  const course=randomUUID(),program=randomUUID(),chapter=randomUUID(),cohort=randomUUID();
  localSql(`
    insert into public.courses(id,org_unit_id,author_user_id,title_fil,title_en,status)
      select '${course}','00000000-0000-0000-0000-000000000006',id,'E2E assessor chapter','E2E assessor chapter','published' from public.users where username='admin.city.stable';
    insert into public.training_programs(id,content_key,org_unit_id,author_user_id,title_fil,title_en,status)
      select '${program}','bhw-reference-manual','00000000-0000-0000-0000-000000000006',id,'E2E assessor manual','E2E assessor manual','published' from public.users where username='admin.city.stable';
    insert into public.training_program_chapters(id,program_id,chapter_key,position,title_fil,title_en,course_id,availability)
      values('${chapter}','${program}','chapter-1',0,'Kabanata I','Chapter I','${course}','available');
    insert into public.assessor_flow_cohorts(id,program_id,chapter_key,cohort_key,requirements_version,ui_enabled,writes_enabled,awards_enabled,authority_cutover_at,authority_cutover_by)
      values('${cohort}','${program}','chapter-1','e2e-preparation','chapter-1:c1af.draft-1',true,false,true,now(),(select id from public.users where username='admin.city.stable'));
    insert into public.assessor_flow_cohort_members(program_id,chapter_key,user_id,cohort_id)
      values('${program}','chapter-1','${actor.id}','${cohort}');
    update public.feature_flags set enabled=true,disabled_roles='{}' where key in ('elearning','assessor_flow_ui','assessor_flow_awards');
  `);

  try {
    await onboardThroughLogin(page,assessor.username,assessor.tempPassword,'AssessorAwardPw2026!');
    const base=`/training/${program}/assessor/chapter-1`;
    await page.goto(`${base}/briefing`);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Itala ang aking pagkilala'}).click();
    await expect(page.getByRole('link',{name:'Magpatuloy sa aking pag-aaral sa Kabanata 1'})).toBeVisible();
    localSql(`
      update users set full_name='Fictional Alex Peña with a deliberately long display name for certificate wrapping' where id='${actor.id}';
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

    const checkpointIds=['find-maria','prepare','brief','observe','feedback','missing','readiness','arrange','formal','chapter-gap','final-review'];
    const choices=['maria','cards','practice','prompted','private','no-grade','resolve','new-task','bounded','gap','sample'];
    const token=await getAccessToken(request,assessor.username,'AssessorAwardPw2026!');
    const rpc=async(name:string,data:Record<string,unknown>)=>request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${name}`,{
      headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,Authorization:`Bearer ${token}`},data,
    });
    const snapshot=()=>localSql(`select jsonb_build_object(
      'study',(select jsonb_agg(to_jsonb(p) order by lesson_id) from assessor_lesson_progress p where chapter_id='${chapter}'),
      'exam',(select jsonb_agg(to_jsonb(p) order by id) from assessor_exam_attempts p where chapter_id='${chapter}'),
      'orientation',(select jsonb_agg(to_jsonb(p) order by id) from assessor_orientation_attempts p where chapter_id='${chapter}'),
      'legacy',(select jsonb_agg(to_jsonb(p) order by id) from assessor_chapter_qualifications p where chapter_id='${chapter}'));`).trim();
    const before=snapshot();
    expect((await rpc('rpc_assessor_chapter_award_state',{p_chapter_id:chapter})).ok()).toBe(true);
    expect((await rpc('rpc_assessor_chapter_award_ensure',{p_chapter_id:chapter})).ok()).toBe(false);
    expect(localSql(`select count(*) from assessor_rollout_private.chapter_awards where chapter_id='${chapter}'`).trim()).toBe('0');
    const approvals=Object.fromEntries(['requirements','mapping','evidence','orientation','simulation','issuer','award'].map(k=>[k,`LOCAL TEST ONLY: ${k}`]));
    localSql(`insert into assessor_rollout_private.award_contracts values(
      'chapter-1:c1af.draft-1','2026-09-28.1','local-rubric','2026-09-29.1','local-award',
      'chapter-1-maria-communication-storyboard','1.0.0','${JSON.stringify(checkpointIds)}','[1,1,1,1,1,1,1,1,1,1,1]',
      '${JSON.stringify(approvals)}','{"organization":"LOCAL TEST ONLY — Fictional organization for chapter-scoped certificate layout verification","signatory":"Fictional fixture signatory for certificate layout checks","title":"Fictional local issuer signing this test-only Chapter 1 achievement with a deliberately long display title"}',true,true);
      update assessor_rollout_private.simulation_control set enabled=true;`);
    await page.goto(`${base}/simulation`);
    await expect(page.getByRole('heading',{name:/1\./})).toBeVisible();
    const read=async()=>{const r=await rpc('rpc_assessor_simulation_state',{p_program_id:program});expect(r.ok(),await r.text()).toBe(true);return r.json();};
    const act=async(action:Record<string,unknown>)=>{
      const s=await read();
      const r=await rpc('rpc_assessor_simulation_act',{p_program_id:program,p_actor_id:actor.id,p_version:'1.0.0',
        p_requirements:s.requirementsVersion,p_chapter:'chapter-1',p_scenario:s.scenarioId,p_revision:s.revision,
        p_checkpoint:checkpointIds[s.next]??'debrief',p_checkpoint_version:1,p_request_id:randomUUID(),p_action:action});
      expect(r.ok(),await r.text()).toBe(true);return r.json();
    };
    for(let i=0;i<11;i++){
      if(i===1)for(const value of ['guide','learner','return'])await act({type:'view',value});
      if(i===3)await act({type:'evidence',facts:[0,1,2],note:'Fictional observation only.'});
      await act({type:'choice',value:choices[i]});
    }
    const completions=await Promise.all([act({type:'finish'}),act({type:'finish'})]);
    expect(completions[0].receipt).toEqual(completions[1].receipt);
    const recoveries=await Promise.all([rpc('rpc_assessor_chapter_award_ensure',{p_chapter_id:chapter}),rpc('rpc_assessor_chapter_award_ensure',{p_chapter_id:chapter})]);
    for(const r of recoveries)expect(r.ok(),await r.text()).toBe(true);
    expect(await recoveries[0].json()).toBe(await recoveries[1].json());
    const saved=await (await rpc('rpc_assessor_chapter_award_state',{p_chapter_id:chapter})).json();
    expect(saved.awards).toHaveLength(1);expect(saved.currentPermission).toBe(false);
    expect(saved.awards[0].certificateId).toMatch(/^[a-f0-9-]{36}$/);
    expect(localSql(`select count(*) from audit_events where event_type='assessor.chapter_award.issued' and subject_id='${saved.awards[0].awardId}'`).trim()).toBe('1');
    await page.reload();await expect(page.getByRole('status').last()).toContainText('Naitala ang pagkumpleto');
    expect(snapshot()).toBe(before);
    await page.getByRole('link',{name:/Buksan ang tunay na working area ng Kabanata 1/}).click();
    await expect(page).toHaveURL(`/training/${program}/assessor/workspace`);
    await expect(page.getByRole('heading',{name:'Working area ng Kabanata 1'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Mga BHW na sinusuportahan ko'})).toBeVisible();
    expect(snapshot()).toBe(before);
    // C1AF-08: output is read-only across page, print, download and minimal
    // public verification. All disclosure/status changes are local fixtures.
    const certificateId=saved.awards[0].certificateId;
    const awardEvidence=()=>localSql(`select to_jsonb(w)-'status'-'status_changed_at' from assessor_rollout_private.chapter_awards w where certificate_id='${certificateId}'`).trim();
    const immutableBefore=awardEvidence();
    for(const locale of ['en','fil'] as const){
      // The runner's language buttons are rehearsal-local; use the real
      // account preference for server-rendered certificate routes.
      const preference=await rpc('rpc_update_settings',{p_language:locale,p_theme:'system',p_font_scale:'md',p_high_contrast:false});
      expect(preference.ok(),await preference.text()).toBe(true);
      for(const width of [390,768,1440]){
        await page.setViewportSize({width,height:960});
        await page.goto(`/training/${program}/assessor/qualifications`);
        await expect(page.getByRole('heading',{name:locale==='en'?'My certifications':'Aking mga sertipikasyon',exact:true})).toBeVisible();
        // A chapter award exists, but no approved overall compatibility rule
        // is installed in this disposable rehearsal.
        await expect(page.getByText(locale==='en'?'0/3 current compatible chapter certifications':'0/3 kasalukuyang katugmang sertipikasyon ng kabanata')).toBeVisible();
        await expect(page.getByText(locale==='en'?'No approved overall award rule is active yet.':'Hindi pa aktibo ang aprubadong tuntunin para sa pangkalahatang award.')).toBeVisible();
        await expect(page.getByRole('heading',{name:locale==='en'?'Chapter 3':'Kabanata 3',exact:true})).toBeVisible();
        await page.getByRole('link',{name:locale==='en'?'View certificate':'Tingnan ang sertipiko',exact:true}).click();
        await expect(page.getByRole('heading',{name:/BHW Reference Manual/})).toBeVisible();
        await expect(page.getByText(/Fictional Alex Peña/)).toBeVisible();
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
        await page.getByRole('button',{name:locale==='en'?'Print certificate':'I-print ang sertipiko'}).focus();
        await expect(page.getByRole('button',{name:locale==='en'?'Print certificate':'I-print ang sertipiko'})).toBeFocused();
        const axe=await new AxeBuilder({page}).include('[data-assessor-certificate]').analyze();
        expect(axe.violations).toEqual([]);
        await page.screenshot({path:`/tmp/c1af-certificate-${locale}-${width}.png`,fullPage:true});
      }
      await page.emulateMedia({media:'print'});
      await expect(page.locator('.assessor-certificate-actions')).toBeHidden();
      await expect(page.locator('.assessor-certificate-document')).toBeVisible();
      await page.screenshot({path:`/tmp/c1af-certificate-print-${locale}.png`,fullPage:true});
      await page.emulateMedia({media:'screen'});
      const downloadPromise=page.waitForEvent('download');
      await page.getByRole('link',{name:locale==='en'?'Download PDF':'I-download ang PDF',exact:true}).click();
      const download=await downloadPromise;
      expect(download.suggestedFilename()).toBe(`assessor-chapter-1-${certificateId}.pdf`);
      await download.saveAs(`/tmp/c1af-earned-${locale}.pdf`);
      const response=await page.request.get(`/api/assessor-certificates/${certificateId}/pdf`);
      expect(response.status()).toBe(200);expect(response.headers()['content-type']).toBe('application/pdf');
      expect(response.headers()['cache-control']).toBe('private, no-store');
      const pdf=await PDFDocument.load(await response.body());
      expect(pdf.getSubject()).toContain(certificateId);
      expect(pdf.getTitle()).toContain(locale==='en'?'Assessor/Facilitator, Chapter 1':'Tagatasa/Tagapagpadaloy, Kabanata 1');
    }
    const anonymous=await browser.newContext();const publicPage=await anonymous.newPage();
    try{
      await publicPage.goto(`/certificates/assessor/${certificateId}`);
      await expect(publicPage.getByText('Hindi pa available ang pampublikong verification.')).toBeVisible();
      localSql('update assessor_rollout_private.certificate_output_control set public_verification_enabled=true');
      for(const status of ['active','suspended','revoked'] as const){
        localSql(`update assessor_rollout_private.chapter_awards set status='${status}',status_changed_at=now() where certificate_id='${certificateId}'`);
        await publicPage.reload();
        await expect(publicPage.getByText(/Fictional Alex Peña/)).toHaveCount(0);
        await expect(publicPage.getByText(status==='active'?'Kasalukuyang katayuan: Aktibong tala ng pagkamit':status==='suspended'?'Kasalukuyang katayuan: Sinuspinde':'Kasalukuyang katayuan: Binawi',{exact:true})).toBeVisible();
        const verification=await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_assessor_certificate_verify`,{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!},data:{p_certificate_id:certificateId}});
        const record=await verification.json();expect(record.status).toBe(status);
        expect(Object.keys(record).sort()).toEqual(['available','found','certificateType','certificateId','chapterKey','titleFil','titleEn','issuedAt','issuerOrganization','status','currentPermission'].sort());
      }
      await publicPage.goto('/certificates/assessor/SAMPLE');
      await expect(publicPage.getByText('Walang nakitang sertipiko ng tagatasa/tagapagpadaloy para sa ID na ito.')).toBeVisible();
      await publicPage.goto(`/assessor-certificates/${certificateId}`);await expect(publicPage).toHaveURL(/\/login/);
      expect((await anonymous.request.get(`/api/assessor-certificates/${certificateId}/pdf`)).status()).toBe(401);
      await page.goto(`/assessor-certificates/${certificateId}`);
      await expect(page.getByText('Kasalukuyang katayuan: Binawi',{exact:true})).toBeVisible();
      const revokedPdf=await page.request.get(`/api/assessor-certificates/${certificateId}/pdf`);expect(revokedPdf.status()).toBe(200);
      writeFileSync('/tmp/c1af-earned-revoked.pdf',await revokedPdf.body());
      // Restore fixture status so C1AF-07's existing gate-off read assertion
      // still compares the same history rather than our intentional lifecycle change.
      localSql(`update assessor_rollout_private.chapter_awards set status='active',status_changed_at=null where certificate_id='${certificateId}'`);
      expect(awardEvidence()).toBe(immutableBefore);expect(snapshot()).toBe(before);
      expect(localSql(`select count(*) from audit_events where event_type='assessor.chapter_award.issued' and subject_id='${saved.awards[0].awardId}'`).trim()).toBe('1');
    }finally{await anonymous.close();localSql('update assessor_rollout_private.certificate_output_control set public_verification_enabled=false');}
    localSql("update feature_flags set enabled=false where key='assessor_flow_awards'");
    expect((await rpc('rpc_assessor_chapter_award_ensure',{p_chapter_id:chapter})).ok()).toBe(false);
    expect(await (await rpc('rpc_assessor_chapter_award_state',{p_chapter_id:chapter})).json()).toEqual(saved);

  } finally {
    localSql(`begin;
      -- Fixture disposal only: immutable content is never altered during the journey.
      alter table course_lesson_revisions disable trigger training_revision_immutable;
      alter table assessor_rollout_private.chapter_awards disable trigger preserve_chapter_award;
      alter table assessor_rollout_private.certificate_display_snapshots disable trigger preserve_certificate_display;
      delete from assessor_rollout_private.certificate_display_snapshots where award_id in(select id from assessor_rollout_private.chapter_awards where chapter_id='${chapter}');
      alter table assessor_rollout_private.certificate_display_snapshots enable trigger preserve_certificate_display;
      delete from assessor_rollout_private.chapter_awards where chapter_id='${chapter}';
      alter table assessor_rollout_private.chapter_awards enable trigger preserve_chapter_award;
      delete from assessor_rollout_private.award_contracts where requirements_version='chapter-1:c1af.draft-1';
      alter table assessor_flow_cohorts disable trigger preserve_assessor_flow_cutover;
      alter table assessor_flow_cohort_members disable trigger preserve_assessor_flow_membership;
      update assessor_rollout_private.simulation_control set enabled=false;
      update feature_flags set enabled=false where key in ('assessor_flow_ui','assessor_flow_awards');
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
      alter table assessor_flow_cohorts enable trigger preserve_assessor_flow_cutover;
      alter table assessor_flow_cohort_members enable trigger preserve_assessor_flow_membership;
      commit;`);
  }
});
