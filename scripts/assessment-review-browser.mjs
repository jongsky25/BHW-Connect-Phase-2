// Render the actual server page with fictional RPC results; no database calls.
import {chromium, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {createServer} from 'vite';
import {resolve, join} from 'node:path';
const root = resolve(import.meta.dirname, '..');
const fixture = join(root, 'scripts/tests/fixtures/assessment-review-browser');
const server = await createServer({configFile:false,envFile:false,root:fixture,
  resolve:{alias:[
    ...['@/lib/supabase/server','@/lib/auth/viewer','next-intl/server','next/navigation'].map(find=>({find,replacement:join(fixture,'stubs.ts')})),
    {find:'next/link',replacement:join(root,'scripts/tests/fixtures/assessment-readability-browser/link.tsx')},
    {find:'next/image',replacement:join(root,'scripts/tests/fixtures/training-connection-browser/image.tsx')},
    {find:/^@\//,replacement:`${root}/src/`}]},esbuild:{jsx:'automatic'},
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
    await expect(page.getByText(locale==='en'?'Why your choice was incorrect:':'Bakit mali ang iyong pinili:')).toBeVisible();
    await page.getByText(locale==='en'?'Read the Reference Manual':'Basahin ang Reference Manual',{exact:true}).click();
    await expect(page.getByText(/Printed pages|Pahina sa aklat/).first()).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  }
  expect(errors).toEqual([]);
  console.log('PASS: saved assessment review and expanded manual at 320px/200% text, both languages/themes, WCAG A/AA. No database calls.');
} finally {await browser?.close();await server.close();}
