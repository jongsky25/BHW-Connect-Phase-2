// Actual production React components in the frozen inline review.
// Next navigation/image/link adapters and save callbacks are explicit local fixtures.
import {createHash} from 'node:crypto';
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import {chromium} from '@playwright/test';
const root=path.resolve(import.meta.dirname,'..'),dir=root+'/.preview/lesson182-deliverables';
const html=fs.readFileSync(dir+'/lesson-1.8.2-apple-review.html');
const require=createRequire(root+'/remotion/package.json');const {ensureBrowser}=require('@remotion/renderer');
const status=process.env.LESSON182_BROWSER_PATH?{path:process.env.LESSON182_BROWSER_PATH}:await ensureBrowser();assert(status.path,'Repository Remotion browser unavailable');
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});await new Promise(r=>server.listen(4179,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:status.path,args:['--no-sandbox']});
const report={review_html_sha256:createHash('sha256').update(html).digest('hex'),source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),date:new Date().toISOString(),method:'Actual production React ReferenceLessons/ReferenceReadSection/LessonAssetFigure with explicit Next and save fixture adapters. One loopback HTTP load per context, then true browser offline. No authenticated production, Chat Guide or dashboard verification.',cases:[],errors:[],console_errors:[],failed_requests:[]};
const lesson=JSON.parse(fs.readFileSync(root+'/content/training/day1-basic-competencies/modules/08-osh/lessons/safety-controls/lesson.json'));
const manifest=JSON.parse(fs.readFileSync(root+'/content/training/day1-basic-competencies/narration.json'));
const save=()=>fs.writeFileSync(dir+'/lesson-1.8.2-browser-verification.json',JSON.stringify(report,null,2)+'\n');
try{
 for(const width of [1280,390])for(const lang of ['fil','en'])for(const mode of ['read','slides']){
  const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));page.on('requestfailed',r=>report.failed_requests.push({url:r.url(),error:r.failure()?.errorText}));page.on('console',m=>{if(m.type()==='error')report.console_errors.push(m.text())});await page.goto('http://127.0.0.1:4179/?lang='+lang+'&mode='+mode);await page.getByRole('button',{name:'Filipino',exact:true}).waitFor();await context.setOffline(true);
  const next=lang==='en'?'Next':'Susunod',complete=lang==='en'?'Mark lesson complete':'Markahang tapos ang aralin';
  for(let i=0;i<6;i++){
   const section=lesson.sections[i],slide=mode==='slides';await page.locator('article[data-scene="'+(slide?'slide-':'')+section.id+'"]').waitFor();
   const image=page.locator('article[data-scene] figure img').first();await image.scrollIntoViewIfNeeded();await page.waitForFunction(()=>Array.from(document.querySelectorAll('article[data-scene] figure img')).some(i=>i.complete&&i.naturalWidth>0));
   assert(await page.getByRole('button',{name:complete,exact:true}).isDisabled());
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:dir+'/lesson182-'+lang+'-'+mode+'-'+width+'-'+section.id+'.png',fullPage:true});
   const caseRecord={width,language:lang,mode,section:section.id,image_visible_before_answer:true,offline:true,no_horizontal_overflow:true};
   if(section.check){assert.equal(await page.locator('audio').count(),0);caseRecord.summary_audio_gated=true;assert.equal(await page.getByRole('status').count(),0);assert.equal(await page.getByText(section['takeaway_'+lang],{exact:true}).count(),0);for(let c=0;c<3;c++){await page.getByRole('button',{name:section.check.options[c][lang],exact:true}).click();const text=await page.getByRole('status').innerText();assert(text.includes(lang==='en'?'First:':'Una:')&&text.includes(lang==='en'?'Third:':'Ikatlo:'));}caseRecord.all_three_rationales=true;}
   if(slide)await page.getByText(lang==='en'?'Full narration and audio':'Buong salaysay at audio',{exact:true}).click();
   assert.equal(await page.locator('audio').count(),1);await page.getByRole('button',{name:lang==='en'?'Listen':'Pakinggan',exact:true}).click();await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&!a.paused&&a.readyState>=2&&a.currentTime>0;});
   const timings=manifest.lessons['safety-controls'].sections[section.id][lang].timings;caseRecord.highlight_zones=[];
   for(const zone of ['heading','body','takeaway']){const t=timings.find(t=>t.zone===zone);await page.locator('audio').evaluate((a,time)=>{a.currentTime=time},(t.start_ms+t.end_ms)/2000);await page.waitForFunction(expected=>Array.from(document.querySelectorAll('[data-active="true"]')).some(el=>el.textContent.replace(/\*\*/g,'').replace(/\s+/g,' ').trim()===expected),t.text.replace(/\*\*/g,'').replace(/\s+/g,' ').trim());caseRecord.highlight_zones.push({zone,expected_text:t.text,matched:true});}
   await page.locator('audio').evaluate(a=>{window.__previousAudio=a});report.cases.push(caseRecord);save();
   if(i<5){await page.getByRole('button',{name:next,exact:true}).focus();await page.getByRole('button',{name:next,exact:true}).press('Enter');assert(await page.evaluate(()=>window.__previousAudio.paused));}
  }
  assert(await page.getByRole('button',{name:complete,exact:true}).isEnabled());await page.getByRole('button',{name:complete,exact:true}).click();await page.waitForFunction(()=>window.__completed===true);report.cases.push({width,language:lang,mode,completion_without_story:true});
  await page.screenshot({path:dir+'/lesson182-'+lang+'-'+mode+'-'+width+'.png',fullPage:true});
  for(const pane of ['Facilitator guide','Observation indicator','Evidence']){await page.getByRole('button',{name:pane,exact:true}).click();assert(await page.locator('main').innerText());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await context.close();
 }
 for(const lang of ['fil','en'])for(const mode of ['read','slides'])for(const id of ['sharps','infection','body','workload','practice','check']){
  const context=await browser.newContext();const page=await context.newPage();const anchor=(mode==='slides'?'slide-':'')+id;await page.goto('http://127.0.0.1:4179/?lang='+lang+'&mode='+mode+'&anchor='+anchor);await page.locator('article[data-scene="'+anchor+'"]').waitFor();const expected=lesson.sections.find(s=>s.id===id).concept_ids[0];await page.getByRole('button',{name:mode==='read'?'Slides':(lang==='en'?'Read':'Basahin'),exact:true}).click();await page.waitForFunction(()=>window.__lastResume);assert.equal(await page.evaluate(()=>window.__lastResume.concept_id),expected);report.cases.push({language:lang,mode,anchor,resume:true,saved_concept:expected,cross_mode_concept_preserved:true});await context.close();
 }
 for(const lang of ['fil','en'])for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();await page.goto('http://127.0.0.1:4179/?lang='+lang);
  await page.getByRole('button',{name:lang==='en'?'Listen':'Pakinggan',exact:true}).click();await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&!a.paused&&a.currentTime>0;});await page.locator('audio').evaluate(a=>window.__previousAudio=a);
  await page.getByRole('button',{name:/Watch the animated|Panoorin ang animadong/}).click();assert(await page.evaluate(()=>window.__previousAudio.paused));await context.setOffline(true);
  await page.locator('video').evaluate(v=>v.play());await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.currentTime>0&&!v.paused&&v.readyState>=2;});await page.locator('video').evaluate(v=>window.__previousVideo=v);
  await page.getByRole('button',{name:lang==='en'?'Full screen':'Buong screen',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();assert.equal(await page.locator('video').count(),1);assert(await page.evaluate(()=>window.__previousVideo.paused));
  await dialog.locator('video').evaluate(v=>v.play());await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.currentTime>0&&!v.paused&&v.readyState>=2;});
  const cues=await page.locator('video').evaluate(v=>({muted:v.muted,cues:v.textTracks[0]?.cues?.length??0,duration:v.duration}));assert.equal(cues.muted,false);assert.equal(cues.cues,6);await page.screenshot({path:dir+'/lesson182-'+lang+'-story-'+width+'.png',fullPage:true});await page.locator('video').evaluate(v=>{v.currentTime=v.duration-0.5});await page.waitForFunction(()=>document.querySelector('video').ended,null,{timeout:10000});
  await dialog.getByRole('button',{name:lang==='en'?'Close':'Isara',exact:true}).click();await dialog.waitFor({state:'hidden'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  report.cases.push({language:lang,width,unmuted_story:true,six_cues:true,complete_ending:true,offline:true,fullscreen_story:true,single_player:true,read_to_story_pauses:true,no_horizontal_overflow:true,duration:cues.duration});await context.close();
 }
 for(const lang of ['fil','en'])for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();await page.goto('http://127.0.0.1:4179/?lang='+lang);
  await page.getByRole('button',{name:lang==='en'?'Listen':'Pakinggan',exact:true}).click();await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&!a.paused;});await page.locator('audio').evaluate(a=>window.__previousAudio=a);
  await page.getByRole('button',{name:'Slides',exact:true}).click();assert(await page.evaluate(()=>window.__previousAudio.paused));
  await page.getByRole('button',{name:lang==='en'?'Read':'Basahin',exact:true}).click();await page.getByRole('button',{name:lang==='en'?'Full screen':'Buong screen',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();assert(await dialog.locator('img').first().isVisible());assert.equal(await page.locator('audio').count(),1);await page.screenshot({path:dir+'/lesson182-'+lang+'-fullscreen-'+width+'.png',fullPage:true});
  await dialog.getByRole('button',{name:lang==='en'?'Close':'Isara',exact:true}).click();await dialog.waitFor({state:'hidden'});await page.getByRole('button',{name:lang==='en'?'Listen':'Pakinggan',exact:true}).click();await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&!a.paused&&a.currentTime>0;});await page.locator('audio').evaluate(a=>window.__previousAudio=a);
  await page.getByRole('button',{name:lang==='en'?'Filipino':'English',exact:true}).click();assert(await page.evaluate(()=>window.__previousAudio.paused));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));report.cases.push({language:lang,width,mode_switch_pauses:true,language_switch_pauses:true,fullscreen_picture:true,single_player:true,no_horizontal_overflow:true});await context.close();
 }
 for(const lang of ['fil','en'])for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();await page.goto('http://127.0.0.1:4179/?lang='+lang);await context.setOffline(true);
  const play=async()=>{await page.getByRole('button',{name:lang==='en'?'Narrated story':'Kuwentong may salaysay',exact:true}).click();await page.locator('video').evaluate(v=>v.play());await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.paused&&v.currentTime>0});await page.locator('video').evaluate(v=>window.__previousVideo=v)};
  await play();await page.getByRole('button',{name:'Slides',exact:true}).click();assert(await page.evaluate(()=>window.__previousVideo.paused));
  await play();await page.getByRole('button',{name:lang==='en'?'Filipino':'English',exact:true}).click();assert(await page.evaluate(()=>window.__previousVideo.paused));
  await page.getByRole('button',{name:lang==='en'?'English':'Filipino',exact:true}).click();await play();await page.getByRole('button',{name:'Facilitator guide',exact:true}).click();assert(await page.evaluate(()=>window.__previousVideo.paused));
  report.cases.push({language:lang,width,story_mode_switch_pauses:true,story_language_switch_pauses:true,navigation_unmount_pauses:true,offline:true});await context.close();
 }
 assert.equal(report.errors.length,0);assert.equal(report.console_errors.length,0);report.screenshot_count=fs.readdirSync(dir).filter(p=>p.startsWith('lesson182-')&&p.endsWith('.png')).length;report.status='passed';report.actual_case_count=report.cases.length;save();
}catch(error){report.status='failed';report.error=String(error.stack??error);save();throw error;}finally{await browser.close();await new Promise(r=>server.close(r));}
