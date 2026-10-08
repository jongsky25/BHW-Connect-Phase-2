#!/usr/bin/env node
// Draft review artifacts only, with the existing repository Gemini secret.
// Target-only bilingual teamwork story, with measured duration.
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
const lessonPath='content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lessons/bhw-teamwork/lesson.json';
const narrationPath='content/training/day1-basic-competencies/narration.json';
const allowed=['bhw-teamwork'];
const original=json(narrationPath);
original.history ??= {};
original.history['bhw-teamwork'] ??= [];
const beforeLessons=loadReferenceModule(path.join(root,'content/training/day1-basic-competencies/modules/05-bhw-at-barangay'),path.join(root,'public')).lessons;
const needsReadUpdate=planReferenceNarration([{key:'05-bhw-at-barangay',lessons:beforeLessons}],original,src=>{const p=path.join(root,'public',src.slice(1));return existsSync(p)?sha(p):null;},{provider:'gemini'}).some(i=>i.lessonKey==='bhw-teamwork'&&i.action!=='skip');
if((original.history['bhw-teamwork'].length===0||needsReadUpdate)&&!original.history['bhw-teamwork'].some(h=>JSON.stringify(h)===JSON.stringify(original.lessons['bhw-teamwork']))) original.history['bhw-teamwork'].push(original.lessons['bhw-teamwork']);
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
const pending=plan.filter(i=>i.lessonKey==='bhw-teamwork'&&i.action!=='skip').map(i=>`${i.lessonKey}/${i.sectionId}/${i.language}`);
// Partial Read tracks are reported; keep independently completed story media for a scoped retry.
for(const item of plan.filter(i=>allowed.includes(i.lessonKey)))if(item.voice!=='gemini:gemini-3.8-flash-tts:Kore')throw new Error('Unexpected synthesis provider');
run('scripts/training-narrate.mjs',[...args,'--provider','gemini']);
run('scripts/training-narrate.mjs',args);
for(const lang of ['fil','en'])run('scripts/remotion-bhw-teamwork-narrate.mjs',[lang]);
for(const lang of ['fil','en'])for(const ext of ['mp3','json'])if(!existsSync(path.join(root,`remotion/public/bhw-teamwork/narration-${lang}.${ext}`)))throw new Error('Story files missing');
if(!existsSync(path.join(root,'remotion/public/bhw-teamwork/scene.png')))throw new Error('New teamwork art missing');
const rootPath=path.join(root,'remotion/src/Root.tsx');
let registry=readFileSync(rootPath,'utf8');
if(!registry.includes('from "./bhw-teamwork/BhwTeamworkStory"'))registry='import {BhwTeamworkStory, calculateBhwTeamworkMetadata, TEAMWORK_FPS, TEAMWORK_FALLBACK_DURATION} from "./bhw-teamwork/BhwTeamworkStory";\n'+registry;
if(!registry.includes('id={language === "fil" ? "BhwTeamworkStoryFil"'))registry=registry.replace('    </>',`      {(["fil", "en"] as const).map((language) => (
        <Composition key={\`bhw-teamwork-\${language}\`} id={language === "fil" ? "BhwTeamworkStoryFil" : "BhwTeamworkStoryEn"}
          component={BhwTeamworkStory} calculateMetadata={calculateBhwTeamworkMetadata}
          durationInFrames={TEAMWORK_FALLBACK_DURATION} fps={TEAMWORK_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
    </>`);
writeFileSync(rootPath,registry);
const lesson=json(lessonPath);
const story={id:'bhw-teamwork-story',alt_fil:'Anim na salaysay na hakbang ng malinaw na pagtutulungan at handoff ni Malou.',alt_en:'Six narrated steps showing Malou’s clear teamwork and handoff.',caption_fil:'Kathang-isip na kuwentong draft; hiwalay na pagrepaso ang kailangan.',caption_en:'Fictional draft story; separate review required.',provenance:'Original lesson1.5.4 teamwork story using new built-in imagegen scene with approved Malou identity as input. Gemini gemini-3.8-flash-tts Kore; measured encoded audio boundaries, varied framing and animated task labels. No real records, human listening, owner approval or SME signoff claimed.',review_status:'draft',videos:{}};
const reports=[];
const previous=existsSync(path.join(root,'docs/lesson-154-media-generation.json'))?json('docs/lesson-154-media-generation.json'):null;
const inputFiles=['remotion/src/bhw-teamwork/BhwTeamworkStory.tsx','remotion/src/bhw-teamwork/narration.ts','scripts/remotion-render.mjs','remotion/public/bhw-teamwork/scene.png',...['fil','en'].flatMap(lang=>['mp3','json'].map(ext=>`remotion/public/bhw-teamwork/narration-${lang}.${ext}`))];
const renderInputHash=createHash('sha256').update(JSON.stringify(inputFiles.map(p=>[p,sha(path.join(root,p))]))).digest('hex');
const oldStory=lesson.assets.find(a=>a.id===story.id);
const cached=previous?.render_input_sha256===renderInputHash&&oldStory&&['fil','en'].every(lang=>[oldStory.videos[lang],oldStory.videos[lang].poster,oldStory.videos[lang].captions].every(m=>existsSync(path.join(root,'public',m.path.slice(1)))&&sha(path.join(root,'public',m.path.slice(1)))===m.content_hash));

const publicDir=path.join(root,'public/training/bhw-1-5');
for(const lang of ['fil','en']){
  if(cached){story.videos[lang]=oldStory.videos[lang];if(lang==='fil'){story.path=oldStory.path;story.content_hash=oldStory.content_hash;}reports.push({...previous.reports.find(r=>r.language===lang),render_reused_exact_input_hash:true});continue;}
  const name=`bhw-teamwork-gemini-${lang}`;
  run('scripts/remotion-render.mjs',[lang==='fil'?'BhwTeamworkStoryFil':'BhwTeamworkStoryEn',name,'--public','training/bhw-1-5','--with-audio','--captions',`bhw-teamwork/narration-${lang}.json`]);
  const media=ext=>{const p=path.join(root,'remotion/out',name+ext);const filename=name+'-'+sha(p).slice(0,12)+ext;if(!readdirSync(publicDir).includes(filename))throw new Error('Rendered public media missing');return{path:'/training/bhw-1-5/'+filename,content_hash:sha(p)};};
  const timing=json(`remotion/public/bhw-teamwork/narration-${lang}.json`);
  const duration=Math.round(Math.round((timing.durationSeconds*1000+1100)*30/1000)/30);
  story.videos[lang]={...media('.mp4'),duration_s:duration,captions:media('.vtt'),poster:media('-poster.jpg')};
  if(lang==='fil')Object.assign(story,media('-poster.jpg'));
  reports.push({language:lang,provider:'gemini',model:'gemini-3.8-flash-tts',voice:'Kore',narration_duration_seconds:timing.durationSeconds,beats:timing.beats,video:story.videos[lang],poster:media('-poster.jpg')});
}
lesson.featured_asset_id=story.id;
lesson.assets=lesson.assets.filter(a=>a.id!==story.id).concat(story);
save(lessonPath,lesson);
if(!pending.length){
  const durations=Object.fromEntries(['fil','en'].map(lang=>[lang,plan.filter(i=>i.lessonKey==='bhw-teamwork'&&i.language===lang).reduce((sum,i)=>sum+i.existing.duration_seconds,0)]));
  for(const lang of ['fil','en']){
    const low=Math.ceil(durations[lang]/60+3),high=low+3;
    const guide=path.join(root,path.dirname(lessonPath),`facilitator.${lang}.md`);
    const estimate=lang==='en'?`Authored independent estimate: ${low}–${high} minutes. Actual six-screen narration is ${durations.en.toFixed(2)} seconds in English and ${durations.fil.toFixed(2)} seconds in Filipino; allow 3–6 minutes for the check and reflection. Optional story or replay is additional.`:`Ginawang pagtataya ng sariling pag-aaral: ${low}–${high} minuto. Aktuwal na salaysay ng anim na screen: ${durations.en.toFixed(2)} segundo sa English at ${durations.fil.toFixed(2)} segundo sa Filipino; maglaan ng 3–6 minuto para sa check at pagninilay. Dagdag pa ang opsyonal na kuwento o pag-ulit.`;
    writeFileSync(guide,readFileSync(guide,'utf8').replace(/SELF_STUDY_TIMING_PENDING|Authored independent estimate:[^\n]+|Ginawang pagtataya ng sariling pag-aaral:[^\n]+/g,estimate));
  }
}
save('docs/lesson-154-media-generation.json',{generated_date:new Date().toISOString(),source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),owner_review:'pending',render_input_sha256:renderInputHash,render_cached:cached,target_read_tracks:12,pending_read_tracks:pending,read_generation_error:readGenerationError,historical_audio_restored:deleted,reports});
console.log('Completed draft lesson media; only target recordings changed, with historical media retained.');
if(pending.length)process.exitCode=1;
