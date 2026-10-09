// @vitest-environment node
import {it,expect} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {beforeProposed183} from '../lib/lesson-183-integration.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
it('rejects unpinned successors and recovers only exact protected predecessors',()=>{
 const receipt=JSON.parse(fs.readFileSync('docs/lesson-183-proposal-receipt.json'));
 for(const [p,e]of Object.entries(receipt.changed_existing_files)){
  expect(sha(fs.readFileSync(p))).toBe(e.proposed_sha256);
  expect(sha(beforeProposed183(p))).toBe(e.predecessor_sha256);
  expect(()=>beforeProposed183(p,Buffer.from('unpinned mutation'))).toThrow('Unpinned');
 }
 expect(()=>beforeProposed183('unrelated',Buffer.from('untouched'))).not.toThrow();
});
