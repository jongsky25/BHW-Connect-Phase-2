import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {loadReferenceModule,parseReferenceRead,FACILITATOR_SECTION_IDS} from './lib/reference-content.mjs';import {planReferenceNarration,mp3AudioFrames} from './lib/reference-narration.mjs';
const j=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const b=j('docs/lesson-165-baseline.json'),receipt=j('docs/lesson-165-proposal-receipt.json'),leaf='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-handoff/';
for(const [p,e]of Object.entries(b.files))if(!receipt.changed_existing_files[p])assert.equal(sha(p),e.sha256,'Protected file changed: '+p);
for(const [p,e]of Object.entries(receipt.changed_existing_files)){assert.equal(sha(p),e.proposed_sha256,'Unpinned proposed source: '+p);assert.equal(createHash('sha256').update(e.predecessor_utf8).digest('hex'),e.predecessor_sha256);assert.equal(e.predecessor_sha256,b.files[p].sha256);}
const original=JSON.parse(receipt.changed_existing_files['content/training/day1-basic-competencies/narration.json'].predecessor_utf8),m=j('content/training/day1-basic-competencies/narration.json');
for(const [k,v]of Object.entries(original.lessons))if(k!=='communication-handoff')assert.deepEqual(m.lessons[k],v,k+' protected selection');
for(const [k,v]of Object.entries(original.history??{}))assert.deepEqual(k==='communication-handoff'?m.history[k].slice(0,v.length):m.history[k],v,k+' protected history');
assert(m.history['communication-handoff'].some(h=>JSON.stringify(h)===JSON.stringify(original.lessons['communication-handoff'])),'Complete target predecessor selection');
const {lessons}=loadReferenceModule('content/training/day1-basic-competencies/modules/06-komunikasyon','public');
const plan=planReferenceNarration([{key:'06-komunikasyon',lessons}],m,src=>sha('public'+src));assert(plan.every(p=>p.action==='skip'),'All current narration must match actual text');
const target=plan.filter(p=>p.lessonKey==='communication-handoff');assert.equal(target.length,12);
for(const p of target){assert.equal(p.voice,'gemini:gemini-3.8-flash-tts:Kore');assert.deepEqual(p.existing.timings.map(({zone,index,text})=>({zone,index,text})),p.zones);const seconds=mp3AudioFrames(fs.readFileSync('public'+p.src)).reduce((s,f)=>s+f.samples/f.sampleRate,0);assert(Math.abs(seconds-p.existing.duration_seconds)<0.001);assert(p.existing.timings.at(-1).end_ms<=seconds*1000+1);}
const lesson=j(leaf+'lesson.json'),old=JSON.parse(receipt.changed_existing_files[leaf+'lesson.json'].predecessor_utf8);assert.deepEqual(lesson.manifest,old.manifest);
assert.deepEqual(lesson.sections.map(s=>s.id),['handoff','audience','meeting','confirm-next-step','practice','check']);
for(const lang of ['fil','en']){const read=parseReferenceRead(fs.readFileSync(leaf+'read.'+lang+'.md','utf8'));const slides=j(leaf+'slides.json');read.forEach((s,i)=>assert.equal(s.body,slides[i]['narration_'+lang]));assert.deepEqual([...fs.readFileSync(leaf+'facilitator.'+lang+'.md','utf8').matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1]),FACILITATOR_SECTION_IDS);}
const story=lesson.assets.find(a=>a.id===lesson.featured_asset_id);assert.equal(story.id,'communication-handoff-story');assert.equal(story.review_status,'draft');
for(const lang of ['fil','en']){const v=story.videos[lang];for(const a of [v,v.poster,v.captions])assert.equal(sha('public'+a.path),a.content_hash);assert.equal((fs.readFileSync('public'+v.captions.path,'utf8').match(/ --> /g)??[]).length,6);const t=j('remotion/public/communication-handoff/narration-'+lang+'.json');assert.equal(t.beats.length,6);assert.equal(sha('remotion/public/communication-handoff/narration-'+lang+'.mp3'),t.audio_sha256);}
console.log('Verified protected bytes/mappings/history, 12 measured target tracks and two six-cue stories.');
