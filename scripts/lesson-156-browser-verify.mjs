// Actual production React components in the frozen inline review.
// Next navigation/image/link adapters and save callbacks are explicit local fixtures.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import {chromium} from '@playwright/test';
const root=path.resolve(import.meta.dirname,'..'),dir=root+'/.preview/lesson156-deliverables';
const html=fs.readFileSync(dir+'/lesson-1.5.6-malou-review.html');
const require=createRequire(root+'/remotion/package.json');const {ensureBrowser}=require('@remotion/renderer');
const status=await ensureBrowser();assert(status.path,'Repository Remotion browser unavailable');
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});await new Promise(r=>server.listen(4176,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:status.path,args:['--no-sandbox']});
const report={source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),date:new Date().toISOString(),method:'Actual production React ReferenceLessons/ReferenceReadSection/LessonAssetFigure with explicit Next and save fixture adapters. One loopback HTTP load per context, then true browser offline. No authenticated production, Chat Guide or dashboard verification.',cases:[],errors:[]};
const lesson=JSON.parse(fs.readFileSync(root+'/content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lessons/bhw-right-contact/lesson.json'));
const manifest=JSON.parse(fs.readFileSync(root+'/content/training/day1-basic-competencies/narration.json'));
const save=()=>fs.writeFileSync(dir+'/lesson-1.5.6-browser-verification.json',JSON.stringify(report,null,2)+'\n');
try{
 // Required agent-browser initial gut-check, using the already verified repository executable.
 const env={...process.env,AGENT_BROWSER_EXECUTABLE_PATH:status.path};
 execFileSync('npx',['--yes','agent-browser','--session','lesson156','open','http://127.0.0.1:4176'],{env,stdio:'inherit'});
 execFileSync('npx',['--yes','agent-browser','--session','lesson156','wait','--load','networkidle'],{env,stdio:'inherit'});
 const snapshot=execFileSync('npx',['--yes','agent-browser','--session','lesson156','snapshot','-i'],{env,encoding:'utf8'});assert(snapshot.includes('Filipino')&&snapshot.includes('Slides'));fs.writeFileSync(dir+'/agent-browser-snapshot.txt',snapshot);
 execFileSync('npx',['--yes','agent-browser','--session','lesson156','screenshot',dir+'/agent-browser-desktop.png'],{env,stdio:'inherit'});
 execFileSync('npx',['--yes','agent-browser','--session','lesson156','close'],{env,stdio:'inherit'});
 for(const width of [1280,390])for(const lang of ['fil','en'])for(const mode of ['read','slides']){
  const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));await page.goto('http://127.0.0.1:4176/?lang='+lang+'&mode='+mode);await page.getByRole('button',{name:'Filipino',exact:true}).waitFor();await context.setOffline(true);
  const next=lang==='en'?'Next':'Susunod',complete=lang==='en'?'Mark lesson complete':'Markahang tapos ang aralin';
  for(let i=0;i<6;i++){
   const section=lesson.sections[i],slide=mode==='slides';await page.locator('article[data-scene="'+(slide?'slide-':'')+section.id+'"]').waitFor();
   const image=page.locator('article[data-scene] figure img').first();await image.scrollIntoViewIfNeeded();await page.waitForFunction(()=>Array.from(document.querySelectorAll('article[data-scene] figure img')).some(i=>i.complete&&i.naturalWidth>0));
   assert(await page.getByRole('button',{name:complete,exact:true}).isDisabled());
   const caseRecord={width,language:lang,mode,section:section.id,image_visible_before_answer:true,offline:true};
   if(section.check){for(let c=0;c<3;c++){await page.getByRole('button',{name:section.check.options[c][lang],exact:true}).click();const text=await page.getByRole('status').innerText();assert(text.includes(lang==='en'?'First:':'Una:')&&text.includes(lang==='en'?'Third:':'Ikatlo:'));}caseRecord.all_three_rationales=true;}
   if(slide)await page.getByText(lang==='en'?'Full narration and audio':'Buong salaysay at audio',{exact:true}).click();
   assert.equal(await page.locator('audio').count(),1);await page.getByRole('button',{name:lang==='en'?'Listen':'Pakinggan',exact:true}).click();await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&!a.paused&&a.readyState>=2&&a.currentTime>0;});
   const timings=manifest.lessons['bhw-right-contact'].sections[section.id][lang].timings;caseRecord.highlight_zones=[];
   for(const zone of ['heading','body','takeaway']){const t=timings.find(t=>t.zone===zone);await page.locator('audio').evaluate((a,time)=>{a.currentTime=time},(t.start_ms+t.end_ms)/2000);await page.waitForTimeout(120);assert(await page.locator('[data-active="true"]').count()>0);caseRecord.highlight_zones.push(zone);}
   await page.locator('audio').evaluate(a=>{window.__previousAudio=a});report.cases.push(caseRecord);save();
   if(i<5){await page.getByRole('button',{name:next,exact:true}).click();assert(await page.evaluate(()=>window.__previousAudio.paused));}
  }
  assert(await page.getByRole('button',{name:complete,exact:true}).isEnabled());await page.getByRole('button',{name:complete,exact:true}).click();await page.waitForFunction(()=>window.__completed===true);report.cases.push({width,language:lang,mode,completion_without_story:true});
  await page.screenshot({path:dir+'/lesson156-'+lang+'-'+mode+'-'+width+'.png',fullPage:true});
  for(const pane of ['Facilitator guide','Observation indicator','Evidence']){await page.getByRole('button',{name:pane,exact:true}).click();assert(await page.locator('main').innerText());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await context.close();
 }
 for(const lang of ['fil','en'])for(const mode of ['read','slides'])for(const id of ['section-11','section-12']){
  const context=await browser.newContext();const page=await context.newPage();const anchor=(mode==='slides'?'slide-':'')+id;await page.goto('http://127.0.0.1:4176/?lang='+lang+'&mode='+mode+'&anchor='+anchor);await page.locator('article[data-scene="'+anchor+'"]').waitFor();report.cases.push({language:lang,mode,anchor,resume:true});await context.close();
 }
 for(const lang of ['fil','en']){
  const context=await browser.newContext();const page=await context.newPage();await page.goto('http://127.0.0.1:4176/?lang='+lang);await page.getByRole('button',{name:/Watch the animated|Panoorin ang animadong/}).click();await context.setOffline(true);
  await page.locator('video').evaluate(v=>v.play());await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.currentTime>0&&!v.paused&&v.readyState>=2;});
  const cues=await page.locator('video').evaluate(v=>({muted:v.muted,cues:v.textTracks[0]?.cues?.length??0,duration:v.duration}));assert.equal(cues.muted,false);assert.equal(cues.cues,6);await page.locator('video').evaluate(v=>{v.currentTime=v.duration-0.5});await page.waitForFunction(()=>document.querySelector('video').ended,{timeout:10000});report.cases.push({language:lang,unmuted_story:true,six_cues:true,complete_ending:true,offline:true,duration:cues.duration});await context.close();
 }
 assert.equal(report.errors.length,0);report.status='passed';report.actual_case_count=report.cases.length;save();
}catch(error){report.status='failed';report.error=String(error.stack??error);save();throw error;}finally{await browser.close();await new Promise(r=>server.close(r));}
