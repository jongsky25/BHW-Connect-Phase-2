// Technical completeness receipt; model reports never establish human approval.
import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const j=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
execFileSync(process.execPath,['scripts/lesson-181-media-verify.mjs'],{stdio:'inherit'});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const out='.preview/lesson181-deliverables',browserPath=out+'/lesson-1.8.1-browser-verification.json',browser=j(browserPath),full=j('docs/lesson-181-audio-review.json'),focus=j('docs/lesson-181-audio-focus.json');
if(browser.source_commit!==head||browser.status!=='passed'||browser.errors.length||browser.actual_case_count!==browser.cases.length||browser.actual_case_count!==92||browser.actual_screenshot_count!==56)throw Error('Complete browser coverage required');
if(full.pending_read_tracks.length||full.records.length!==14||full.records.some(r=>!r.model_response||r.model_response.startsWith('Review unavailable')))throw Error('Full actual-audio model reports incomplete');
if(focus.decode_only||focus.prompt_revision!=='apple-hazard-v1'||focus.records.length!==14||focus.records.some(r=>r.excerpts.length!==4))throw Error('Versioned 56-excerpt focused review required');
const notes=j('docs/lesson-181-audio-review-notes.json');
if(notes.full_reviews!==14||notes.focused_reviews!==56||notes.human_listening!=='pending'||notes.owner_package_review!=='pending'||notes.local_policy_SME_review!=='pending')throw Error('Accurate pending human/owner/SME review required');
const manifest=j('content/training/day1-basic-competencies/narration.json');
const story=j('content/training/day1-basic-competencies/modules/08-osh/lessons/safety-identify/lesson.json').assets.find(a=>a.id==='safety-identify-story');
for(const record of full.records){
 if(record.id.startsWith('story-')){const video=story.videos[record.language];if(record.source_video!==video.path||record.source_video_sha256!==sha('public'+video.path)||record.sha256!==sha('remotion/public/safety-identify/shipped-aac-'+record.language+'.wav'))throw Error('Full review does not match shipped AAC');}
 else {const section=record.id.replace('read-safety-identify-','').replace(/-(fil|en)$/,'');if(record.sha256!==sha('public'+manifest.lessons['safety-identify'].sections[section][record.language].src))throw Error('Full review does not match shipped Read MP3');}
}
for(const record of focus.records){
 if(record.source_sha256!==sha('public'+record.source_path))throw Error('Focused review source mismatch');
 if(!(record.full_audio_metrics.rms>0.002)||record.zones.some(z=>!(z.rms>0.001)))throw Error('Silent audio or zone');
 for(const excerpt of record.excerpts)if(!excerpt.model_response||excerpt.excerpt_sha256!==sha('.preview/lesson181-excerpts/'+excerpt.file))throw Error('Focused response or exact WAV excerpt missing');
}
// Bind every reported review to its raw actual-audio request and returned response.
const rawDirectory='.preview/lesson181-raw';
const raw=fs.readdirSync(rawDirectory).filter(p=>p.endsWith('.json')).map(p=>({file:rawDirectory+'/'+p,...j(rawDirectory+'/'+p)}));
for(const r of raw){if(createHash('sha256').update(JSON.stringify(r.request)).digest('hex')!==r.request_sha256)throw Error('Raw request hash mismatch');if(r.response_body!==null&&createHash('sha256').update(r.response_body).digest('hex')!==r.response_sha256)throw Error('Raw response hash mismatch');}
const text=value=>{if(typeof value==='string')return value;if(Array.isArray(value))return value.map(text).filter(Boolean).join('\n');if(!value||typeof value!=='object')return '';if(typeof value.output_text==='string')return value.output_text;if(value.type==='text'&&typeof value.text==='string')return value.text;return text(value.outputs??value.output??value.content??value.steps?.filter(s=>s.type==='model_output')??[]);};
const successful=raw.filter(r=>r.response_status>=200&&r.response_status<300&&r.request?.model==='gemini-3.8-flash').map(r=>{const input=r.request.input.find(i=>i.type==='audio');return {...r,audio_sha256:input?createHash('sha256').update(Buffer.from(input.data,'base64')).digest('hex'):null,response_text:text(JSON.parse(r.response_body))};});
for(const r of full.records)if(!successful.some(raw=>raw.audio_sha256===r.sha256&&raw.response_text===r.model_response))throw Error('Raw full review provenance missing: '+r.id);
for(const r of focus.records)for(const e of r.excerpts)if(!successful.some(raw=>raw.audio_sha256===e.excerpt_sha256&&raw.response_text===e.model_response))throw Error('Raw focused review provenance missing: '+r.id+'/'+e.kind);
const currentBindings=new Set([...full.records.map(r=>r.sha256+'\n'+r.model_response),...focus.records.flatMap(r=>r.excerpts.map(e=>e.excerpt_sha256+'\n'+e.model_response))]);
const rawReceipt={requests:raw.length,successful_review_responses:successful.length,superseded_review_responses:successful.filter(r=>!currentBindings.has(r.audio_sha256+'\n'+r.response_text)).length,failed_requests:raw.filter(r=>!(r.response_status>=200&&r.response_status<300)).length,full_responses_bound:14,focused_responses_bound:56,files:raw.map(r=>({file:r.file,sha256:sha(r.file)}))};
fs.writeFileSync(out+'/lesson-181-raw-provenance.json',JSON.stringify(rawReceipt,null,2)+'\n');
const ciPath=out+'/lesson-181-final-ci.json';
if(fs.existsSync(ciPath)&&(j(ciPath).head_sha!==head||!['passed','completed_with_inherited_failure'].includes(j(ciPath).status)))throw Error('CI receipt does not match exact head');
const report={status:fs.existsSync(ciPath)&&j(ciPath).status==='completed_with_inherited_failure'?'draft_complete_with_inherited_ci_failure':'passed',technical_checks:'passed',source_commit:head,method:'Technical package completeness and exact media-byte evidence. Model assessment is supporting evidence, not human listening or approval.',browser:{file:browserPath,sha256:sha(browserPath),cases:browser.actual_case_count,screenshots:browser.actual_screenshot_count},actual_read_tracks:12,shipped_AAC_stories:2,full_model_reports:14,focused_WAV_reviews:56,earlier_media_and_selection:'verified by scoped media guard',normal_CI:fs.existsSync(ciPath)?j(ciPath):'Pending exact-head CI receipt',audio_concern_reconciliation:{file:'docs/lesson-181-audio-review-notes.json',sha256:sha('docs/lesson-181-audio-review-notes.json'),unresolved_concerns:notes.unresolved_concerns},human_listening:'pending',owner_package_review:'pending',local_policy_SME_review:'pending'};
fs.writeFileSync(out+'/lesson-1.8.1-verification.json',JSON.stringify(report,null,2)+'\n');
console.log('Verified complete technical review: actual browser cases, 14 full reports, 56 exact WAV excerpts.');
