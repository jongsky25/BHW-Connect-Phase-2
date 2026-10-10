// Printable bilingual cards and a separate one-page listening aid; fictional only.
import fs from 'node:fs';import path from 'node:path';import {chromium} from '@playwright/test';
const root=path.resolve(import.meta.dirname,'..'),out=root+'/.preview/lesson183-deliverables';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.LESSON_REVIEW_BROWSER??'/usr/bin/chromium',args:['--no-sandbox']});
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
try{for(const lang of ['fil','en']){
 const md=fs.readFileSync(root+`/docs/lesson-183-practice-kit.${lang}.md`,'utf8');const sections=md.split(/^## /m).slice(1);
 const html=`<!doctype html><html lang="${lang}"><meta charset="utf-8"><title>Apple readiness kit</title><style>@page{size:A4;margin:18mm}body{font:16px/1.5 Arial;color:#183e3b}section{break-after:page}section:last-child{break-after:auto}h1{font-size:25px}h2{font-size:21px}.body{white-space:pre-wrap}footer{margin-top:32px;font-size:12px}</style>`+sections.map((s,i)=>`<section><h1>1.8.3 · Apple</h1><h2>${escape(s.split('\n')[0])}</h2><div class="body">${escape(s.split('\n').slice(1).join('\n').trim())}</div><footer>${lang==='en'?'Fictional rehearsal only. No real resident record.':'Kathang-isip na pagsasanay lamang. Walang tunay na rekord.'} · ${i+1}/${sections.length}</footer></section>`).join('');
 fs.writeFileSync(out+`/lesson-183-print-kit.${lang}.html`,html);const page=await browser.newPage();await page.setContent(html);await page.pdf({path:out+`/lesson-183-print-kit.${lang}.pdf`,format:'A4',printBackground:true});await page.close();
 const aid=sections.at(-1);const aidPage=await browser.newPage();await aidPage.setContent(html.slice(0,html.indexOf('<section>'))+`<section><h1>1.8.3 · Apple</h1><h2>${escape(aid.split('\n')[0])}</h2><div class="body">${escape(aid.split('\n').slice(1).join('\n').trim())}</div></section>`);await aidPage.pdf({path:out+`/lesson-183-pause-aid.${lang}.pdf`,format:'A4',printBackground:true});await aidPage.close();
}}finally{await browser.close();}
