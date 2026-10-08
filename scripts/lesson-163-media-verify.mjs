import './lesson-163-preservation.mjs';
// Actual committed media and historical selection checks; no fixtures, writes or approval.
import fs from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {loadReferenceModule} from './lib/reference-content.mjs';import {planReferenceNarration,mp3AudioFrames} from './lib/reference-narration.mjs';
const j=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const b=j('docs/lesson-163-baseline.json'),m=j('content/training/day1-basic-competencies/narration.json'),key='communication-explain';
assert(m.history[key].some(h=>JSON.stringify(h)===JSON.stringify(b.target_narration)),'Complete predecessor selection retained');
assert.deepEqual(m.history[key].slice(0,b.target_history.length),b.target_history,'All target history retained');
for(const langs of Object.values(b.target_narration.sections))for(const t of Object.values(langs))assert.equal(sha('public'+t.src),t.sha256);
const {lessons}=loadReferenceModule('content/training/day1-basic-competencies/modules/06-komunikasyon','public');
const plan=planReferenceNarration([{key:'06-komunikasyon',lessons}],m,src=>sha('public'+src));assert(plan.every(p=>p.action==='skip'),'Every current 1.6 track must match its exact new text');
const target=plan.filter(p=>p.lessonKey==='communication-explain');assert.equal(target.length,12);
for(const p of target){assert.equal(p.voice,'gemini:gemini-3.8-flash-tts:Kore');assert.deepEqual(p.existing.timings.map(({zone,index,text})=>({zone,index,text})),p.zones);const seconds=mp3AudioFrames(fs.readFileSync('public'+p.src)).reduce((s,f)=>s+f.samples/f.sampleRate,0);assert(Math.abs(seconds-p.existing.duration_seconds)<0.001);assert(p.existing.timings.at(-1).end_ms<=seconds*1000+1);}
const lesson=j('content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-explain/lesson.json');const story=lesson.assets.find(a=>a.id===lesson.featured_asset_id);assert.equal(story.review_status,'draft');
for(const lang of ['fil','en']){const v=story.videos[lang];for(const a of [v,v.poster,v.captions])assert.equal(sha('public'+a.path),a.content_hash);assert.equal((fs.readFileSync('public'+v.captions.path,'utf8').match(/ --> /g)??[]).length,6);const t=j('remotion/public/communication-explain/narration-'+lang+'.json');assert.equal(t.beats.length,6);assert.equal(sha('remotion/public/communication-explain/narration-'+lang+'.mp3'),t.audio_sha256);}
console.log('Verified all current 1.6 narration, 12 measured target tracks, both six-cue stories and every historical predecessor mapping.');
