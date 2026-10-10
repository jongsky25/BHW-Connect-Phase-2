// Actual production components. Report missing media explicitly; never fabricate playback evidence.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const dir='.preview/lesson193-deliverables',html=fs.readFileSync(dir+'/lesson-1.9.3-charlaine-review.html');
const leaf='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-monitor/';
const lesson=JSON.parse(fs.readFileSync(leaf+'lesson.json'));
const withMedia=process.argv.includes('--with-media');
const manifest=JSON.parse(fs.readFileSync('content/training/day1-basic-competencies/narration.json'));
const story=lesson.assets.find(a=>a.id==='resources-monitor-story');
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const report={source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),html_sha256:createHash('sha256').update(html).digest('hex'),scope:'production components offline with local auth/save fixture; bilingual checks, actual media, gating, zone highlighting, resume and cleanup; no production-auth claim',date:new Date().toISOString(),cases:[],screenshots:[],errors:[],network_failures:[],missing:withMedia?[]:['story/caption/fullscreen verification','narration playback/zone verification until actual media imported']};
const observe=page=>{page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text()+' ('+m.location().url.slice(0,200)+')');});page.on('requestfailed',r=>report.network_failures.push({url:r.url().slice(0,200),error:r.failure()?.errorText}));};
const save=()=>fs.writeFileSync(dir+'/lesson-193-browser-verification.json',JSON.stringify(report,null,2)+'\n');
try{
 for(const width of [1280,390])for(const lang of ['fil','en'])for(const mode of ['read','slides']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();observe(page);
  await page.goto(`${url}/?lang=${lang}&mode=${mode}`);await page.getByRole('button',{name:'Filipino',exact:true}).waitFor();await context.setOffline(true);
  for(const [i,section]of lesson.sections.entries()){
   if(withMedia){const seconds=Math.round(Object.values(manifest.lessons['resources-monitor'].sections).reduce((n,s)=>n+s[lang].duration_seconds,0));assert((await page.locator('main').innerText()).includes(`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`),'Measured narration time not shown');}
   const anchor=(mode==='slides'?'slide-':'')+section.id;await page.locator(`article[data-scene="${anchor}"]`).waitFor();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow '+anchor);
   const picture=page.locator('article[data-scene] figure img').first();await picture.waitFor();assert(await picture.evaluate(i=>i.complete&&i.naturalWidth>0),'Missing picture '+anchor);
   if(withMedia&&story) {
    const button=page.getByRole('button',{name:/^(Narrated story|Kuwentong may salaysay)$/});
    if(i===0)assert(await button.isDisabled(),'Story ending exposed before checks');
   }
   if(section.check){
    const before=`lesson193-${lang}-${mode}-${width}-${section.id}-before-answer.png`;await page.screenshot({path:dir+'/'+before,fullPage:true});report.screenshots.push(before);
    assert(await picture.evaluate(i=>i.getBoundingClientRect().top)<(await page.getByRole('button',{name:section.check.options[0][lang],exact:true}).boundingBox()).y,'Picture after decision');
    assert.equal(await page.getByRole('status').count(),0,'Premature feedback');assert.equal(await page.locator('audio').count(),0,'Premature takeaway audio');
    for(const option of section.check.options){await page.getByRole('button',{name:option[lang],exact:true}).click();assert((await page.getByRole('status').innerText()).includes(section.check['feedback_'+lang]));}
   }
   if(withMedia){
    const track=manifest.lessons['resources-monitor'].sections[section.id][lang];
    if(mode==='slides')await page.getByText(lang==='en'?'Full narration and audio':'Buong salaysay at audio',{exact:true}).click();
    await page.getByRole('button',{name:lang==='en'?'Listen':'Pakinggan',exact:true}).click();
    await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&!a.paused&&a.readyState>=2&&a.currentTime>0;});assert.equal(await page.locator('audio').count(),1);
    for(const zone of ['heading','body','takeaway']){
     const timing=track.timings.find(t=>t.zone===zone);assert(timing,'Missing zone '+zone);
     await page.locator('audio').evaluate((a,ms)=>{a.currentTime=ms/1000},(timing.start_ms+timing.end_ms)/2);
     await page.waitForFunction(expected=>Array.from(document.querySelectorAll('[data-active="true"]')).some(el=>el.textContent.replace(/\*\*/g,'').replace(/\s+/g,' ').trim()===expected),timing.text.replace(/\*\*/g,'').replace(/\s+/g,' ').trim());
    }
    await page.locator('audio').evaluate(a=>{window.__previousAudio=a});
   }
   const shot=`lesson193-${lang}-${mode}-${width}-${section.id}.png`;await page.screenshot({path:dir+'/'+shot,fullPage:true});report.screenshots.push(shot);
   report.cases.push({width,language:lang,mode,anchor,no_overflow:true,all_answers_rationales_checked:!!section.check,pre_response_feedback_audio_gated:!!section.check,picture_present:await page.locator('article[data-scene] figure img').count()>0});save();
   if(i<lesson.sections.length-1){await page.getByRole('button',{name:lang==='en'?'Next':'Susunod',exact:true}).click();if(withMedia)assert(await page.evaluate(()=>window.__previousAudio.paused),'Read audio remains playing after navigation');}
  }
  if(withMedia&&story){
   await page.locator('audio').evaluate(a=>a.play());await page.waitForFunction(()=>!document.querySelector('audio').paused);
   await page.getByRole('button',{name:/^(Narrated story|Kuwentong may salaysay)$/}).click();assert(await page.evaluate(()=>!window.__previousAudio||window.__previousAudio.paused));
   await page.locator('video').evaluate(v=>v.play());await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.currentTime>0&&!v.paused&&v.readyState>=2;});
   await page.waitForFunction(()=>document.querySelector('video')?.textTracks[0]?.cues?.length===7);
   const data=await page.locator('video').evaluate(v=>({muted:v.muted,cues:v.textTracks[0]?.cues?.length??0,duration:v.duration}));assert.equal(data.muted,false);assert.equal(data.cues,7);
   await page.locator('video').evaluate(v=>window.__previousVideo=v);
   await page.getByRole('button',{name:lang==='en'?'Full screen':'Buong screen',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();assert.equal(await page.locator('video').count(),1);assert(await page.evaluate(()=>window.__previousVideo.paused));
   await dialog.locator('video').evaluate(v=>v.play());await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.paused&&v.currentTime>0;});
   await dialog.locator('video').evaluate(v=>{v.currentTime=v.duration-2});await page.waitForFunction(()=>document.querySelector('video').ended,null,{timeout:10000});
   const shot=`lesson193-story-${lang}-${mode}-${width}-ending.png`;await page.screenshot({path:dir+'/'+shot,fullPage:true});report.screenshots.push(shot);
   await dialog.getByRole('button',{name:lang==='en'?'Close':'Isara',exact:true}).click();await dialog.waitFor({state:'hidden'});
   for(const action of ['language','mode','navigation']){
    if(await page.locator('video').count()===0)await page.getByRole('button',{name:/^(Narrated story|Kuwentong may salaysay)$/}).click();
    await page.locator('video').evaluate(v=>{window.__previousVideo=v;return v.play()});await page.waitForFunction(()=>!document.querySelector('video').paused);
    if(action==='language'){
     await page.getByRole('button',{name:lang==='en'?'Filipino':'English',exact:true}).click();assert(await page.evaluate(()=>window.__previousVideo.paused));
     await page.getByRole('button',{name:lang==='en'?'English':'Filipino',exact:true}).click();
    }
    if(action==='mode'){
     await page.getByRole('button',{name:mode==='read'?'Slides':lang==='en'?'Read':'Basahin',exact:true}).click();assert(await page.evaluate(()=>window.__previousVideo.paused));
     await page.getByRole('button',{name:mode==='slides'?'Slides':lang==='en'?'Read':'Basahin',exact:true}).click();
    }
    if(action==='navigation'){await page.getByRole('button',{name:'Facilitator guide',exact:true}).click();assert(await page.evaluate(()=>window.__previousVideo.paused));}
   }
   report.cases.push({width,language:lang,mode,story_gated_until_all_checks:true,unmuted_story:true,seven_cues:true,ending_played:true,fullscreen:true,single_player:true,read_audio_paused:true,language_mode_navigation_pause:true,duration:data.duration});
  }
  for(const pane of ['Facilitator guide','Observation indicator','Evidence']){await page.getByRole('button',{name:pane,exact:true}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await context.close();
 }
 if(withMedia)for(const lang of ['fil','en'])for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();observe(page);
  await page.goto(`${url}/?lang=${lang}`);await context.setOffline(true);
  await page.getByRole('button',{name:lang==='en'?'Listen':'Pakinggan',exact:true}).click();await page.waitForFunction(()=>document.querySelector('audio')&&!document.querySelector('audio').paused);await page.locator('audio').evaluate(a=>window.__previousAudio=a);
  await page.getByRole('button',{name:'Slides',exact:true}).click();assert(await page.evaluate(()=>window.__previousAudio.paused));
  await page.getByRole('button',{name:lang==='en'?'Read':'Basahin',exact:true}).click();await page.getByRole('button',{name:lang==='en'?'Listen':'Pakinggan',exact:true}).click();await page.waitForFunction(()=>document.querySelector('audio')&&!document.querySelector('audio').paused);await page.locator('audio').evaluate(a=>window.__previousAudio=a);
  await page.getByRole('button',{name:lang==='en'?'Filipino':'English',exact:true}).click();assert(await page.evaluate(()=>window.__previousAudio.paused));
  report.cases.push({width,language:lang,read_mode_cleanup:true,read_language_cleanup:true});await context.close();
 }
 for(const lang of ['fil','en'])for(const mode of ['read','slides'])for(const s of lesson.sections){
  const page=await browser.newPage(),anchor=(mode==='slides'?'slide-':'')+s.id;observe(page);
  await page.goto(`${url}/?lang=${lang}&mode=${mode}&anchor=${anchor}`);await page.locator(`article[data-scene="${anchor}"]`).waitFor();report.cases.push({language:lang,mode,anchor,old_resume:true});await page.close();
 }
 assert.equal(report.errors.length,0);assert.equal(report.network_failures.length,0);report.status=withMedia?'passed for actual component/media fixture scope; human listening and production separate':'passed for text/check/resume scope; media matrix incomplete';report.actual_case_count=report.cases.length;report.actual_screenshot_count=report.screenshots.length;save();
}catch(e){report.status='failed';report.error=String(e.stack??e);save();throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
