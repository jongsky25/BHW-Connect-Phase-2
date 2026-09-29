#!/usr/bin/env node
// Generate transactional, idempotent DML for draft Chapter III staging when
// admin REST credentials are unavailable. This generator is offline only.
// The resulting SQL files must be applied in filename order to the confirmed
// target. They never publish a course, lesson revision or program chapter.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentHash, loadReferenceModule } from './lib/reference-content.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = path.join(root, 'content/training/chapter3-core-competencies');
const blueprint = JSON.parse(readFileSync(path.join(pkg, 'chapter-blueprint.json'), 'utf8'));
const program = JSON.parse(readFileSync(path.join(root, 'content/training/day1-basic-competencies/program.json'), 'utf8'));
assert.equal(blueprint.publication_allowed, false);
assert.equal(blueprint.availability, 'unavailable');
assert.deepEqual(program.chapters.find(c => c.chapter_key === 'chapter-3')?.delivery_course, null);
const out = process.argv[2];
if (!out || process.argv.length !== 3) throw new Error('Usage: node scripts/chapter3-sql-stage.mjs <output-directory>');
const output = path.resolve(out);
mkdirSync(output, { recursive: true });
const q = value => `'${String(value).replaceAll("'", "''")}'`;
const j = value => `${q(JSON.stringify(value))}::jsonb`;
const a = values => `ARRAY[${values.map(q).join(',')}]::text[]`;
const sql = (name, body) => writeFileSync(path.join(output, name), `-- Generated from committed Chapter III content. Draft staging only.\nBEGIN;\nDO $chapter3_stage$\nDECLARE\n  v_program uuid;\n  v_org uuid;\n  v_author uuid;\n  v_course uuid;\n  v_module uuid;\n  v_lesson uuid;\n  v_revision uuid;\nBEGIN\n${body}\nEND\n$chapter3_stage$;\nCOMMIT;\n`);
const guard = `  SELECT p.id, p.org_unit_id INTO STRICT v_program, v_org
  FROM public.training_programs p WHERE p.content_key = 'bhw-reference-manual';
  IF NOT EXISTS (
    SELECT 1 FROM public.training_program_chapters ch
    WHERE ch.program_id = v_program AND ch.chapter_key = 'chapter-3'
      AND ch.availability = 'unavailable'
  ) THEN RAISE EXCEPTION 'Chapter III must remain unavailable'; END IF;
  SELECT c.author_user_id INTO STRICT v_author
  FROM public.training_program_chapters ch JOIN public.courses c ON c.id = ch.course_id
  JOIN public.users u ON u.id = c.author_user_id
  WHERE ch.program_id = v_program AND ch.chapter_key = 'chapter-2'
    AND u.role = 'admin' AND u.status = 'active';
  IF (SELECT count(*) FROM public.courses c WHERE c.org_unit_id = v_org AND c.title_en = ${q(blueprint.title_en)}) > 1
    THEN RAISE EXCEPTION 'Duplicate Chapter III course titles'; END IF;
  SELECT c.id INTO v_course FROM public.courses c
  WHERE c.org_unit_id = v_org AND c.title_en = ${q(blueprint.title_en)};
  IF v_course IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.courses c WHERE c.id = v_course AND c.status = 'draft'
      AND c.title_fil = ${q(blueprint.title_fil)} AND c.author_user_id = v_author
  ) THEN RAISE EXCEPTION 'Existing Chapter III course differs or is no longer draft'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.training_program_chapters ch
    WHERE ch.program_id = v_program AND ch.chapter_key = 'chapter-3'
      AND ch.course_id IS NOT NULL AND ch.course_id IS DISTINCT FROM v_course
  ) THEN RAISE EXCEPTION 'Chapter III is linked to a different course'; END IF;`;
const courseGuard = `${guard}
  IF v_course IS NULL THEN RAISE EXCEPTION 'Stage the draft course first'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.training_program_chapters ch
    WHERE ch.program_id = v_program AND ch.chapter_key = 'chapter-3'
      AND ch.course_id = v_course AND ch.availability = 'unavailable'
  ) THEN RAISE EXCEPTION 'Map the draft course to unavailable Chapter III first'; END IF;`;

sql('00-course.sql', `${guard}
  IF v_course IS NULL THEN
    INSERT INTO public.courses
      (org_unit_id, author_user_id, title_fil, title_en, description_fil, description_en, status, quiz_passing_percent, quiz_max_attempts)
    VALUES (v_org, v_author, ${q(blueprint.title_fil)}, ${q(blueprint.title_en)},
      'Kabanata III — draft para sa pagsusuri', 'Chapter III — draft for review', 'draft', 80, 3)
    RETURNING id INTO v_course;
  END IF;
  UPDATE public.training_program_chapters ch SET course_id = v_course
  WHERE ch.program_id = v_program AND ch.chapter_key = 'chapter-3'
    AND ch.course_id IS NULL AND ch.availability = 'unavailable';`);

let lessons = 0;
for (const m of blueprint.modules) {
  const dir = path.join(pkg, 'drafts', m.module_key);
  const meta = JSON.parse(readFileSync(path.join(dir, 'module.json'), 'utf8'));
  const competency = JSON.parse(readFileSync(path.join(dir, 'competency.json'), 'utf8'));
  const guide = {
    notes_fil: readFileSync(path.join(dir, 'facilitator-notes.fil.md'), 'utf8'),
    notes_en: readFileSync(path.join(dir, 'facilitator-notes.en.md'), 'utf8'),
    competency_statement_fil: competency.competency_statement_fil,
    competency_statement_en: competency.competency_statement_en,
    observation_indicators: competency.observation_indicators,
    activities: JSON.parse(readFileSync(path.join(dir, 'facilitator-activities.json'), 'utf8')),
  };
  const moduleNumber = String(meta.position + 1).padStart(2, '0');
  const moduleWhere = `course_id = v_course AND position = ${meta.position}`;
  const moduleGuard = `${courseGuard}
  SELECT cm.id INTO v_module FROM public.course_modules cm WHERE cm.${moduleWhere.replaceAll(' AND ', ' AND cm.')};
  IF v_module IS NULL THEN RAISE EXCEPTION 'Stage module ${m.module_key} first'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.course_modules cm WHERE cm.id = v_module AND cm.title_en = ${q(meta.title_en)})
    THEN RAISE EXCEPTION 'Module ${m.module_key} identity differs'; END IF;`;
  sql(`${moduleNumber}-00-module.sql`, `${courseGuard}
  IF (SELECT count(*) FROM public.course_modules cm WHERE cm.${moduleWhere.replaceAll(' AND ', ' AND cm.')}) > 1
    THEN RAISE EXCEPTION 'Duplicate module position ${meta.position}'; END IF;
  SELECT cm.id INTO v_module FROM public.course_modules cm WHERE cm.${moduleWhere.replaceAll(' AND ', ' AND cm.')};
  IF v_module IS NULL THEN
    INSERT INTO public.course_modules
      (course_id, position, type, title_fil, title_en, body_fil, body_en, video_url,
       objectives_fil, objectives_en, summary_fil, summary_en, lesson)
    VALUES (v_course, ${meta.position}, 'text', ${q(meta.title_fil)}, ${q(meta.title_en)}, '', '', NULL,
      ${a(meta.objectives_fil)}, ${a(meta.objectives_en)}, ${q(meta.summary_fil)}, ${q(meta.summary_en)}, NULL)
    RETURNING id INTO v_module;
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.course_modules cm WHERE cm.id = v_module AND cm.type = 'text'
      AND cm.title_fil = ${q(meta.title_fil)} AND cm.title_en = ${q(meta.title_en)}
      AND cm.objectives_fil = ${a(meta.objectives_fil)} AND cm.objectives_en = ${a(meta.objectives_en)}
      AND cm.summary_fil = ${q(meta.summary_fil)} AND cm.summary_en = ${q(meta.summary_en)}
  ) THEN RAISE EXCEPTION 'Existing module ${m.module_key} differs'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.course_module_facilitator_notes n WHERE n.module_id = v_module) THEN
    INSERT INTO public.course_module_facilitator_notes
      (module_id, notes_fil, notes_en, competency_statement_fil, competency_statement_en, observation_indicators, activities)
    VALUES (v_module, ${q(guide.notes_fil)}, ${q(guide.notes_en)}, ${q(guide.competency_statement_fil)},
      ${q(guide.competency_statement_en)}, ${j(guide.observation_indicators)}, ${j(guide.activities)});
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.course_module_facilitator_notes n WHERE n.module_id = v_module
      AND n.notes_fil = ${q(guide.notes_fil)} AND n.notes_en = ${q(guide.notes_en)}
      AND n.competency_statement_fil = ${q(guide.competency_statement_fil)}
      AND n.competency_statement_en = ${q(guide.competency_statement_en)}
      AND n.observation_indicators = ${j(guide.observation_indicators)} AND n.activities = ${j(guide.activities)}
  ) THEN RAISE EXCEPTION 'Existing module guide ${m.module_key} differs'; END IF;`);

  const loaded = loadReferenceModule(dir, path.join(root, 'public'));
  for (const lesson of loaded.lessons) {
    const x = lesson.manifest;
    const r = lesson.revision;
    const n = lesson.notes;
    const hash = contentHash(lesson);
    const filename = `${moduleNumber}-${String(x.position + 1).padStart(2, '0')}-${x.lesson_key}.sql`;
    sql(filename, `${moduleGuard}
  SELECT cl.id INTO v_lesson FROM public.course_lessons cl
  WHERE cl.module_id = v_module AND cl.lesson_key = ${q(x.lesson_key)};
  IF v_lesson IS NULL THEN
    INSERT INTO public.course_lessons
      (module_id, lesson_key, position, title_fil, title_en, objectives_fil, objectives_en, required)
    VALUES (v_module, ${q(x.lesson_key)}, ${x.position}, ${q(x.title_fil)}, ${q(x.title_en)},
      ${a(x.objectives_fil)}, ${a(x.objectives_en)}, ${x.required ? 'true' : 'false'})
    RETURNING id INTO v_lesson;
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.course_lessons cl WHERE cl.id = v_lesson
      AND cl.position = ${x.position} AND cl.title_fil = ${q(x.title_fil)} AND cl.title_en = ${q(x.title_en)}
      AND cl.objectives_fil = ${a(x.objectives_fil)} AND cl.objectives_en = ${a(x.objectives_en)}
      AND cl.required = ${x.required ? 'true' : 'false'} AND cl.published_revision_id IS NULL
  ) THEN RAISE EXCEPTION 'Existing lesson ${x.lesson_key} differs or is published'; END IF;
  SELECT cr.id INTO v_revision FROM public.course_lesson_revisions cr
  WHERE cr.lesson_id = v_lesson AND cr.content_hash = ${q(hash)};
  IF v_revision IS NULL THEN
    INSERT INTO public.course_lesson_revisions
      (lesson_id, revision_key, content_hash, read_sections, slides, coverage, sources, assets, featured_asset_id, created_by)
    VALUES (v_lesson, ${q(hash)}, ${q(hash)}, ${j(r.read_sections)}, ${j(r.slides)}, ${j(r.coverage)},
      ${j(r.sources)}, ${j(r.assets)}, ${r.featured_asset_id === null ? 'NULL' : q(r.featured_asset_id)}, v_author)
    RETURNING id INTO v_revision;
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.course_lesson_revisions cr WHERE cr.id = v_revision
      AND cr.revision_key = ${q(hash)} AND cr.read_sections = ${j(r.read_sections)}
      AND cr.slides = ${j(r.slides)} AND cr.coverage = ${j(r.coverage)}
      AND cr.sources = ${j(r.sources)} AND cr.assets = ${j(r.assets)}
      AND cr.featured_asset_id IS NOT DISTINCT FROM ${r.featured_asset_id === null ? 'NULL' : q(r.featured_asset_id)}
  ) THEN RAISE EXCEPTION 'Existing lesson revision ${x.lesson_key} differs'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.course_lesson_facilitator_notes fn WHERE fn.revision_id = v_revision) THEN
    INSERT INTO public.course_lesson_facilitator_notes
      (revision_id, notes_fil, notes_en, observation_indicators)
    VALUES (v_revision, ${q(n.notes_fil)}, ${q(n.notes_en)}, ${j(n.observation_indicators)});
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.course_lesson_facilitator_notes fn WHERE fn.revision_id = v_revision
      AND fn.notes_fil = ${q(n.notes_fil)} AND fn.notes_en = ${q(n.notes_en)}
      AND fn.observation_indicators = ${j(n.observation_indicators)}
  ) THEN RAISE EXCEPTION 'Existing lesson notes ${x.lesson_key} differ'; END IF;`);
    lessons++;
  }
}
assert.equal(lessons, 65);
console.log(JSON.stringify({ output, files: 1 + blueprint.modules.length + lessons, modules: blueprint.modules.length, lessons, publication: false }, null, 2));
