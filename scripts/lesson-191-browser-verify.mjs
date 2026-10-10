// Actual production components with explicit local auth/save adapters; no pilot writes.
import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium} from '@playwright/test';
const dir='.preview/lesson191-deliverables',html=fs.readFileSync(dir+'/lesson-1.9.1-charlaine-review.html');
const leaf='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-audit/';
const lesson=JSON.parse(fs.readFileSync(leaf+'lesson.json')),mf=JSON.parse(fs.readFileSync('content/training/day1-basic-competencies/narration.json'));
const contentOnly=process.argv.includes('--content-only');
assert(process.env.PLAYWRIGHT_EXECUTABLE_PATH,'Specify the verified local browser path');
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const baseUrl='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH,args:['--no-sandbox']});
const report={date:new Date().toISOString(),source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),method:'Actual ReferenceLessons/ReferenceReadSection production components, local auth/navigation/save fixtures. Browser offline after loopback load; no authenticated production proof.',scope:contentOnly?'text/check/resume only':'text/check/resume and actual narration',artwork_story:'Six action illustrations present; story playback separately checked',cases:[],screenshots:[],errors:[]};
const trackErrors=page=>{page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});};
const save=()=>fs.writeFileSync(dir+'/lesson-191-browser-verification.json',JSON.stringify(report,null,2)+'\n');
try{
 for(const width of [1280,390])for(const lang of ['fil','en'])for(const mode of ['read','slides']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();trackErrors(page);
  await page.goto(`${baseUrl}/?lang=${lang}&mode=${mode}`);
  await page.getByRole('button',{name:'Filipino',exact:true}).waitFor();await context.setOffline(true);
  for(const [index,section]of lesson.sections.entries()){
   const anchor=(mode==='slides'?'slide-':'')+section.id;
   await page.locator(`article[data-scene="${anchor}"]`).waitFor();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow');
   const picture=page.locator('article[data-scene] figure img').first();await picture.waitFor();assert(await picture.evaluate(i=>i.complete&&i.naturalWidth>0));
   const record={width,language:lang,mode,anchor,no_horizontal_overflow:true,picture_before_check:true};
   if(section.check){
    assert.equal(await page.getByRole('status').count(),0,'Feedback revealed before decision');
    assert.equal(await page.locator('audio').count(),0,'Takeaway audio revealed before decision');record.takeaway_audio_gated=true;
    for(const o of section.check.options){await page.getByRole('button',{name:o[lang],exact:true}).click();const text=await page.getByRole('status').innerText();for(const n of ['1.','2.','3.'])assert(text.includes(n));assert(text.includes('Charlaine'));if(section.id==='check')assert(text.includes(lang==='en'?'shortage remains unresolved':'hindi pa naayos ang shortage')); }
    record.all_original_answers_rationales_corrected_ending=true;
   }
   if(!contentOnly){
    const track=mf.lessons['resources-audit'].sections[section.id]?.[lang];assert(track,'Missing target narration');
    if(mode==='slides')await page.getByText(lang==='en'?'Full narration and audio':'Buong salaysay at audio',{exact:true}).click();
    const button=page.getByRole('button',{name:lang==='en'?'Listen':'Pakinggan',exact:true});await button.click();
    await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&!a.paused&&a.readyState>=2&&a.currentTime>0;});
    assert.equal(await page.locator('audio').count(),1);record.highlighted=[];
    for(const zone of ['heading','body','takeaway']){
     const timing=track.timings.find(t=>t.zone===zone);assert(timing,'Missing narration zone '+zone);
     await page.locator('audio').evaluate((a,ms)=>{a.currentTime=ms/1000},(timing.start_ms+timing.end_ms)/2);
     await page.waitForFunction(expected=>Array.from(document.querySelectorAll('[data-active="true"]')).some(el=>el.textContent.replace(/\*\*/g,'').replace(/\s+/g,' ').trim()===expected),timing.text.replace(/\*\*/g,'').replace(/\s+/g,' ').trim());record.highlighted.push(zone);
    }
    await page.locator('audio').evaluate(a=>{window.__previousAudio=a;a.pause()});record.actual_audio_played=true;
   }
   const screenshot=`lesson191-${lang}-${mode}-${width}-${section.id}.png`;await page.screenshot({path:dir+'/'+screenshot,fullPage:true});report.screenshots.push(screenshot);report.cases.push(record);save();
   if(index<5)await page.getByRole('button',{name:lang==='en'?'Next':'Susunod',exact:true}).click();
  }
  for(const pane of ['Facilitator guide','Observation indicator','Evidence']){await page.getByRole('button',{name:pane,exact:true}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(pane==='Facilitator guide'){assert((await page.locator('article section div').nth(1).innerText()).length>100,'Guide body missing');assert((await page.locator('article h2').nth(1).innerText()).length<120,'Guide body rendered as heading');}}
  await context.close();
 }
 for(const lang of ['fil','en'])for(const mode of ['read','slides'])for(const id of ['exposure','return-demo','near-miss','practice','check']){
  const context=await browser.newContext(),page=await context.newPage(),anchor=(mode==='slides'?'slide-':'')+id;
  trackErrors(page);await page.goto(`${baseUrl}/?lang=${lang}&mode=${mode}&anchor=${anchor}`);await page.locator(`article[data-scene="${anchor}"]`).waitFor();report.cases.push({language:lang,mode,anchor,old_resume:true});await context.close();
 }

 for(const lang of ['fil','en'])for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();trackErrors(page);await page.goto(`${baseUrl}/?lang=${lang}`);
  await page.getByRole('button',{name:lang==='en'?'Listen':'Pakinggan',exact:true}).click();await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&!a.paused&&a.currentTime>0;});await page.locator('audio').evaluate(a=>window.__previousAudio=a);
  await page.getByRole('button',{name:/Watch the animated|Panoorin ang animadong/}).click();assert(await page.evaluate(()=>window.__previousAudio.paused));await context.setOffline(true);
  await page.locator('video').evaluate(v=>v.play());await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.currentTime>0&&!v.paused&&v.readyState>=2;});await page.locator('video').evaluate(v=>window.__previousVideo=v);
  await page.getByRole('button',{name:lang==='en'?'Full screen':'Buong screen',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();assert.equal(await page.locator('video').count(),1);assert(await page.evaluate(()=>window.__previousVideo.paused));
  await dialog.locator('video').evaluate(v=>v.play());await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.currentTime>0&&!v.paused&&v.readyState>=2;});
  const cues=await page.locator('video').evaluate(v=>({muted:v.muted,cues:v.textTracks[0]?.cues?.length??0,duration:v.duration}));assert.equal(cues.muted,false);assert.equal(cues.cues,6);await page.locator('video').evaluate(v=>{v.currentTime=v.duration-2});await page.waitForFunction(()=>document.querySelector('video').ended,null,{timeout:10000});
  const endingShot=`lesson191-story-${lang}-${width}-ending.png`;await page.screenshot({path:dir+'/'+endingShot,fullPage:true});report.screenshots.push(endingShot);
  await dialog.getByRole('button',{name:lang==='en'?'Close':'Isara',exact:true}).click();await dialog.waitFor({state:'hidden'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  report.cases.push({language:lang,width,unmuted_story:true,six_cues:true,ending_played:true,offline:true,fullscreen_story:true,single_player:true,read_to_story_pauses:true,no_horizontal_overflow:true,duration:cues.duration});await context.close();
 }
 for(const lang of ['fil','en'])for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();trackErrors(page);await page.goto(`${baseUrl}/?lang=${lang}`);
  await page.getByRole('button',{name:lang==='en'?'Listen':'Pakinggan',exact:true}).click();await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&!a.paused;});await page.locator('audio').evaluate(a=>window.__previousAudio=a);
  await page.getByRole('button',{name:'Slides',exact:true}).click();assert(await page.evaluate(()=>window.__previousAudio.paused));
  await page.getByRole('button',{name:lang==='en'?'Read':'Basahin',exact:true}).click();await page.getByRole('button',{name:lang==='en'?'Listen':'Pakinggan',exact:true}).click();await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&!a.paused;});await page.locator('audio').evaluate(a=>window.__previousAudio=a);
  await page.getByRole('button',{name:lang==='en'?'Filipino':'English',exact:true}).click();assert(await page.evaluate(()=>window.__previousAudio.paused));
  for(const action of ['mode','language','navigation']){
   await page.getByRole('button',{name:/^(Narrated story|Kuwentong may salaysay)$/}).click();await page.locator('video').evaluate(v=>v.play());await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.paused&&v.currentTime>0;});await page.locator('video').evaluate(v=>window.__previousVideo=v);
   if(action==='mode')await page.getByRole('button',{name:'Slides',exact:true}).click();
   if(action==='language')await page.getByRole('button',{name:lang==='en'?'English':'Filipino',exact:true}).click();
   if(action==='navigation')await page.getByRole('button',{name:'Facilitator guide',exact:true}).click();
   assert(await page.evaluate(()=>window.__previousVideo.paused),'Story remains playing after '+action);
  }
  report.cases.push({language:lang,width,mode_switch_pauses:true,language_switch_pauses:true,story_mode_cleanup:true,story_language_cleanup:true,story_navigation_cleanup:true});await context.close();
 }
 assert.equal(report.errors.length,0);report.status='passed for stated fixture scope; human listening, clinical and owner review separate';report.actual_case_count=report.cases.length;report.actual_screenshot_count=report.screenshots.length;save();
}catch(e){report.status='failed';report.error=String(e.stack??e);save();throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
