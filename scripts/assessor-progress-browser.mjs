// Actual shared guidance components and app CSS; route wiring/auth separately
// checked by route units and the disposable-Supabase preparation E2E.
import fs from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),fixture=join(root,'scripts/tests/fixtures/assessor-progress-browser');
const server=await createServer({configFile:false,root:fixture,resolve:{alias:[
 {find:'next/link',replacement:join(root,'scripts/tests/fixtures/assessment-readability-browser/link.tsx')},
 {find:'next/navigation',replacement:join(root,'scripts/tests/fixtures/training-connection-browser/navigation.ts')},
 {find:'@/lib/supabase/client',replacement:join(root,'scripts/tests/fixtures/chat-history-browser/client.ts')},
 {find:/^@\//,replacement:join(root,'src')+'/'},
]},esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:0},logLevel:'error'});
let browser,cases=0;
try{
 await server.listen();browser=await chromium.launch({args:['--no-sandbox'],executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 for(const lang of ['en','fil'])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width:320,height:844}}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))requests.push(r.method()+' '+r.url());});
  const name=(eng,fil)=>lang==='en'?eng:fil;
  const open=state=>page.goto(`${server.resolvedUrls.local[0]}?lang=${lang}&theme=${theme}&state=${state}`);
  await open('complete_chapter-2');
  const action=page.getByRole('link',{name:name('Open Chapter 2 study progress','Buksan ang progreso sa pag-aaral sa Kabanata 2')});
  await expect(action).toHaveAttribute('href','/training/manual/assessor/chapter-2#assessor-study-progress');
  const nav=page.getByRole('navigation',{name:name('Study progress by chapter','Progreso sa pag-aaral ayon sa kabanata')});
  await expect(nav.getByRole('link')).toHaveCount(2);
  const links=await nav.getByRole('link').evaluateAll(nodes=>nodes.map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})));
  expect(links.every(b=>b.h>=44&&b.w<=288)).toBe(true);
  await action.focus();await expect(action).toBeFocused();
  expect((await new AxeBuilder({page}).include('main').analyze()).violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  if(process.env.ASSESSOR_PROGRESS_SCREENSHOTS){fs.mkdirSync(process.env.ASSESSOR_PROGRESS_SCREENSHOTS,{recursive:true});await page.screenshot({path:join(process.env.ASSESSOR_PROGRESS_SCREENSHOTS,`progress-${lang}-${theme}.png`)});}
  cases++;
  await open('review_chapter-1');
  await page.getByRole('link',{name:name('Review Chapter 1 record below','Suriin ang tala sa Kabanata 1 sa ibaba')}).click();
  await expect(page.locator('#chapter-1')).toBeFocused();
  const clearance=await page.evaluate(()=>({target:document.getElementById('chapter-1').getBoundingClientRect().top,header:document.querySelector('[data-fixture-header]').getBoundingClientRect().bottom}));
  expect(clearance.target).toBeGreaterThanOrEqual(clearance.header);cases++;
  await open('complete_chapter-3');
  await expect(page.getByRole('link',{name:name('Review Chapter 3 record below','Suriin ang tala sa Kabanata 3 sa ibaba')})).toHaveAttribute('href','#chapter-3');
  await expect(page.locator('a[href*="/assessor/chapter-3"]')).toHaveCount(0);cases++;
  await open('error');
  await expect(page.getByRole('link',{name:name('Reload status','Basahin muli ang katayuan')})).toHaveAttribute('href','/training/manual/assessor/qualifications');
  await expect(page.getByRole('navigation',{name:name('Study progress by chapter','Progreso sa pag-aaral ayon sa kabanata')})).toHaveCount(0);
  expect((await new AxeBuilder({page}).include('main').analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);expect(requests).toEqual([]);cases++;await context.close();
 }
 console.log(`Assessor progress guidance verification passed: ${cases}`);
}finally{await browser?.close();await server.close();}
