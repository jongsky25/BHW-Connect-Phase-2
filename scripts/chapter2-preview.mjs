import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {loadReferenceModule,parseReferenceRead} from './lib/reference-content.mjs';
import {root,packageRoot,json,validatePackage} from './chapter2-validate.mjs';

validatePackage();
const outputAt=process.argv.indexOf('--output');
if(outputAt<0||!process.argv[outputAt+1]) throw new Error('Provide --output <review-directory>');
const output=path.resolve(process.argv[outputAt+1]);mkdirSync(output,{recursive:true});
const moduleAt=process.argv.indexOf('--module');
const moduleCode=moduleAt<0?'2.1':process.argv[moduleAt+1];
const modulePlan=json(path.join(packageRoot,'chapter-blueprint.json')).modules.find(m=>m.code===moduleCode&&m.status==='draft-authored');
if(!modulePlan) throw new Error('Select an authored draft module with --module 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 or 2.7');
const dir=path.join(packageRoot,'drafts',modulePlan.module_key);
const chapterModule=loadReferenceModule(dir,path.join(root,'public'));
const review=json(path.join(dir,'review.json'));
const e=(s)=>String(s).replace(/[&<>"']/g,(x)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const safeJson=(x)=>JSON.stringify(x).replace(/</g,'\\u003c');
export function learnerPayload(lessons){return lessons.map(({manifest,revision})=>({manifest,revision}));}
const learner=learnerPayload(chapterModule.lessons);
for(const l of learner) for(const a of l.revision.assets) a.inline='data:image/svg+xml;base64,'+readFileSync(path.join(root,'public',a.path.slice(1))).toString('base64');
const css=`*{box-sizing:border-box}body{margin:0;background:#f4f6f3;color:#172e29;font:18px/1.65 system-ui,sans-serif}header{background:#123f34;color:white;padding:22px max(20px,calc((100vw - 1080px)/2))}header p{margin:0;color:#d0e6dc;font-size:14px}h1{font-size:clamp(25px,4vw,38px);line-height:1.2;margin:12px 0}main{max-width:1080px;margin:auto;padding:24px 20px 48px}button,select{font:inherit;min-height:44px;border:1px solid #557468;border-radius:10px;padding:9px 14px;background:white;color:#173e32}button{cursor:pointer}button:hover{background:#e4eee6}button:disabled{opacity:.5;cursor:default}button:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid #bb7100;outline-offset:3px}nav,.controls,.actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:16px 0}label{font-size:15px;font-weight:650}select{max-width:100%}.card{background:white;border:1px solid #d4e0d7;border-radius:18px;padding:clamp(18px,4vw,38px);margin:20px 0;box-shadow:0 8px 24px #173e3208}h2{font-size:27px;line-height:1.35}h3{font-size:21px}p{max-width:72ch;white-space:pre-line}.eyebrow{font-size:14px;letter-spacing:.07em;text-transform:uppercase;color:#47685a}.progress{height:6px;background:#d8e4d9;border-radius:4px;overflow:hidden}.progress>div{height:100%;background:#276d52;transition:width .2s}figure{margin:18px 0;max-width:440px}figure img{max-width:100%;max-height:360px}figcaption{font-size:15px;color:#39594b}.options{display:grid;gap:12px;margin:18px 0}.options button{text-align:left;padding:14px 18px}.feedback{background:#e9f3ec;padding:18px;border-left:4px solid #32734e;border-radius:6px}.feedback p{margin:6px 0}.slide-text{font-size:clamp(22px,3vw,31px);line-height:1.6}.muted{font-size:15px;color:#496154}.pill{background:#e4eee6;border-radius:30px;padding:3px 12px;font-size:14px}a{color:#14543b}details{margin:18px 0}summary{cursor:pointer;font-weight:700}pre{white-space:pre-wrap;font:inherit}table{border-collapse:collapse;font-size:15px;width:100%}td,th{padding:9px;border:1px solid #c7d5ca;text-align:left;vertical-align:top}.print-card{break-inside:avoid;page-break-inside:avoid}.hidden{display:none!important}@media(max-width:480px){main{padding:15px 12px}.card{padding:20px 16px}.controls>*{max-width:100%}select{width:100%}h2{font-size:24px}.actions button{flex:1}.slide-text{font-size:22px}}@media print{body{background:white;font-size:11pt;line-height:1.45}header{color:black;background:white;padding:0}main{padding:0}.controls,nav,.actions,.no-print{display:none}.card{box-shadow:none;padding:12px;border:0;break-after:page}details{display:block}details>*{display:block}figure{max-width:250px}.print-card{padding:12px;border:1px solid #aaa;margin:15px 0}h2{font-size:18pt}h3{font-size:14pt}}`;
const shell=(title,body,script='')=>`<!doctype html><html lang="fil"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${e(title)}</title><style>${css}</style></head><body>${body}${script?`<script>${script}</script>`:''}</body></html>`;
const body=`<header><p>CHAPTER 2 · CONTENT REVIEW · UNPUBLISHED</p><h1 id="module-title">${e(moduleCode)} · ${e(modulePlan.title_fil)}</h1><p>Local learner preview. Changes here do not save course progress.</p></header><main><div class="controls"><label for="lesson">Aralin / Lesson</label><select id="lesson"></select><label for="language">Wika / Language</label><select id="language"><option value="fil">Filipino</option><option value="en">English</option></select><label for="mode">Paraan / Mode</label><select id="mode"><option value="read">Read</option><option value="slides">Slides</option></select></div><div id="intro"></div><div class="progress" role="progressbar" aria-label="Lesson position" aria-valuemin="0" aria-valuemax="7"><div id="bar"></div></div><article class="card" id="content"></article><p id="status" role="status" aria-live="polite"></p><div class="actions"><button id="previous">Bumalik</button><button id="next">Susunod</button><button id="complete" disabled>Tapusin</button></div><p class="muted">Review controls demonstrate the intended flow. Audio scripts are authored; recordings and production integration are pending.</p></main>`;
const script=`const moduleCode=${safeJson(moduleCode)},moduleTitles=${safeJson({fil:modulePlan.title_fil,en:modulePlan.title_en})};const lessons=${safeJson(learner)};let lessonIndex=['2.3','2.4','2.5','2.7'].includes(moduleCode)?0:1,lang='fil',mode='read',position=0;const answers={},completed=new Set();const $=id=>document.getElementById(id);const esc=${e.toString()};
function answerKey(s){return lessons[lessonIndex].manifest.lesson_key+':'+s.id.replace(/^slide-/,'')}
function render(){const l=lessons[lessonIndex];document.documentElement.lang=lang;$('module-title').textContent=moduleCode+' · '+moduleTitles[lang];$('lesson').innerHTML=lessons.map((x,i)=>'<option value="'+i+'" '+(i===lessonIndex?'selected':'')+'>'+moduleCode+'.'+(i+1)+' '+esc(x.manifest['title_'+lang])+'</option>').join('');$('intro').innerHTML='<p class="eyebrow">'+moduleCode+'.'+(lessonIndex+1)+' · '+(position+1)+' / 7</p><h2>'+esc(l.manifest['title_'+lang])+'</h2><p class="muted">'+esc(l.manifest['objectives_'+lang][0])+'</p>';const s=(mode==='read'?l.revision.read_sections:l.revision.slides)[position];let inner='<h3 tabindex="-1" id="section-heading">'+esc(s['heading_'+lang])+'</h3><p class="'+(mode==='slides'?'slide-text':'')+'">'+esc(s[(mode==='read'?'body_':'display_')+lang])+'</p>';for(const id of s.asset_ids){const a=l.revision.assets.find(x=>x.id===id);inner+='<figure><img src="'+a.inline+'" alt="'+esc(a['alt_'+lang])+'"><figcaption>'+esc(a['caption_'+lang])+'</figcaption></figure>'}if(s.check){const c=s.check;inner+='<p><strong>'+esc(c['prompt_'+lang])+'</strong></p><div class="options">'+c.options.map((o,i)=>'<button data-answer="'+i+'" aria-pressed="'+(answers[answerKey(s)]===i)+'">'+esc(o[lang])+'</button>').join('')+'</div>';if(Object.hasOwn(answers,answerKey(s))){inner+='<div class="feedback" role="status" tabindex="-1"><strong>'+(lang==='fil'?'Paliwanag sa bawat pagpipilian':'Why each option helps or does not help')+'</strong><p>'+esc(c['feedback_'+lang])+'</p><p>'+esc(l.revision.read_sections[position]['takeaway_'+lang])+'</p></div>'}}$('content').innerHTML=inner;$('content').querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{answers[answerKey(s)]=Number(b.dataset.answer);render();$('content').querySelector('.feedback')?.focus()});$('bar').style.width=((position+1)/7*100)+'%';document.querySelector('[role=progressbar]').setAttribute('aria-valuenow',position+1);$('previous').disabled=position===0;$('next').disabled=position===6;$('previous').textContent=lang==='fil'?'Bumalik':'Previous';$('next').textContent=lang==='fil'?'Susunod':'Next';$('complete').textContent=lang==='fil'?'Tapusin ang preview':'Complete preview';const attempted=l.revision.read_sections.filter(x=>x.check).every(x=>Object.hasOwn(answers,answerKey(x)));$('complete').disabled=position!==6||!attempted;$('status').textContent=completed.has(l.manifest.lesson_key)?(lang==='fil'?'Natapos sa preview lamang.':'Completed in preview only.'):(lang==='fil'?'Subukan ang dalawang check at puntahan ang huling bahagi.':'Attempt both checks and reach the final section.');}
$('lesson').onchange=event=>{lessonIndex=Number(event.target.value);position=0;render()};$('language').onchange=event=>{lang=event.target.value;render()};$('mode').onchange=event=>{mode=event.target.value;render()};$('previous').onclick=()=>{position--;render();$('section-heading').focus()};$('next').onclick=()=>{position++;render();$('section-heading').focus()};$('complete').onclick=()=>{completed.add(lessons[lessonIndex].manifest.lesson_key);render();if(lessonIndex<lessons.length-1){const b=document.createElement('button');b.textContent=lang==='fil'?'Buksan ang susunod na aralin':'Open next lesson';b.onclick=()=>{lessonIndex++;position=0;render()};$('status').appendChild(b)}};render();`;
writeFileSync(path.join(output,'chapter-2-learner-preview.html'),shell('Chapter 2 learner review',body,script));

function md(text){return text.replace(/\r\n/g,'\n').split(/\n\n+/).map(block=>{
  if(block.startsWith('|')) {
    const rows=block.split('\n').filter(line=>!/^\|[-| ]+\|$/.test(line)).map(line=>line.split('|').slice(1,-1).map(cell=>cell.trim()));
    return '<table>'+rows.map((cells,i)=>'<tr>'+cells.map(cell=>i===0?'<th scope="col">'+e(cell)+'</th>':'<td>'+e(cell)+'</td>').join('')+'</tr>').join('')+'</table>';
  }
  return block.startsWith('# ')?'<h3>'+e(block.slice(2))+'</h3>':block.startsWith('## ')?'<h4>'+e(block.slice(3))+'</h4>':'<p>'+e(block)+'</p>';
}).join('');}
let staff=`<header><p>PRIVATE FACILITATOR REVIEW · UNPUBLISHED</p><h1>${e(moduleCode)} · Facilitator activity kit</h1><p>Contains answer explanations and observation rubrics. Distribute participant cards separately.</p></header><main><div class="controls"><label for="language">Wika / Language</label><select id="language"><option value="fil">Filipino</option><option value="en">English</option></select><button id="print">Print visible language</button></div><p class="no-print">${review.facilitated_minutes}-minute session outline. ${e(review.timing_basis??"Ten-hour behavior allocation: 120 + 180 + 180 + 120 minutes.")} Additional observed practice may be needed. No learner ratings are stored here.</p>`;
for(const lang of ['fil','en']){
  staff+=`<div data-language="${lang}"${lang==='en'?' class="hidden"':''}>`;
  for(const [i,l] of chapterModule.lessons.entries()){
    staff+=`<section class="card"><p class="eyebrow">${e(moduleCode)}.${i+1}</p><h2>${e(l.manifest['title_'+lang])}</h2>`;
    const sections=parseReferenceRead(l.notes['notes_'+lang]);
    staff+=sections.map(s=>`<section><h3>${e(s.heading)}</h3><p>${e(s.body)}</p></section>`).join('');
    const lessonDir=path.join(dir,'lessons',l.manifest.lesson_key);
    for(const name of ['participant-cards','worksheet','observer-sheet'].filter(n=>existsSync(path.join(lessonDir,`${n}.${lang}.md`)))) staff+=`<section class="print-card">${md(readFileSync(path.join(lessonDir,`${name}.${lang}.md`),'utf8'))}</section>`;
    staff+='</section>';
  }
  staff+=`<section class="card">${md(readFileSync(path.join(dir,`job-aid.${lang}.md`),'utf8'))}</section></div>`;
}
staff+='</main>';
const staffScript=`document.getElementById('language').onchange=e=>{document.documentElement.lang=e.target.value;document.querySelectorAll('[data-language]').forEach(x=>x.classList.toggle('hidden',x.dataset.language!==e.target.value))};document.getElementById('print').onclick=()=>window.print();`;
writeFileSync(path.join(output,'PRIVATE-chapter-2-facilitator-kit.html'),shell('Private Chapter 2 facilitator kit',staff,staffScript));
let participant='<header><p>PARTICIPANT PRACTICE · UNPUBLISHED</p><h1>'+e(moduleCode)+' · Practice workbook</h1><p>Fictional practice only. No staff answer keys or rating anchors.</p></header><main><div class="controls"><label for="language">Wika / Language</label><select id="language"><option value="fil">Filipino</option><option value="en">English</option></select><button id="print">Print visible language</button></div>';
for(const lang of ['fil','en']){
  participant+=`<div data-language="${lang}"${lang==='en'?' class="hidden"':''}>`;
  for(const l of chapterModule.lessons){
    const lessonDir=path.join(dir,'lessons',l.manifest.lesson_key);
    participant+='<section class="card">';
    for(const name of ['participant-cards','worksheet'].filter(n=>existsSync(path.join(lessonDir,`${n}.${lang}.md`)))) participant+=`<section class="print-card">${md(readFileSync(path.join(lessonDir,`${name}.${lang}.md`),'utf8'))}</section>`;
    participant+='</section>';
  }
  participant+='</div>';
}
participant+='</main>';
writeFileSync(path.join(output,'chapter-2-participant-workbook.html'),shell('Chapter 2 participant workbook',participant,staffScript));
writeFileSync(path.join(output,'chapter-2-authoring-validation.json'),JSON.stringify(validatePackage(),null,2)+'\n');
console.log('Wrote learner preview, participant workbook, private facilitator kit and validation report to '+output);


