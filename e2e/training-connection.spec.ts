import {execFileSync} from 'node:child_process';
import {expect, test} from '@playwright/test';

test('loaded lessons and assessments recover from slow and interrupted HTTP connections', () => {
  test.setTimeout(180_000);
  const output = execFileSync(process.execPath, ['scripts/training-connection-browser.mjs'], {
    encoding: 'utf8', timeout: 170_000,
  });
  expect(output).toContain('Training connection recovery passed: 10');
});
