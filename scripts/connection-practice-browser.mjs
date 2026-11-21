// Render monitoring components with fictional data; no database calls.
import {chromium, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {createServer} from 'vite';
import {resolve, join} from 'node:path';
const root = resolve(import.meta.dirname, '..');
const fixture = join(root, 'scripts/tests/fixtures/connection-practice-browser');
const server = await createServer({configFile:false,envFile:false,root:fixture,
  resolve:{alias:[{find:'next/link',replacement:join(root,'scripts/tests/fixtures/assessment-readability-browser/link.tsx')}]},
  esbuild:{jsx:'automatic'},
  server:{host:'127.0.0.1',port:0},logLevel:'error'});
let browser;
try {
  await server.listen();
  browser=await chromium.launch({headless:true,args:['--no-sandbox'],executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
  const context=await browser.newContext({viewport:{width:320,height:800}});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const locale of ['en','fil']) for(const theme of ['light','dark']) {
    await page.goto(`${server.resolvedUrls.local[0]}?locale=${locale}&theme=${theme}`);
    await page.getByText(locale==='en'?'Guided practice: navigation, review and connection recovery':'Gabay sa pagsasanay: pag-navigate, pagsuri at pagbawi ng koneksyon',{exact:true}).click();
    await page.getByText(locale==='en'?'Check the expected interpretation':'Tingnan ang inaasahang pag-unawa',{exact:true}).click();
    await expect(page.getByText(locale==='en'?/The page counts reconcile to 3/:/Tugma sa 3 ang bilang sa pahina/)).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  }
  expect(errors).toEqual([]);
  console.log('PASS: assessor connection practice at 320px/200% text, both languages/themes, WCAG A/AA. No database calls.');
} finally {await browser?.close();await server.close();}
