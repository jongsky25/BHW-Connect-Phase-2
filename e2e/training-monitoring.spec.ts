import {execFileSync} from 'node:child_process';
import {expect,test} from '@playwright/test';
test('Chapter 1 monitoring and follow-up topics fit a phone',()=>{
  const output=execFileSync(process.execPath,['scripts/training-monitoring-browser.mjs'],{encoding:'utf8',timeout:60000});
  expect(output).toContain('PASS: training monitoring');
});
