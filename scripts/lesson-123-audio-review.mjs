// Model-mediated listening to the actual shipped recordings; not owner approval.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(readFileSync(path.join(root,'content/training/day1-basic-competencies/narration.json'),'utf8'));
const lesson=JSON.parse(readFileSync(path.join(root,'content/training/day1-basic-competencies/modules/02-uhc-act/lessons/uhc-local-system/lesson.json'),'utf8'));
const story=lesson.assets.find(a=>a.id==='local-system-story');
const items=Object.entries(manifest.lessons['uhc-local-system'].sections).flatMap(([section,langs])=>Object.entries(langs).map(([language,entry])=>({id:`read-${section}-${language}`,language,file:path.join(root,'public',entry.src.slice(1))})));
items.push(...['fil','en'].map(language=>({id:`video-${language}`,language,file:path.join(root,'public',story.videos[language].path.slice(1)),mime:'video/mp4'})));
if(!process.env.GEMINI_API_KEY)throw new Error('Existing Gemini key unavailable');
const textOf=node=>{if(!node||typeof node!=='object')return '';if(node.type==='text'&&typeof node.text==='string')return node.text;return Object.values(node).map(v=>Array.isArray(v)?v.map(textOf).filter(Boolean).join('\n'):textOf(v)).filter(Boolean).join('\n');};
let next=0;
const reports=[];
await Promise.all(Array.from({length:2},async()=>{
 while(next<items.length){
  const item=items[next++];const bytes=readFileSync(item.file);
  const prompt=`Listen to the actual ${item.language==='fil'?'Filipino (Tagalog)':'Philippine English'} educational narration. Give a word-for-word transcript in its original language, then assess clarity, pronunciation (Vlanche, Ernesto, BHW, UHC, HEPO, health board), expressive pitch/pace, any omitted or clipped words, word endings, and distracting silences. For video also note whether captions/scene text agree with the spoken meaning. Separate TRANSCRIPT and DELIVERY. Do not infer expected words or policy facts. This is model-mediated review, not human listening or approval.`;
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:'gemini-3.8-flash',input:[{type:'text',text:prompt},{type:item.mime?'video':'audio',data:bytes.toString('base64'),mime_type:item.mime??'audio/mp3'}]})});
  if(!response.ok)throw new Error('Model audio review HTTP '+response.status);
  const data=await response.json();const review=data.output_text??textOf(data.outputs??data.steps??data);
  if(!review)throw new Error('No review text');
  reports.push({id:item.id,language:item.language,sha256:createHash('sha256').update(bytes).digest('hex'),review});
  writeFileSync(path.join(root,'docs/lesson-123-automated-listening.json'),JSON.stringify({source_commit:process.env.GITHUB_SHA??null,method:'Gemini 3.8 Flash understanding of actual shipped MP3/MP4 bytes, without expected transcript. Model-mediated listening; not human/owner/SME approval.',reports:reports.sort((a,b)=>a.id.localeCompare(b.id))},null,2)+'\n');
  console.log('Reviewed '+item.id);
 }
}));
