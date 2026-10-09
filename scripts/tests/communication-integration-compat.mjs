import {beforeProposed162} from './lesson-162-proposal-compat.mjs';
import {beforeProposed163} from './lesson-163-proposal-compat.mjs';
import fs from 'node:fs';
const receipt=JSON.parse(fs.readFileSync('docs/lesson-162-proposal-receipt.json'));
export const beforeIntegratedCommunication=p=>receipt.changed_existing_files[p]?beforeProposed162(p):beforeProposed163(p);
