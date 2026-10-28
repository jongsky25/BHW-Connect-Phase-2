// Restore the exact pre-item-16 reader before historical release guards run.
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const target='src/components/elearning/reference-lessons.tsx';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
let receipt, predecessor;

export function beforeFeedbackItem16(path,actual=fs.readFileSync(path),strict=false) {
  if(path!==target)return actual;
  receipt??=JSON.parse(fs.readFileSync('docs/feedback-remediation/feedback-item-16-reader-preservation.json'));
  if(receipt.path!==target||receipt.replacements.length!==6)throw Error('Invalid item 16 reader scope');
  const input=Buffer.isBuffer(actual)?actual:Buffer.from(actual);
  if(sha(input)===receipt.predecessor_sha256)return Buffer.from(input);
  if(sha(input)!==receipt.successor_sha256){
    if(strict)throw Error('Unpinned integrated successor (item 16): '+path);
    return actual;
  }
  if(predecessor)return Buffer.from(predecessor);
  let previous=input.toString('utf8');
  for(const change of receipt.replacements){
    if(previous.split(change.current_utf8).length-1!==change.count)throw Error('Ambiguous item 16 reader fragment');
    previous=previous.replace(change.current_utf8,change.predecessor_utf8);
  }
  const restored=Buffer.from(previous);
  if(sha(restored)!==receipt.predecessor_sha256)throw Error('Corrupt item 16 reader predecessor');
  predecessor=Buffer.from(restored);
  return restored;
}
