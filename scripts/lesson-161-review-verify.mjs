// Technical completeness receipt; model reports never establish human approval.
import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const j=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
execFileSync(process.execPath,['scripts/lesson-161-media-verify.mjs'],{stdio:'inherit'});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const out='.preview/lesson161-deliverables',browserPath=out+'/lesson-1.6.1-browser-verification.json',browser=j(browserPath),full=j('docs/lesson-161-audio-review.json'),focus=j('docs/lesson-161-audio-focus.json');
if(browser.source_commit!==head||browser.status!=='passed'||browser.errors.length||browser.actual_case_count!==84)throw Error('Complete 84-case browser verification required');
if(full.pending_read_tracks.length||full.records.length!==14||full.records.some(r=>!r.model_response||r.model_response.startsWith('Review unavailable')))throw Error('Full actual-audio model reports incomplete');
if(focus.decode_only||focus.prompt_revision!=='gibs-listening-v1'||focus.records.length!==14||focus.records.some(r=>r.excerpts.length!==4))throw Error('Versioned 56-excerpt focused review required');
const manifest=j('content/training/day1-basic-competencies/narration.json');
const story=j('content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-listen/lesson.json').assets.find(a=>a.id==='communication-listen-story');
for(const record of full.records){
 if(record.id.startsWith('story-')){const video=story.videos[record.language];if(record.source_video!==video.path||record.source_video_sha256!==sha('public'+video.path)||record.sha256!==sha('remotion/public/communication-listen/shipped-aac-'+record.language+'.wav'))throw Error('Full review does not match shipped AAC');}
 else {const section=record.id.replace('read-communication-listen-','').replace(/-(fil|en)$/,'');if(record.sha256!==sha('public'+manifest.lessons['communication-listen'].sections[section][record.language].src))throw Error('Full review does not match shipped Read MP3');}
}
for(const record of focus.records){
 if(record.source_sha256!==sha('public'+record.source_path))throw Error('Focused review source mismatch');
 if(!(record.full_audio_metrics.rms>0.002)||record.zones.some(z=>!(z.rms>0.001)))throw Error('Silent audio or zone');
 for(const excerpt of record.excerpts)if(!excerpt.model_response||excerpt.excerpt_sha256!==sha('.preview/lesson161-excerpts/'+excerpt.file))throw Error('Focused response or exact WAV excerpt missing');
}
const initial=j('docs/lesson-161-initial-audio-review.json');
for(const record of initial.records){
 const p='.preview/lesson161-initial-media/shipped-aac-'+record.language+'.wav';
 if(record.id.startsWith('story-')){if(record.sha256!==sha(p))throw Error('Initial AAC review bytes missing');}
 else {const section=record.id.replace('read-communication-listen-','').replace(/-(fil|en)$/,'');const t=manifest.history['communication-listen'].map(h=>h.sections[section]?.[record.language]).find(t=>t?.sha256===record.sha256);if(!t||sha('public'+t.src)!==record.sha256)throw Error('Initial Read review bytes missing');}
}
const ciPath=out+'/lesson-161-final-ci.json';
if(fs.existsSync(ciPath)&&(j(ciPath).head_sha!==head||j(ciPath).status!=='passed'))throw Error('CI receipt does not match exact head');
const report={status:'passed',source_commit:head,method:'Technical package completeness and exact media-byte evidence. Model assessment is supporting evidence, not human listening or approval.',browser:{file:browserPath,sha256:sha(browserPath),cases:84},actual_read_tracks:12,shipped_AAC_stories:2,full_model_reports:14,focused_WAV_reviews:56,earlier_media_and_selection:'verified by scoped media guard',normal_CI:fs.existsSync(ciPath)?j(ciPath):'Pending exact-head CI receipt',human_listening:'pending',owner_package_review:'pending',local_policy_SME_review:'pending'};
fs.writeFileSync(out+'/lesson-1.6.1-verification.json',JSON.stringify(report,null,2)+'\n');
console.log('Verified complete technical review: 84 browser cases, 14 full reports, 56 exact WAV excerpts.');
