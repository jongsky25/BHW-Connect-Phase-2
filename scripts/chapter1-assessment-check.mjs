import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLessonMap, validateOrientation, validateRelease } from './lib/chapter1-assessment-content.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'content/training/day1-basic-competencies/learner-assessment-v2');
const orientation = JSON.parse(readFileSync(join(source, 'orientation.json'), 'utf8'));
const map = loadLessonMap(root);
if (map.lessonKeys.length !== 42 || Object.keys(map.slotTargets).length !== 30 ||
    Object.keys(map.boundaries).length !== 12) throw new Error('The lesson map is incomplete');

const orientationOnly = process.argv.includes('--orientation-only');
const errors = orientationOnly ? validateOrientation(orientation) :
  existsSync(join(source, 'release.json'))
    ? validateRelease(JSON.parse(readFileSync(join(source, 'release.json'), 'utf8')), { ...map, orientation })
    : ['release.json is absent: the 108 reviewed questions and curriculum revisions have not been authored'];
if (errors.length) {
  for (const error of errors) process.stderr.write(`- ${error}\n`);
  process.exitCode = 1;
} else process.stdout.write('Chapter 1 assessment content contract passed.\n');
