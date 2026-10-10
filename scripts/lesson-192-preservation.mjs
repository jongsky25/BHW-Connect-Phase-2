// Exact protected-byte proof, with target-only narration and registry successors.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const baseline=JSON.parse(fs.readFileSync('docs/lesson-192-execution-baseline.json'));
const frozen=JSON.parse(fs.readFileSync('docs/lesson-192-handoff-baseline.json'));
const leaf='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-safe-change/';
const narration='content/training/day1-basic-competencies/narration.json';
const sha=b=>createHash('sha256').update(b).digest('hex');
const allowed=new Set(['lesson.json','read.fil.md','read.en.md','slides.json','facilitator.fil.md','facilitator.en.md'].map(p=>leaf+p));
allowed.add('scripts/lib/lesson-184-release-integration.mjs');allowed.add('scripts/tests/lesson-184-release.test.mjs');allowed.add('src/components/elearning/reference-lessons.tsx');allowed.add('scripts/lib/reference-narration.mjs');allowed.add('.github/workflows/remotion.yml');allowed.add(narration);allowed.add('remotion/src/Root.tsx');
const changed={},unchanged=[];
for(const[p,h]of Object.entries(baseline.sha256)){
 if(!fs.existsSync(p))throw Error('Protected file missing: '+p);
 const current=sha(fs.readFileSync(p));
 if(current===h){unchanged.push(p);continue}
 if(!allowed.has(p))throw Error('Non-target protected bytes changed: '+p);
 changed[p]={predecessor_sha256:h,successor_sha256:current};
}
const previous=JSON.parse(execFileSync('git',['show',baseline.commit+':'+narration],{maxBuffer:16*1024*1024}));
const current=JSON.parse(fs.readFileSync(narration));
for(const[k,v]of Object.entries(previous.lessons))if(k!=='resources-safe-change'&&JSON.stringify(v)!==JSON.stringify(current.lessons[k]))throw Error('Sibling narration changed '+k);
for(const[k,v]of Object.entries(previous.history??{}))if(JSON.stringify(v)!==JSON.stringify(current.history?.[k]))throw Error('Historical narration changed '+k);
if(JSON.stringify(current.lessons['resources-safe-change'])!==JSON.stringify(previous.lessons['resources-safe-change'])&&!current.history['resources-safe-change'].some(t=>JSON.stringify(t)===JSON.stringify(previous.lessons['resources-safe-change'])))throw Error('Original target narration not archived');
const oldRoot=execFileSync('git',['show',baseline.commit+':remotion/src/Root.tsx'],{encoding:'utf8'}),root=fs.readFileSync('remotion/src/Root.tsx','utf8');
const removeTarget=root.replace(/^import \{ResourcesSafeChangeStory[^\n]+\n/m,'').replace(/\s*\{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\s*<Composition key=\{`resources-safe-change[^]*?\)\)\}/,'');
if(removeTarget.trim()!==oldRoot.trim())throw Error('Registry change exceeds target import/append');
const lesson=JSON.parse(fs.readFileSync(leaf+'lesson.json'));
if(JSON.stringify(lesson.manifest)!==JSON.stringify(frozen.manifest))throw Error('Manifest changed');
for(const a of lesson.assets){if(sha(fs.readFileSync('public'+a.path))!==a.content_hash)throw Error('Asset hash '+a.id);for(const v of Object.values(a.videos??{}))for(const m of [v,v.poster,v.captions].filter(Boolean))if(sha(fs.readFileSync('public'+m.path))!==m.content_hash)throw Error('Media hash '+a.id)}
const result={date:new Date().toISOString(),source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),predecessor_commit:baseline.commit,protected_predecessor_files:Object.keys(baseline.sha256).length,unchanged_files:unchanged.length,changed_existing_files:changed,non_target_narration_and_history:'exactly preserved',old_public_media:'all predecessor bytes retained',lesson_manifest:'exactly preserved',owner_release_approval:false};
fs.writeFileSync('docs/lesson-192-preservation.json',JSON.stringify(result,null,2)+'\n');console.log(`Protected ${result.protected_predecessor_files} originals; ${unchanged.length} unchanged, ${Object.keys(changed).length} scoped successors.`);
