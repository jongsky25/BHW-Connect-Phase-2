import {execFileSync} from 'node:child_process';
import {expect,test} from '@playwright/test';
test('assessor progress guidance is usable on small phones in both languages and themes',()=>{
 test.setTimeout(130_000);
 const output=execFileSync(process.execPath,['scripts/assessor-progress-browser.mjs'],{encoding:'utf8',timeout:120_000});
 expect(output).toContain('Assessor progress guidance verification passed: 20');
});
