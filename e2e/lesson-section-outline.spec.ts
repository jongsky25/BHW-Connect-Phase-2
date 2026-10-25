import {execFileSync} from 'node:child_process';
import {expect,test} from '@playwright/test';
test('lesson outline revisits and resumes unchanged UHC sections without bypassing checks in either training flow',()=>{
 test.setTimeout(170_000);
 const output=execFileSync(process.execPath,['scripts/lesson-outline-browser.mjs'],{encoding:'utf8',timeout:160_000});
 expect(output).toContain('Lesson section outline verification passed: 8');
});
