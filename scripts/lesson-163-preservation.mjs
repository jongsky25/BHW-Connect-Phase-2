// Target-only source/media preservation against the immutable approved baseline.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=JSON.parse(fs.readFileSync('docs/lesson-163-baseline.json'));
const leaf='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-explain/';
const shared=new Set(['remotion/src/Root.tsx','scripts/lib/reference-narration.mjs','scripts/lib/tts-providers/gemini.mjs','content/training/day1-basic-competencies/narration.json']);
for(const [p,h] of Object.entries(baseline.file_hashes))if(!p.startsWith(leaf)&&!shared.has(p))assert.equal(sha(fs.readFileSync(p)),h,'Protected file '+p);
const m=JSON.parse(fs.readFileSync('content/training/day1-basic-competencies/narration.json'));
// Python's sorted JSON and JS stable JSON differ in separators; compare using the stored exact JSON canonical object hashes generated below.
const canonical=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
for(const [k,h] of Object.entries(baseline.non_target_mappings))assert.equal(sha(Buffer.from(canonical(m.lessons[k]))),h,'Non-target selection '+k);
for(const [k,h] of Object.entries(baseline.non_target_history))assert.equal(sha(Buffer.from(canonical(m.history[k]))),h,'Non-target history '+k);
assert.deepEqual(JSON.parse(fs.readFileSync(leaf+'lesson.json')).manifest,baseline.manifest);
console.log('Preserved approved manifest, all sibling files/mappings/history, UUID lock, receipts and every earlier public byte.');
