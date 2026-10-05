#!/usr/bin/env node
// Draft review artifacts only, with the existing repository Gemini secret.
// BHWE-specific bilingual story scripts preserve scope within the duration budget.
// No database, deployment, approval, commit or publication operations.
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadReferenceModule} from './lib/reference-content.mjs';
import {planReferenceNarration} from './lib/reference-narration.mjs';
const root=path.resolve(import.meta.dirname,'..');
const run=(script,args=[])=>execFileSync(process.execPath,[path.join(root,script),...args],{cwd:root,stdio:'inherit'});
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const json=p=>JSON.parse(readFileSync(path.join(root,p),'utf8'));
const save=(p,j)=>writeFileSync(path.join(root,p),JSON.stringify(j,null,2)+'\n');
if(!process.env.GEMINI_API_KEY)throw new Error('Existing repository GEMINI_API_KEY secret is unavailable. No replacement provider is authorized.');
const lessonPath='content/training/day1-basic-competencies/modules/04-ra7883/lessons/bhw-eligibility/lesson.json';
const narrationPath='content/training/day1-basic-competencies/narration.json';
const allowed=['bhw-eligibility'];
const original=json(narrationPath);
original.history ??= {};
original.history['bhw-eligibility'] ??= [];
if(!original.history['bhw-eligibility'].some(h=>JSON.stringify(h)===JSON.stringify(original.lessons['bhw-eligibility']))) original.history['bhw-eligibility'].push(original.lessons['bhw-eligibility']);
save(narrationPath,original);
const args=['--modules','04-ra7883','--lessons',allowed.join(',')];
let deleted=[];
let readGenerationError=null;
try{
  run('scripts/training-narrate.mjs',[...args,'--provider','gemini']);
  run('scripts/training-narrate.mjs',[...args,'--provider','gemini','--max-requests','300','--apply']);
}catch(error){
  readGenerationError=String(error.message).split('\n')[0];
  console.error('Some target Read tracks may be incomplete; saving completed media for scoped retry.');
}finally{
  // Restore ALL tracked historical files pruned by the module-wide cleanup.
  deleted=execFileSync('git',['ls-files','--deleted','-z','--','public/training/audio'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
  if(deleted.length)execFileSync('git',['restore','--',...deleted],{cwd:root,stdio:'inherit'});
}
const current=json(narrationPath);
for(const key of Object.keys(original.lessons))if(!allowed.includes(key)&&JSON.stringify(original.lessons[key])!==JSON.stringify(current.lessons[key]))throw new Error('Unexpected sibling narration change: '+key);
const moduleKey='04-ra7883';
const {lessons}=loadReferenceModule(path.join(root,'content/training/day1-basic-competencies/modules',moduleKey),path.join(root,'public'));
const plan=planReferenceNarration([{key:moduleKey,lessons}],current,src=>{const p=path.join(root,'public',src.slice(1));return existsSync(p)?sha(p):null;});
const pending=plan.filter(i=>i.lessonKey==='bhw-eligibility'&&i.action!=='skip').map(i=>`${i.lessonKey}/${i.sectionId}/${i.language}`);
// Partial Read tracks are reported; keep independently completed story media for a scoped retry.
for(const item of plan.filter(i=>allowed.includes(i.lessonKey)))if(item.voice!=='gemini:gemini-3.8-flash-tts:Kore')throw new Error('Unexpected synthesis provider');
run('scripts/training-narrate.mjs',[...args,'--provider','gemini']);
run('scripts/training-narrate.mjs',args);
for(const lang of ['fil','en'])run('scripts/remotion-bhw-eligibility-narrate.mjs',[lang]);
for(const lang of ['fil','en'])for(const ext of ['mp3','json'])if(!existsSync(path.join(root,`remotion/public/bhw-eligibility/narration-${lang}.${ext}`)))throw new Error('Story files missing');
if(!existsSync(path.join(root,'remotion/public/bhw-eligibility/scene.png')))throw new Error('Original art missing');
const rootPath=path.join(root,'remotion/src/Root.tsx');
let registry=readFileSync(rootPath,'utf8');
if(!registry.includes('from "./bhw-eligibility/BhwEligibilityStory"'))registry='import {BhwEligibilityStory, calculateBhwEligibilityMetadata, ELIGIBILITY_FPS, ELIGIBILITY_FALLBACK_DURATION} from "./bhw-eligibility/BhwEligibilityStory";\n'+registry;
if(!registry.includes('id={language === "fil" ? "BhwEligibilityStoryFil"'))registry=registry.replace('    </>',`      {(["fil", "en"] as const).map((language) => (
        <Composition key={\`bhw-eligibility-\${language}\`} id={language === "fil" ? "BhwEligibilityStoryFil" : "BhwEligibilityStoryEn"}
          component={BhwEligibilityStory} calculateMetadata={calculateBhwEligibilityMetadata}
          durationInFrames={ELIGIBILITY_FALLBACK_DURATION} fps={ELIGIBILITY_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
    </>`);
writeFileSync(rootPath,registry);
const lesson=json(lessonPath);
const story={id:'bhw-eligibility-story',alt_fil:'Kuwentong may salaysay: ipinaliliwanag ni Demi ang BHWE conditions, accredited-service count at tiyak na CSC verification.',alt_en:'Narrated story: Demi distinguishes BHWE conditions and accredited-service counts and asks a specific CSC question.',caption_fil:'Anim na tagpong kathang-isip na may Gemini narration at captions. Draft; hinihintay ang owner review.',caption_en:'Six fictional scenes with Gemini narration and captions. Draft awaiting owner review.',provenance:'Original Remotion animation for lesson 1.4.3; original built-in imagegen illustration generated 2026-10-05, derived from the owner-approved fictional Demi reference identity. Gemini TTS model gemini-3.8-flash-tts, voice Kore. Encoded MP3 sample counts set duration; scene boundaries come from the synthesis timings, authored script/timing text is preserved and captions derive from those timings. New media are draft; no owner or independent policy SME approval.',review_status:'draft',videos:{}};
const reports=[];
const publicDir=path.join(root,'public/training/bhw-1-4');
for(const lang of ['fil','en']){
  const name=`bhw-eligibility-gemini-${lang}`;
  run('scripts/remotion-render.mjs',[lang==='fil'?'BhwEligibilityStoryFil':'BhwEligibilityStoryEn',name,'--public','training/bhw-1-4','--with-audio','--captions',`bhw-eligibility/narration-${lang}.json`]);
  const media=ext=>{const p=path.join(root,'remotion/out',name+ext);const filename=name+'-'+sha(p).slice(0,12)+ext;if(!readdirSync(publicDir).includes(filename))throw new Error('Rendered public media missing');return{path:'/training/bhw-1-4/'+filename,content_hash:sha(p)};};
  const timing=json(`remotion/public/bhw-eligibility/narration-${lang}.json`);
  const duration=Math.round(Math.round((timing.durationSeconds*1000+1100)*30/1000)/30);
  story.videos[lang]={...media('.mp4'),duration_s:duration,captions:media('.vtt'),poster:media('-poster.jpg')};
  if(lang==='fil')Object.assign(story,media('-poster.jpg'));
  reports.push({language:lang,provider:'gemini',model:'gemini-3.8-flash-tts',voice:'Kore',narration_duration_seconds:timing.durationSeconds,beats:timing.beats,video:story.videos[lang],poster:media('-poster.jpg')});
}
lesson.featured_asset_id=story.id;
lesson.assets=lesson.assets.filter(a=>a.id!==story.id).concat(story);
save(lessonPath,lesson);
save('docs/lesson-143-media-generation.json',{generated_date:new Date().toISOString(),source_commit:process.env.GITHUB_SHA??null,owner_review:'pending',target_read_tracks:12,pending_read_tracks:pending,read_generation_error:readGenerationError,historical_audio_restored:deleted,reports});
console.log('Completed draft lesson media; only target recordings changed, with historical media retained.');
if(pending.length)process.exitCode=1;
