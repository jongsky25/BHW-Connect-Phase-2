// Add Root.tsx to cache dependencies only after proving the original render used identical bytes.
// No re-render claim or media-byte change; predecessor cache key stays in the audit.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const sha=b=>createHash('sha256').update(b).digest('hex'),j=p=>JSON.parse(fs.readFileSync(p));
const p='docs/lesson-163-media-generation.json',report=j(p);
const files=['remotion/src/communication-explain/CommunicationExplainStory.tsx','remotion/src/communication-explain/narration.ts','scripts/remotion-render.mjs','remotion/public/communication-explain/teach-back.png',...['fil','en'].flatMap(l=>['mp3','json'].map(e=>`remotion/public/communication-explain/narration-${l}.${e}`)),...['family-planning','distress','smoking','practice','check'].map(id=>`remotion/public/communication-explain/${id}.png`)];
const pairs=files.map(p=>[p,sha(fs.readFileSync(path.resolve(p)))]),oldHash=sha(JSON.stringify(pairs)),rootFile='remotion/src/Root.tsx',rootHash=sha(fs.readFileSync(rootFile)),nextHash=sha(JSON.stringify([[rootFile,rootHash],...pairs]));
if(report.render_input_sha256===nextHash){console.log('Complete render cache dependencies already pinned.');process.exit(0);}
assert.equal(report.render_input_sha256,oldHash,'All original render inputs must be unchanged');
assert.equal(sha(execFileSync('git',['show',report.source_commit+':'+rootFile])),rootHash,'Original render registry must equal current registry byte-for-byte');
report.render_dependency_audit={method:'Proven identical original render inputs and registry from recorded source commit; extended dependency key without regenerating or changing media.',previous_render_input_sha256:oldHash,registry_sha256:rootHash,source_commit:report.source_commit};
report.render_input_sha256=nextHash;fs.writeFileSync(p,JSON.stringify(report,null,2)+'\n');
console.log('Pinned complete render input key against original exact registry/media dependencies.');
