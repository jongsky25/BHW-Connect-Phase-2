// Printable bilingual cards and a separate one-page safe-demonstration aid; fictional only.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {chromium} from '@playwright/test';
const root=path.resolve(import.meta.dirname,'..'),out=root+'/.preview/lesson184-deliverables';fs.mkdirSync(out,{recursive:true});
const require=createRequire(import.meta.url),{ensureBrowser}=require(root+'/remotion/node_modules/@remotion/renderer');
const status=process.env.PLAYWRIGHT_EXECUTABLE_PATH?{path:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:await ensureBrowser(),browser=await chromium.launch({executablePath:status.path,args:['--no-sandbox']});
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
try{for(const lang of ['fil','en']){
 const md=fs.readFileSync(root+`/docs/lesson-184-practice-kit.${lang}.md`,'utf8');const sections=md.split(/^## /m).slice(1);
 const html=`<!doctype html><html lang="${lang}"><meta charset="utf-8"><title>Apple safe-demonstration kit</title><style>@page{size:A4;margin:18mm}body{font:16px/1.6 Arial;color:#183e3b}section{break-after:page}section:last-child{break-after:auto}h1{font-size:25px}h2{font-size:21px}.body{white-space:pre-wrap}footer{margin-top:32px;font-size:12px}</style>`+sections.map((s,i)=>`<section><h1>1.8.4 · Apple</h1><h2>${escape(s.split('\n')[0])}</h2><div class="body">${escape(s.split('\n').slice(1).join('\n').trim())}</div><footer>${lang==='en'?'Fictional rehearsal only. No real resident record.':'Kathang-isip na pagsasanay lamang. Walang tunay na rekord.'} · ${i+1}/5</footer></section>`).join('');
 fs.writeFileSync(out+`/lesson-184-print-kit.${lang}.html`,html);const page=await browser.newPage();await page.setContent(html);await page.pdf({path:out+`/lesson-184-print-kit.${lang}.pdf`,format:'A4',printBackground:true});await page.close();
 let index=0;const aidHtml=html.replace(/<section>[\s\S]*?<\/section>/g,section=>++index===5?section.replace('5/5','1/1'):'');
 fs.writeFileSync(out+`/lesson-184-exposure-aid.${lang}.html`,aidHtml);const aidPage=await browser.newPage();await aidPage.setContent(aidHtml);await aidPage.pdf({path:out+`/lesson-184-exposure-aid.${lang}.pdf`,format:'A4',printBackground:true});await aidPage.close();
}}finally{await browser.close();}
