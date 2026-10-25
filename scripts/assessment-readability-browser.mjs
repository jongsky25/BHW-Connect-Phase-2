// Actual components/CSS with local RPC fixtures; never connects to a database.
import {chromium, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {createServer} from 'vite';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = join(root, 'scripts/tests/fixtures/assessment-readability-browser');
const server = await createServer({configFile: false, root: fixture,
  resolve: {alias: [
    {find: '@/lib/supabase/client', replacement: join(fixture, 'client.ts')},
    {find: 'next/link', replacement: join(fixture, 'link.tsx')},
    {find: 'next/navigation', replacement: join(fixture, 'navigation.ts')},
    {find: /^@\//, replacement: `${join(root, 'src')}/`},
  ]}, esbuild: {jsx: 'automatic'}, server: {host: '127.0.0.1', port: 0}, logLevel: 'error'});
let browser;
let cases = 0;
try {
  await server.listen();
  browser = await chromium.launch({headless: true, args: ['--no-sandbox'],
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined});
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const lang of ['en', 'fil']) for (const phase of ['pretest', 'posttest'])
    for (const width of [320, 390]) for (const theme of ['light', 'dark']) {
      await page.setViewportSize({width, height: 844});
      await page.goto(`${server.resolvedUrls.local[0]}?lang=${lang}&phase=${phase}&theme=${theme}`);
      await page.getByRole('button', {name: lang === 'en' ? `Resume ${phase}` : `Ipagpatuloy ang ${phase}`, exact: true}).click();
      await expect(page.locator('[data-assessment] h1')).toBeVisible();
      await page.locator('[data-assessment] fieldset input').first().check();
      const jump = page.locator(`[data-assessment] [aria-label="${lang === 'en' ? 'Jump to question' : 'Pumunta sa tanong'}"] button`);
      for (const [index, pixels] of [[1, 16], [3, 20]]) {
        await jump.first().click();
        const before = await page.evaluate(() => window.readability.calls.length);
        await page.locator('input[name="font-scale"]').nth(index).check();
        await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBe(pixels);
        await expect(page.locator('[data-assessment] fieldset input').first()).toBeChecked();
        expect(await page.evaluate(start => window.readability.calls.slice(start)
          .filter(name => name !== 'rpc_update_display_settings'), before)).toEqual([]);
        for (const question of await page.evaluate(() => window.readability.indexes)) {
          await jump.nth(question).click();
          const geometry = await page.evaluate(() => {
            const root = document.documentElement;
            const selectors = ['[data-assessment]', '[data-quick]', '[data-full-font]', '[data-legacy]'];
            return {document: root.scrollWidth <= innerWidth + 1,
              panels: selectors.every(selector => {const e = document.querySelector(selector); return e.scrollWidth <= e.clientWidth + 1;}),
              question: parseFloat(getComputedStyle(document.querySelector('[data-assessment] h1')).fontSize),
              legacy: parseFloat(getComputedStyle(document.querySelector('[data-legacy] legend')).fontSize),
              choice: parseFloat(getComputedStyle(document.querySelector('[data-legacy] label')).fontSize),
              radios: [...document.querySelectorAll('[data-legacy] input')].every(e => e.getBoundingClientRect().width >= 12)};
          });
          expect(geometry).toEqual({document: true, panels: true, question: pixels * 1.25,
            legacy: pixels * 1.25, choice: pixels, radios: true});
        }
        await page.getByRole('button', {name: lang === 'en' ? 'Review all' : 'Balikan ang lahat', exact: true}).click();
        await expect(page.locator('[data-assessment] ol button')).toHaveCount(30);
        expect(await page.locator('[data-assessment] ol').evaluate(e => {
          const r = e.getBoundingClientRect();
          return [...e.querySelectorAll('button')].every(button => {
            const b = button.getBoundingClientRect(); return b.left >= r.left - 1 && b.right <= r.right + 1 && b.width >= 44 && b.height >= 44;
          }) && document.documentElement.scrollWidth <= innerWidth + 1;
        })).toBe(true);
        await expect(page.getByRole('button', {name: lang === 'en' ? 'Submit assessment' : 'Isumite ang pagtatasa', exact: true})).toBeDisabled();
        if (width === 320 && phase === 'pretest' && index === 3) {
          const scan = await new AxeBuilder({page}).include('main').withTags(['wcag2a', 'wcag2aa']).analyze();
          expect(scan.violations).toEqual([]);
        }
        await page.getByRole('button', {name: lang === 'en' ? 'Back to questions' : 'Bumalik sa mga tanong', exact: true}).click();
        cases++;
      }
      // Native keyboard selection still works after the segmented row wraps.
      const quick = page.locator('input[name="quick-font-scale"]').last();
      await quick.focus(); await page.keyboard.press('Space'); await expect(quick).toBeChecked();
      await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBe(18);
    }
  expect(errors).toEqual([]);
  console.log(`Assessment readability passed: ${cases} phone/language/theme/form/size cases, reflow, radio state, keyboard and review geometry.`);
} finally {await browser?.close(); await server.close();}
