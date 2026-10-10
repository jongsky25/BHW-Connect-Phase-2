// Preserve model concerns and disagreements; no automatic clinical or human approval.
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p));
const files=['docs/lesson-183-audio-review.json','docs/lesson-183-story-audio-review.json'].filter(p=>fs.existsSync(p));
function parse(text){try{return JSON.parse(text);}catch{const code=text.match(/```json\s*([\s\S]*?)\s*```/);if(code)try{return JSON.parse(code[1]);}catch{}return null;}}
const records=[];
for(const p of files)for(const record of read(p).records){
 const results=[{kind:'full',...record.full},...record.excerpts].map(r=>({kind:r.kind,sha256:r.sha256,parsed:parse(r.response??''),raw_response_retained:true}));
 const concerns=results.flatMap(r=>Object.entries(r.parsed??{}).filter(([k,v])=>/concerns|clipped_ending|uncertainty/.test(k)&&v&&!(Array.isArray(v)&&v.length===0)&&!['none','None'].includes(v)).map(([field,value])=>({kind:r.kind,field,value})));
 records.push({id:record.id,source_review:p,full_sha256:record.full.sha256,excerpts:record.excerpts.map(e=>({kind:e.kind,sha256:e.sha256,start_ms:e.start_ms,end_ms:e.end_ms,name_present:e.name_present})),concerns,structured_reviews:results.filter(r=>r.parsed).length,disposition:concerns.length?'Retain full/focused disagreements for human listening; no defect-free or stable-voice approval claimed':'No concerns reported by these model reviews; human listening still pending'});
}
fs.writeFileSync('docs/lesson-183-audio-review-notes.json',JSON.stringify({status:'review evidence retained; human listening pending',method:'Parse actual full/focused responses without replacing raw text or inventing signoff',recordings:records.length,full_reviews:records.length,focused_reviews:records.reduce((n,r)=>n+r.excerpts.length,0),human_listening:'pending',clinical_review:'pending',owner_approval:'pending',records},null,2)+'\n');
