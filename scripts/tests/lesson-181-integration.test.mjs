// @vitest-environment node
import {test,expect} from 'vitest';import fs from 'node:fs';import {createHash} from 'node:crypto';import {beforeLesson181} from '../lib/lesson-181-integration.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
test('historical guards require exact draft successors and reject any unpinned mutation',()=>{const r=JSON.parse(fs.readFileSync('docs/lesson-181-proposal-receipt.json'));expect(r.target).toBe('safety-identify');expect(r.owner_release_approval).toBe(false);for(const [p,e]of Object.entries(r.changed_existing_files)){expect(sha(fs.readFileSync(p)),p).toBe(e.proposed_sha256);expect(sha(beforeLesson181(p)),p).toBe(e.predecessor_sha256);expect(()=>beforeLesson181(p,Buffer.from('unpinned mutation'))).toThrow('Unpinned');}});
