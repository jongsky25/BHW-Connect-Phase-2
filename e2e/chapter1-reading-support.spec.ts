import {execFileSync} from 'node:child_process';
import {expect, test} from '@playwright/test';

test('Chapter 1 reading help stays readable and separate from manual quotations on phones', () => {
  test.setTimeout(130_000);
  const output = execFileSync(process.execPath, ['scripts/chapter1-reading-support-browser.mjs'], {
    encoding: 'utf8', timeout: 120_000,
  });
  expect(output).toContain('PASS: 42 lesson mappings in both languages');
});
