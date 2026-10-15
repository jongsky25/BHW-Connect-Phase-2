import {execFileSync} from 'node:child_process';
import {expect,test} from '@playwright/test';

test('C1AF-27 installs the disabled registry on the complete local schema and rolls back',()=>{
  test.setTimeout(120000);
  const output=execFileSync(process.execPath,['scripts/c1af27-local-rehearsal.mjs'],{
    encoding:'utf8',timeout:100000,maxBuffer:2*1024*1024,
  });
  expect(output).toContain('"criteria": 42');
  expect(output).toContain('"components": 9');
  expect(output).toContain('"enabled": false');
  expect(output).toContain('"legacy_unchanged": true');
});
