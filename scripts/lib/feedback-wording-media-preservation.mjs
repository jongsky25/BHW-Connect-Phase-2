import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

// Historical audits allow only these five new hash-bound files. Every original
// source, recording and timing remains covered by the original git diff checks.
export function feedbackWordingMediaExclusions(){
  const manifest=JSON.parse(readFileSync('src/lib/elearning/feedback-wording-narration.json'));
  const receipt=JSON.parse(readFileSync('docs/feedback-remediation/first-nine-narration-receipt.json'));
  const entries=Object.values(manifest.lessons).flatMap(l=>Object.values(l.sections).flatMap(Object.values));
  assert.equal(entries.length,5);
  assert.deepEqual(entries.map(e=>({src:e.src,sha256:e.sha256})).sort((a,b)=>a.src.localeCompare(b.src)),receipt);
  return receipt.map(e=>{
    assert.match(e.src,/^\/training\/audio\/[a-z0-9/-]+\.(en|fil)\.[a-f0-9]{12}\.mp3$/);
    assert.equal(createHash('sha256').update(readFileSync('public'+e.src)).digest('hex'),e.sha256);
    return ':(exclude)public'+e.src;
  });
}
