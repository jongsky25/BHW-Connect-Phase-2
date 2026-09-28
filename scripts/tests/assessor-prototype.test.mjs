// @vitest-environment node
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { test, expect } from 'vitest';

const html = readFileSync('prototypes/assessor/index.html', 'utf8');
function preview() {
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
  const document = dom.window.document;
  const click = action => document.querySelector(`[data-action="${action}"]`).click();
  return { dom, document, click };
}

test('candidate learning to orientation to qualified assessment, then review and save', () => {
  const { dom, document, click } = preview();
  expect(document.body.textContent).toContain('79%');
  click('retake');
  expect(document.body.textContent).toContain('80%');
  click('orientation');
  expect(document.body.textContent).toContain('Score what you observe');
  click('qualified');
  click('dashboard');
  click('bhw');
  expect(document.body.textContent).toContain('6 / 42');
  click('assess');
  expect(document.querySelector('#review').disabled).toBe(true);
  document.querySelector('[value="practice"]').click();
  const note = document.querySelector('#note');
  note.value = '<img src=x onerror=alert(1)> Needs a prompt on the third role.';
  note.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  expect(document.querySelector('#review').disabled).toBe(false);
  click('review');
  expect(document.querySelector('#review-note').textContent).toContain('<img');
  expect(document.querySelector('#review-note img')).toBeNull();
  click('save');
  expect(document.querySelector('#saved').textContent).toContain('preview only');
  dom.window.close();
});

test('unqualified assessor sees the BHW but is directed to qualification', () => {
  const { dom, document, click } = preview();
  document.querySelector('[data-screen="dashboard"]').click();
  click('bhw');
  expect(document.querySelector('[data-action="assess"]')).toBeNull();
  click('qualifications');
  expect(document.querySelector('#scenario')).not.toBeNull();
  dom.window.close();
});

test('Filipino, searchable fictional roster and repeatable tour', () => {
  const { dom, document, click } = preview();
  document.querySelector('#language').click();
  expect(document.documentElement.lang).toBe('fil');
  expect(document.body.textContent).toContain('Buong kabanata');
  document.querySelector('[data-screen="dashboard"]').click();
  const search = document.querySelector('#search');
  search.value = 'missing'; search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  expect(document.querySelector('#roster').textContent).toContain('Walang tumugma');
  click('tour');
  click('tour-next');
  click('tour-back');
  expect(document.querySelector('.help').textContent).toContain('1/4');
  click('tour-close');
  expect(document.querySelector('.help')).toBeNull();
  click('tour');
  expect(document.querySelector('.help')).not.toBeNull();
  dom.window.close();
});
