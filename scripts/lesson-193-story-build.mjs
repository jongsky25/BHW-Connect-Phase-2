// Measured Gemini story narration and H.264/AAC render; append immutable public bytes.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const leaf='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-monitor/lesson.json';
const lesson=JSON.parse(fs.readFileSync(leaf));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const art={id:'resources-monitor-story',alt_fil:'Pitong kathang-isip na beats: panukala, patas na comparison, no-internet master, workload, handover, retry at kwalipikadong ulat.',alt_en:'Seven fictional beats: proposal, fair comparison, no-internet master, workload, handover, retry and a qualified report.',caption_fil:'Kathang-isip na adaptation. Walang napatunayang savings o matagumpay na trial.',caption_en:'Fictional adaptation. No proven savings or successful trial.',provenance:'Shared draft Charlaine reference; seven built-in imagegen scenes; Gemini Kore audio with measured encoded boundaries; owner/facility/human listening review pending.',review_status:'draft',videos:{}};
for(const lang of ['fil','en']){
 execFileSync(process.execPath,['scripts/remotion-resources-monitor-narrate.mjs',lang],{stdio:'inherit'});
 const name='resources-monitor-gemini-'+lang;
 execFileSync(process.execPath,['scripts/remotion-render.mjs',lang==='fil'?'ResourcesMonitorStoryFil':'ResourcesMonitorStoryEn',name,'--public','training/bhw-1-9','--with-audio','--captions',`resources-monitor/narration-${lang}.json`],{stdio:'inherit'});
 const media=ext=>{const p='remotion/out/'+name+ext,h=sha(p);return {path:'/training/bhw-1-9/'+name+'-'+h.slice(0,12)+ext,content_hash:h};};
 const timing=JSON.parse(fs.readFileSync(`remotion/public/resources-monitor/narration-${lang}.json`));
 art.videos[lang]={...media('.mp4'),duration_s:Math.round(timing.durationSeconds+1.1),poster:media('-poster.jpg'),captions:media('.vtt')};
 if(lang==='fil')Object.assign(art,media('-poster.jpg'));
}
lesson.assets=lesson.assets.filter(a=>a.id!==art.id).concat(art);lesson.featured_asset_id=art.id;fs.writeFileSync(leaf,JSON.stringify(lesson,null,2)+'\n');
fs.writeFileSync('docs/lesson-193-story-generation.json',JSON.stringify({status:'actual encoded stories generated; review pending',videos:art.videos},null,2)+'\n');
