import {chromium, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {createServer} from 'vite';
import {resolve, join} from 'node:path';
const root = resolve(import.meta.dirname, '..');
const fixture = join(root, 'scripts/tests/fixtures/simulation-guidance');
const server = await createServer({configFile:false, envFile:false, root:fixture,
  resolve:{alias:[{find:'@/lib/supabase/client',replacement:join(fixture,'client.ts')},
    {find:'next/link',replacement:join(root,'scripts/tests/fixtures/assessment-readability-browser/link.tsx')},
    {find:/^@\//,replacement:`${root}/src/`}]}, esbuild:{jsx:'automatic'},
  server:{host:'127.0.0.1',port:0},logLevel:'error'});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({headless:true,args:['--no-sandbox'],executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
  const context = await browser.newContext({viewport:{width:320,height:800}});
  const page = await context.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  for (const locale of ['en','fil']) for (const theme of ['light','dark']) for (const next of [1,3,11]) {
    await page.goto(`${server.resolvedUrls.local[0]}?locale=${locale}&theme=${theme}&next=${next}&large`);
    await expect(page.getByRole('heading',{name:locale==='en'?'Where you are and what to do next':'Nasaan ka na at ano ang susunod'})).toBeVisible();
    const overflow=await page.evaluate(()=>[...document.querySelectorAll('article *')].filter(e=>e.getBoundingClientRect().right>innerWidth).slice(0,10).map(e=>({tag:e.tagName,text:e.textContent.slice(0,100),width:e.getBoundingClientRect().width})));
    expect(overflow,`${locale}/${theme}/${next}`).toEqual([]);
    const layout=await page.evaluate(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const text=[];while(w.nextNode()){const r=document.createRange();r.selectNodeContents(w.currentNode);if(r.getBoundingClientRect().right>innerWidth)text.push(w.currentNode.textContent.slice(0,120));}return {width:innerWidth,scroll:document.documentElement.scrollWidth,text};});
    expect(layout.scroll,JSON.stringify({locale,theme,next,...layout})).toBeLessThanOrEqual(layout.width);
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
    if(next===3){
      await page.getByRole('textbox').fill('Fictional note');
      await expect(page.getByText(locale==='en'?'Changes not saved. Save before leaving or answering.':'Hindi pa naka-save ang mga pagbabago. I-save bago umalis o sumagot.')).toBeVisible();
      page.once('dialog',dialog=>{expect(dialog.type()).toBe('confirm');return dialog.dismiss();});
      await page.getByRole('link',{name:locale==='en'?'Return to my preparation and current next step':'Bumalik sa aking paghahanda at kasalukuyang susunod na hakbang',exact:true}).click();
      await expect(page.getByRole('textbox')).toHaveValue('Fictional note');
      // Leaving this visual fixture is deliberate; the next iteration starts fresh.
      page.once('dialog',dialog=>{expect(dialog.type()).toBe('beforeunload');return dialog.accept();});
    }
  }
  await page.goto(`${server.resolvedUrls.local[0]}?locale=fil&theme=dark&next=3`);
  await page.locator('#simulation-next-step').evaluate(el=>el.scrollIntoView({block:'start'}));
  if(process.env.SIMULATION_GUIDANCE_SCREENSHOT_PATH)await page.screenshot({path:process.env.SIMULATION_GUIDANCE_SCREENSHOT_PATH});
  expect(errors).toEqual([]);
  console.log('PASS: preparation, evidence and finish guidance in both languages/themes at 320px and 200% text; WCAG A/AA; unsaved note state. No RPCs.');
} finally {await browser?.close();await server.close();}
