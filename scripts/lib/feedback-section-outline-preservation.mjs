// Exact preceding reader for historical release guards; old receipts stay immutable.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const target='src/components/elearning/reference-lessons.tsx';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
let receipt,successor,predecessor;
function pinSuccessor(bytes,r){
  let previous=bytes.toString('utf8');
  for(const change of r.replacements){
    if(previous.split(change.current_utf8).length-1!==change.count)throw Error('Ambiguous FB-5.2c predecessor fragment');
    previous=previous.split(change.current_utf8).join(change.predecessor_utf8);
  }
  const restored=Buffer.from(previous);
  if(sha(restored)!==r.predecessor_sha256)throw Error('Corrupt FB-5.2c predecessor');
  successor=Buffer.from(bytes);predecessor=restored;
}
export function beforeFeedbackSectionOutline(path,actual=fs.readFileSync(path)) {
  if(path!==target)return actual;
  const r=receipt??=JSON.parse(fs.readFileSync('docs/feedback-remediation/fb-5.2c-reader-preservation.json'));
  if(r.path!==target||r.replacements.length!==3)throw Error('Invalid FB-5.2c reader scope');
  // Read and compare ALL current bytes on every call. Only the pure exact
  // reconstruction is memoized: any disk/input change misses these equality
  // checks and must satisfy the same SHA-256 allowlist as before.
  const disk=fs.readFileSync(path);
  if(!disk.equals(successor??Buffer.alloc(0))&&!disk.equals(predecessor??Buffer.alloc(0))){
    const hash=sha(disk);
    if(hash===r.successor_sha256)pinSuccessor(disk,r);
    else if(hash===r.predecessor_sha256)predecessor=Buffer.from(disk);
    else throw Error('Unpinned integrated successor (FB-5.2c): '+path);
  }
  const input=Buffer.isBuffer(actual)?actual:Buffer.from(actual);
  if(successor&&input.equals(successor))return Buffer.from(predecessor);
  if(!successor&&sha(input)===r.successor_sha256){pinSuccessor(input,r);return Buffer.from(predecessor);}
  return actual;
}
