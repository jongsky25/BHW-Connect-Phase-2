import {execFileSync} from 'node:child_process';
import {expect,test} from '@playwright/test';
test('saved assessment review and later manual reading fit a phone',()=>{
  const output=execFileSync(process.execPath,['scripts/assessment-review-browser.mjs'],{encoding:'utf8',timeout:60000});
  expect(output).toContain('PASS: saved assessment review');
});
