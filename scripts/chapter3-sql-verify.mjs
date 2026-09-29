#!/usr/bin/env node
// Emit a read-only SQL query comparing every staged revision hash with the
// committed Chapter III package. Pipe to a confirmed target only after the
// owner has authorized contact with that target.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentHash, loadReferenceModule } from './lib/reference-content.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const courseId = process.argv[2];
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId ?? '')) {
  throw new Error('Usage: node scripts/chapter3-sql-verify.mjs <staged-course-uuid>');
}
const pkg = path.join(root, 'content/training/chapter3-core-competencies');
const blueprint = JSON.parse(readFileSync(path.join(pkg, 'chapter-blueprint.json'), 'utf8'));
const q = s => `'${String(s).replaceAll("'", "''")}'`;
const rows = blueprint.modules.flatMap((m, position) =>
  loadReferenceModule(path.join(pkg, 'drafts', m.module_key), path.join(root, 'public')).lessons
    .map(l => `(${position}, ${q(l.manifest.lesson_key)}, ${q(contentHash(l))})`));
if (rows.length !== 65) throw new Error('Expected 65 lessons');
process.stdout.write(`WITH expected(module_position, lesson_key, content_hash) AS (VALUES
${rows.join(',\n')}
), actual AS (
  SELECT m.position AS module_position, l.lesson_key, r.content_hash
  FROM public.courses c
  JOIN public.course_modules m ON m.course_id = c.id
  JOIN public.course_lessons l ON l.module_id = m.id
  JOIN public.course_lesson_revisions r ON r.lesson_id = l.id
  WHERE c.id = ${q(courseId)}
), matched AS (
  SELECT e.*, a.content_hash AS staged_hash
  FROM expected e LEFT JOIN actual a USING (module_position, lesson_key, content_hash)
)
SELECT (SELECT count(*) FROM expected) AS expected_revisions,
  (SELECT count(*) FROM actual) AS staged_revisions,
  count(staged_hash) AS exact_matches,
  coalesce(jsonb_agg(jsonb_build_object('module_position', module_position, 'lesson_key', lesson_key))
    FILTER (WHERE staged_hash IS NULL), '[]'::jsonb) AS missing_or_mismatched
FROM matched;
`);
