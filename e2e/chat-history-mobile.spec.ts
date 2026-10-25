import {execFileSync} from 'node:child_process';
import {expect, test} from '@playwright/test';
test('chat history preserves current chat and reopens stored records on small phones in both languages and themes', () => {
  test.setTimeout(150_000);
  const output=execFileSync(process.execPath,['scripts/chat-history-browser.mjs'],{encoding:'utf8',timeout:140_000});
  expect(output).toContain('Chat history browser verification passed: 8');
});
