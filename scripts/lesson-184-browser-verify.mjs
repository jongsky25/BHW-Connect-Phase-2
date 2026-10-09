// Actual production components with explicit local auth/save adapters; no pilot writes.
import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium} from '@playwright/test';
const dir='.preview/lesson184-deliverables',html=fs.readFileSync(dir+'/lesson-1.8.4-apple-review.html');
const leaf='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-demonstrate/';
const lesson=JSON.parse(fs.readFileSync(leaf+'lesson.json')),mf=JSON.parse(fs.readFileSync('content/training/day1-basic-competencies/narration.json'));
const contentOnly=process.argv.includes('--content-only');
assert(process.env.PLAYWRIGHT_EXECUTABLE_PATH,'Specify the verified local browser path');
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
await new Promise(r=>server.listen(4184,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH,args:['--no-sandbox']});
const report={date:new Date().toISOString(),source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),method:'Actual ReferenceLessons/ReferenceReadSection production components, local auth/navigation/save fixtures. Browser offline after loopback load; no authenticated production proof.',scope:contentOnly?'text/check/resume only':'text/check/resume and actual narration',artwork_story:'Six action illustrations present; story playback separately checked',cases:[],screenshots:[],errors:[]};
const save=()=>fs.writeFileSync(dir+'/lesson-184-browser-verification.json',JSON.stringify(report,null,2)+'\n');
try{
 for(const width of [1280,390])for(const lang of ['fil','en'])for(const mode of ['read','slides']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(String(e)));
  await page.goto(`http://127.0.0.1:4184/?lang=${lang}&mode=${mode}`);
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
    for(const o of section.check.options){await page.getByRole('button',{name:o[lang],exact:true}).click();const text=await page.getByRole('status').innerText();for(const n of ['1.','2.','3.'])assert(text.includes(n));assert(text.includes('Apple'));assert(text.includes(lang==='en'?'Documentation follows care':'Kasunod ng pangangalaga'));}
    record.all_original_answers_rationales_corrected_ending=true;
   }
   if(!contentOnly){
    const track=mf.lessons['safety-demonstrate'].sections[section.id]?.[lang];assert(track,'Missing target narration');
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
   const screenshot=`lesson184-${lang}-${mode}-${width}-${section.id}.png`;await page.screenshot({path:dir+'/'+screenshot,fullPage:true});report.screenshots.push(screenshot);report.cases.push(record);save();
   if(index<5)await page.getByRole('button',{name:lang==='en'?'Next':'Susunod',exact:true}).click();
  }
  for(const pane of ['Facilitator guide','Observation indicator','Evidence']){await page.getByRole('button',{name:pane,exact:true}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await context.close();
 }
 for(const lang of ['fil','en'])for(const mode of ['read','slides'])for(const id of ['exposure','return-demo','near-miss','practice','check']){
  const context=await browser.newContext(),page=await context.newPage(),anchor=(mode==='slides'?'slide-':'')+id;
  await page.goto(`http://127.0.0.1:4184/?lang=${lang}&mode=${mode}&anchor=${anchor}`);await page.locator(`article[data-scene="${anchor}"]`).waitFor();report.cases.push({language:lang,mode,anchor,old_resume:true});await context.close();
 }
 assert.equal(report.errors.length,0);report.status='passed for stated scope; complete media review blocked';report.actual_case_count=report.cases.length;report.actual_screenshot_count=report.screenshots.length;save();
}catch(e){report.status='failed';report.error=String(e.stack??e);save();throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
