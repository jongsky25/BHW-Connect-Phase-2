// @vitest-environment node
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {beforeFeedbackCsc} from '../lib/feedback-csc-preservation.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
it('reconstructs exact predecessor bytes within the bounded CSC source and historical-test scope',()=>{
  const receipt=JSON.parse(readFileSync('docs/feedback-remediation/fb-2.3-preservation.json'));
  expect(Object.keys(receipt.changed_existing_files)).toHaveLength(6);
  for(const [path,e]of Object.entries(receipt.changed_existing_files)){
    const disk=readFileSync(path),previous=beforeFeedbackCsc(path,disk);
    expect(sha(disk)).toBe(e.proposed_sha256);expect(sha(previous)).toBe(e.predecessor_sha256);
    expect(beforeFeedbackCsc(path,previous)).toEqual(previous);
    if(path.endsWith('narration.json')){
      const old=JSON.parse(previous),current=JSON.parse(disk);
      for(const key of Object.keys(old.lessons))if(key!=='bhw-eligibility')expect(current.lessons[key]).toEqual(old.lessons[key]);
      for(const key of Object.keys(old.history))if(key!=='bhw-eligibility')expect(current.history[key]).toEqual(old.history[key]);
    }
  }
},30000);
