// Actual guide components/app CSS. Auth and real navigation are checked by
// route tests and the disposable-Supabase preparation E2E.
import fs from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const server=await createServer({configFile:false,root:join(root,'scripts/tests/fixtures/group-learning-browser'),resolve:{alias:[
 {find:'next/link',replacement:join(root,'scripts/tests/fixtures/assessment-readability-browser/link.tsx')},
 {find:'next/navigation',replacement:join(root,'scripts/tests/fixtures/training-connection-browser/navigation.ts')},
 {find:'@/lib/supabase/client',replacement:join(root,'scripts/tests/fixtures/chat-history-browser/client.ts')},
 {find:/^@\//,replacement:join(root,'src')+'/'},
]},esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:0},logLevel:'error'});
let browser,cases=0;
try{
 await server.listen();browser=await chromium.launch({args:['--no-sandbox'],executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 for(const lang of ['en','fil'])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width:320,height:844}}),page=await context.newPage(),errors=[],writes=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!['GET','HEAD'].includes(request.method()))writes.push(request.method()+' '+request.url());});
  const text=(en,fil)=>lang==='en'?en:fil;
  await page.goto(`${server.resolvedUrls.local[0]}?lang=${lang}&theme=${theme}`);
  const group=page.getByRole('navigation',{name:text('Group learning guides','Mga gabay sa pag-aaral ng pangkat')});
  await expect(group.getByRole('link').nth(0)).toHaveAttribute('href','/training/manual/chapter-1/module/lesson-1');
  await expect(group.getByRole('link').nth(1)).toHaveAttribute('href','/training/manual/chapter-1/module?view=run');
  const nav=page.getByRole('navigation',{name:text('Discussion, practice and follow-up','Talakayan, pagsasanay at follow-up')});
  await expect(page.locator('#lesson-guide-practice')).toHaveJSProperty('open',false);
  for(const id of ['opening','steps','expected-answers','practice','support']){
   const link=nav.locator(`a[href="#lesson-guide-${id}-content"]`);
   await link.focus();await page.keyboard.press('Enter');
   const target=page.locator(`#lesson-guide-${id}-content`);
   await expect(target).toBeVisible();await expect(target).toBeFocused();
   await expect(page.locator(`#lesson-guide-${id}`)).toHaveJSProperty('open',true);
   const clearance=await target.evaluate(node=>({top:node.getBoundingClientRect().top,header:document.querySelector('[data-fixture-header]').getBoundingClientRect().bottom}));
   expect(clearance.top).toBeGreaterThanOrEqual(clearance.header);
  }
  const targets=await page.locator('nav a').evaluateAll(nodes=>nodes.map(node=>({w:node.getBoundingClientRect().width,h:node.getBoundingClientRect().height})));
  expect(targets.every(target=>target.h>=44&&target.w<=288)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  expect((await new AxeBuilder({page}).include('main').analyze()).violations).toEqual([]);
  if(process.env.GROUP_LEARNING_SCREENSHOTS){fs.mkdirSync(process.env.GROUP_LEARNING_SCREENSHOTS,{recursive:true});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:join(process.env.GROUP_LEARNING_SCREENSHOTS,`group-learning-${lang}-${theme}.png`),fullPage:true});}
  cases++;
  await page.goto(`${server.resolvedUrls.local[0]}?lang=${lang}&theme=${theme}&view=run`);
  const lessons=page.getByRole('navigation',{name:text('Lesson facilitation guides','Mga gabay ng facilitator sa bawat aralin')});
  await expect(lessons.getByRole('link')).toHaveCount(2);
  await expect(lessons.getByRole('link').first()).toHaveAttribute('href','/training/manual/chapter-1/module/lesson-1');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  expect((await new AxeBuilder({page}).include('main').analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);expect(writes).toEqual([]);cases++;await context.close();
 }
 console.log(`Group learning guide verification passed: ${cases}`);
}finally{await browser?.close();await server.close();}
