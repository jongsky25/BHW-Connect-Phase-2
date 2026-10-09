// Generate only target draft Read narration and preserve every historical byte.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadReferenceModule} from './lib/reference-content.mjs';
import {planReferenceNarration} from './lib/reference-narration.mjs';
const root=path.resolve(import.meta.dirname,'..'),key='safety-demonstrate';
const file='content/training/day1-basic-competencies/narration.json';
const original=JSON.parse(fs.readFileSync(file));
if(!process.env.GEMINI_API_KEY)throw Error('Repository Gemini credential unavailable; no narration fabricated.');
const before=structuredClone(original);
original.history??={};original.history[key]??=[];
if(!original.history[key].some(h=>JSON.stringify(h)===JSON.stringify(original.lessons[key])))original.history[key].push(structuredClone(original.lessons[key]));
fs.writeFileSync(file,JSON.stringify(original,null,2)+'\n');
let error=null;
try{execFileSync(process.execPath,['scripts/training-narrate.mjs','--modules','08-osh','--lessons',key,'--provider','gemini','--max-requests','300','--apply'],{cwd:root,stdio:'inherit'});}catch(e){error=e.message;}
finally{
 const deleted=execFileSync('git',['ls-files','--deleted','-z','--','public/training/audio'],{encoding:'utf8'}).split('\0').filter(Boolean);
 if(deleted.length)execFileSync('git',['restore','--',...deleted],{stdio:'inherit'});
}
const current=JSON.parse(fs.readFileSync(file));
for(const [k,v]of Object.entries(before.lessons))if(k!==key&&JSON.stringify(current.lessons[k])!==JSON.stringify(v))throw Error('Sibling narration changed: '+k);
for(const [k,v]of Object.entries(before.history??{}))if(k!==key&&JSON.stringify(current.history[k])!==JSON.stringify(v))throw Error('Sibling history changed: '+k);
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const {lessons}=loadReferenceModule('content/training/day1-basic-competencies/modules/08-osh','public');
const plan=planReferenceNarration([{key:'08-osh',lessons}],current,src=>fs.existsSync('public'+src)?sha('public'+src):null).filter(p=>p.lessonKey===key);
const pending=plan.filter(p=>p.action!=='skip').map(p=>`${p.sectionId}/${p.language}`);
fs.writeFileSync('docs/lesson-184-media-generation.json',JSON.stringify({source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),date:new Date().toISOString(),provider:'gemini:gemini-3.8-flash-tts:Kore',expected_read_tracks:12,completed_read_tracks:12-pending.length,pending,error,story_status:'blocked: coordinated Apple reference and final scenes unavailable',human_listening:'pending',clinical_review:'pending',owner_approval:'pending'},null,2)+'\n');
if(pending.length)process.exitCode=1;
// Story uses the same pinned fictional reference/actions; no clinical outcomes.
if(!pending.length){
 const leaf='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-demonstrate/lesson.json';
 const lesson=JSON.parse(fs.readFileSync(leaf));
 const story={id:'safety-demonstrate-story',alt_fil:'Anim na beat: trainer-observed dummy demo ni Apple, agarang reporting/evaluation at documentation pagkatapos ng care.',alt_en:'Six beats: Apple’s trainer-observed dummy demo, immediate reporting/evaluation and documentation following care.',caption_fil:'Kathang-isip na demonstration at referral simulation; walang medical outcome.',caption_en:'Fictional demonstration and referral simulation; no medical outcome.',provenance:'Six built-in imagegen actions using the coordinated Apple reference; Gemini Kore narration, measured encoded samples; draft pending owner, clinical and human-listening review.',review_status:'draft',videos:{}};
 for(const language of ['fil','en'])execFileSync(process.execPath,['scripts/remotion-safety-demonstrate-narrate.mjs',language],{stdio:'inherit'});
 for(const language of ['fil','en']){
  const name='safety-demonstrate-gemini-'+language;
  execFileSync(process.execPath,['scripts/remotion-render.mjs',language==='fil'?'SafetyDemonstrateStoryFil':'SafetyDemonstrateStoryEn',name,'--public','training/bhw-1-8','--with-audio','--captions',`safety-demonstrate/narration-${language}.json`],{stdio:'inherit'});
  const media=ext=>{const p='remotion/out/'+name+ext,h=sha(p);return{path:'/training/bhw-1-8/'+name+'-'+h.slice(0,12)+ext,content_hash:h};};
  const timing=JSON.parse(fs.readFileSync(`remotion/public/safety-demonstrate/narration-${language}.json`));
  story.videos[language]={...media('.mp4'),duration_s:Math.round(timing.durationSeconds+1.1),poster:media('-poster.jpg'),captions:media('.vtt')};
  if(language==='fil')Object.assign(story,media('-poster.jpg'));
 }
 lesson.assets=lesson.assets.filter(a=>a.id!==story.id).concat(story);lesson.featured_asset_id=story.id;fs.writeFileSync(leaf,JSON.stringify(lesson,null,2)+'\n');
 const report=JSON.parse(fs.readFileSync('docs/lesson-184-media-generation.json'));report.story_status='two actual H.264/AAC draft stories generated; reviews pending';report.story_videos=story.videos;fs.writeFileSync('docs/lesson-184-media-generation.json',JSON.stringify(report,null,2)+'\n');
}
