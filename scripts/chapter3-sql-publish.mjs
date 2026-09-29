#!/usr/bin/env node
// One-time, owner-authorized Chapter III revision promotion through the
// connected SQL editor when no app-admin credentials are available. The audit
// record identifies this as a postgres migration and claims no app actor.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentHash, loadReferenceModule } from './lib/reference-content.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = path.join(root, 'content/training/chapter3-core-competencies');
const blueprint = JSON.parse(readFileSync(path.join(pkg, 'chapter-blueprint.json'), 'utf8'));
const [courseId, output] = process.argv.slice(2);
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId ?? '') || !output || process.argv.length !== 4) {
  throw new Error('Usage: node scripts/chapter3-sql-publish.mjs <staged-course-uuid> <output.sql>');
}
const expected = blueprint.modules.flatMap((item, modulePosition) =>
  loadReferenceModule(path.join(pkg, 'drafts', item.module_key), path.join(root, 'public')).lessons.map(lesson => ({
    module_position: modulePosition,
    lesson_key: lesson.manifest.lesson_key,
    content_hash: contentHash(lesson),
  })));
if (blueprint.modules.length !== 12 || expected.length !== 65 || new Set(expected.map(e => `${e.module_position}/${e.lesson_key}`)).size !== 65) {
  throw new Error('Expected exactly 12 modules and 65 distinct lessons');
}
const q = value => `'${String(value).replaceAll("'", "''")}'`;
const sql = `-- Chapter III lesson publication, owner authorized 2026-09-29.
-- Generated from the committed package. Run only on the confirmed pilot project.
-- Atomic: any mismatch aborts without publishing any lesson.
BEGIN;
DO $chapter3_publish$
DECLARE
  v_course uuid := ${q(courseId)};
  v_expected jsonb := ${q(JSON.stringify(expected))}::jsonb;
  v_count integer;
  v_changed integer;
  v_module uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.training_program_chapters ch ON ch.course_id = c.id
    JOIN public.training_programs p ON p.id = ch.program_id
    JOIN public.org_units o ON o.id = p.org_unit_id
    WHERE c.id = v_course AND c.org_unit_id = o.id AND c.status = 'draft'
      AND c.title_en = ${q(blueprint.title_en)} AND c.title_fil = ${q(blueprint.title_fil)}
      AND p.content_key = 'bhw-reference-manual' AND o.name = 'Department of Health'
      AND ch.chapter_key = 'chapter-3' AND ch.availability = 'unavailable'
  ) THEN RAISE EXCEPTION 'Target is not the mapped, unavailable Chapter III draft'; END IF;

  SELECT count(*) INTO v_count FROM public.course_modules m WHERE m.course_id = v_course;
  IF v_count <> 12 THEN RAISE EXCEPTION 'Expected 12 modules, found %', v_count; END IF;
  SELECT count(*) INTO v_count FROM public.course_lessons l
    JOIN public.course_modules m ON m.id = l.module_id WHERE m.course_id = v_course;
  IF v_count <> 65 THEN RAISE EXCEPTION 'Expected 65 lessons, found %', v_count; END IF;
  SELECT count(*) INTO v_count FROM public.course_module_facilitator_notes n
    JOIN public.course_modules m ON m.id = n.module_id WHERE m.course_id = v_course;
  IF v_count <> 12 THEN RAISE EXCEPTION 'Expected 12 private module guides, found %', v_count; END IF;

  -- Every expected lesson must have exactly one matching immutable revision,
  -- separate private notes, no unapproved asset, and no conflicting pointer.
  SELECT count(*) INTO v_count
  FROM jsonb_to_recordset(v_expected) AS e(module_position integer, lesson_key text, content_hash text)
  JOIN public.course_modules m ON m.course_id = v_course AND m.position = e.module_position
  JOIN public.course_lessons l ON l.module_id = m.id AND l.lesson_key = e.lesson_key
  JOIN public.course_lesson_revisions r ON r.lesson_id = l.id AND r.content_hash = e.content_hash
  JOIN public.course_lesson_facilitator_notes n ON n.revision_id = r.id
  WHERE (l.published_revision_id IS NULL OR l.published_revision_id = r.id)
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(r.assets) a
      WHERE a->>'review_status' IS DISTINCT FROM 'approved'
    );
  IF v_count <> 65 THEN RAISE EXCEPTION 'Revision, guide, asset or pointer mismatch: %/65', v_count; END IF;
  IF EXISTS (
    SELECT 1 FROM public.course_modules m WHERE m.course_id = v_course
      AND NOT EXISTS (SELECT 1 FROM public.course_lessons l WHERE l.module_id = m.id AND l.required)
  ) THEN RAISE EXCEPTION 'Every module requires at least one required lesson'; END IF;

  UPDATE public.course_lessons l SET published_revision_id = r.id
  FROM jsonb_to_recordset(v_expected) AS e(module_position integer, lesson_key text, content_hash text)
  JOIN public.course_modules m ON m.course_id = v_course AND m.position = e.module_position
  JOIN public.course_lesson_revisions r ON r.content_hash = e.content_hash
  WHERE l.module_id = m.id AND l.lesson_key = e.lesson_key AND r.lesson_id = l.id
    AND l.published_revision_id IS DISTINCT FROM r.id;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed NOT IN (0,65) THEN RAISE EXCEPTION 'Unexpected partial publication: % lessons', v_changed; END IF;

  IF v_changed = 65 THEN
    FOR v_module IN SELECT m.id FROM public.course_modules m WHERE m.course_id = v_course ORDER BY m.position LOOP
      INSERT INTO public.audit_events
        (actor_user_id,event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
      SELECT NULL,'course.lessons_published','course',v_course,
        jsonb_build_object('module_id',v_module,'revision_ids',array_agg(l.published_revision_id ORDER BY l.position),
          'method','postgres_content_migration','owner_attestation','2026-09-29 chat; review record to follow',
          'source_commit','cd35bec97541a675caed0f1412a241da02364581'),
        'Inilathala ang kumpletong pangkat ng mga aralin sa migrasyon ng Kabanata III.',
        'Published the complete Chapter III lesson set in an owner-authorized database migration.'
      FROM public.course_lessons l WHERE l.module_id = v_module;
    END LOOP;
  END IF;

  SELECT count(*) INTO v_count FROM public.course_lessons l
  JOIN public.course_modules m ON m.id = l.module_id
  WHERE m.course_id = v_course AND l.published_revision_id IS NOT NULL;
  IF v_count <> 65 THEN RAISE EXCEPTION 'Post-publication count is %/65', v_count; END IF;
  RAISE NOTICE 'Chapter III published revisions: 65/65; updated in this transaction: %', v_changed;
END
$chapter3_publish$;
COMMIT;
`;
writeFileSync(path.resolve(output), sql);
console.log(`Prepared atomic publication SQL for ${expected.length} lessons: ${path.resolve(output)}`);
