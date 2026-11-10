// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import {join} from 'node:path';
import {expect, it} from 'vitest';
import {memoDiskView} from '../lib/disk-view-memo.mjs';

it('reuses a view only for identical disk bytes and never caches a rejection', () => {
  const dir = fs.mkdtempSync(join(os.tmpdir(), 'disk-view-memo-'));
  const file = join(dir, 'source.txt');
  let calls = 0;
  const view = memoDiskView((path, raw) => {
    calls++;
    if (raw.toString() === 'unpinned') throw Error('Unpinned');
    return Buffer.from(raw.toString().toUpperCase());
  });
  try {
    fs.writeFileSync(file, 'pinned');
    expect(view(file).toString()).toBe('PINNED');
    expect(view(file).toString()).toBe('PINNED');
    expect(calls).toBe(1);

    // A change on disk is a different key, so the full check runs again.
    fs.writeFileSync(file, 'unpinned');
    expect(() => view(file)).toThrow('Unpinned');
    expect(() => view(file)).toThrow('Unpinned');
    expect(calls).toBe(3);

    // Callers get copies: changing one cannot alter the cached view.
    fs.writeFileSync(file, 'pinned');
    view(file).fill(0);
    expect(view(file).toString()).toBe('PINNED');
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
