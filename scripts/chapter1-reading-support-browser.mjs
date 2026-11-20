// Local rendering of the real components and CSS; no pilot or database access.
import {chromium, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {createServer} from 'vite';
import {readFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
const root = resolve(import.meta.dirname, '..');
const fixture = join(root, 'scripts/tests/fixtures/chapter1-manual');
const support = JSON.parse(readFileSync(join(root, 'src/lib/elearning/chapter1-reading-support.json')));
const server = await createServer({configFile: false, root: fixture, publicDir: join(root, 'public'),
  resolve: {alias: [{find: 'next/image', replacement: join(fixture, 'image.tsx')}, {find: /^@\//, replacement: `${root}/src/`}]},
  esbuild: {jsx: 'automatic'}, server: {host: '127.0.0.1', port: 0}, logLevel: 'error'});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({headless: true, args: ['--no-sandbox'], executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined});
  const context = await browser.newContext({viewport: {width: 320, height: 740}});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = server.resolvedUrls.local[0];
  for (const locale of ['en', 'fil']) {
    for (const [key, ids] of Object.entries(support.lessons)) {
      await page.goto(`${base}?support&lesson=${key}&locale=${locale}`);
      const summary = page.getByText(locale === 'en' ? 'Words used in this lesson' : 'Mga salitang gamit sa aralin', {exact: true});
      if (!ids.length) {await expect(summary).toHaveCount(0); continue;}
      await summary.focus();
      await page.keyboard.press('Enter');
      for (const id of ids) await expect(page.getByText(support.terms[id][locale], {exact: true})).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    // The longest panel at 200% text, with both source and editorial help open.
    await page.goto(`${base}?support&lesson=resources-monitor&locale=${locale}`);
    await page.evaluate(() => {document.documentElement.style.fontSize = '200%';});
    await page.getByText(locale === 'en' ? 'Words used in this lesson' : 'Mga salitang gamit sa aralin', {exact: true}).click();
    await page.getByText(locale === 'en' ? 'Read the Reference Manual' : 'Basahin ang Reference Manual', {exact: true}).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const dark of [false, true]) {
      await page.evaluate(dark => document.documentElement.dataset.theme = dark ? 'dark' : 'light', dark);
      expect((await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
    }
    await context.setOffline(true);
    const summary = page.getByText(locale === 'en' ? 'Words used in this lesson' : 'Mga salitang gamit sa aralin', {exact: true});
    await summary.click(); await summary.click();
    await expect(page.getByText(support.terms.denominator[locale], {exact: true})).toBeVisible();
    await context.setOffline(false);
  }
  if (process.env.READING_SUPPORT_SCREENSHOT_PATH) {
    await page.evaluate(() => {document.documentElement.style.fontSize = ''; window.scrollTo(0, 0);});
    await page.screenshot({path: process.env.READING_SUPPORT_SCREENSHOT_PATH});
  }
  expect(errors).toEqual([]);
  console.log('PASS: 42 lesson mappings in both languages, keyboard access, 320px reflow, longest panel at 200% text, light/dark WCAG A/AA, loaded help offline.');
} finally {
  await browser?.close();
  await server.close();
}
