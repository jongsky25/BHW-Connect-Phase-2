// Actual production components. Report missing media explicitly; never fabricate playback evidence.
import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const dir='.preview/lesson193-deliverables',html=fs.readFileSync(dir+'/lesson-1.9.3-charlaine-review.html');
const leaf='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-monitor/';
const lesson=JSON.parse(fs.readFileSync(leaf+'lesson.json'));
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const report={scope:'production components with local auth/save fixture; text, checks, gating, resume and overflow only',date:new Date().toISOString(),cases:[],screenshots:[],errors:[],missing:['seven generated scene illustrations','story/caption/fullscreen verification','narration playback/zone verification until actual media imported']};
const save=()=>fs.writeFileSync(dir+'/lesson-193-browser-verification.json',JSON.stringify(report,null,2)+'\n');
try{
 for(const width of [1280,390])for(const lang of ['fil','en'])for(const mode of ['read','slides']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto(`${url}/?lang=${lang}&mode=${mode}`);await page.getByRole('button',{name:'Filipino',exact:true}).waitFor();await context.setOffline(true);
  for(const [i,section]of lesson.sections.entries()){
   const anchor=(mode==='slides'?'slide-':'')+section.id;await page.locator(`article[data-scene="${anchor}"]`).waitFor();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow '+anchor);
   if(section.check){
    assert.equal(await page.getByRole('status').count(),0,'Premature feedback');assert.equal(await page.locator('audio').count(),0,'Premature takeaway audio');
    for(const option of section.check.options){await page.getByRole('button',{name:option[lang],exact:true}).click();assert((await page.getByRole('status').innerText()).includes(section.check['feedback_'+lang]));}
   }
   const shot=`lesson193-${lang}-${mode}-${width}-${section.id}.png`;await page.screenshot({path:dir+'/'+shot,fullPage:true});report.screenshots.push(shot);
   report.cases.push({width,language:lang,mode,anchor,no_overflow:true,all_answers_rationales_checked:!!section.check,pre_response_feedback_audio_gated:!!section.check,picture_present:await page.locator('article[data-scene] figure img').count()>0});save();
   if(i<lesson.sections.length-1)await page.getByRole('button',{name:lang==='en'?'Next':'Susunod',exact:true}).click();
  }
  for(const pane of ['Facilitator guide','Observation indicator','Evidence']){await page.getByRole('button',{name:pane,exact:true}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await context.close();
 }
 for(const lang of ['fil','en'])for(const mode of ['read','slides'])for(const s of lesson.sections){
  const page=await browser.newPage(),anchor=(mode==='slides'?'slide-':'')+s.id;
  await page.goto(`${url}/?lang=${lang}&mode=${mode}&anchor=${anchor}`);await page.locator(`article[data-scene="${anchor}"]`).waitFor();report.cases.push({language:lang,mode,anchor,old_resume:true});await page.close();
 }
 assert.equal(report.errors.length,0);report.status='passed for text/check/resume scope; media matrix incomplete';report.actual_case_count=report.cases.length;report.actual_screenshot_count=report.screenshots.length;save();
}catch(e){report.status='failed';report.error=String(e.stack??e);save();throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
