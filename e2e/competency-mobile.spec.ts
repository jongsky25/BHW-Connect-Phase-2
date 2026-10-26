import {execFileSync} from 'node:child_process';
import {expect,test} from '@playwright/test';
test('competency criteria and full rubrics stay readable and reachable on phones',()=>{
 test.setTimeout(180_000);
 const output=execFileSync(process.execPath,['scripts/competency-browser.mjs'],{encoding:'utf8',timeout:170_000});
 expect(output).toContain('Competency readability verification passed: 16');
});
