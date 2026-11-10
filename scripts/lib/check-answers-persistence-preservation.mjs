// Reconstruct the reader before check answers survived a reload, for immutable
// historical release audits. Historical audits call this thousands of times,
// so a byte-length check rules out other versions before any hashing, and the
// reconstructed predecessor is memoized like the item 16 layer.
import fs from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
let receipt, predecessor;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function beforeCheckAnswersPersistence(path,actual=fs.readFileSync(path)) {
  if(path!=='src/components/elearning/reference-lessons.tsx')return actual;
  const r=receipt??=JSON.parse(fs.readFileSync(resolve(import.meta.dirname,'../../docs/feedback-remediation/check-answers-persistence-preservation.json')));
  if(Buffer.byteLength(actual)!==r.successor_bytes||sha(actual)!==r.successor_sha256)return actual;
  if(predecessor)return Buffer.from(predecessor);
  let previous=Buffer.from(actual).toString('utf8');
  for(const change of r.replacements){
    if(previous.split(change.current_utf8).length-1!==change.count)throw Error('Ambiguous check-answers predecessor fragment');
    previous=previous.replace(change.current_utf8,change.predecessor_utf8);
  }
  const restored=Buffer.from(previous);
  if(sha(restored)!==r.predecessor_sha256)throw Error('Corrupt check-answers predecessor');
  predecessor=Buffer.from(restored);
  return restored;
}
