// Actual unchanged UHC teaching + shared ManualLesson reader and application CSS.
// Loopback persistence is disposable; never calls Supabase or a remote service.
import fs from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {parseReferenceRead,loadReferenceModule,contentHash} from './lib/reference-content.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),fixture=join(root,'scripts/tests/fixtures/lesson-outline-browser');
const dir=join(root,'content/training/day1-basic-competencies/modules/02-uhc-act/lessons/uhc-coverage');
const read=name=>fs.readFileSync(join(dir,name),'utf8'),authored=JSON.parse(read('lesson.json'));
const en=parseReferenceRead(read('read.en.md')),fil=parseReferenceRead(read('read.fil.md'));
const lesson={...authored.manifest,id:'lesson',module_id:'module',revision:{...authored,id:'revision',read_sections:authored.sections.map((s,i)=>({...s,heading_en:en[i].heading,body_en:en[i].body,heading_fil:fil[i].heading,body_fil:fil[i].body})),slides:JSON.parse(read('slides.json'))}};
const audit=JSON.parse(fs.readFileSync(join(root,'docs/feedback-remediation/fb-5.2c-reading-audit.json')));
expect(lesson.revision.read_sections.map(s=>({id:s.id,heading_en:s.heading_en,heading_fil:s.heading_fil}))).toEqual(audit.read_sections.map(({id,heading_en,heading_fil})=>({id,heading_en,heading_fil})));
const source=loadReferenceModule(join(dir,'../..'),join(root,'public')).lessons.find(l=>l.manifest.lesson_key==='uhc-coverage');
expect(contentHash(source)).toBe(audit.content_hash);
const states=new Map();
const server=await createServer({configFile:false,root:fixture,publicDir:join(root,'public'),
 plugins:[{name:'local-outline-persistence',configureServer(server){server.middlewares.use('/fixture',async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),state=states.get(url.searchParams.get('case'));
  if(!state){res.statusCode=404;res.end();return;}
  res.setHeader('Content-Type','application/json');
  if(url.pathname==='/data'){res.end(JSON.stringify({title_en:'Manual',title_fil:'Manwal',chapters:[],lessons:[lesson],completed:state.completed,resumes:state.resumes}));return;}
  let raw='';for await(const part of req)raw+=part;
  const {name,args}=JSON.parse(raw);state.calls.push({name,args});
  if(name.endsWith('_resume'))state.resumes=[{lesson_id:args.p_lesson_id,revision_id:args.p_revision_id,modality:args.p_modality,language:args.p_language,position_key:args.p_position_key,concept_id:args.p_concept_id,updated_at:new Date().toISOString(),course_progress_id:'fixture'}];
  if(name.endsWith('_complete'))state.completed=[{course_progress_id:'fixture',lesson_id:'lesson',revision_id:'revision',completed_at:new Date().toISOString(),completion_basis:'learner'}];
  res.end(JSON.stringify({data:null,error:null}));
 });}}],resolve:{alias:[
  {find:'@/lib/supabase/client',replacement:join(fixture,'client.ts')},
  {find:'next/navigation',replacement:join(root,'scripts/tests/fixtures/training-connection-browser/navigation.ts')},
  {find:'next/image',replacement:join(root,'scripts/tests/fixtures/training-connection-browser/image.tsx')},
  {find:'next/link',replacement:join(root,'scripts/tests/fixtures/assessment-readability-browser/link.tsx')},
  {find:/^@\//,replacement:join(root,'src')+'/'},
 ]},esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:0},logLevel:'error'});
let browser,cases=0;
async function screenshot(page,name){if(process.env.LESSON_OUTLINE_SCREENSHOTS){fs.mkdirSync(process.env.LESSON_OUTLINE_SCREENSHOTS,{recursive:true});await page.screenshot({path:join(process.env.LESSON_OUTLINE_SCREENSHOTS,name+'.png')});}}
try{
 await server.listen();browser=await chromium.launch({args:['--no-sandbox'],executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 for(const lang of ['en','fil'])for(const theme of ['light','dark'])for(const role of ['bhw','assessor']){
  const key=`${lang}-${theme}-${role}`,state={calls:[],resumes:[],completed:[]};states.set(key,state);
  const context=await browser.newContext({viewport:{width:320,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));const name=(eng,fil)=>lang==='en'?eng:fil;
  await page.goto(`${server.resolvedUrls.local[0]}?case=${key}&lang=${lang}&theme=${theme}&role=${role}`);
  const outline=()=>page.getByText(new RegExp('^'+name('Sections in this lesson','Mga bahagi ng araling ito')+' ·'));
  const open=async()=>{await outline().click();return page.getByRole('navigation',{name:name('Sections in this lesson','Mga bahagi ng araling ito')});};
  await outline().focus();await page.keyboard.press('Enter');
  let nav=page.getByRole('navigation',{name:name('Sections in this lesson','Mga bahagi ng araling ito')});
  await expect(nav.getByRole('button')).toHaveCount(6);expect(state.calls).toHaveLength(0);
  const backgrounds=await nav.getByRole('button').evaluateAll(buttons=>buttons.slice(0,2).map(b=>getComputedStyle(b).backgroundColor));
  expect(backgrounds[0]).not.toBe(backgrounds[1]);
  expect((await new AxeBuilder({page}).include('main').analyze()).violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await outline().scrollIntoViewIfNeeded();await screenshot(page,`outline-${key}`);
  const target=lesson.revision.read_sections[3],heading=lang==='en'?target.heading_en:target.heading_fil;
  await nav.getByRole('button',{name:heading,exact:true}).click();
  await expect(page.getByRole('heading',{name:heading,exact:true})).toBeFocused();
  await expect(outline()).toHaveText(/4 \/ 6$/);
  await expect.poll(()=>state.resumes[0]?.position_key).toBe('benefit');
  expect(state.calls[0].name).toBe(role==='assessor'?'rpc_assessor_lesson_resume':'rpc_course_lesson_resume');
  if(role==='assessor')expect(state.calls[0].args.p_chapter_id).toBe('chapter');
  await page.reload();await expect(outline()).toHaveText(/4 \/ 6$/);
  await page.getByRole('button',{name:'Slides',exact:true}).click();
  await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();
  nav=await open();const last=lesson.revision.slides.at(-1),lastHeading=lang==='en'?last.heading_en:last.heading_fil;
  await nav.getByRole('button',{name:new RegExp(lastHeading)}).click();
  const complete=page.getByRole('button',{name:name('Mark lesson complete','Markahang tapos ang aralin'),exact:true});
  await expect(complete).toBeDisabled();expect(state.completed).toHaveLength(0);
  const summary=lang==='en'?last.display_en:last.display_fil;
  await expect(page.getByText(summary,{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:lang==='en'?last.check.options[0].en:last.check.options[0].fil,exact:true}).click();
  await expect(complete).toBeEnabled();await complete.click();
  await expect.poll(()=>state.completed.length).toBe(1);
  expect(state.calls.at(-1).name).toBe(role==='assessor'?'rpc_assessor_lesson_complete':'rpc_course_lesson_complete');
  expect(state.calls.every(c=>c.name.startsWith(role==='assessor'?'rpc_assessor_':'rpc_course_'))).toBe(true);
  // The full-screen reader retains its existing pager and content; the new
  // inline outline isn't duplicated inside the fitted/story presentation.
  await page.getByRole('button',{name:name('Full screen','Buong screen'),exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading',{name:lastHeading,exact:true})).toBeVisible();
  await expect(dialog.getByRole('navigation',{name:name('Sections in this lesson','Mga bahagi ng araling ito')})).toHaveCount(0);
  await dialog.getByRole('button',{name:name('Close','Isara'),exact:true}).click();
  expect(errors).toEqual([]);cases++;await context.close();
 }
 console.log(`Lesson section outline verification passed: ${cases}`);
}finally{await browser?.close();await server.close();}
