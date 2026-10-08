// Verify selected Read MP3s, measured story media and historical text selection.
import fs from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {loadReferenceModule} from './lib/reference-content.mjs';import {planReferenceNarration,mp3AudioFrames} from './lib/reference-narration.mjs';
const j=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
execFileSync(process.execPath,['scripts/lesson-162-preservation.mjs'],{stdio:'inherit'});
const b=j('docs/lesson-162-baseline.json'),m=j('content/training/day1-basic-competencies/narration.json');
const {lessons}=loadReferenceModule('content/training/day1-basic-competencies/modules/06-komunikasyon','public');
const plan=planReferenceNarration([{key:'06-komunikasyon',lessons}],m,src=>sha('public'+src));assert(plan.every(p=>p.action==='skip'),'Every current 1.6 track must match its exact text');
const target=plan.filter(p=>p.lessonKey==='communication-clarify');assert.equal(target.length,12);
for(const p of target){assert.equal(p.voice,'gemini:gemini-3.8-flash-tts:Kore');assert.deepEqual(p.existing.timings.map(({zone,index,text})=>({zone,index,text})),p.zones);const seconds=mp3AudioFrames(fs.readFileSync('public'+p.src)).reduce((s,f)=>s+f.samples/f.sampleRate,0);assert(Math.abs(seconds-p.existing.duration_seconds)<0.001);assert(p.existing.timings.at(-1).end_ms<=seconds*1000+1);}
for(const k of Object.keys(b.narration.lessons))for(const langs of Object.values(b.narration.lessons[k].sections))for(const t of Object.values(langs))assert.equal(sha('public'+t.src),t.sha256);
const lesson=j('content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-clarify/lesson.json'),story=lesson.assets.find(a=>a.id===lesson.featured_asset_id);assert.equal(story.review_status,'draft');
for(const lang of ['fil','en']){const v=story.videos[lang];for(const a of [v,v.poster,v.captions])assert.equal(sha('public'+a.path),a.content_hash);assert.equal((fs.readFileSync('public'+v.captions.path,'utf8').match(/ --> /g)??[]).length,6);const t=j('remotion/public/communication-clarify/narration-'+lang+'.json');assert.equal(t.beats.length,6);assert.equal(sha('remotion/public/communication-clarify/narration-'+lang+'.mp3'),t.audio_sha256);}
console.log('Verified twelve measured target tracks, both six-cue stories and exact historical MP3 bytes.');
