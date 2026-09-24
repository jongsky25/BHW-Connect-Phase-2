import {course, lessons} from './content.mjs';

const KEY = 'bhw-reference-1-1-review-v1';
const $ = id => document.getElementById(id);
const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let stored = {};
try { stored = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { /* Storage is optional. */ }
let language = ['fil','en'].includes(stored.language) ? stored.language : 'fil';
let mode = stored.mode === 'read' ? 'read' : 'slides';
let lesson = lessons.find(x => x.id === stored.lesson) || lessons[0];
let sectionId = lesson.sections.some(x => x.id === stored.sectionId) || stored.sectionId === 'check' ? stored.sectionId : lesson.sections[0].id;
let completed = new Set(Array.isArray(stored.completed) ? stored.completed.filter(id => lessons.some(x => x.id === id)) : []);
const positions = stored.positions && typeof stored.positions === 'object' && !Array.isArray(stored.positions) ? stored.positions : {};
const answers = new Map();
let storageWorks = true;
const t = value => value[language];
const ui = (fil,en) => language === 'fil' ? fil : en;
function save() {
  positions[lesson.id]=sectionId;
  try { localStorage.setItem(KEY,JSON.stringify({language,mode,lesson:lesson.id,sectionId,positions,completed:[...completed]})); }
  catch { storageWorks = false; }
}
function person(x,y,color,scale=1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-17 5 Q-20-31 0-30 Q25-26 18 7" fill="#304d42"/><circle cy="-9" r="15" fill="#c78e68"/><path d="M-23 12 Q0 0 23 12 L30 67 H-30Z" fill="${color}"/><path d="M-12 68L-14 99M12 68L15 99" stroke="#365149" stroke-width="10" stroke-linecap="round"/><path d="M-22 18L-38 48M22 18L37 42" stroke="#c78e68" stroke-width="10" stroke-linecap="round"/></g>`;
}
// Original code-authored SVG scene sketches; no external imagery or agency marks.
function scene(index, audience=false) {
  if(audience) {
    const figures=[`${person(90,52,'#488578',.75)}<ellipse cx="150" cy="100" rx="24" ry="17" fill="#e5c883"/><circle cx="132" cy="92" r="10" fill="#c78e68"/>`,`${person(95,62,'#ac7c47',.65)}${person(160,57,'#698ca0',.7)}`,`${person(120,50,'#698ca0',.8)}<ellipse cx="130" cy="91" rx="20" ry="23" fill="#698ca0"/>`,`${person(110,55,'#ac7c47',.75)}<path d="M96 44 Q105 24 123 36" stroke="#d7ddd3" stroke-width="10" fill="none"/><path d="M155 85q10-8 10 5v52" stroke="#795f42" fill="none" stroke-width="4"/>`];
    return `<svg viewBox="0 0 240 160" aria-hidden="true" focusable="false"><rect x="5" y="4" width="230" height="150" rx="18" fill="#e1ead5"/>${figures[index%4]}</svg>`;
  }
  return `<svg viewBox="0 0 240 160" aria-hidden="true" focusable="false"><rect x="5" y="4" width="230" height="150" rx="18" fill="#e1ead5"/><path d="M14 135H228" stroke="#adc1a1" stroke-width="2"/>${index%3===0?'<rect x="118" y="25" width="88" height="63" rx="5" fill="#fff" stroke="#b3c7ac"/><path d="M135 45h52m-52 14h30m-30 14h41" stroke="#89a778" stroke-width="4"/>':index%3===1?'<path d="M129 45L173 16L217 45" fill="#c3a17c"/><path d="M139 45H207V107H139Z" fill="#faf8e9"/><rect x="164" y="74" width="20" height="33" fill="#92ac85"/>':'<rect x="127" y="20" width="88" height="100" rx="8" fill="#faf8e9"/><path d="M146 42h46m-46 13h35" stroke="#8dab81" stroke-width="4"/><rect x="151" y="80" width="37" height="40" fill="#abc1a1"/>'}${person(67,50,'#247263',.8)}${person(172,87,audience?'#b27d4d':'#698ca0',.45)}${index%3===1?person(118,88,'#ac7c47',.45):''}<circle cx="30" cy="30" r="10" fill="#e7d99a"/></svg>`;
}
function visual(section) {
  const {layout,labels,caption,asset}=section.slide;
  let content;
  if(layout==='scene'||layout==='audience') content=`<div class="scene-grid">${labels.map((label,i)=>`<div class="scene-card">${asset==='A07'&&i===0?`<svg viewBox="0 0 240 160" aria-hidden="true" focusable="false"><rect x="5" y="4" width="230" height="150" rx="18" fill="#e1ead5"/><path d="M20 50L70 15L120 50" fill="#c3a17c"/><path d="M32 50H108V115H32Z" fill="#faf8e9"/><ellipse cx="135" cy="130" rx="40" ry="12" fill="#aacad0"/><path d="M113 129h40m-31 6h24" stroke="#618e99" stroke-width="2"/>${person(189,59,'#247263',.65)}</svg>`:scene(i,layout==='audience')}<span class="visual-label">${esc(t(label))}</span></div>`).join('')}</div>`;
  else if(layout==='documents') content=`<div class="visual-grid">${labels.map(label=>`<div class="document"><span class="example-tag">${ui('HALIMBAWA LAMANG','LEARNING EXAMPLE')}</span><span class="visual-label">${esc(t(label))}</span><div class="rule"></div><div class="rule"></div></div>`).join('')}</div>`;
  else content=`${layout==='roles'?`<div class="roles-center">${ui('Pagsusulong ng kalusugan sa barangay','Health promotion in the barangay')}</div>`:''}<div class="visual-grid">${labels.map((label,i)=>`<div class="step"><span class="step-number">${String(i+1).padStart(2,'0')}</span><span class="visual-label">${esc(t(label))}</span></div>`).join('')}</div>`;
  // Live labels and captions are the full text alternative; SVGs are decorative.
  return `<div class="visual ${layout}" data-asset="${asset}">${content}</div><div class="visual-caption">${esc(t(caption))}</div>`;
}
function outline() {
  $('outline').innerHTML=`<button type="button" class="mobile-outline" aria-expanded="false">${ui('☰ Mga aralin','☰ Course outline')} · ${lesson.number}</button><p class="eyebrow">${ui('Isang kurso · tatlong kabanata','One course · three chapters')}</p><h2>${esc(course.title)}</h2><div class="chapter"><strong>${ui('KABANATA I','CHAPTER I')}</strong><small>${esc(t(course.chapters[0]))}</small></div><p class="subchapter">1.1 ${esc(t(course.subchapters[0]))}</p><nav class="lesson-list" aria-label="${ui('Mga aralin','Lessons')}">${lessons.map(l=>`<button type="button" class="lesson-link" data-lesson="${l.id}" aria-current="${l.id===lesson.id}"><span class="ordinal">${l.number}</span><span>${esc(t(l.title))}${completed.has(l.id)?`<small>✓ ${ui('Nasuri sa preview','Reviewed in preview')}</small>`:''}</span></button>`).join('')}</nav><p class="demo-progress">${completed.size} / 6 ${ui('nasuri sa preview','reviewed in preview')}</p><details><summary>${ui('Iba pang subchapter sa Kabanata I','Other Chapter I subchapters')}</summary>${course.subchapters.slice(1).map((s,i)=>`<div class="future">1.${i+2} ${esc(t(s))}<small>${ui('Hindi kasama sa preview','Outside this preview')}</small></div>`).join('')}</details>${course.chapters.slice(1).map((c,i)=>`<div class="chapter"><strong>${ui('KABANATA','CHAPTER')} ${['II','III'][i]}</strong><small>${esc(t(c))}</small><small>${ui('Hindi pa available','Not yet available')}</small></div>`).join('')}`;
  document.querySelectorAll('[data-lesson]').forEach(button=>button.addEventListener('click',()=>{
    lesson=lessons.find(l=>l.id===button.dataset.lesson);const saved=positions[lesson.id];sectionId=saved==='check'||lesson.sections.some(s=>s.id===saved)?saved:lesson.sections[0].id;render();$('lesson-title').focus();
  }));
  document.querySelector('.mobile-outline').addEventListener('click',event=>{
    const open=$('outline').classList.toggle('mobile-open');event.currentTarget.setAttribute('aria-expanded',String(open));
  });
}
function render(focus=false) {
  save();document.documentElement.lang=language;
  $('language').value=language;outline();
  $('review-label').textContent=ui('PROTOTYPE · PARA SA REVIEW','PROTOTYPE · FOR REVIEW');
  $('breadcrumb').textContent=ui('Kabanata I / 1.1 Ang mga Tungkulin ng BHW','Chapter I / 1.1 The Roles of a BHW');
  $('lesson-number').textContent=`${ui('ARALIN','LESSON')} ${lesson.number}`;
  $('lesson-title').textContent=t(lesson.title);
  $('objective').textContent=`${ui('Sa dulo ng araling ito:','By the end of this lesson:')} ${t(lesson.objective)}`;
  $('pacing').textContent=`${lesson.minutes} ${ui('min · paunang tantiya sa sariling pag-aaral','min · initial self-study estimate')}`;
  $('read-mode').textContent=ui('Basahin','Read');$('slides-mode').textContent=ui('Slides','Slides');
  $('read-mode').setAttribute('aria-pressed',String(mode==='read'));$('slides-mode').setAttribute('aria-pressed',String(mode==='slides'));
  const index=sectionId==='check'?lesson.sections.length:lesson.sections.findIndex(x=>x.id===sectionId);
  const total=lesson.sections.length+1;
  $('position').innerHTML=Array.from({length:total},(_,i)=>`<span class="${i===index?'active':''}" aria-hidden="true"></span>`).join('');
  if(sectionId==='check') {
    const answer=answers.get(lesson.id);
    $('stage').innerHTML=`<div class="practice"><p class="eyebrow">${ui('Subukan · sariling pagsasanay','Try it · self-check')}</p><h2>${esc(t(lesson.check.prompt))}</h2><div role="group" aria-label="${ui('Mga pagpipilian','Answer options')}">${lesson.check.options.map((option,i)=>`<button type="button" class="option" data-answer="${i}" aria-pressed="${answer===i}">${String.fromCharCode(65+i)}. ${esc(t(option))}</button>`).join('')}</div><div id="feedback" aria-live="polite">${answer!==undefined?`<div class="feedback"><strong>${answer===lesson.check.correct?ui('Tama.','Correct.'):ui('Balikan ang paliwanag.','Review the explanation.')}</strong> ${esc(t(lesson.check.feedback))}</div>`:''}</div>${answer!==undefined?`<div class="takeaway"><p class="eyebrow">${ui('Tandaan','Takeaway')}</p><p>${esc(t(lesson.takeaway))}</p></div>`:''}</div>`;
    document.querySelectorAll('[data-answer]').forEach(button=>button.addEventListener('click',()=>{answers.set(lesson.id,Number(button.dataset.answer));render();document.querySelector(`[data-answer="${button.dataset.answer}"]`).focus();}));
  } else {
    const s=lesson.sections[index];
    $('stage').innerHTML=mode==='slides'?`<div class="slide-head"><p class="eyebrow">${ui('Tingnan · iugnay · gamitin','See · connect · apply')}</p><h2>${esc(t(s.title))}</h2></div>${visual(s)}`:`<div class="reading"><p class="eyebrow">${ui('Basahin at iugnay sa iyong gawain','Read and connect to your work')}</p><h2>${esc(t(s.title))}</h2><p>${esc(t(s.read))}</p>${visual(s)}</div>`;
  }
  $('page-count').textContent=`${index+1} / ${total} ${mode==='slides'?ui('slide','slides'):ui('bahagi','sections')}`;
  $('previous').textContent=ui('← Nauna','← Previous');$('previous').disabled=index===0;
  $('next').textContent=index===total-1?ui('Susunod na aralin →','Next lesson →'):ui('Susunod →','Next →');
  $('next').disabled=index===total-1&&lesson===lessons.at(-1);
  $('completion').innerHTML=sectionId==='check'?`<button type="button" id="mark-reviewed" ${answers.has(lesson.id)?'':'disabled'}>${completed.has(lesson.id)?ui('✓ Nasuri sa preview','✓ Reviewed in preview'):ui('Markahang nasuri · preview lamang','Mark reviewed · preview only')}</button>`:'';
  $('mark-reviewed')?.addEventListener('click',()=>{completed.add(lesson.id);render();$('mark-reviewed').focus();});
  $('sources-label').textContent=ui('Mga sanggunian · aktuwal na pahina ng PDF','Sources · actual PDF page numbers');$('sources').textContent=lesson.sources;
  $('preview-note').textContent=ui('Preview lamang. Ang posisyon at markang “nasuri” ay nasa browser na ito lamang. Walang nababagong learner progress o certification.','Preview only. Position and “reviewed” marks stay in this browser. Learner progress and certification are unchanged.')+(storageWorks?'':ui(' Hindi available ang pag-save sa browser; gumagana pa rin ang preview.',' Browser storage is unavailable; the preview still works.'));
  if(focus)$('stage').focus();
}
function step(direction){
  let index=sectionId==='check'?lesson.sections.length:lesson.sections.findIndex(x=>x.id===sectionId);
  if(direction===1&&index===lesson.sections.length){const next=lessons[lessons.indexOf(lesson)+1];if(!next)return;lesson=next;index=-1;}
  index+=direction;if(index<0)return;
  sectionId=index===lesson.sections.length?'check':lesson.sections[index].id;render(true);
}
$('previous').addEventListener('click',()=>step(-1));$('next').addEventListener('click',()=>step(1));
$('language').addEventListener('change',event=>{language=event.target.value;render();});
$('read-mode').addEventListener('click',()=>{mode='read';render();});
$('slides-mode').addEventListener('click',()=>{mode='slides';render();});
// Stable section IDs keep the same concept when mode or language changes.
render();
