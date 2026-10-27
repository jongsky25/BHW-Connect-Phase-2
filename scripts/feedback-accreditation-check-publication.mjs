import {readFileSync} from 'node:fs';
import {accreditationCheckPublicationSql} from './lib/bhw-accreditation-check-sql.mjs';

const sql=accreditationCheckPublicationSql();
const checked=readFileSync('content/training/day1-basic-competencies/lesson-releases/bhw-accreditation-fb-2.2l-v2/publish.sql','utf8');
if(sql!==checked)throw new Error('Reviewed accreditation publication SQL drift');
if(process.argv.includes('--sql'))process.stdout.write(sql);
else console.log('Approved accreditation check and reviewed publication SQL match');
