import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function assertGabayReleaseApproved() {
  const manifest = JSON.parse(readFileSync(path.join(root, 'content/gabay-release-manifest.json'), 'utf8'));
  if (manifest.package !== 'philhealth-gabay' || !manifest.approval || !manifest.source_rechecked_on) {
    throw new Error('Gabay release approval record is incomplete');
  }
  const files = Object.entries(manifest.sha256_lf ?? {});
  if (files.length < 19) throw new Error('Gabay release approval record has missing content');
  for (const [relative, expected] of files) {
    if (relative.includes('..') || path.isAbsolute(relative)) throw new Error('invalid release path');
    const value = readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
    const actual = createHash('sha256').update(value).digest('hex');
    if (actual !== expected) throw new Error(`Gabay release content changed: ${relative}`);
  }
  return { files: files.length, sourceRecheckedOn: manifest.source_rechecked_on };
}
