import {execFileSync} from 'node:child_process';
import {expect, test} from '@playwright/test';

test('assessment and display controls reflow on phones with enlarged text', () => {
  test.setTimeout(180_000);
  const output = execFileSync(process.execPath, ['scripts/assessment-readability-browser.mjs'], {
    encoding: 'utf8', timeout: 170_000,
  });
  expect(output).toContain('Assessment readability passed: 32');
});
