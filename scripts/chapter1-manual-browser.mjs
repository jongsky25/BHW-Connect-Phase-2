// Actual reference component and application CSS, local-only; no database.
import {chromium, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {createServer} from 'vite';
import {readFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
const root = resolve(import.meta.dirname, '..');
const fixture = join(root, 'scripts/tests/fixtures/chapter1-manual');
const manual = JSON.parse(readFileSync(join(root, 'content/training/day1-basic-competencies/manual-references/chapter1.json')));
const server = await createServer({configFile: false, root: fixture, publicDir: join(root, 'public'),
  resolve: {alias: [{find: 'next/image', replacement: join(fixture, 'image.tsx')}, {find: /^@\//, replacement: `${root}/src/`}]},
  esbuild: {jsx: 'automatic'}, server: {host: '127.0.0.1', port: 0}, logLevel: 'error'});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({headless: true, args: ['--no-sandbox'], executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined});
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = server.resolvedUrls.local[0];
  for (const locale of ['en', 'fil']) {
    for (const [key, mapping] of Object.entries(manual.lessons)) {
      await page.goto(`${base}?lesson=${key}&locale=${locale}`);
      const summary = page.locator('main > details > summary');
      await expect(summary).toBeVisible();
      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('blockquote')).toHaveCount(mapping.sections.length);
      await expect(page.getByRole('link', {name: /Google Drive/})).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await page.goto(`${base}?lesson=safety-identify&locale=en`);
  await page.locator('main > details > summary').click();
  await expect(page.getByText('Mga disgrasya at aksidente habang nagtatrabaho')).toBeVisible();
  const a11y = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(a11y.violations).toEqual([]);
  await page.getByText('See the original table').last().click();
  const image = page.getByRole('img', {name: /workplace \(2\)/});
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Already-loaded text remains readable when connectivity disappears. This
  // does not promise offline cold loads, unloaded images or saved progress.
  await context.setOffline(true);
  await page.locator('main > details > summary').click();
  await page.locator('main > details > summary').click();
  await expect(page.getByText('Mga disgrasya at aksidente habang nagtatrabaho')).toBeVisible();
  await context.setOffline(false);
  if (process.env.MANUAL_SCREENSHOT_PATH) await page.screenshot({path: process.env.MANUAL_SCREENSHOT_PATH});
  expect(errors).toEqual([]);
  console.log('PASS: all 42 references in both languages at 390px, keyboard opening, citations, safety figures, no horizontal overflow, WCAG AA scan, already-loaded text offline.');
} finally {
  await browser?.close();
  await server.close();
}
