// @vitest-environment node
import {readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect, it} from 'vitest';
import {loadReferenceModule, contentHash} from '../lib/reference-content.mjs';
import {applyApprovedReferenceReleases} from '../lib/safety-identify-copy-release.mjs';

const manual = JSON.parse(readFileSync('content/training/day1-basic-competencies/manual-references/chapter1.json'));
const baseline = JSON.parse(readFileSync('docs/work-items/c1-pe-0/publication-baseline.json'));
const root = 'content/training/day1-basic-competencies/modules';
const lessons = readdirSync(root).flatMap(dir => applyApprovedReferenceReleases(loadReferenceModule(`${root}/${dir}`, 'public')).lessons);

it('maps every published lesson and preserves the effective approved publication, including all eight overlays', () => {
  expect(lessons).toHaveLength(42);
  expect(Object.keys(manual.lessons).sort()).toEqual(lessons.map(l => l.manifest.lesson_key).sort());
  for (const lesson of lessons) {
    const key = lesson.manifest.lesson_key;
    expect(contentHash(lesson), key).toBe(baseline.lessons.find(l => l.lesson_key === key).content_hash);
    const mapping = manual.lessons[key];
    expect(mapping.sections.length).toBeGreaterThan(0);
    for (const id of mapping.sections) expect(manual.sections.some(s => s.id === id)).toBe(true);
  }
  expect(Object.entries(manual.lessons).filter(([, m]) => m.partialSupport).map(([key]) => key).sort())
    .toEqual(['resources-audit', 'resources-monitor', 'resources-safe-change']);
});

it('preserves citations, the complete two-page safety table, and all original table figures', () => {
  expect(manual.source.sha256).toBe(baseline.manual_pdf_sha256);
  expect(manual.sections).toHaveLength(11);
  const tables = manual.sections.flatMap(s => {
    expect(s.printedPages).toEqual(s.pdfPages.map(p => p - 8));
    return s.blocks.filter(b => b.kind === 'table');
  });
  expect(tables.map(t => t.rows.length)).toEqual([3, 5, 6, 3, 2]);
  for (const table of tables) {
    expect(table.rows.every(row => row.length === table.headers.length && row.every(cell => cell.trim()))).toBe(true);
    const hash = createHash('sha256').update(readFileSync(`public${table.figure.src}`)).digest('hex');
    expect(hash).toBe(table.figure.sha256);
    expect(table.figure.src).toContain(hash.slice(0, 12));
  }
  const safety = manual.sections.find(s => s.id === 'safety');
  expect(safety.pdfPages).toEqual([21, 22, 23]);
  expect(safety.blocks.filter(b => b.kind === 'table').flatMap(b => b.rows).at(-1)[0])
    .toBe('Mga disgrasya at aksidente habang nagtatrabaho');
});
