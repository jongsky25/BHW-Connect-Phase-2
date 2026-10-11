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
const literal = value => `'${String(value).replaceAll("'", "''")}'`;
const json = value => `convert_from(decode('${Buffer.from(JSON.stringify(value)).toString('hex')}','hex'),'UTF8')::jsonb`;
const releaseId = literal(release.release_id);
const sql = `
begin;
do $import$
begin
  if not exists (
    select 1 from public.training_program_chapters ch
    join public.training_programs p on p.id = ch.program_id
    where p.content_key = 'bhw-reference-manual' and p.status = 'published'
      and ch.chapter_key = 'chapter-1' and ch.availability = 'available'
      and (select count(*) from jsonb_array_elements(${json(release.curriculum_revisions)}) rev
        where exists (select 1 from public.course_modules m
          join public.course_lessons l on l.module_id = m.id
          join public.course_lesson_revisions r on r.id = l.published_revision_id
          where m.course_id = ch.course_id and l.lesson_key = rev->>'lesson_key'
            and r.id = (rev->>'revision_id')::uuid and r.content_hash = rev->>'sha256')) = 42
  ) then raise exception 'approved published curriculum does not match pinned revisions'; end if;
  if exists (select 1 from learner_assessment_private.releases
    where id = ${releaseId} and content_hash <> '${contentHash}') then
    raise exception 'release ID already has different content'; end if;
  insert into learner_assessment_private.releases
    (id, blueprint_id, source_commit, program_key, chapter_key, curriculum_revisions, content_hash)
    values (${releaseId}, ${literal(release.blueprint_id)}, ${literal(release.source_commit)},
      'bhw-reference-manual', 'chapter-1', ${json(release.curriculum_revisions)}, '${contentHash}')
    on conflict (id) do nothing;
${['pretest', 'posttest'].map(phase => {
  const form = release.forms[phase];
  return `  if exists (select 1 from learner_assessment_private.forms where id = ${literal(form.form_id)}
    and (release_id <> ${releaseId} or form_hash <> ${literal(form.hash)})) then
    raise exception 'form ID already has different content'; end if;
  insert into learner_assessment_private.forms(id, release_id, phase, items, form_hash)
    values(${literal(form.form_id)}, ${releaseId}, '${phase}', ${json(form.items)}, ${literal(form.hash)})
    on conflict (id) do nothing;`;
}).join('\n')}
${release.checkpoints.map(group => `  if exists (select 1 from learner_assessment_private.checkpoints
    where release_id = ${releaseId} and group_key = ${literal(group.key)}
      and (after_lesson_key <> ${literal(group.after_lesson_key)}
        or first_items <> ${json(group.first)} or alternate_items <> ${json(group.alternates)})) then
    raise exception 'checkpoint ID already has different content'; end if;
  insert into learner_assessment_private.checkpoints(release_id, group_key, after_lesson_key, first_items, alternate_items)
    values(${releaseId}, ${literal(group.key)}, ${literal(group.after_lesson_key)},
      ${json(group.first)}, ${json(group.alternates)})
    on conflict (release_id, group_key) do nothing;`).join('\n')}
end;
$import$;
commit;
`;
const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432',
  PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
  PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGSSLMODE: url.searchParams.get('sslmode') || 'require' };
delete env.ASSESSMENT_DATABASE_URL;
const result = spawnSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1'], { input: sql, env, encoding: 'utf8', maxBuffer: 1024 * 1024 });
if (result.error || result.status !== 0) throw new Error('Transactional draft import failed; check PostgreSQL connectivity, curriculum scope and release IDs.');
process.stdout.write(`${summary}\nDraft release imported or confirmed unchanged. New starts remain disabled.\n`);
