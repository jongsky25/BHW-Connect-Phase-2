// Local browser regression for story playback → questions → completion.
// Uses actual Chapter 1 content and a short generated video; progress saves are
// simulated. Requires ffmpeg and Chromium (or PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH).
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/postcss';
import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {parseReferenceRead} from './lib/reference-content.mjs';
const root=path.resolve(import.meta.dirname,'..'), dir=path.join(root,'.preview/story-handoff');
fs.mkdirSync(dir,{recursive:true});
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=black:s=160x90:d=0.3','-c:v','libx264','-pix_fmt','yuv420p','-an','-y',path.join(dir,'short.mp4')]);
const leaves=['01-tungkulin-ng-bhw/lessons/bhw-roles-hepo','09-sustainable-practices/lessons/resources-audit'];
const lessons=leaves.map((leaf,i)=>{
 const base=path.join(root,'content/training/day1-basic-competencies/modules',leaf);
 const read=name=>fs.readFileSync(path.join(base,name),'utf8');
 const a=JSON.parse(read('lesson.json')),fil=parseReferenceRead(read('read.fil.md')),en=parseReferenceRead(read('read.en.md'));
 return {...a.manifest,id:`lesson-${i}`,module_id:'module',revision:{...a,id:`revision-${i}`,read_sections:a.sections.map((s,j)=>({...s,heading_fil:fil[j].heading,body_fil:fil[j].body,heading_en:en[j].heading,body_en:en[j].body})),slides:JSON.parse(read('slides.json'))}};
});
fs.writeFileSync(path.join(dir,'fixture.json'),JSON.stringify(lessons));
fs.writeFileSync(path.join(dir,'adapters.tsx'),`import React from 'react';export const useRouter=()=>({push:(url)=>{location.href=url}});export default function Link({href,children,prefetch,...props}){return <a href={href} {...props}>{children}</a>}`);
fs.writeFileSync(path.join(dir,'image.tsx'),`import React from 'react';export default function Image({fill,priority,sizes,...props}){return <img {...props} style={fill?{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}:undefined}/>} `);
fs.writeFileSync(path.join(dir,'entry.tsx'),`import React from 'react';import {createRoot} from 'react-dom/client';import {ReferenceLessons} from '@/components/elearning/reference-lessons';import lessons from './fixture.json';import '@/app/globals.css';const q=new URLSearchParams(location.search),lesson=lessons[Number(q.get('lesson')||0)];window.saves=0;createRoot(document.getElementById('root')).render(<main style={{maxWidth:1050,margin:'auto',padding:16}}><h1>Chapter 1 story handoff</h1><ReferenceLessons title_fil="Manual" title_en="Manual" chapters={[]} modules={[]} lessons={[lesson]} completed={[]} resumes={[]} locale="en" initialLessonId={lesson.id} initialMode={q.get('mode')==='slides'?'slides':'read'} lessonBaseHref="/lessons" nextLessonHref="/next-lesson" storyQuestionHandoff onResume={async()=>{}} onComplete={async()=>{window.saves++}}/></main>);`);
fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Story handoff check</title></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>');
const server=await createServer({configFile:false,root:dir,publicDir:path.join(root,'public'),plugins:[react()],resolve:{alias:{'@':path.join(root,'src'),'next/navigation':path.join(dir,'adapters.tsx'),'next/link':path.join(dir,'adapters.tsx'),'next/image':path.join(dir,'image.tsx')}},css:{postcss:{plugins:[tailwind()]}},server:{host:'127.0.0.1',port:0},logLevel:'error'});
let browser;
try {
 await server.listen();browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const results=[];
 for(const scenario of [{width:1280,height:900,lesson:0,mode:'read',full:false},{width:390,height:844,lesson:0,mode:'read',full:true},{width:844,height:390,lesson:1,mode:'read',full:true},{width:390,height:844,lesson:1,mode:'slides',full:true}]){
  const context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*.mp4',route=>route.fulfill({path:path.join(dir,'short.mp4'),contentType:'video/mp4'}));
  await page.goto(`${server.resolvedUrls.local[0]}?lesson=${scenario.lesson}&mode=${scenario.mode}`);
  await page.getByRole('button',{name:'Narrated story',exact:true}).click();
  await expect(page.getByRole('button',{name:'Continue to question',exact:true})).toBeVisible();
  if(scenario.full)await page.getByRole('button',{name:'Full screen',exact:true}).click();
  await page.locator('video').evaluate(async video=>{video.muted=true;await video.play()});
  await expect(page.locator('video')).toHaveCount(0);
  const lesson=lessons[scenario.lesson],items=scenario.mode==='read'?lesson.revision.read_sections:lesson.revision.slides;
  const checks=items.filter(p=>p.check);
  for(const [i,item] of checks.entries()){
   await expect(page.getByRole('heading',{name:item.heading_en,exact:true})).toBeVisible();
   try {await expect(page.locator('fieldset')).toBeFocused()} catch(e) {console.log('FOCUS FAILURE',scenario,await page.evaluate(()=>({active:document.activeElement?.outerHTML,fullscreen:document.fullscreenElement?.tagName,dialog:document.querySelector('dialog')?.open,question:document.querySelector('fieldset')?.getBoundingClientRect().toJSON()})));await page.screenshot({path:dir+'/focus-failure.png'});throw e;}
   await page.getByRole('button',{name:item.check.options[0].en,exact:true}).click();
   if(i<checks.length-1)await page.getByRole('button',{name:'Next question',exact:true}).click();
  }
  const end=page.getByRole('button',{name:'Continue to lesson end',exact:true});if(await end.count())await end.click();
  const complete=page.getByRole('button',{name:'Mark lesson complete',exact:true});await expect(complete).toBeEnabled();
  if(scenario.full)await expect(page.locator('dialog').getByRole('button',{name:'Mark lesson complete',exact:true})).toBeVisible();
  await complete.click();await expect(page.getByRole('link',{name:'Next lesson →',exact:true})).toBeVisible();
  if(await page.evaluate(()=>window.saves)!==1)throw Error('Expected one completion save');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('Horizontal overflow');
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();if(axe.violations.length)throw Error(JSON.stringify(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))));
  if(errors.length)throw Error(errors.join('\n'));
  await page.screenshot({path:path.join(dir,`result-${results.length}.png`)});
  results.push({...scenario,checks:checks.length,saveCount:1,consoleErrors:0,axeViolations:0});await context.close();
 }
 console.log(JSON.stringify(results,null,2));fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(results,null,2));
}finally{await browser?.close();await server.close()}
