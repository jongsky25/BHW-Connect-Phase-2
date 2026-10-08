// Technical completeness receipt; model reports never establish human approval.
import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const j=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
execFileSync(process.execPath,['scripts/lesson-164-media-verify.mjs'],{stdio:'inherit'});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const out='.preview/lesson164-deliverables',browserPath=out+'/lesson-1.6.4-browser-verification.json',browser=j(browserPath),full=j('docs/lesson-164-audio-review.json'),focus=j('docs/lesson-164-audio-focus.json');
if(browser.source_commit!==head||browser.status!=='passed'||browser.errors.length||browser.actual_case_count!==80)throw Error('Complete 80-case browser verification required');
if(full.pending_read_tracks.length||full.records.length!==14||full.records.some(r=>!r.model_response||r.model_response.startsWith('Review unavailable')))throw Error('Full actual-audio model reports incomplete');
if(focus.decode_only||focus.prompt_revision!=='gibs-recording-v1'||focus.records.length!==14||focus.records.some(r=>r.excerpts.length!==4))throw Error('Versioned 56-excerpt focused review required');
const manifest=j('content/training/day1-basic-competencies/narration.json');
const story=j('content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-record/lesson.json').assets.find(a=>a.id==='communication-record-story');
for(const record of full.records){
 if(record.id.startsWith('story-')){const video=story.videos[record.language];if(record.source_video!==video.path||record.source_video_sha256!==sha('public'+video.path)||record.sha256!==sha('remotion/public/communication-record/shipped-aac-'+record.language+'.wav'))throw Error('Full review does not match shipped AAC');}
 else {const section=record.id.replace('read-communication-record-','').replace(/-(fil|en)$/,'');if(record.sha256!==sha('public'+manifest.lessons['communication-record'].sections[section][record.language].src))throw Error('Full review does not match shipped Read MP3');}
}
for(const record of focus.records){
 if(record.source_sha256!==sha('public'+record.source_path))throw Error('Focused review source mismatch');
 if(!(record.full_audio_metrics.rms>0.002)||record.zones.some(z=>!(z.rms>0.001)))throw Error('Silent audio or zone');
 for(const excerpt of record.excerpts)if(!excerpt.model_response||excerpt.excerpt_sha256!==sha('.preview/lesson164-excerpts/'+excerpt.file))throw Error('Focused response or exact WAV excerpt missing');
}
const ciPath=out+'/lesson-164-final-ci.json';
if(fs.existsSync(ciPath)&&(j(ciPath).head_sha!==head||j(ciPath).status!=='passed'))throw Error('CI receipt does not match exact head');
const report={status:'passed',source_commit:head,method:'Technical package completeness and exact media-byte evidence. Model assessment is supporting evidence, not human listening or approval.',browser:{file:browserPath,sha256:sha(browserPath),cases:80},actual_read_tracks:12,shipped_AAC_stories:2,full_model_reports:14,focused_WAV_reviews:56,earlier_media_and_selection:'verified by scoped media guard',normal_CI:fs.existsSync(ciPath)?j(ciPath):'Pending exact-head CI receipt',human_listening:'pending',owner_package_review:'pending',local_policy_SME_review:'pending'};
fs.writeFileSync(out+'/lesson-1.6.4-verification.json',JSON.stringify(report,null,2)+'\n');
console.log('Verified complete technical review: 80 browser cases, 14 full reports, 56 exact WAV excerpts.');
