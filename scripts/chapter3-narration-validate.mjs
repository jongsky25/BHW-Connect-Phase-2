#!/usr/bin/env node
// Offline verification of all Chapter III Read audio and manifest entries.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadReferenceModule } from './lib/reference-content.mjs';
import { narratedModules, NARRATION_MANIFEST } from './lib/narration-sources.mjs';
import { mp3AudioFrames, planReferenceNarration, sha256 } from './lib/reference-narration.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, NARRATION_MANIFEST), 'utf8'));
const modules = narratedModules(root).filter(m => m.key.startsWith('chapter3/')).map(({ key, dir }) => ({ key, lessons: loadReferenceModule(path.join(root, dir), path.join(root, 'public')).lessons }));
const keys = modules.flatMap(m => m.lessons.map(l => l.manifest.lesson_key));
assert.equal(modules.length, 12);
assert.equal(keys.length, 65);
assert.equal(new Set(keys).size, 65);
const audioFile = src => path.join(root, 'public', src.slice(1));
const hash = src => {
  try { return sha256(readFileSync(audioFile(src))); } catch { return null; }
};
const items = planReferenceNarration(modules, manifest, hash);
assert.equal(items.length, 910);
assert.ok(items.every(i => i.action === 'skip'), `Stale/missing: ${items.filter(i => i.action !== 'skip').map(i => `${i.lessonKey}/${i.sectionId}/${i.language}`).join(', ')}`);
let seconds = 0;
let bytes = 0;
for (const item of items) {
  const entry = item.existing;
  const data = readFileSync(audioFile(item.src));
  const frames = mp3AudioFrames(data);
  const duration = frames.reduce((n, f) => n + f.samples / f.sampleRate, 0);
  assert.ok(Math.abs(duration - entry.duration_seconds) < 0.01, item.src);
  assert.ok(entry.timings.length && entry.timings.at(-1).end_ms <= Math.round(duration * 1000), item.src);
  bytes += data.length;
  seconds += duration;
}
console.log(JSON.stringify({ mode: 'offline', modules: modules.length, lessons: keys.length, audio_sections: items.length, languages: ['fil','en'], minutes: Math.round(seconds / 60 * 10) / 10, megabytes: Math.round(bytes / 1048576 * 10) / 10, stale_or_missing: 0 }, null, 2));
