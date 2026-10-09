// Verify actual production components offline; report audio/story gaps explicitly.
import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const dir='.preview/lesson174-deliverables';
const html=fs.readFileSync(dir+'/lesson-1.7.4-carole-review.html');
const lesson=JSON.parse(fs.readFileSync('content/training/day1-basic-competencies/modules/07-problema/lessons/problem-action-plan/lesson.json'));
const report={method:'Actual ReferenceLessons production components, explicit offline save/navigation/auth fixtures; no authenticated database connection.',cases:[],errors:[],audio_and_story:'Text/art-only matrix; use lesson-174-full-browser-verify.mjs for actual media playback and highlighting.'};
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
await new Promise(resolve=>server.listen(4179,'127.0.0.1',resolve));
const browser=await chromium.launch({args:['--no-sandbox']});
const save=()=>fs.writeFileSync(dir+'/lesson-174-browser-verification.json',JSON.stringify(report,null,2)+'\n');
try{
 for(const width of [1280,390])for(const lang of ['fil','en'])for(const mode of ['read','slides']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(String(e)));
  await page.goto(`http://127.0.0.1:4179/?lang=${lang}&mode=${mode}`);
  await page.getByRole('button',{name:'Filipino',exact:true}).waitFor();await context.setOffline(true);
  const complete=lang==='en'?'Mark lesson complete':'Markahang tapos ang aralin';
  for(const [i,s]of lesson.sections.entries()){
   const anchor=(mode==='slides'?'slide-':'')+s.id,article=page.locator(`article[data-scene="${anchor}"]`);await article.waitFor();
   const img=article.locator('figure img').first();await img.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('article[data-scene] figure img')).some(i=>i.complete&&i.naturalWidth>0));
   assert(await page.getByRole('button',{name:complete,exact:true}).isDisabled());
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const record={width,language:lang,mode,screen:s.id,offline:true,illustration_loaded:true,no_horizontal_overflow:true};
   if(s.check){
    assert.equal(await page.getByRole('status').count(),0);
    assert.equal(await page.locator('audio').count(),0);
    assert(await page.evaluate(()=>{const figure=document.querySelector('article[data-scene] figure'),choice=Array.from(document.querySelectorAll('article[data-scene] button')).find(b=>b.textContent.includes('Ituring na')||b.textContent.includes('Declare success'));return Boolean(figure&&choice&&(figure.compareDocumentPosition(choice)&Node.DOCUMENT_POSITION_FOLLOWING));}));
    record.illustration_before_choices=true;
    for(let c=0;c<3;c++){
     await page.getByRole('button',{name:s.check.options[c][lang],exact:true}).click();
     const text=await page.getByRole('status').innerText();
     for(const label of lang==='en'?['First:','Second:','Third:']:['Una:','Ikalawa:','Ikatlo:'])assert(text.includes(label));
     assert(text.includes(lang==='en'?'staff time pending':'staff time na hinihintay'));
    }
    record.all_three_choices_and_rationales=true;record.pending_ending=true;
   }
   await page.screenshot({path:`${dir}/lesson174-${lang}-${mode}-${width}-${s.id}.png`,fullPage:true});
   report.cases.push(record);save();
   if(i<5)await page.getByRole('button',{name:lang==='en'?'Next':'Susunod',exact:true}).click();
  }
  assert(await page.getByRole('button',{name:complete,exact:true}).isEnabled());
  await page.getByRole('button',{name:complete,exact:true}).click();await page.waitForFunction(()=>window.__completed===true);
  report.cases.push({width,language:lang,mode,completion_with_answer:true});
  for(const pane of ['Facilitator guide','Observation indicator','Evidence']){
   await page.getByRole('button',{name:pane,exact:true}).click();assert((await page.locator('main').innerText()).length>100);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  await context.close();
 }
 for(const lang of ['fil','en'])for(const mode of ['read','slides'])for(const id of lesson.sections.map(s=>s.id)){
  const context=await browser.newContext(),page=await context.newPage();const anchor=(mode==='slides'?'slide-':'')+id;
  await page.goto(`http://127.0.0.1:4179/?lang=${lang}&mode=${mode}&anchor=${anchor}`);
  await page.locator(`article[data-scene="${anchor}"]`).waitFor();report.cases.push({language:lang,mode,anchor,resume:true});await context.close();
 }
 assert.equal(report.errors.length,0);report.status='passed for available text/art flows';report.actual_case_count=report.cases.length;save();
}catch(error){report.status='failed';report.error=String(error.stack??error);save();throw error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
