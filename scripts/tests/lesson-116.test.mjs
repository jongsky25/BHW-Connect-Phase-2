// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadReferenceModule} from '../lib/reference-content.mjs';
import {planReferenceNarration} from '../lib/reference-narration.mjs';
import {ROLES_APPLICATION_BEATS} from '../../remotion/src/roles-application/narration.ts';

const root = path.resolve(import.meta.dirname, '../..');
const moduleDir = path.join(root, 'content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw');
const hashFile = src => createHash('sha256').update(readFileSync(path.join(root, 'public', src.slice(1)))).digest('hex');
const json = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));

describe('lesson 1.1.6 role application', () => {
  it('keeps every Read recording current and expressive Gemini after text or character edits', () => {
    const trainingModule = loadReferenceModule(moduleDir, path.join(root, 'public'));
    const manifest = json('content/training/day1-basic-competencies/narration.json');
    const plan = planReferenceNarration([{key:'01-tungkulin-ng-bhw',lessons:trainingModule.lessons}], manifest, hashFile)
      .filter(item => item.lessonKey === 'bhw-roles-application');
    expect(plan).toHaveLength(12);
    for (const item of plan) {
      expect(item.action).toBe('skip');
      expect(item.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');
      expect(item.speechStyle).toMatch(/animated community health storyteller/);
    }
  });

  it('has complete bilingual featured media whose captions follow measured Gemini beats', () => {
    const lesson = json('content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-roles-application/lesson.json');
    const asset = lesson.assets.find(item => item.id === lesson.featured_asset_id);
    expect(asset.provenance).toMatch(/Gemini TTS.*gemini-3\.8-flash-tts.*Kore/);
    expect(['draft','approved']).toContain(asset.review_status);
    expect(hashFile(asset.path)).toBe(asset.content_hash);
    for (const lang of ['fil','en']) {
      const video = asset.videos[lang];
      expect(video.path).toMatch(/-riza-gemini-.*\.mp4$/);
      expect(hashFile(video.path)).toBe(video.content_hash);
      expect(hashFile(video.captions.path)).toBe(video.captions.content_hash);
      const timings = json(`remotion/public/roles-application/narration-${lang}.json`);
      expect(timings.language).toBe(lang);
      expect(timings.beats.map(beat => beat.zone)).toEqual(ROLES_APPLICATION_BEATS.map(beat => beat.id));
      expect(timings.beats.map(beat => beat.text)).toEqual(ROLES_APPLICATION_BEATS.map(beat => beat[lang]));
      const captions = readFileSync(path.join(root, 'public', video.captions.path.slice(1)), 'utf8');
      for (const beat of timings.beats) expect(captions).toContain(beat.text);
      expect(video.duration_s).toBeGreaterThan(timings.durationSeconds);
    }
  });
});
