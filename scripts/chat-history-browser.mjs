// Actual ChatGuide + ChatHistory and app CSS; loopback HTTP only, no Supabase.
import fs from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {chromium, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = join(root, 'scripts/tests/fixtures/chat-history-browser');
const sessions = Array.from({length: 21}, (_, i) => ({id: String(i),last_message_at: '2026-10-25T10:00:00Z',chat_messages: [{text: `Saved question ${i} ` + (i === 0 ? 'longword'.repeat(35) : ''),sender: 'user'}]}));
const messages = Array.from({length: 52}, (_, i) => ({id: String(i),sender: i % 2 === 0 ? 'user' : 'system',text: i === 0 ? '[bp measurement]' : i === 1 ? 'measurement:bp:result' : i === 3 ? 'did_you_mean' : i === 5 ? 'no_answer' : `Original stored text ${i}`,kind: 'answer',route: 'direct'}));
let failNext = false, empty = false, posts = 0, reads = 0;
const server = await createServer({configFile: false,root: fixture,
  plugins: [{name:'local-chat-history',configureServer(server) {server.middlewares.use('/api/chat', (req,res) => {
    res.setHeader('Content-Type','application/json'); res.setHeader('Cache-Control','private, no-store');
    if (req.method === 'POST') {
      posts++; res.end(JSON.stringify({type:'answer',session_id:'current',message_id:'current-answer',is_first_answer:false,
        answer:{id:'entry',question_en:'Current question',question_fil:'Kasalukuyang tanong',answer_en:'Current answer remains here.',answer_fil:'Nananatili rito ang kasalukuyang sagot.'},related:[]}));return;
    }
    reads++; if (failNext) {failNext = false;res.statusCode=500;res.end('{}');return;}
    const params = new URL(req.url,'http://localhost').searchParams;
    const page = Number(params.get('page') || 0), isTranscript = params.has('session');
    const size = isTranscript ? 50 : 20, items = empty ? [] : isTranscript ? messages : sessions;
    res.end(JSON.stringify({items:items.slice(page*size,(page+1)*size),nextPage:items.length>(page+1)*size?page+1:null}));
  });}}],
  resolve: {alias:[{find:'@/lib/supabase/client',replacement:join(fixture,'client.ts')},{find:'next/link',replacement:join(root,'scripts/tests/fixtures/assessment-readability-browser/link.tsx')},{find:/^@\//,replacement:join(root,'src')+'/'}]},
  esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:0},logLevel:'error'});
let browser, cases=0;
try {
  await server.listen();browser=await chromium.launch({args:['--no-sandbox'],executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined});
  for (const lang of ['en','fil']) for (const theme of ['light','dark']) {
    const context=await browser.newContext({viewport:{width:320,height:844}}), page=await context.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(e.message)); failNext=false;empty=false;posts=0;reads=0;
    const name=(en,fil)=>lang==='en'?en:fil;
    const url=`${server.resolvedUrls.local[0]}?lang=${lang}&theme=${theme}`;
    await page.goto(url);
    const input=page.getByLabel(name('Your question','Ang iyong tanong'));
    await input.fill('Current question');await page.getByRole('button',{name:name('Send','Ipadala'),exact:true}).click();
    await expect(page.getByText(name('Current answer remains here.','Nananatili rito ang kasalukuyang sagot.'))).toBeVisible();
    await input.fill('Unsent question stays here');
    const toggle=page.getByRole('button',{name:name('My chat history','Mga nakaraan kong usapan')});
    await toggle.click(); await expect(page.getByRole('list',{name:name('Your saved conversations','Mga naka-save mong usapan')}).getByRole('listitem')).toHaveCount(20);
    await expect(page.getByRole('button',{name:/Saved question 0 /})).toBeVisible();
    failNext=true;await page.getByRole('button',{name:name('Load more','Magpakita pa')}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByRole('button',{name:name('Retry history','Subukang buksan muli')}).click();
    await expect(page.getByRole('button',{name:/Saved question 20 /})).toBeVisible();
    await page.getByRole('button',{name:/Saved question 0 /}).click();
    const transcript=page.getByRole('list',{name:name('Saved conversation','Naka-save na usapan')});
    await expect(transcript.getByRole('listitem')).toHaveCount(50);
    await expect(transcript).not.toContainText('measurement:');await expect(transcript).not.toContainText('did_you_mean');
    await expect(transcript).toContainText(name('Measurement details were not saved.','Hindi itinabi ang mga detalye ng pagsukat.'));
    await page.getByRole('button',{name:name('Load more','Magpakita pa')}).click();
    await expect(transcript.getByRole('listitem')).toHaveCount(52);
    await expect(transcript).toContainText('Original stored text 51');
    await expect(input).toHaveValue('Unsent question stays here');expect(posts).toBe(1);
    expect((await new AxeBuilder({page}).include('main').analyze()).violations).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    const directory=process.env.CHAT_HISTORY_SCREENSHOTS;
    if(directory) {await toggle.scrollIntoViewIfNeeded();fs.mkdirSync(directory,{recursive:true});await page.screenshot({path:join(directory,`chat-history-${lang}-${theme}.png`)});}
    await toggle.click();expect(await transcript.count()).toBe(0);
    await expect(page.getByText(name('Current answer remains here.','Nananatili rito ang kasalukuyang sagot.'))).toBeVisible();
    // Fresh reload deliberately returns to live chat; opening history reads
    // the server again, without a localStorage transcript or auto re-ask.
    await page.reload();await expect(input).toHaveValue('');await toggle.click();
    await page.getByRole('button',{name:/Saved question 0 /}).click();await expect(transcript.getByRole('listitem')).toHaveCount(50);
    expect(posts).toBe(1);expect(reads).toBeGreaterThan(5);cases++;
    await page.getByRole('button',{name:name('Back to conversations','Bumalik sa mga usapan')}).click();
    await expect(page.getByRole('button',{name:/Saved question 0 /})).toBeVisible();
    await toggle.click();empty=true;await toggle.click();
    await expect(page.getByText(name('No saved conversations yet.','Wala pang naka-save na usapan.'))).toBeVisible();
    expect(errors).toEqual([]);cases++;await context.close();
  }
  console.log(`Chat history browser verification passed: ${cases}`);
} finally {await browser?.close();await server.close();}
