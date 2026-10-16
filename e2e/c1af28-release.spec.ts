import {execFileSync} from 'node:child_process';
import {expect,test} from '@playwright/test';

test('C1AF-28 releases all eligible pilot accounts with evidence and authority guards',()=>{
  test.setTimeout(120000);
  const output=execFileSync(process.execPath,['scripts/c1af28-local-rehearsal.mjs'],{
    encoding:'utf8',timeout:100000,maxBuffer:2*1024*1024,
  });
  for(const evidence of ['"criteria": 42','"components": 9','"enabled": true',
    '"future_enrollment": true','"draft_archived": true','"qualification_guard": true','"legacy_unchanged": true']){
    expect(output).toContain(evidence);
  }
});
