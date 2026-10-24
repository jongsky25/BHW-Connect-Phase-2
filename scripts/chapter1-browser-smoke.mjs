// Isolated browser journey for the actual learner components. RPC responses
// come from a small local fixture; SQL authorization is tested separately.
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'vite';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = join(root, 'scripts/tests/fixtures/chapter1-browser');
const server = await createServer({
  configFile: false, root: fixture,
  resolve: { alias: [
    { find: '@/lib/supabase/client', replacement: join(fixture, 'client.ts') },
    { find: 'next/link', replacement: join(fixture, 'link.tsx') },
    { find: /^@\//, replacement: `${join(root, 'src')}/` },
  ] },
  esbuild: { jsx: 'automatic' },
  server: { host: '127.0.0.1', port: 0 },
  logLevel: 'error',
});
let browser;
try {
  await server.listen();
  const url = server.resolvedUrls.local[0];
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'],
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(`${url}#intro`);
  await expect(page.getByText('Read this introduction before the lesson.')).toBeVisible();
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByRole('button', { name: 'Review introduction' })).toBeVisible();
  await expect(page.getByText('Read this introduction before the lesson.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Review introduction' }).click();
  await expect(page.getByText('Read this introduction before the lesson.')).toBeVisible();

  await page.goto(url);
  await expect(page.getByLabel('How to finish')).toBeVisible();
  await page.getByRole('button', { name: 'Continue to chapter overview' }).click();
  await page.getByRole('button', { name: 'Begin baseline' }).click();
  await expect(page.getByRole('heading', { name: 'Question 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Review all' }).click();
  await expect(page.getByRole('heading', { name: 'Review before submitting' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Submit assessment' })).toBeDisabled();
  await page.getByRole('button', { name: 'Go to first unanswered' }).click();
  await expect(page.getByRole('heading', { name: 'Question 1' })).toBeFocused();
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  if (accessibility.violations.length) throw new Error(accessibility.violations
    .map(violation => `${violation.id}: ${violation.nodes.map(node => node.target.join(' ')).join(', ')}`).join('\n'));
  await page.getByRole('radio', { name: "I don't know yet" }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('status')).toContainText('Saved');
  await page.getByRole('button', { name: 'Mark for review' }).click();
  await expect(page.getByText(/1 marked for review/)).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Resume pretest' }).click();
  await expect(page.getByRole('heading', { name: 'Question 2' })).toBeVisible();
  for (let i = 2; i <= 30; i++) {
    await page.getByRole('radio', { name: 'Option a' }).check();
    await expect(page.getByRole('status')).toContainText('Saved');
    if (i < 30) await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await expect(page.getByText('All 30 responses are saved.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Review all' }).click();
  await expect(page.getByText('0 unanswered.')).toBeVisible();
  await page.getByRole('button', { name: 'Go to first review mark' }).click();
  await expect(page.getByRole('heading', { name: 'Question 1' })).toBeFocused();
  await page.getByRole('button', { name: 'Review all' }).click();
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Submit assessment' }).click();
  await expect(page.getByRole('heading', { name: 'Review before submitting' })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Submit assessment' }).click();
  await expect(page.getByRole('heading', { name: 'Assessment submitted' })).toBeVisible();
  await expect(page.getByText('Because A')).toHaveCount(0);

  await page.reload();
  await page.getByRole('button', { name: 'Continue to post-test' }).click();
  await page.getByRole('button', { name: 'Begin post-test' }).click();
  for (let i = 1; i <= 30; i++) {
    await page.getByRole('radio', { name: 'Option a' }).check();
    await expect(page.getByRole('status')).toContainText('Saved');
    if (i < 30) await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Review all' }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Submit assessment' }).click();
  await expect(page.getByRole('link', { name: 'Review my post-test' })).toBeVisible();
  if (pageErrors.length) throw new Error(pageErrors.join('\n'));
  process.stdout.write('Browser journey passed: finish guidance, incomplete review, question shortcuts, save/resume, unknown/marked responses, final-question handoff, confirmation, pretest and posttest.\n');
} finally {
  await browser?.close();
  await server.close();
}
