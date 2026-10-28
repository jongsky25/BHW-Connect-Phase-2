// Model-assisted review of the two actual revised recordings; human listening is not claimed.
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {COMMUNICATION_EXPLAIN_BEATS} from '../remotion/src/communication-explain/narration.ts';

if(!process.env.GEMINI_API_KEY)throw new Error('Existing Gemini key unavailable');
const outputText=v=>typeof v==='string'?v:Array.isArray(v)?v.map(outputText).join('\n'):v?.output_text??(v?.type==='text'?v.text:outputText(v?.outputs??v?.output??v?.content??v?.steps?.filter(s=>s.type==='model_output')??[]));
const report={method:'Gemini review of actual revised MP3 bytes against exact six-beat source; not human listening',source_commit:process.env.GITHUB_SHA,records:[]};
for(const language of ['fil','en']){
  const bytes=readFileSync(`remotion/public/communication-explain/narration-${language}.mp3`);
  const timing=JSON.parse(readFileSync(`remotion/public/communication-explain/narration-${language}.json`));
  const sha256=createHash('sha256').update(bytes).digest('hex');
  if(sha256!==timing.audio_sha256 || timing.beats.length!==6 || timing.beats.some((beat,i)=>beat.text!==COMMUNICATION_EXPLAIN_BEATS[i][language]))throw new Error(`${language}: narration source/hash drift`);
  const expected=timing.beats.map(beat=>beat.text).join(' ');
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:'gemini-3.8-flash',input:[{type:'text',text:`Transcribe the actual attached ${language==='fil'?'Filipino':'Philippine English'} fictional training narration, then compare it with this exact expected text: ${expected}\nReturn JSON with transcript, audible_throughout, clipped_ending, omissions, additions, meaning_changes, pronunciation_concerns, delivery_concerns and uncertainty. Focus on Jo's family-planning concern and choice, Ben's weeks of low mood and wish to talk, Ramon's smoking goal and stress barrier, and all negations or unconfirmed plans. Do not claim human listening or clinical approval.`},{type:'audio',data:bytes.toString('base64'),mime_type:'audio/mp3'}],generation_config:{temperature:0}}),signal:AbortSignal.timeout(180000)});
  if(!response.ok)throw new Error(`${language}: Gemini review HTTP ${response.status}`);
  report.records.push({language,sha256,duration_seconds:timing.durationSeconds,expected_text:expected,model_response:outputText(await response.json())});
  writeFileSync('docs/feedback-remediation/feedback-item-12-audio-review.json',JSON.stringify(report,null,2)+'\n');
  console.log('Reviewed revised',language,'story audio');
}
