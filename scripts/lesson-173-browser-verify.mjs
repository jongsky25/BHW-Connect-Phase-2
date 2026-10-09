// Real production components, explicit save/auth fixtures, offline after load.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const root=path.resolve(import.meta.dirname,'..'),dir=root+'/.preview/lesson173-deliverables';
const html=fs.readFileSync(dir+'/lesson-1.7.3-carole-review.html');
const lesson=JSON.parse(fs.readFileSync(root+'/content/training/day1-basic-competencies/modules/07-problema/lessons/problem-prioritize/lesson.json'));
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});await new Promise(r=>server.listen(4183,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.LESSON_REVIEW_BROWSER??'/usr/bin/chromium',args:['--no-sandbox']});
const report={method:'Production React components with local Next/save/auth fixtures; network offline after document load. No authenticated production or database E2E.',cases:[],errors:[],not_verified:['Narration playback/highlighting','Story captions/audio/ending/player exclusivity','Production published baseline','Local Supabase E2E']};
try{
 for(const width of [1280,390])for(const lang of ['fil','en'])for(const mode of ['read','slides']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));await page.goto(`http://127.0.0.1:4183/?lang=${lang}&mode=${mode}`);await page.locator('article[data-scene]').waitFor();await context.setOffline(true);
  const complete=lang==='en'?'Mark lesson complete':'Markahang tapos ang aralin';
  for(const s of lesson.sections){
   const article=page.locator(`article[data-scene="${mode==='slides'?'slide-':''}${s.id}"]`);await article.waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('article[data-scene] img')].some(i=>i.complete&&i.naturalWidth>0));
   assert(await page.getByRole('button',{name:complete,exact:true}).isDisabled());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await page.locator('audio').count(),0,'Stale audio must not be selected');
   if(s.id==='worked-scores'){const table=article.getByRole('table');assert.equal(await table.getByRole('row').count(),4);for(const n of ['19','17','16'])assert.equal(await table.getByRole('cell',{name:n,exact:true}).count(),1);}
   const record={width,language:lang,mode,section:s.id,offline:true,illustration_visible:true,no_document_overflow:true,stale_audio_absent:true};
   if(s.check){
    const choice=article.getByRole('button',{name:s.check.options[0][lang],exact:true});assert(await article.locator('figure').evaluate((el,button)=>Boolean(el.compareDocumentPosition(document.querySelector(button))&Node.DOCUMENT_POSITION_FOLLOWING),'article[data-scene] button'));
    assert.equal(await page.getByRole('status').count(),0);assert.equal(await page.getByText(s['takeaway_'+lang],{exact:true}).count(),0);
    for(const o of s.check.options){await article.getByRole('button',{name:o[lang],exact:true}).click();const feedback=await page.getByRole('status').innerText();for(const word of lang==='en'?['First:','Second:','Third:','transport','referral']:['Una:','Ikalawa:','Ikatlo:','transport','referral'])assert(feedback.includes(word));}
    record.all_three_rationales=true;record.corrected_ending=true;record.illustration_before_choices=true;
   }
   await page.screenshot({path:dir+`/lesson173-${lang}-${mode}-${width}-${s.id}.png`,fullPage:true});report.cases.push(record);
   if(s.id!=='check')await page.getByRole('button',{name:lang==='en'?'Next':'Susunod',exact:true}).click();
  }
  assert(await page.getByRole('button',{name:complete,exact:true}).isEnabled());await page.getByRole('button',{name:complete,exact:true}).click();await page.waitForFunction(()=>window.__completed===true);report.cases.push({width,language:lang,mode,fixture_completion:true});
  for(const pane of ['Facilitator guide','Observation indicator','Evidence']){await page.getByRole('button',{name:pane,exact:true}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await context.close();
 }
 for(const lang of ['fil','en'])for(const mode of ['read','slides'])for(const id of ['criteria','worked-scores','practice','check']){
  const page=await browser.newPage();const anchor=(mode==='slides'?'slide-':'')+id;await page.goto(`http://127.0.0.1:4183/?lang=${lang}&mode=${mode}&anchor=${anchor}`);await page.locator(`article[data-scene="${anchor}"]`).waitFor();report.cases.push({language:lang,mode,original_anchor:anchor,resume:true});await page.close();
 }
 assert.equal(report.errors.length,0);report.status='passed';report.actual_case_count=report.cases.length;
} catch(e){report.status='failed';report.error=String(e.stack??e);throw e;} finally{fs.writeFileSync(dir+'/lesson-173-browser-verification.json',JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}
console.log(`Passed ${report.actual_case_count} actual offline browser cases; audio/story checks remain blocked.`);
