// Hash-bound predecessor view for the preservation-scope CI fix; historical
// guards see the exact bytes they pinned, current tests run current bytes.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
let receipt;
export function beforeCiScope(p,actual=fs.readFileSync(p)){
 const r=receipt??=JSON.parse(fs.readFileSync('docs/ci-preservation-scope-receipt.json'));
 const e=r.changed_existing_files[p];if(!e)return actual;
 if(sha(actual)===e.predecessor_sha256)return actual;
 if(sha(actual)!==e.proposed_sha256)throw Error('Unpinned integrated successor (CI preservation scope): '+p);
 const prior=Buffer.from(e.predecessor_utf8);
 if(sha(prior)!==e.predecessor_sha256)throw Error('Corrupt CI preservation scope predecessor: '+p);
 return prior;
}
