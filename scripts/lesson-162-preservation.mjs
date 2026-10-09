// Check actual current bytes, target-only changes and the complete narration history.
import {reviewed162Bytes} from './lib/lesson-162-release-compat.mjs';
import fs from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const sha=p=>createHash('sha256').update(reviewed162Bytes(p)).digest('hex'),j=p=>JSON.parse(fs.readFileSync(p));
const baseline=j('docs/lesson-162-baseline.json'),proposal=j('docs/lesson-162-proposal-receipt.json');
const target='communication-clarify',leaf='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/'+target+'/';
const allowed=new Set([leaf+'lesson.json',leaf+'slides.json',leaf+'read.fil.md',leaf+'read.en.md',leaf+'facilitator.fil.md',leaf+'facilitator.en.md',leaf+'competency.json','src/components/elearning/reference-lessons.tsx','remotion/src/Root.tsx','scripts/lib/reference-narration.mjs','content/training/day1-basic-competencies/narration.json']);
let unchanged=0;
for(const [p,h]of Object.entries(baseline.files_sha256)){
 if(allowed.has(p)){const e=proposal.changed_existing_files[p];assert.equal(sha(p),e?.proposed_sha256??h,p);if(e)assert.equal(e.predecessor_sha256,h,p);}
 else {assert.equal(sha(p),h,p);unchanged++;}
}
const lesson=j(leaf+'lesson.json'),old=JSON.parse(baseline.target_utf8[leaf+'lesson.json']);assert.deepEqual(lesson.manifest,old.manifest);
for(const anchor of old.sections){const current=lesson.sections.find(s=>s.id===anchor.id);assert.deepEqual(current.concept_ids,anchor.concept_ids);}
assert.deepEqual(lesson.sections.map(s=>s.id),['open-question','clarify-detail','barriers','confirm-summary','practice','check']);
const registry=reviewed162Bytes('remotion/src/Root.tsx').toString();
const prior=registry.replace(/^import \{CommunicationClarifyStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`communication-clarify-[\s\S]+?      \)\)\}\n/,'');assert.equal(prior,baseline.registry_utf8,'Complete prior registry source/order');
const component='src/components/elearning/reference-lessons.tsx';
const originalComponent=j('docs/lesson-162-shared-predecessors.json')[component];
const componentPrior=reviewed162Bytes(component).toString()
 .replace('  const clarificationRevision = lesson?.lesson_key === "communication-clarify" && lesson.revision.assets.some(asset => asset.id === "clarify-check");\n','')
 .replace('const listeningTracks = (listeningRevision || clarificationRevision) ?', 'const listeningTracks = listeningRevision ?')
 .replace('{(listeningRevision || clarificationRevision) ? (listeningMinutes', '{listeningRevision ? (listeningMinutes')
 .replace('{(listeningRevision || clarificationRevision) && !storyLayout && figures}','{listeningRevision && !storyLayout && figures}')
 .replace('!storyLayout && !listeningRevision && !clarificationRevision && (revealSummary','!storyLayout && !listeningRevision && (revealSummary');
assert.equal(componentPrior,originalComponent,'Only target draft Slides illustration visibility changes');
const m=JSON.parse(reviewed162Bytes('content/training/day1-basic-competencies/narration.json')),oldM=baseline.narration;
for(const [k,v]of Object.entries(oldM.lessons))if(k!==target)assert.deepEqual(m.lessons[k],v,k);
for(const [k,v]of Object.entries(oldM.history??{}))assert.deepEqual(k===target?m.history[k]?.slice(0,v.length):m.history[k],v,k+' history');
if(JSON.stringify(m.lessons[target])!==JSON.stringify(oldM.lessons[target]))assert(m.history[target].some(h=>JSON.stringify(h)===JSON.stringify(oldM.lessons[target])),'complete prior target selection');
const report={status:'passed',unchanged_baseline_files:unchanged,total_baseline_files:Object.keys(baseline.files_sha256).length,scope:target,complete_manifest:true,old_anchor_concepts:true,non_target_narration_and_history:true,registry_source_and_order:true,earlier_public_bytes:true,owner_release_approval:false};
fs.writeFileSync('docs/lesson-162-preservation.json',JSON.stringify(report,null,2)+'\n');console.log('Verified target-only proposal and '+unchanged+' unchanged approved files.');
