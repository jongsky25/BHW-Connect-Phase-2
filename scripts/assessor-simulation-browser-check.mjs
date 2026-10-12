import {chromium, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
import {startStoryboard} from './assessor-simulation-storyboard.mjs';

// Uses actual rendered component, never the Next app or a hosted database.
const server = await startStoryboard(0);
let browser;
try {
  browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
  const url = server.resolvedUrls.local[0];
  await mkdir('/tmp/assessor-simulation-review', {recursive: true});
  for (const locale of ['en', 'fil']) for (const width of [390, 1024]) for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({viewport: {width, height: 900}, colorScheme});
    const page = await context.newPage();
    const errors = [], forbidden = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (!request.url().startsWith(url) || !['GET', 'HEAD'].includes(request.method())) forbidden.push(request.url());
    });
    await page.goto(url);
    if (locale === 'fil') await page.getByRole('button', {name: 'Filipino', exact: true}).click();
    const next = page.getByRole('button', {name: locale === 'en' ? 'Next scene' : 'Susunod na scene', exact: true});
    const answers = [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1];
    const guide = page.getByRole('button', {name: locale === 'en' ? 'Open guide / return to guide' : 'Buksan ang gabay / bumalik sa gabay'});
    for (let i = 0; i < answers.length; i++) {
      await expect(page.locator('#story-scene-title')).toContainText(`${i + 1}.`);
      if (i > 0) await expect(page.locator('#story-scene-title')).toBeFocused();
      if (i === 1) {
        await guide.click();
        await page.getByRole('button', {name: locale === 'en' ? 'Switch to Maria’s view' : 'Lumipat sa view ni Maria'}).click();
        await guide.click();
      }
      if (i === 3) {
        for (const checkbox of await page.getByRole('checkbox').all()) await checkbox.check();
        await page.getByRole('textbox').fill('P1: Maria accepted correction after the prompt. Fictional practice.');
      }
      if ([3, 5, 6].includes(i)) {
        await page.locator('.choices button').nth(0).click();
        await expect(next).toBeDisabled();
        await expect(page.getByRole('status')).toContainText(locale === 'en' ? 'Try again' : 'Subukan muli');
      }
      const answer = page.locator('.choices button').nth(answers[i]);
      await answer.focus(); await page.keyboard.press('Enter');
      await expect(page.getByRole('status')).toContainText(locale === 'en' ? 'Checkpoint reviewed' : 'Nasuri ang checkpoint');
      if ([1, 3, 5, 6, 10].includes(i)) {
        const a11y = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa']).analyze();
        expect(a11y.violations, `${locale}/${width}/${colorScheme}/scene ${i + 1}`).toEqual([]);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (i === 3 || i === 10) await page.screenshot({path: `/tmp/assessor-simulation-review/${locale}-${width}-${colorScheme}-scene-${i + 1}.png`, fullPage: true});
      if (i < answers.length - 1) await next.click();
    }
    await expect(page.getByText(locale === 'en' ? /Local review checklist/ : /Lokal na checklist ng review/)).toContainText('11/11');
    await expect(page.getByRole('complementary')).toContainText('SAMPLE');
    expect(await page.evaluate(() => ({local: localStorage.length, session: sessionStorage.length}))).toEqual({local: 0, session: 0});
    await page.reload();
    await expect(page.getByText(/Local review checklist/)).toContainText('0/11');
    expect(errors).toEqual([]); expect(forbidden).toEqual([]);
    await context.close();
  }
  console.log('PASS: 8 bilingual/viewport/theme journeys; guided success, mistaken rating, no-grade, blocker, correction, keyboard, axe, no external requests or writes, reload reset. Screenshots: /tmp/assessor-simulation-review');
} finally {
  await browser?.close(); await server.close();
}
