import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function beforeWordingTestFix(path,bytes=readFileSync(path)){
  if(path!=='scripts/tests/lesson-193-release.test.mjs')return bytes;
  const r=JSON.parse(readFileSync('docs/feedback-remediation/first-nine-historical-test-receipt.json'));
  if(sha(readFileSync(path))!==r.successor_sha256)throw new Error('Unpinned historical artifact test fix');
  if(sha(bytes)!==r.successor_sha256)return bytes;
  const previous=Buffer.from(r.predecessor_utf8);
  if(sha(previous)!==r.predecessor_sha256)throw new Error('Corrupt historical test receipt');
  return previous;
}
