// Actual component verification after one loopback HTTP load, then true browser offline.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {execFileSync} from 'node:child_process';import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'..'),out=root+'/.preview/lesson155',html=fs.readFileSync(out+'/lesson-1.5.5-malou-review.html');
const server=http.createServer((req,res)=>{if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end(html);}else{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});const page=await context.newPage();
const records=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const report={source_commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),fixture:'Actual production components, strict selector and local-only resume/completion callbacks; no authenticated production claim',http_loads:1,offline_after_initial_load:true,records,errors};
const assert=(ok,message)=>{if(!ok)throw Error(message);};
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});await context.setOffline(true);
 for(const width of [1280,390])for(const lang of ['fil','en']){
  await page.setViewportSize({width,height:900});await page.getByRole('button',{name:lang==='en'?'English':'Filipino',exact:true}).click();await page.getByRole('button',{name:'Lesson',exact:true}).click();
  for(const mode of ['read','slides']){
   await page.getByRole('button',{name:lang==='en'?'English':'Filipino',exact:true}).click();
   if(mode==='slides')await page.getByRole('button',{name:'Slides',exact:true}).click();
   for(let i=0;i<7;i++){
    const id=['section-9','self-reliability','self-stress-time','self-trust-honesty','self-adaptability','section-10','self-application-check'][i];
    const img=page.locator('main figure img');assert(await img.count()===1,'Exactly one screen image');await img.evaluate(el=>el.decode());
    assert(await img.evaluate(el=>el.naturalWidth===1536),'New scene loads offline');
    if(i===6){assert(await page.locator('article').innerText().then(t=>t.includes(lang==='en'?'There is no immediate danger':'Walang agarang panganib')),'Application context visible before answering');await page.locator('fieldset button').first().click();}
    if(mode==='slides'){const panel=page.locator('details').filter({has:page.getByText(lang==='en'?'Full narration and audio':'Buong salaysay at audio',{exact:true})});if(await panel.count())await panel.evaluate(el=>el.open=true);}
    const audio=page.locator('audio');assert(await audio.count()===1,'One exact-match audio player on every screen');
    const timings=await page.evaluate(({lang,id})=>window.reviewTimings[lang][id],{lang,id});assert(timings?.length>2,'Real timing zones available');
    const selected=[timings[0],timings.find(t=>t.zone==='body'),timings.at(-1)];
    for(const t of selected){await audio.evaluate(async(el,time)=>{el.currentTime=time;await el.play();},(t.start_ms+Math.min(350,(t.end_ms-t.start_ms)/2))/1000);await page.waitForFunction(text=>[...document.querySelectorAll('[data-active="true"]')].some(el=>el.textContent.includes(text)||text.includes(el.textContent)),t.text.replaceAll('**',''));const active=await page.locator('[data-active="true"]').allTextContents();assert(active.some(v=>v.includes(t.text.replaceAll('**',''))||t.text.replaceAll('**','').includes(v)),'Measured zone highlighting '+id+' '+t.zone);await audio.evaluate(el=>el.pause());}
    if(i===6){const check=page.locator('fieldset');for(const option of [0,1,2]){await check.locator('button').nth(option).click();const text=await check.locator('[role="status"]').innerText();assert(['A','B','C'].every(l=>text.includes(l)),'All-choice rationale');}}
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal page overflow');
    records.push({width,language:lang,mode,screen:id,image:true,one_audio:true,head_body_end_highlight:true,all_choices:i===6,offline:true});
    if(i===0||i===6)await page.screenshot({path:out+`/screen-${width}-${lang}-${mode}-${i}.png`,fullPage:true});
    if(i<6){await audio.evaluate(async el=>{window.previousAudio=el;el.currentTime=0;await el.play();});assert(await audio.evaluate(el=>!el.paused),'Audio playing before transition');await page.getByRole('button',{name:lang==='en'?'Next':'Susunod',exact:true}).click();assert(await page.evaluate(()=>window.previousAudio.paused),'Pause on transition');}
   }
   if(mode==='read'){await page.evaluate(()=>{window.reviewEvents=[];});await page.getByRole('button',{name:lang==='en'?'Mark lesson complete':'Markahang tapos ang aralin',exact:true}).click();assert(await page.evaluate(()=>window.reviewEvents.some(e=>e.type==='complete')),'Completion without watching story');}
  }
  await page.getByRole('button',{name:lang==='en'?'Narrated story':'Kuwentong may salaysay',exact:true}).click();const video=page.locator('video');assert(await video.count()===1,'One story');
  await video.evaluate(async el=>{el.load();await el.play();});await page.waitForFunction(()=>document.querySelector('video')?.currentTime>0.2);assert(await video.evaluate(el=>!el.muted),'Story unmuted');
  await page.waitForFunction(()=>document.querySelector('video')?.textTracks[0]?.cues?.length===6);const length=await video.evaluate(el=>el.duration);await video.evaluate(el=>el.currentTime=el.duration-0.3);await page.waitForFunction(()=>document.querySelector('video')?.ended);records.push({width,language:lang,story:true,unmuted:true,captions:6,ending:true,duration:length,offline:true});
  await page.getByRole('button',{name:lang==='en'?'Full screen':'Buong screen',exact:true}).click();
  const dialog=page.getByRole('dialog');assert(await dialog.isVisible(),'Story full-screen dialog opens');
  const fullVideo=dialog.locator('video');await fullVideo.evaluate(async el=>{el.currentTime=0;await el.play();});
  await page.waitForFunction(()=>document.querySelector('dialog video')?.currentTime>0.2);
  await fullVideo.evaluate(el=>{window.previousFullVideo=el;});
  await dialog.getByRole('button',{name:lang==='en'?'Close':'Isara',exact:true}).click();
  assert(await page.evaluate(()=>window.previousFullVideo.paused),'Closing full-screen pauses video');
  records.push({width,language:lang,full_screen:'story',playback:true,close_pauses:true,offline:true});
  await page.getByRole('button',{name:lang==='en'?'Read':'Basahin',exact:true}).click();
  await page.getByRole('button',{name:lang==='en'?'Full screen':'Buong screen',exact:true}).click();
  for(const mode of [lang==='en'?'Read':'Basahin','Slides']){
   await dialog.getByRole('button',{name:mode,exact:true}).click();
   assert(await dialog.locator('figure img').count()===1,'Full-screen image present');
   assert(await dialog.getByRole('heading').count()>0,'Full-screen section heading present');
   records.push({width,language:lang,full_screen:mode,image:true,offline:true});
  }
  await dialog.getByRole('button',{name:lang==='en'?'Close':'Isara',exact:true}).click();
  for(const pane of ['Facilitator guide','Evidence']){await page.getByRole('button',{name:pane,exact:true}).click();assert(await page.locator('main').innerText().then(t=>t.length>100),'Pane renders '+pane);if(pane==='Facilitator guide')assert(await page.locator('main h2').count()===12,'All canonical guide sections render');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No pane overflow');records.push({width,language:lang,pane,offline:true});}
 }
 assert(errors.length===0,'Browser errors: '+errors.join(';'));report.status='passed';
}catch(e){report.status='failed';report.failure=e.stack;await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});process.exitCode=1;}
finally{fs.writeFileSync(root+'/docs/lesson-155-browser-verification.json',JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify({status:report.status,cases:records.length,failure:report.failure??null}));
