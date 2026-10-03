#!/usr/bin/env node
// Build only this draft package using the repository's existing Gemini secret.
// No database, deployment, approval, commit or publication operations.
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const run=(script,args=[])=>execFileSync(process.execPath,[path.join(root,script),...args],{cwd:root,stdio:'inherit'});
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const json=p=>JSON.parse(readFileSync(path.join(root,p),'utf8'));
const save=(p,j)=>writeFileSync(path.join(root,p),JSON.stringify(j,null,2)+'\n');
if(!process.env.GEMINI_API_KEY)throw new Error('Existing repository GEMINI_API_KEY secret is unavailable. No replacement provider is authorised.');
const lessonPath='content/training/day1-basic-competencies/modules/02-uhc-act/lessons/uhc-local-system/lesson.json';
const narrationPath='content/training/day1-basic-competencies/narration.json';
const original=json(narrationPath);
const args=['--modules','02-uhc-act','--lessons','uhc-local-system'];
run('scripts/training-narrate.mjs',[...args,'--provider','gemini']);
run('scripts/training-narrate.mjs',[...args,'--provider','gemini','--max-requests','300','--apply']);
// The historical module-wide cleanup must never remove older public media.
const deleted=execFileSync('git',['ls-files','--deleted','-z','--','public/training/audio'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
if(deleted.length)execFileSync('git',['restore','--',...deleted],{cwd:root,stdio:'inherit'});
const current=json(narrationPath);
for(const key of Object.keys(original.lessons))if(key!=='uhc-local-system'&&JSON.stringify(original.lessons[key])!==JSON.stringify(current.lessons[key]))throw new Error('Unexpected sibling narration change: '+key);
const sectionIds=json(lessonPath).sections.map(s=>s.id);
for(const id of sectionIds)for(const lang of ['fil','en']){
  const track=current.lessons['uhc-local-system'].sections[id]?.[lang];
  if(track?.voice!=='gemini:gemini-3.8-flash-tts:Kore'||sha(path.join(root,'public',track.src.slice(1)))!==track.sha256)throw new Error('Missing or incorrect Gemini track '+id+'/'+lang);
}
run('scripts/training-narrate.mjs',[...args,'--provider','gemini']);
run('scripts/training-narrate.mjs',args);
for(const lang of ['fil','en'])run('scripts/remotion-uhc-local-system-narrate.mjs',[lang]);
for(const lang of ['fil','en'])for(const ext of ['mp3','json'])if(!existsSync(path.join(root,`remotion/public/uhc-local-system/narration-${lang}.${ext}`)))throw new Error('Story files missing');
if(!existsSync(path.join(root,'remotion/public/uhc-local-system/scene.png')))throw new Error('Original art missing');
const rootPath=path.join(root,'remotion/src/Root.tsx');
let registry=readFileSync(rootPath,'utf8');
if(!registry.includes('from "./uhc-local-system/LocalSystemStory"'))registry='import {LocalSystemStory, calculateLocalSystemMetadata, LOCAL_SYSTEM_FPS, LOCAL_SYSTEM_FALLBACK_DURATION} from "./uhc-local-system/LocalSystemStory";\n'+registry;
if(!registry.includes('id={language === "fil" ? "LocalSystemStoryFil"'))registry=registry.replace('    </>',`      {(["fil", "en"] as const).map((language) => (
        <Composition key={\`uhc-local-system-\${language}\`} id={language === "fil" ? "LocalSystemStoryFil" : "LocalSystemStoryEn"}
          component={LocalSystemStory} calculateMetadata={calculateLocalSystemMetadata}
          durationInFrames={LOCAL_SYSTEM_FALLBACK_DURATION} fps={LOCAL_SYSTEM_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
    </>`);
writeFileSync(rootPath,registry);
const lesson=json(lessonPath);
const story={id:'local-system-story',alt_fil:'Kuwentong may salaysay: mula sa tanong ng residente hanggang sa lokal na feedback.',alt_en:'Narrated story: from a resident question to local feedback.',caption_fil:'Kathang-isip na anim na tagpo na may Gemini narration at captions. Draft; hinihintay ang owner review.',caption_en:'Six fictional scenes with Gemini narration and captions. Draft awaiting owner review.',provenance:'Original Remotion animation for lesson 1.2.3; original built-in imagegen illustration generated 2026-10-03 with fictional Vlanche/Mang Ernesto/midwife continuity. Gemini TTS model gemini-3.8-flash-tts, voice Kore. Boundaries measured from decoded PCM sample counts; authored script/timing text preserved and captions derived from timings. New media are draft; no owner or independent policy/clinical SME approval.',review_status:'draft',videos:{}};
const reports=[];
const publicDir=path.join(root,'public/training/bhw-1-2');
for(const lang of ['fil','en']){
  const name=`uhc-local-system-gemini-${lang}`;
  run('scripts/remotion-render.mjs',[lang==='fil'?'LocalSystemStoryFil':'LocalSystemStoryEn',name,'--public','training/bhw-1-2','--with-audio','--captions',`uhc-local-system/narration-${lang}.json`]);
  const media=ext=>{const p=path.join(root,'remotion/out',name+ext);return{path:'/training/bhw-1-2/'+readdirSync(publicDir).find(n=>n===name+'-'+sha(p).slice(0,12)+ext),content_hash:sha(p)};};
  const timing=json(`remotion/public/uhc-local-system/narration-${lang}.json`);
  const duration=Math.round((Math.round((timing.durationSeconds*1000+1100)*30/1000))/30);
  story.videos[lang]={...media('.mp4'),duration_s:duration,captions:media('.vtt')};
  if(lang==='fil')Object.assign(story,media('-poster.jpg'));
  reports.push({language:lang,provider:'gemini',model:'gemini-3.8-flash-tts',voice:'Kore',narration_duration_seconds:timing.durationSeconds,beats:timing.beats,video:story.videos[lang],poster:media('-poster.jpg')});
}
lesson.featured_asset_id=story.id;
lesson.assets=lesson.assets.filter(a=>a.id!==story.id).concat(story);
save(lessonPath,lesson);
save('docs/lesson-123-media-generation.json',{generated_date:'2026-10-03',source_commit:process.env.GITHUB_SHA??null,owner_review:'pending',read_tracks:sectionIds.length*2,historical_audio_restored:deleted,reports});
console.log('Completed draft media package for uhc-local-system only.');
