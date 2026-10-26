// Actual private-guide component with repository-authored competency text only.
// Auth/data boundaries are covered by route tests and disposable-Supabase E2E.
import fs from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const competency=JSON.parse(fs.readFileSync(join(root,'content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/competency.json'),'utf8'));
const moduleContent=JSON.parse(fs.readFileSync(join(root,'content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/module.json'),'utf8'));
const server=await createServer({configFile:false,root:join(root,'scripts/tests/fixtures/competency-browser'),resolve:{alias:[
 {find:'next/link',replacement:join(root,'scripts/tests/fixtures/assessment-readability-browser/link.tsx')},
 {find:'next/navigation',replacement:join(root,'scripts/tests/fixtures/training-connection-browser/navigation.ts')},
 {find:'@/lib/supabase/client',replacement:join(root,'scripts/tests/fixtures/chat-history-browser/client.ts')},
 {find:/^@\//,replacement:join(root,'src')+'/'},
]},esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:0},logLevel:'error'});
let browser,cases=0;
const metrics=[];
try{
 await server.listen();browser=await chromium.launch({args:['--no-sandbox'],executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 for(const lang of ['en','fil'])for(const theme of ['light','dark']){
  const context=await browser.newContext(),page=await context.newPage(),errors=[],writes=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!['GET','HEAD'].includes(request.method()))writes.push(request.method()+' '+request.url());});
  const text=(en,fil)=>lang==='en'?en:fil;
  for(const [width,scale] of [[320,'normal'],[320,'xl'],[1024,'xl']]){
   await page.setViewportSize({width,height:844});
   await page.goto(`${server.resolvedUrls.local[0]}?lang=${lang}&theme=${theme}&scale=${scale}`);
   const section=page.locator('#guide-competency');await expect(section).toBeVisible();
   await expect(section.getByText(competency[`competency_statement_${lang}`],{exact:true})).toBeVisible();
   const nav=page.getByRole('navigation',{name:text('Jump to an indicator','Pumunta sa indicator')});
   await expect(nav.getByRole('link')).toHaveCount(4);
   await expect(section.locator('details[open]')).toHaveCount(0);
   expect((await new AxeBuilder({page}).include('main').analyze()).violations).toEqual([]);
   const initialHeight=await section.evaluate(n=>n.getBoundingClientRect().height);
   for(const [i,indicator] of competency.observation_indicators.entries()){
    const card=page.locator(`#competency-indicator-${i+1}`),link=nav.getByRole('link',{name:`Indicator ${i+1}`,exact:true});
    expect(await link.evaluate(n=>n.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await link.focus();await link.press('Enter');await expect(card).toBeFocused();
    const clearance=await card.evaluate(n=>({top:n.getBoundingClientRect().top,header:document.querySelector('[data-fixture-header]').getBoundingClientRect().bottom}));
    expect(clearance.top).toBeGreaterThanOrEqual(clearance.header);
    const objective=moduleContent[`objectives_${lang}`][indicator.objective_index];
    for(const value of [objective,indicator[`observable_${lang}`],indicator[`not_yet_${lang}`]])await expect(card.getByText(value,{exact:true})).toBeVisible();
    const summary=card.getByText(text('Compare the three levels','Ihambing ang tatlong antas'),{exact:true});
    expect(await summary.evaluate(n=>n.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await summary.focus();await summary.press('Enter');
    await expect(summary.locator('..')).toHaveJSProperty('open',true);
    for(const key of ['kaya_na','kailangan_practice','hindi_pa'])await expect(card.getByText(indicator.levels[`${key}_${lang}`],{exact:true})).toBeVisible();
    const sizes=await card.locator('p,dt,dd').evaluateAll(nodes=>nodes.map(n=>parseFloat(getComputedStyle(n).fontSize)));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(16);
   }
   expect((await new AxeBuilder({page}).include('main').analyze()).violations).toEqual([]);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
   const allText=await section.textContent();
   // Disclosures must retain full authored wording even while closed.
   for(const indicator of competency.observation_indicators)for(const value of [indicator[`observable_${lang}`],indicator[`not_yet_${lang}`],...Object.entries(indicator.levels).filter(([key])=>key.endsWith('_'+lang)).map(([,v])=>v)])expect(allText).toContain(value);
   metrics.push({lang,theme,width,scale,initialHeight,expandedHeight:await section.evaluate(n=>n.getBoundingClientRect().height)});
   if(process.env.COMPETENCY_SCREENSHOTS&&width===320&&scale==='xl'){
    fs.mkdirSync(process.env.COMPETENCY_SCREENSHOTS,{recursive:true});
    // Hide only the artificial sticky header while capturing a card taller
    // than the viewport; all focus/clearance checks above keep it visible.
    await page.locator('#competency-indicator-1').screenshot({path:join(process.env.COMPETENCY_SCREENSHOTS,`competency-${lang}-${theme}.png`),style:'[data-fixture-header]{visibility:hidden}'});
   }
   cases++;
  }
  await page.setViewportSize({width:320,height:844});
  await page.goto(`${server.resolvedUrls.local[0]}?lang=${lang}&theme=${theme}&scale=xl&empty=yes`);
  await expect(page.getByText(text('No indicators authored for this subchapter yet.','Wala pang indicator para sa subchapter na ito.'))).toBeVisible();
  await expect(page.getByRole('navigation',{name:text('Jump to an indicator','Pumunta sa indicator')})).toHaveCount(0);
  expect((await new AxeBuilder({page}).include('main').analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);expect(writes).toEqual([]);cases++;await context.close();
 }
 console.log(JSON.stringify(metrics));
 console.log(`Competency readability verification passed: ${cases}`);
}finally{await browser?.close();await server.close();}
