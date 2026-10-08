// Complete technical review; human listening and local-policy review stay pending.
import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const j=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
execFileSync(process.execPath,['scripts/lesson-163-media-verify.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/lesson-163-decoded-media-check.mjs'],{stdio:'inherit'});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),out='.preview/lesson163-deliverables';
const browser=j(out+'/lesson-1.6.3-browser-verification.json'),full=j('docs/lesson-163-audio-review.json'),focus=j('docs/lesson-163-audio-focus.json'),ci=j(out+'/lesson-163-final-ci.json');
assert.equal(browser.source_commit,head);assert.equal(browser.status,'passed');assert.equal(browser.errors.length,0);assert.equal(browser.actual_case_count,88);
assert.equal(full.pending_read_tracks.length,0);assert.equal(full.records.length,14);assert(full.records.every(r=>r.model_response&&!r.model_response.startsWith('Review unavailable')));
assert.equal(focus.decode_only,false);assert.equal(focus.prompt_revision,'gibs-teach-back-v1');assert.equal(focus.records.length,14);assert(focus.records.every(r=>r.excerpts.length===4));
const manifest=j('content/training/day1-basic-competencies/narration.json'),story=j('content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-explain/lesson.json').assets.find(a=>a.id==='communication-explain-story');
for(const r of full.records){if(r.id.startsWith('story-')){const v=story.videos[r.language];assert.equal(r.source_video,v.path);assert.equal(r.source_video_sha256,sha('public'+v.path));assert.equal(r.sha256,sha('remotion/public/communication-explain/shipped-aac-'+r.language+'.wav'));}else{const id=r.id.replace('read-communication-explain-','').replace(/-(fil|en)$/,'');assert.equal(r.sha256,sha('public'+manifest.lessons['communication-explain'].sections[id][r.language].src));}}
for(const r of focus.records){assert.equal(r.source_sha256,sha('public'+r.source_path));assert(r.full_audio_metrics.rms>0.002);assert(r.zones.every(z=>z.rms>0.001));for(const e of r.excerpts){assert(e.model_response);assert.equal(e.excerpt_sha256,sha('.preview/lesson163-excerpts/'+e.file));}}
assert.equal(ci.head_sha,head);assert.equal(ci.status,'passed');assert.equal(ci.complete_Remotion_registry,78);
const rawFiles=fs.readdirSync('.preview/lesson163-raw').filter(p=>p.endsWith('.json'));
assert(rawFiles.length,'Raw requests/responses retained');
const hashBytes=b=>createHash('sha256').update(b).digest('hex'),rawAudio=new Map();
for(const file of rawFiles){const r=j('.preview/lesson163-raw/'+file);assert.equal(r.request_sha256,hashBytes(JSON.stringify(r.request)));if(r.response_body!==null)assert.equal(r.response_sha256,hashBytes(r.response_body));for(const input of r.request?.input??[])if(input.type==='audio'&&r.response_status>=200&&r.response_status<300){const h=hashBytes(Buffer.from(input.data,'base64'));rawAudio.set(h,[...(rawAudio.get(h)??[]),file]);}}
const rawLinks=[];
for(const r of full.records){assert(rawAudio.has(r.sha256),'Full review raw bytes '+r.id);rawLinks.push({id:r.id,audio_sha256:r.sha256,raw_responses:rawAudio.get(r.sha256)});}
for(const r of focus.records)for(const e of r.excerpts){assert(rawAudio.has(e.excerpt_sha256),'Focused review raw bytes '+r.id+'/'+e.kind);rawLinks.push({id:r.id+'/'+e.kind,audio_sha256:e.excerpt_sha256,raw_responses:rawAudio.get(e.excerpt_sha256)});}
fs.writeFileSync(out+'/lesson-163-raw-evidence-links.json',JSON.stringify({status:'passed',raw_attempts:rawFiles.length,reviewed_audio_records:rawLinks.length,records:rawLinks},null,2)+'\n');
const report={status:'passed',source_commit:head,method:'Exact-media-byte technical review; offline production-component fixture is separate from authenticated disposable-Supabase CI.',browser:{sha256:sha(out+'/lesson-1.6.3-browser-verification.json'),cases:88},actual_read_tracks:12,shipped_AAC_stories:2,full_model_reports:14,focused_WAV_reviews:56,earlier_media_and_selection:'verified by scoped preservation/media guards',normal_CI:ci,human_listening:'pending',owner_package_review:'pending',local_policy_SME_review:'pending'};
fs.writeFileSync(out+'/lesson-1.6.3-verification.json',JSON.stringify(report,null,2)+'\n');
console.log('Verified 88 browser cases, 14 full actual-audio reports, 56 exact WAV reviews and exact-head CI/78-composition regression.');
