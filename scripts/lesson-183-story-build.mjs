// Append only renderable draft compositions; no existing registry entry is changed.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(script,args)=>execFileSync(process.execPath,[script,...args],{cwd:root,stdio:'inherit'});
const registryPath=root+'/remotion/src/Root.tsx';
let registry=fs.readFileSync(registryPath,'utf8');
for(const lang of ['fil','en'])for(const ext of ['mp3','json'])if(!fs.existsSync(root+`/remotion/public/safety-prepare/narration-${lang}.${ext}`))throw Error('Actual measured story narration required');
for(const id of ['station-preparation','field-preparation','combined-hazards','verify-readiness','practice','check'])if(!fs.existsSync(root+`/remotion/public/safety-prepare/${id}.png`))throw Error('Pinned scene missing');
const predecessor=sha(registryPath);
if(!registry.includes('SafetyPrepareStoryFil')){
 registry="import {SafetyPrepareStory, calculateSafetyPrepareMetadata, SAFETY_PREPARE_FALLBACK_DURATION, SAFETY_PREPARE_FPS} from './safety-prepare/SafetyPrepareStory';\n"+registry;
 registry=registry.replace('    </>',`      {(["fil", "en"] as const).map((language) => (
        <Composition key={\`safety-prepare-\${language}\`} id={language === "fil" ? "SafetyPrepareStoryFil" : "SafetyPrepareStoryEn"}
          component={SafetyPrepareStory} calculateMetadata={calculateSafetyPrepareMetadata}
          durationInFrames={SAFETY_PREPARE_FALLBACK_DURATION} fps={SAFETY_PREPARE_FPS} width={854} height={480}
          defaultProps={{language}}/>
      ))}
    </>`);
 fs.writeFileSync(registryPath,registry);
}
const leaf=root+'/content/training/day1-basic-competencies/modules/08-osh/lessons/safety-prepare/lesson.json';
const lesson=JSON.parse(fs.readFileSync(leaf));
const asset={id:'safety-prepare-story',alt_fil:'Anim na hakbang ni Apple: paghahanda, ruta, pasya, beripikasyon, retry at alternatibong may hindi pa tiyak.',alt_en:'Apple’s six steps: preparation, route, decision, verification, retry and an alternative with unresolved conditions.',caption_fil:'Kathang-isip na role-play: briefing muna; deferred ang visit habang hindi pa ready.',caption_en:'Fictional role-play: briefing first; visit deferred while conditions remain unready.',provenance:'Original six-scene Remotion adaptation using hash-pinned shared Apple reference and Gemini Kore narration. Measured beat boundaries and actual final-frame poster. Human listening, clinical and owner reviews pending.',review_status:'draft',videos:{}};
const reports=[];
for(const lang of ['fil','en']){
 const name='safety-prepare-gemini-'+lang;
 run('scripts/remotion-render.mjs',[lang==='fil'?'SafetyPrepareStoryFil':'SafetyPrepareStoryEn',name,'--public','training/bhw-1-8','--with-audio','--captions',`safety-prepare/narration-${lang}.json`]);
 const media=ext=>{const p=root+'/remotion/out/'+name+ext,h=sha(p);return {path:'/training/bhw-1-8/'+name+'-'+h.slice(0,12)+ext,content_hash:h};};
 const timing=JSON.parse(fs.readFileSync(root+`/remotion/public/safety-prepare/narration-${lang}.json`));
 const video=media('.mp4');
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',root+'/public'+video.path],{encoding:'utf8'}));
 if(!probe.streams.some(s=>s.codec_name==='h264'&&s.width===854&&s.height===480)||!probe.streams.some(s=>s.codec_name==='aac'))throw Error('Wrong actual encoded story format');
 asset.videos[lang]={...video,duration_s:Number(probe.format.duration),poster:media('-poster.jpg'),captions:media('.vtt')};
 if(lang==='fil')Object.assign(asset,media('-poster.jpg'));
 reports.push({language:lang,timing,encoded_probe:probe,video:asset.videos[lang]});
}
lesson.assets=lesson.assets.filter(a=>a.id!==asset.id).concat(asset);lesson.featured_asset_id=asset.id;
fs.writeFileSync(leaf,JSON.stringify(lesson,null,2)+'\n');
fs.writeFileSync(root+'/docs/lesson-183-story-generation.json',JSON.stringify({status:'generated draft',source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),registry_predecessor_sha256:predecessor,registry_successor_sha256:sha(registryPath),reports,human_listening:'pending',clinical_review:'pending',owner_review:'pending'},null,2)+'\n');
