// Model-mediated review of actual completed tracks, not human listening.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

const manifest=JSON.parse(readFileSync('src/lib/elearning/feedback-wording-narration.json'));
const report={method:'Gemini review of actual MP3 bytes against exact revised text; not human listening',source_commit:process.env.GITHUB_SHA,records:[]};
const outputText=v=>typeof v==='string'?v:Array.isArray(v)?v.map(outputText).join('\n'):v?.output_text??(v?.type==='text'?v.text:outputText(v?.outputs??v?.output??v?.content??v?.steps?.filter(s=>s.type==='model_output')??[]));
for(const [lesson,l] of Object.entries(manifest.lessons))for(const [section,languages] of Object.entries(l.sections))for(const [language,entry] of Object.entries(languages)){
  const bytes=readFileSync('public'+entry.src);
  const hash=createHash('sha256').update(bytes).digest('hex');
  if(hash!==entry.sha256)throw new Error('Audio hash drift');
  const expected=entry.timings.map(t=>t.text).join(' ');
  // Build-time review of admin-authored fictional training media only; never learner/patient data.
  // eslint-disable-next-line no-restricted-syntax
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:'gemini-3.8-flash',input:[{type:'text',text:`Review the attached actual ${language} training narration. First transcribe what you hear, then compare with this expected revised text: ${expected}\nReturn JSON: transcript, intelligible (boolean), clipped_ending (boolean), meaning_changes (array), omissions (array), additions (array), pronunciation_concerns (array), delivery_concerns (array). Preserve negations, conditions, complete endings and the revised wording. Distinguish acronym pronunciation from omitted words. State uncertainty. Do not claim human approval.`},{type:'audio',data:bytes.toString('base64'),mime_type:'audio/mp3'}],generation_config:{temperature:0}}),signal:AbortSignal.timeout(180000)});
  if(!response.ok)throw new Error('Audio review HTTP '+response.status);
  const modelResponse=outputText(await response.json());
  report.records.push({lesson,section,language,sha256:hash,expected_text:expected,model_response:modelResponse});
  mkdirSync('feedback-wording-media/docs/feedback-remediation',{recursive:true});
  writeFileSync('feedback-wording-media/docs/feedback-remediation/first-nine-audio-review.json',JSON.stringify(report,null,2)+'\n');
  console.log('Reviewed',lesson,section,language);
}
if(report.records.length!==5)throw new Error('Expected exactly five revised tracks');
