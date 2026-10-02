import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const moduleDir = path.join(root, 'content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons');
const narration = JSON.parse(readFileSync(path.join(root, 'content/training/day1-basic-competencies/narration.json'), 'utf8'));
const lessonKeys = ['bhw-roles-hepo', 'bhw-health-educator', 'bhw-community-organizer', 'bhw-service-provider', 'bhw-records'];

describe('Chapter 1 narrated stories', () => {
  for (const key of lessonKeys) {
    it(`${key} keeps Gemini narration in its Read and animated story`, () => {
      const lesson = JSON.parse(readFileSync(path.join(moduleDir, key, 'lesson.json'), 'utf8'));
      const asset = lesson.assets.find(item => item.id === lesson.featured_asset_id);
      expect(asset?.review_status).toBe('approved');
      expect(asset?.provenance).toMatch(/Gemini TTS.*gemini-3\.8-flash-tts.*Kore/);
      for (const lang of ['fil', 'en']) {
        expect(asset?.videos?.[lang]?.path).toMatch(/-riza-gemini-.*\.mp4$/);
        expect(asset?.videos?.[lang]?.captions?.path).toMatch(/-riza-gemini-.*\.vtt$/);
      }
      for (const section of Object.values(narration.lessons[key].sections)) {
        for (const lang of ['fil', 'en']) expect(section[lang]?.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');
      }
    });
  }
});
