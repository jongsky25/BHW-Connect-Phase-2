import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {loadReferenceModule} from './lib/reference-content.mjs';
import {wordingReleases,applyFeedbackWordingRelease} from './lib/feedback-wording-release.mjs';
import {planReferenceNarration,renderNarration,sha256} from './lib/reference-narration.mjs';
import {synthesizeWithGemini} from './lib/tts-providers/gemini.mjs';

// Generate only changed section/language pairs. Original recordings and manifest
// stay byte-for-byte intact for historical/pinned revisions.
const old=JSON.parse(readFileSync('content/training/day1-basic-competencies/narration.json'));
const path='src/lib/elearning/feedback-wording-narration.json';
const next=JSON.parse(readFileSync(path));
for(const r of wordingReleases){
  const lesson=loadReferenceModule('content/training/day1-basic-competencies/modules/'+r.module_key,'public').lessons.find(l=>l.manifest.lesson_key===r.lesson_key);
  const changed=applyFeedbackWordingRelease(lesson);
  const selected=new Set(r.edits.filter(e=>e.collection==='read_sections').map(e=>e.id+':'+e.field.split('_').at(-1)));
  const plan=planReferenceNarration([{key:r.module_key,lessons:[changed]}],old,()=>null,{provider:'gemini'});
  next.lessons[r.lesson_key]??={module:r.module_key,sections:{}};
  for(const item of plan.filter(i=>selected.has(i.sectionId+':'+i.language))){
    const existing=next.lessons[r.lesson_key].sections[item.sectionId]?.[item.language];
    if(existing?.content_hash===item.contentHash)continue;
    const audio=await renderNarration(item,{synthesizeWithGemini,geminiApiKey:process.env.GEMINI_API_KEY});
    mkdirSync('public'+item.src.slice(0,item.src.lastIndexOf('/')),{recursive:true});
    writeFileSync('public'+item.src,audio.bytes);
    const artifact='feedback-wording-media/public'+item.src;
    mkdirSync(artifact.slice(0,artifact.lastIndexOf('/')),{recursive:true});
    copyFileSync('public'+item.src,artifact);
    next.lessons[r.lesson_key].sections[item.sectionId]??={};
    next.lessons[r.lesson_key].sections[item.sectionId][item.language]={src:item.src,voice:item.voice,content_hash:item.contentHash,sha256:sha256(audio.bytes),duration_seconds:audio.durationSeconds,timings:audio.timings};
    writeFileSync(path,JSON.stringify(next,null,2)+'\n');
    mkdirSync('feedback-wording-media/src/lib/elearning',{recursive:true});
    copyFileSync(path,'feedback-wording-media/'+path);
    console.log('Generated',r.lesson_key,item.sectionId,item.language,audio.durationSeconds);
  }
}
