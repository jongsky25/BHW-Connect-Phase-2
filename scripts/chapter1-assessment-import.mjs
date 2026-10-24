import { draftImportSql } from './lib/chapter1-assessment-import-sql.mjs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLessonMap, validateRelease } from './lib/chapter1-assessment-content.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'content/training/day1-basic-competencies/learner-assessment-v2');
const orientation = JSON.parse(readFileSync(join(dir, 'orientation.json'), 'utf8'));
const release = JSON.parse(readFileSync(join(dir, 'release.json'), 'utf8'));
const errors = validateRelease(release, { ...loadLessonMap(root), orientation });
if (errors.length) {
  errors.forEach(error => process.stderr.write(`- ${error}\n`));
  process.exit(1);
}
const contentHash = createHash('sha256').update(JSON.stringify(release)).digest('hex');
const summary = `Validated ${release.release_id}: 60 test items, 48 practice items, 42 pinned revisions, 9 introductions; SHA-256 ${contentHash}`;
if (!process.argv.includes('--import')) { process.stdout.write(`${summary}\nDry run only. Use --import with ASSESSMENT_DATABASE_URL to write a draft release.\n`); process.exit(0); }

const connection = process.env.ASSESSMENT_DATABASE_URL;
if (!connection) throw new Error('ASSESSMENT_DATABASE_URL is required for --import');
const url = new URL(connection);
if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Expected a PostgreSQL URL');
const sql = draftImportSql(release);
const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432',
  PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
  PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGSSLMODE: url.searchParams.get('sslmode') || 'require' };
delete env.ASSESSMENT_DATABASE_URL;
const result = spawnSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1'], { input: sql, env, encoding: 'utf8', maxBuffer: 1024 * 1024 });
if (result.error || result.status !== 0) throw new Error('Transactional draft import failed; check PostgreSQL connectivity, curriculum scope and release IDs.');
process.stdout.write(`${summary}\nDraft release imported or confirmed unchanged. New starts remain disabled.\n`);
