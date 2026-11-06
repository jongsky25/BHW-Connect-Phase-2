import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const server=await createServer({configFile:false,root:join(root,'scripts/tests/fixtures/assessor-home-browser'),resolve:{alias:[
 {find:'next/link',replacement:join(root,'scripts/tests/fixtures/assessment-readability-browser/link.tsx')},
 {find:/^@\//,replacement:join(root,'src')+'/'},
]},esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:0},logLevel:'error'});
let browser;
try {
 await server.listen();browser=await chromium.launch({args:['--no-sandbox'],executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 for(const lang of ['en','fil'])for(const theme of ['light','dark'])for(const state of ['partial','complete']) {
  const context=await browser.newContext({viewport:{width:320,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}?lang=${lang}&theme=${theme}&state=${state}`);
  await expect(page.getByRole('progressbar').first()).toHaveAttribute('aria-valuenow',state==='complete'?'100':'2');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  expect((await new AxeBuilder({page}).include('main').analyze()).violations).toEqual([]);
  const links=page.getByRole('link');
  expect((await links.evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height))).every(h=>h>=44)).toBe(true);
  await links.first().focus();await expect(links.first()).toBeFocused();
  expect(errors).toEqual([]);
  if(lang==='fil'&&theme==='light'&&state==='partial')await page.screenshot({path:'/tmp/assessor-home-mobile.png',fullPage:true});
  await context.close();
 }
 console.log('Assessor home: 8 phone/XL-font/language/theme/state checks passed, including axe and keyboard focus.');
} finally {await browser?.close();await server.close();}
