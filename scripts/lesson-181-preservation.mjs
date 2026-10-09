// Pinned source/media preservation, stable identity and historical narration selections.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const j=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const b=j('docs/lesson-181-execution-baseline.json'),h=j('docs/lesson-181-handoff-baseline.json');
const leaf='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-identify/';
const allowed=new Set([...Object.keys(h.target_files_sha256),'content/training/day1-basic-competencies/modules/08-osh/module.json','content/training/day1-basic-competencies/narration.json','scripts/lib/reference-narration.mjs','src/components/elearning/reference-lessons.tsx','remotion/src/Root.tsx','.github/workflows/ci.yml','.github/workflows/remotion.yml']);
let protectedFiles=0;const changed={};
for(const [p,hash] of Object.entries(b.protected_sha256)){
 const current=fs.readFileSync(p);
 if(allowed.has(p)){if(sha(current)!==hash)changed[p]={predecessor_sha256:hash,successor_sha256:sha(current)};}
 else {assert.equal(sha(current),hash,p);protectedFiles++;}
}
for(const [p,hash]of Object.entries(h.target_files_sha256))assert.equal(sha(Buffer.from(h.target_files_utf8[p])),hash,p+' frozen snapshot');
const lesson=j(leaf+'lesson.json'),old=JSON.parse(h.target_files_utf8[leaf+'lesson.json']);
assert.deepEqual(lesson.manifest,h.manifest);assert.equal(lesson.sections.length,6);assert.deepEqual(lesson.sections.map(s=>s.id),['ana','inspect','scope-and-contact','five-hazards','practice','check']);
for(const s of old.sections)assert.deepEqual(lesson.sections.find(n=>n.id===s.id).concept_ids,s.concept_ids);
for(const key of ['options','correct_option_index','prompt_fil','prompt_en'])assert.deepEqual(lesson.sections.at(-1).check[key],old.sections.at(-1).check[key]);
for(const lang of ['fil','en'])assert.deepEqual([...fs.readFileSync(leaf+'facilitator.'+lang+'.md','utf8').matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1]),['purpose','time-materials','prepare','opening','steps','expected-answers','misconception','practice','answer-key','observe','support','sources-review']);
const i=j(leaf+'competency.json').observation_indicators;assert.equal(i.length,1);assert.equal(i[0].objective_index,0);assert.equal(Object.keys(i[0].levels).length,6);
const modulePath='content/training/day1-basic-competencies/modules/08-osh/module.json';const om=JSON.parse(execFileSync('git',['show',b.source_commit+':'+modulePath],{encoding:'utf8'}));for(const lang of ['fil','en'])om['summary_'+lang]=om['summary_'+lang].replaceAll('Ana','Apple');assert.deepEqual(j(modulePath),om);
const n=j('content/training/day1-basic-competencies/narration.json');
for(const [k,v]of Object.entries(b.narration.lessons))if(k!=='safety-identify')assert.deepEqual(n.lessons[k],v,k);
for(const [k,v]of Object.entries(b.narration.history??{}))assert.deepEqual(k==='safety-identify'?n.history[k].slice(0,v.length):n.history[k],v,k);
const generation=fs.existsSync('docs/lesson-181-media-generation.json');if(generation)assert(n.history['safety-identify'].some(v=>JSON.stringify(v)===JSON.stringify(b.narration.lessons['safety-identify'])),'complete old selection retained');
const root=fs.readFileSync('remotion/src/Root.tsx','utf8'),oldRoot=execFileSync('git',['show',b.source_commit+':remotion/src/Root.tsx'],{encoding:'utf8'});const stripped=root.replace(/^import \{SafetyIdentifyStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`safety-identify-[\s\S]+?      \)\)\}\n/,'');assert.equal(stripped,oldRoot,'existing registry IDs/source/order unchanged');
const report={status:'passed',source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),protected_files:protectedFiles,stable_manifest:true,original_quiz_and_anchor_semantics_preserved:true,sibling_narration_and_history_preserved:true,historical_target_selection_retained:generation,changed_existing:changed,clinical_review:'pending',owner_approval:false};fs.mkdirSync('.preview/lesson181-deliverables',{recursive:true});fs.writeFileSync('.preview/lesson181-deliverables/lesson-181-preservation.json',JSON.stringify(report,null,2)+'\n');console.log('Preserved '+protectedFiles+' protected file hashes, identity, quiz and prior narration.');
