// Memoizes a historical reader's view of the file currently on disk.
//
// Each reader-preservation layer calls the layer below it twice: once on the
// bytes it was given and once on the current disk bytes, to check that the
// working tree is a pinned successor. Every layer therefore doubled the work
// of the layer below it, and the preservation tests ran into their timeouts
// as layers were added.
//
// The disk bytes are still read on every call, and the cache key includes
// their SHA-256, so any change on disk misses the cache and runs the full
// reconstruction and its checks again. A call that throws caches nothing.
// The layers read their receipts only once per process, so for the same
// path and bytes the view is always the same.
import fs from 'node:fs';
import {createHash} from 'node:crypto';

export function memoDiskView(view) {
  const cache = new Map();
  return path => {
    const raw = fs.readFileSync(path);
    const key = path + '\0' + createHash('sha256').update(raw).digest('hex');
    let result = cache.get(key);
    if (!result) {
      result = Buffer.from(view(path, raw));
      cache.set(key, result);
    }
    // Callers get a copy, so they cannot alter the cached bytes.
    return Buffer.from(result);
  };
}
