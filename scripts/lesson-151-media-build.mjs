#!/usr/bin/env node
// Draft review artifacts only, with the existing repository Gemini secret.
// Target-only bilingual relationships story, with measured duration.
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
const lessonPath='content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lessons/bhw-relationships/lesson.json';
const narrationPath='content/training/day1-basic-competencies/narration.json';
const allowed=['bhw-relationships'];
const original=json(narrationPath);
original.history ??= {};
original.history['bhw-relationships'] ??= [];
if(!original.history['bhw-relationships'].some(h=>JSON.stringify(h)===JSON.stringify(original.lessons['bhw-relationships']))) original.history['bhw-relationships'].push(original.lessons['bhw-relationships']);
save(narrationPath,original);
const args=['--modules','05-bhw-at-barangay','--lessons',allowed.join(',')];
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
const moduleKey='05-bhw-at-barangay';
const {lessons}=loadReferenceModule(path.join(root,'content/training/day1-basic-competencies/modules',moduleKey),path.join(root,'public'));
const plan=planReferenceNarration([{key:moduleKey,lessons}],current,src=>{const p=path.join(root,'public',src.slice(1));return existsSync(p)?sha(p):null;});
const pending=plan.filter(i=>i.lessonKey==='bhw-relationships'&&i.action!=='skip').map(i=>`${i.lessonKey}/${i.sectionId}/${i.language}`);
// Partial Read tracks are reported; keep independently completed story media for a scoped retry.
for(const item of plan.filter(i=>allowed.includes(i.lessonKey)))if(item.voice!=='gemini:gemini-3.8-flash-tts:Kore')throw new Error('Unexpected synthesis provider');
run('scripts/training-narrate.mjs',[...args,'--provider','gemini']);
run('scripts/training-narrate.mjs',args);
for(const lang of ['fil','en'])run('scripts/remotion-bhw-relationships-narrate.mjs',[lang]);
for(const lang of ['fil','en'])for(const ext of ['mp3','json'])if(!existsSync(path.join(root,`remotion/public/bhw-relationships/narration-${lang}.${ext}`)))throw new Error('Story files missing');
if(!existsSync(path.join(root,'remotion/public/bhw-relationships/scene.png')))throw new Error('Original art missing');
const rootPath=path.join(root,'remotion/src/Root.tsx');
let registry=readFileSync(rootPath,'utf8');
if(!registry.includes('from "./bhw-relationships/BhwRelationshipsStory"'))registry='import {BhwRelationshipsStory, calculateBhwRelationshipsMetadata, RELATIONSHIPS_FPS, RELATIONSHIPS_FALLBACK_DURATION} from "./bhw-relationships/BhwRelationshipsStory";\n'+registry;
if(!registry.includes('id={language === "fil" ? "BhwRelationshipsStoryFil"'))registry=registry.replace('    </>',`      {(["fil", "en"] as const).map((language) => (
        <Composition key={\`bhw-relationships-\${language}\`} id={language === "fil" ? "BhwRelationshipsStoryFil" : "BhwRelationshipsStoryEn"}
          component={BhwRelationshipsStory} calculateMetadata={calculateBhwRelationshipsMetadata}
          durationInFrames={RELATIONSHIPS_FALLBACK_DURATION} fps={RELATIONSHIPS_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
    </>`);
writeFileSync(rootPath,registry);
const lesson=json(lessonPath);
const story={id:'bhw-relationships-story',alt_fil:'Kuwentong may salaysay: nakikinig si Malou kay Nena sa bakuran, ipinapaliwanag ang apat na ugnayan at pinaghihiwalay ang propesyonal at praktikal na suporta.',alt_en:'Narrated story: Malou listens to Nena in the courtyard, explains four relationships and separates professional and practical support.',caption_fil:'Anim na kathang-isip na story beat na may Gemini narration at captions. Draft; hinihintay ang owner review.',caption_en:'Six fictional story beats with Gemini narration and captions. Draft awaiting owner review.',provenance:'Original Remotion animation for lesson1.5.1 using genuinely new built-in imagegen Malou courtyard artwork generated6 October2026 without reference inputs. This fictional identity remains draft, not owner-approved. Gemini TTS model gemini-3.8-flash-tts, voice Kore. Encoded MP3 sample counts set duration; scene boundaries and captions derive from actual synthesis timings. One original illustration is reframed between conversation, coordination and wide views, with animated role cards. No actual local procedure, owner approval or independent policy SME approval is claimed.',review_status:'draft',videos:{}};
const reports=[];
const previous=existsSync(path.join(root,'docs/lesson-151-media-generation.json'))?json('docs/lesson-151-media-generation.json'):null;
const inputFiles=['remotion/src/bhw-relationships/BhwRelationshipsStory.tsx','remotion/src/bhw-relationships/narration.ts','scripts/remotion-render.mjs','remotion/public/bhw-relationships/scene.png',...['fil','en'].flatMap(lang=>['mp3','json'].map(ext=>`remotion/public/bhw-relationships/narration-${lang}.${ext}`))];
const renderInputHash=createHash('sha256').update(JSON.stringify(inputFiles.map(p=>[p,sha(path.join(root,p))]))).digest('hex');
const oldStory=lesson.assets.find(a=>a.id===story.id);
const cached=previous?.render_input_sha256===renderInputHash&&oldStory&&['fil','en'].every(lang=>[oldStory.videos[lang],oldStory.videos[lang].poster,oldStory.videos[lang].captions].every(m=>existsSync(path.join(root,'public',m.path.slice(1)))&&sha(path.join(root,'public',m.path.slice(1)))===m.content_hash));

const publicDir=path.join(root,'public/training/bhw-1-5');
for(const lang of ['fil','en']){
  if(cached){story.videos[lang]=oldStory.videos[lang];if(lang==='fil'){story.path=oldStory.path;story.content_hash=oldStory.content_hash;}reports.push({...previous.reports.find(r=>r.language===lang),render_reused_exact_input_hash:true});continue;}
  const name=`bhw-relationships-gemini-${lang}`;
  run('scripts/remotion-render.mjs',[lang==='fil'?'BhwRelationshipsStoryFil':'BhwRelationshipsStoryEn',name,'--public','training/bhw-1-5','--with-audio','--captions',`bhw-relationships/narration-${lang}.json`]);
  const media=ext=>{const p=path.join(root,'remotion/out',name+ext);const filename=name+'-'+sha(p).slice(0,12)+ext;if(!readdirSync(publicDir).includes(filename))throw new Error('Rendered public media missing');return{path:'/training/bhw-1-5/'+filename,content_hash:sha(p)};};
  const timing=json(`remotion/public/bhw-relationships/narration-${lang}.json`);
  const duration=Math.round(Math.round((timing.durationSeconds*1000+1100)*30/1000)/30);
  story.videos[lang]={...media('.mp4'),duration_s:duration,captions:media('.vtt'),poster:media('-poster.jpg')};
  if(lang==='fil')Object.assign(story,media('-poster.jpg'));
  reports.push({language:lang,provider:'gemini',model:'gemini-3.8-flash-tts',voice:'Kore',narration_duration_seconds:timing.durationSeconds,beats:timing.beats,video:story.videos[lang],poster:media('-poster.jpg')});
}
lesson.featured_asset_id=story.id;
lesson.assets=lesson.assets.filter(a=>a.id!==story.id).concat(story);
save(lessonPath,lesson);
if(!pending.length){
  const durations=Object.fromEntries(['fil','en'].map(lang=>[lang,plan.filter(i=>i.lessonKey==='bhw-relationships'&&i.language===lang).reduce((sum,i)=>sum+i.existing.duration_seconds,0)]));
  const low=Math.ceil(Math.max(...Object.values(durations))/60+3),high=low+3;
  for(const lang of ['fil','en']){
    const guide=path.join(root,path.dirname(lessonPath),`facilitator.${lang}.md`);
    const estimate=lang==='en'?`Authored independent estimate: ${low}–${high} minutes. Actual encoded six-screen narration is ${durations.en.toFixed(2)} seconds in English and ${durations.fil.toFixed(2)} seconds in Filipino; add3–6 minutes for the check and reflection. Optional story/replay is additional.`:`Ginawang pagtataya ng sariling pag-aaral: ${low}–${high} minuto. Aktuwal na encoded narration ng anim na screen: ${durations.en.toFixed(2)} segundo sa English at ${durations.fil.toFixed(2)} segundo sa Filipino; dagdag3–6 minuto para sa check at pagninilay. Dagdag pa ang opsyonal na kuwento o pag-ulit.`;
    writeFileSync(guide,readFileSync(guide,'utf8').replace('SELF_STUDY_TIMING_PENDING',estimate));
  }
}
save('docs/lesson-151-media-generation.json',{generated_date:new Date().toISOString(),source_commit:process.env.GITHUB_SHA??null,owner_review:'pending',render_input_sha256:renderInputHash,render_cached:cached,target_read_tracks:12,pending_read_tracks:pending,read_generation_error:readGenerationError,historical_audio_restored:deleted,reports});
console.log('Completed draft lesson media; only target recordings changed, with historical media retained.');
if(pending.length)process.exitCode=1;
