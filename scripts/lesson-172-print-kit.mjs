// Printable bilingual cards and a separate one-page listening aid; fictional only.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {chromium} from '@playwright/test';
const root=path.resolve(import.meta.dirname,'..'),out=root+'/.preview/lesson172-deliverables';fs.mkdirSync(out,{recursive:true});
const require=createRequire(import.meta.url),{ensureBrowser}=require(root+'/remotion/node_modules/@remotion/renderer');
const status=await ensureBrowser(),browser=await chromium.launch({executablePath:status.path,args:['--no-sandbox']});
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
try{for(const lang of ['fil','en']){
 const md=fs.readFileSync(root+`/docs/lesson-172-practice-kit.${lang}.md`,'utf8');const sections=md.split(/^## /m).slice(1);
 const html=`<!doctype html><html lang="${lang}"><meta charset="utf-8"><title>Carole cause verification kit</title><style>@page{size:A4;margin:18mm}body{font:15px/1.45 Arial;color:#183e3b}section{break-after:page}section:last-child{break-after:auto}h1{font-size:25px}h2{font-size:21px}.body{white-space:pre-wrap}footer{margin-top:32px;font-size:12px}</style>`+sections.map((s,i)=>`<section><h1>1.7.2 · Carole</h1><h2>${escape(s.split('\n')[0])}</h2><div class="body">${escape(s.split('\n').slice(1).join('\n').trim())}</div><footer>${lang==='en'?'Fictional rehearsal only. No real resident record.':'Kathang-isip na pagsasanay lamang. Walang tunay na rekord.'} · ${i+1}/4</footer></section>`).join('');
 fs.writeFileSync(out+`/lesson-172-print-kit.${lang}.html`,html);const page=await browser.newPage();await page.setContent(html);await page.pdf({path:out+`/lesson-172-print-kit.${lang}.pdf`,format:'A4',printBackground:true});await page.close();
}}finally{await browser.close();}
