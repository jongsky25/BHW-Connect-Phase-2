import {execFileSync} from 'node:child_process';
import {expect,test} from '@playwright/test';
test('assessor connection practice fits a phone in both languages and themes',()=>{
 const output=execFileSync(process.execPath,['scripts/connection-practice-browser.mjs'],{encoding:'utf8',timeout:60000});
 expect(output).toContain('PASS: assessor connection practice');
});
