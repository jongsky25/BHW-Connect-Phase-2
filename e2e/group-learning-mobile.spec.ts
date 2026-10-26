import {execFileSync} from 'node:child_process';
import {expect,test} from '@playwright/test';
test('group learning guides expose their existing discussion and practice on small phones',()=>{
 test.setTimeout(130_000);
 const output=execFileSync(process.execPath,['scripts/group-learning-browser.mjs'],{encoding:'utf8',timeout:120_000});
 expect(output).toContain('Group learning guide verification passed: 8');
});
