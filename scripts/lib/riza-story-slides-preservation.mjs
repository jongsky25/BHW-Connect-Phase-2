// Reconstruct the preceding reader for immutable historical release audits.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
let receipt;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function beforeRizaStorySlides(path,actual=fs.readFileSync(path)) {
  if(path!=='src/components/elearning/reference-lessons.tsx')return actual;
  const r=receipt??=JSON.parse(fs.readFileSync(new URL('../../docs/feedback-remediation/riza-story-slides-preservation.json',import.meta.url)));
  if(sha(actual)!==r.successor_sha256)return actual;
  let previous=actual.toString('utf8');
  for(const change of r.replacements){
    if(previous.split(change.current_utf8).length-1!==change.count)throw Error('Ambiguous Riza story predecessor fragment');
    previous=previous.replace(change.current_utf8,change.predecessor_utf8);
  }
  const restored=Buffer.from(previous);
  if(sha(restored)!==r.predecessor_sha256)throw Error('Corrupt Riza story predecessor');
  return restored;
}
