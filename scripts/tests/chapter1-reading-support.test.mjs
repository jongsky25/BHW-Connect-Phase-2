// @vitest-environment node
import {readFileSync, readdirSync} from 'node:fs';
import {expect, it} from 'vitest';
import {loadReferenceModule, contentHash} from '../lib/reference-content.mjs';
import {applyApprovedReferenceReleases} from '../lib/safety-identify-copy-release.mjs';

const support = JSON.parse(readFileSync('src/lib/elearning/chapter1-reading-support.json'));
const review = JSON.parse(readFileSync('docs/work-items/c1-pe-1-language/terminology-review.json'));
const baseline = JSON.parse(readFileSync('docs/work-items/c1-pe-0/publication-baseline.json'));
const root = 'content/training/day1-basic-competencies/modules';
const lessons = readdirSync(root).flatMap(dir => applyApprovedReferenceReleases(loadReferenceModule(`${root}/${dir}`, 'public')).lessons);

it('ties each explanation to actual Filipino teaching text and preserves every published lesson hash', () => {
  expect(Object.keys(support.lessons).sort()).toEqual(lessons.map(l => l.manifest.lesson_key).sort());
  expect(review.lessons).toHaveLength(42);
  for (const lesson of lessons) {
    const key = lesson.manifest.lesson_key;
    expect(contentHash(lesson), key).toBe(baseline.lessons.find(l => l.lesson_key === key).content_hash);
    const evidence = review.lessons.find(l => l.lesson_key === key);
    expect(Object.keys(evidence.term_sections)).toEqual(support.lessons[key]);
    for (const [id, sections] of Object.entries(evidence.term_sections)) {
      expect(support.terms[id].fil.trim()).not.toBe('');
      expect(support.terms[id].en.trim()).not.toBe('');
      for (const sectionId of sections) {
        const section = lesson.revision.read_sections.find(s => s.id === sectionId);
        // Never source a glossary entry from an answer key or hidden feedback.
        const text = [section.heading_fil, section.body_fil, section.takeaway_fil].join(' ').toLowerCase();
        expect(review.term_aliases[id].some(alias => text.includes(alias)), `${key}/${sectionId}/${id}`).toBe(true);
      }
    }
  }
});
