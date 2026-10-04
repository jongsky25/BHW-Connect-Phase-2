#!/usr/bin/env node
// Draft review artifacts only, with the existing repository Gemini secret.
// Revised concise bilingual story scripts preserve scope within the duration budget.
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
const lessonPath='content/training/day1-basic-competencies/modules/03-polisiya-bhs/lessons/bhs-resources/lesson.json';
const narrationPath='content/training/day1-basic-competencies/narration.json';
const allowed=['bhs-resources'];
const original=json(narrationPath);
original.history ??= {};
original.history['bhs-resources'] ??= [];
if(!original.history['bhs-resources'].some(h=>JSON.stringify(h)===JSON.stringify(original.lessons['bhs-resources']))) original.history['bhs-resources'].push(original.lessons['bhs-resources']);
save(narrationPath,original);
const args=['--modules','03-polisiya-bhs','--lessons',allowed.join(',')];
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
const moduleKey='03-polisiya-bhs';
const {lessons}=loadReferenceModule(path.join(root,'content/training/day1-basic-competencies/modules',moduleKey),path.join(root,'public'));
const plan=planReferenceNarration([{key:moduleKey,lessons}],current,src=>{const p=path.join(root,'public',src.slice(1));return existsSync(p)?sha(p):null;});
const pending=plan.filter(i=>i.lessonKey==='bhs-resources'&&i.action!=='skip').map(i=>`${i.lessonKey}/${i.sectionId}/${i.language}`);
// Partial Read tracks are reported; keep independently completed story media for a scoped retry.
for(const item of plan.filter(i=>allowed.includes(i.lessonKey)))if(item.voice!=='gemini:gemini-3.8-flash-tts:Kore')throw new Error('Unexpected synthesis provider');
run('scripts/training-narrate.mjs',[...args,'--provider','gemini']);
run('scripts/training-narrate.mjs',args);
for(const lang of ['fil','en'])run('scripts/remotion-bhs-resources-narrate.mjs',[lang]);
for(const lang of ['fil','en'])for(const ext of ['mp3','json'])if(!existsSync(path.join(root,`remotion/public/bhs-resources/narration-${lang}.${ext}`)))throw new Error('Story files missing');
if(!existsSync(path.join(root,'remotion/public/bhs-resources/scene.png')))throw new Error('Original art missing');
const rootPath=path.join(root,'remotion/src/Root.tsx');
let registry=readFileSync(rootPath,'utf8');
if(!registry.includes('from "./bhs-resources/BhsResourcesStory"'))registry='import {BhsResourcesStory, calculateBhsResourcesMetadata, RESOURCES_FPS, RESOURCES_FALLBACK_DURATION} from "./bhs-resources/BhsResourcesStory";\n'+registry;
if(!registry.includes('id={language === "fil" ? "BhsResourcesStoryFil"'))registry=registry.replace('    </>',`      {(["fil", "en"] as const).map((language) => (
        <Composition key={\`bhs-resources-\${language}\`} id={language === "fil" ? "BhsResourcesStoryFil" : "BhsResourcesStoryEn"}
          component={BhsResourcesStory} calculateMetadata={calculateBhsResourcesMetadata}
          durationInFrames={RESOURCES_FALLBACK_DURATION} fps={RESOURCES_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
    </>`);
writeFileSync(rootPath,registry);
const lesson=json(lessonPath);
const story={id:'bhs-resources-story',alt_fil:'Kuwentong may salaysay: sinusuri ni Mimi ang resource concern at nakikipag-ugnayan bago kumilos.',alt_en:'Narrated story: Mimi checks a resource concern and coordinates before acting.',caption_fil:'Anim na tagpong kathang-isip na may Gemini narration at captions. Draft; hinihintay ang owner review.',caption_en:'Six fictional scenes with Gemini narration and captions. Draft awaiting owner review.',provenance:'Original Remotion animation for lesson 1.3.4; original built-in imagegen illustration generated 2026-10-04, using the previously approved fictional Mimi identity as reference. Gemini TTS model gemini-3.8-flash-tts, voice Kore. Encoded MP3 sample counts set duration; scene boundaries come from the synthesis timings, authored script/timing text is preserved and captions derive from those timings. New media are draft; no owner or independent policy SME approval.',review_status:'draft',videos:{}};
const reports=[];
const publicDir=path.join(root,'public/training/bhw-1-3');
for(const lang of ['fil','en']){
  const name=`bhs-resources-gemini-${lang}`;
  run('scripts/remotion-render.mjs',[lang==='fil'?'BhsResourcesStoryFil':'BhsResourcesStoryEn',name,'--public','training/bhw-1-3','--with-audio','--captions',`bhs-resources/narration-${lang}.json`]);
  const media=ext=>{const p=path.join(root,'remotion/out',name+ext);const filename=name+'-'+sha(p).slice(0,12)+ext;if(!readdirSync(publicDir).includes(filename))throw new Error('Rendered public media missing');return{path:'/training/bhw-1-3/'+filename,content_hash:sha(p)};};
  const timing=json(`remotion/public/bhs-resources/narration-${lang}.json`);
  const duration=Math.round(Math.round((timing.durationSeconds*1000+1100)*30/1000)/30);
  story.videos[lang]={...media('.mp4'),duration_s:duration,captions:media('.vtt'),poster:media('-poster.jpg')};
  if(lang==='fil')Object.assign(story,media('-poster.jpg'));
  reports.push({language:lang,provider:'gemini',model:'gemini-3.8-flash-tts',voice:'Kore',narration_duration_seconds:timing.durationSeconds,beats:timing.beats,video:story.videos[lang],poster:media('-poster.jpg')});
}
lesson.featured_asset_id=story.id;
lesson.assets=lesson.assets.filter(a=>a.id!==story.id).concat(story);
save(lessonPath,lesson);
save('docs/lesson-134-media-generation.json',{generated_date:new Date().toISOString(),source_commit:process.env.GITHUB_SHA??null,owner_review:'pending',target_read_tracks:12,pending_read_tracks:pending,read_generation_error:readGenerationError,historical_audio_restored:deleted,reports});
console.log('Completed draft lesson media; only target recordings changed, with historical media retained.');
if(pending.length)process.exitCode=1;
