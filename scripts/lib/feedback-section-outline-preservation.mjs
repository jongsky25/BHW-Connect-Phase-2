// Exact preceding reader for historical release guards; old receipts stay immutable.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const target='src/components/elearning/reference-lessons.tsx';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
let receipt;
export function beforeFeedbackSectionOutline(path,actual=fs.readFileSync(path)) {
  if(path!==target)return actual;
  const r=receipt??=JSON.parse(fs.readFileSync('docs/feedback-remediation/fb-5.2c-reader-preservation.json'));
  if(r.path!==target||r.replacements.length!==3)throw Error('Invalid FB-5.2c reader scope');
  if(![r.predecessor_sha256,r.successor_sha256].includes(sha(fs.readFileSync(path))))throw Error('Unpinned integrated successor (FB-5.2c): '+path);
  if(sha(actual)!==r.successor_sha256)return actual;
  let previous=actual.toString('utf8');
  for(const change of r.replacements){
    if(previous.split(change.current_utf8).length-1!==change.count)throw Error('Ambiguous FB-5.2c predecessor fragment');
    previous=previous.split(change.current_utf8).join(change.predecessor_utf8);
  }
  const bytes=Buffer.from(previous);
  if(sha(bytes)!==r.predecessor_sha256)throw Error('Corrupt FB-5.2c predecessor');
  return bytes;
}
