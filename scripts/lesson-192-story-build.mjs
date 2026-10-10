// Generate and append only the two actual draft story assets; no publication.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),leaf='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-safe-change/lesson.json';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const reference=JSON.parse(fs.readFileSync('docs/lesson-19-charlaine-reference.json'));
if(sha('public'+reference.path)!==reference.sha256)throw Error('Unpinned shared reference');
const provenance=JSON.parse(fs.readFileSync('docs/lesson-192-scene-provenance.json'));
if(provenance.reference_sha256!==reference.sha256||provenance.attempts.filter(a=>!a.superseded).length!==6)throw Error('Missing coordinated scene provenance');
for(const a of provenance.attempts.filter(a=>!a.superseded))if(sha(a.output_path)!==a.output_sha256||sha(`remotion/public/resources-safe-change/${a.id}.png`)!==a.output_sha256)throw Error('Scene source mismatch '+a.id);
const story={id:'resources-safe-change-story',alt_fil:'Anim na beat ng fictional safe-change proposal ni Charlaine, may safeguards at unknown approval/savings.',alt_en:'Six beats of Charlaine’s fictional safe-change proposal, preserving safeguards with approval/savings unknown.',caption_fil:'Kathang-isip na proposal; walang inaangking approval, savings o repair completion.',caption_en:'Fictional proposal; no approval, savings or repair completion is claimed.',provenance:'Pinned built-in imagegen Charlaine scenes with measured Gemini Kore narration, H.264/AAC and six matching WebVTT cues; exact package remains draft.',review_status:'draft',videos:{}};
for(const language of ['fil','en'])execFileSync(process.execPath,['scripts/remotion-resources-safe-change-narrate.mjs',language],{cwd:root,stdio:'inherit'});
for(const language of ['fil','en']){
 const name='resources-safe-change-gemini-'+language;
 execFileSync(process.execPath,['scripts/remotion-render.mjs',language==='fil'?'ResourcesSafeChangeStoryFil':'ResourcesSafeChangeStoryEn',name,'--public','training/bhw-1-9','--with-audio','--captions',`resources-safe-change/narration-${language}.json`],{cwd:root,stdio:'inherit'});
 const media=ext=>{const p='remotion/out/'+name+ext,h=sha(p);return{path:'/training/bhw-1-9/'+name+'-'+h.slice(0,12)+ext,content_hash:h}};
 const timing=JSON.parse(fs.readFileSync(`remotion/public/resources-safe-change/narration-${language}.json`));
 story.videos[language]={...media('.mp4'),duration_s:Math.round(timing.durationSeconds+1.1),poster:media('-poster.jpg'),captions:media('.vtt')};
 if(language==='fil')Object.assign(story,media('-poster.jpg'));
}
const lesson=JSON.parse(fs.readFileSync(leaf));lesson.assets=lesson.assets.filter(a=>a.id!==story.id).concat(story);lesson.featured_asset_id=story.id;fs.writeFileSync(leaf,JSON.stringify(lesson,null,2)+'\n');
fs.writeFileSync('docs/lesson-192-story-generation.json',JSON.stringify({source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),generated_at:new Date().toISOString(),status:'two actual draft H.264/AAC stories generated',videos:story.videos,owner_approval:false,human_listening:'pending',facility_review:'pending'},null,2)+'\n');
