/* eslint-disable @typescript-eslint/no-require-imports -- Optional QA dependencies resolve from caller-provided package paths in this standalone CommonJS runner. */
// Set PLAYWRIGHT_MODULE to an installed Playwright package if not available locally.
// AXE_MODULE optionally points to @axe-core/playwright. Never uses application credentials.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
(async()=>{
  const {lessons}=await import('./content.mjs');
  const out=process.env.QA_OUTPUT||path.join(__dirname,'qa');await fs.mkdir(out,{recursive:true});
  const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];const external=[];const violations=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173'))external.push(r.url());});
  let count=0;let axeCount=0;
  const url='http://127.0.0.1:4173';await page.goto(url);
  async function state(l,s,mode='slides',language='fil'){
    await page.evaluate(v=>localStorage.setItem('bhw-reference-1-1-review-v1',JSON.stringify(v)),{lesson:l.id,sectionId:s,mode,language});await page.reload();
  }
  for(const width of [1440,360]){
    await page.setViewportSize({width,height:1000});
    for(const language of ['fil','en'])for(const l of lessons)for(const mode of ['slides','read'])for(const s of [...l.sections.map(x=>x.id),'check']){
      await state(l,s,mode,language);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
      assert.equal(overflow,false,`${width}/${language}/${l.id}/${mode}/${s}: overflow`);
      assert.equal(await page.locator('#stage h2').count(),1);count++;
    }
  }
  await page.setViewportSize({width:1440,height:1000});
  await state(lessons[2],'liph');
  const heading=await page.locator('#stage h2').textContent();
  await page.locator('#read-mode').click();assert.equal(await page.locator('#stage h2').textContent(),heading);
  await page.locator('#language').selectOption('en');assert.equal(await page.locator('#stage h2').textContent(),'Contribute to wider planning');
  await page.reload();assert.equal(await page.locator('#read-mode').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#page-count').textContent(),'4 / 5 sections');
  await page.locator(`[data-lesson="${lessons[0].id}"]`).click();await page.locator(`[data-lesson="${lessons[2].id}"]`).click();assert.equal(await page.locator('#page-count').textContent(),'4 / 5 sections');
  await state(lessons[0],'check');assert.equal(await page.locator('.feedback').count(),0);assert.equal(await page.locator('#mark-reviewed').isDisabled(),true);
  await page.locator('[data-answer="0"]').click();assert.match(await page.locator('.feedback').textContent(),/Balikan/);
  await page.locator('[data-answer="1"]').click();assert.match(await page.locator('.feedback').textContent(),/Tama/);
  await page.locator('#mark-reviewed').click();await page.locator('#read-mode').click();await page.reload();assert.match(await page.locator('#completion').textContent(),/Nasuri/);
  await page.keyboard.press('Tab');assert.notEqual(await page.evaluate(()=>document.activeElement.tagName),'BODY');
  const shots=[['A01',0,'morning'],['A02',0,'hepo'],['A03',1,'life-stages'],['A04',2,'liph'],['A05',3,'boundaries'],['A06',4,'list-registry'],['A07',5,'handover']];
  for(const [name,i,s] of shots){
    for(const width of [1440,360]){
      await page.setViewportSize({width,height:1000});await state(lessons[i],s);
      await page.screenshot({path:path.join(out,`${name}-${width}.png`),fullPage:true});
      if(process.env.AXE_MODULE){const {default:AxeBuilder}=require(process.env.AXE_MODULE);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();axeCount++;violations.push(...result.violations.map(v=>({name,width,id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})));}
    }
  }
  await page.setViewportSize({width:360,height:1000});await state(lessons[4],'household-profile','read');await page.screenshot({path:path.join(out,'read-360.png'),fullPage:true});
  await page.locator('svg').evaluateAll(nodes=>nodes.forEach(node=>node.remove()));assert.match(await page.locator('#stage').textContent(),/HH-014/);
  // Corrupt and unavailable storage both degrade to a usable preview.
  await page.evaluate(()=>localStorage.setItem('bhw-reference-1-1-review-v1','bad-json'));await page.reload();assert.match(await page.locator('#lesson-number').textContent(),/1.1.1/);
  const blocked=await context.newPage();await blocked.addInitScript(()=>{Storage.prototype.setItem=function(){throw new Error('disabled')};Storage.prototype.getItem=function(){throw new Error('disabled')};});await blocked.goto(url);assert.match(await blocked.locator('#preview-note').textContent(),/Hindi available/);await blocked.close();
  // Enlarged text and mobile outline retain access to the unavailable chapters.
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('.mobile-outline').click();assert.equal(await page.locator('aside .chapter').last().isVisible(),true);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  const report={screenChecks:count,viewports:[1440,360],languages:['fil','en'],modes:['read','slides'],axeScans:axeCount,violations,consoleErrors:errors,externalRequests:external,behavior:'mode/language/reload/independent lesson resume, feedback, review marks, keyboard focus, missing SVG, malformed/blocked storage, 200% text, mobile outline'};
  await fs.writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();assert.deepEqual(violations,[]);
})().catch(e=>{console.error(e);process.exit(1)});
