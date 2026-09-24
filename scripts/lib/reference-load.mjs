import {
  canonical,
  contentHash,
  validateReferenceLesson,
} from "./reference-content.mjs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function requireId(id, label) {
  if (!uuid.test(id))
    throw new Error(`Reconcile lock: missing/invalid ${label}`);
  return id;
}
async function all(client, table, filter) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const page = await client.get(
      `${table}?select=*&${filter}&order=id&limit=500&offset=${offset}`,
    );
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}
// Entire selection is validated and reconciled before the first write. Lock is
// extended only; natural keys recover interrupted inserts without new identities.
export async function planReferenceLoad(
  client,
  modules,
  lock,
  { orgUnitId, promote = false } = {},
) {
  const courseId = requireId(lock.course, "course UUID");
  const [course] = await client.get(
    `courses?select=id,org_unit_id&id=eq.${courseId}`,
  );
  if (!course || course.org_unit_id !== orgUnitId)
    throw new Error(
      "Reconcile lock: course missing or outside requested organization",
    );
  const plan = [];
  for (const mod of modules) {
    const moduleId = requireId(lock.modules?.[mod.module_key], mod.module_key);
    const [existingModule] = await client.get(
      `course_modules?select=id,course_id&id=eq.${moduleId}`,
    );
    if (!existingModule || existingModule.course_id !== courseId)
      throw new Error("Reconcile lock: module missing or wrong course");
    const existing = await all(
      client,
      "course_lessons",
      `module_id=eq.${moduleId}`,
    );
    if (
      existing.some(
        (l) => !mod.lessons.some((s) => s.manifest.lesson_key === l.lesson_key),
      )
    )
      throw new Error(
        "Selected subchapter omits existing lessons; reconcile instead of deleting",
      );
    const entries = [];
    for (const lesson of mod.lessons) {
      validateReferenceLesson(lesson);
      if (
        promote &&
        lesson.revision.assets.some((a) => a.review_status !== "approved")
      )
        throw new Error("Promotion requires approved assets");
      const m = lesson.manifest,
        found = existing.find((l) => l.lesson_key === m.lesson_key),
        locked = lock.lessons?.[mod.module_key]?.[m.lesson_key];
      if (locked && (!found || found.id !== locked))
        throw new Error("Reconcile lock: lesson identity conflict");
      if (
        found &&
        Object.keys(m).some((k) => canonical(found[k]) !== canonical(m[k]))
      )
        throw new Error(
          "Lesson metadata changed: reconcile immutable identity/metadata before staging",
        );
      if (!found && existing.some((l) => l.position === m.position))
        throw new Error("Lesson position conflicts with existing identity");
      const hash = contentHash(lesson);
      const revisions = found
        ? await client.get(
            `course_lesson_revisions?select=*&lesson_id=eq.${found.id}&content_hash=eq.${hash}`,
          )
        : [];
      const revision = revisions[0];
      if (
        revision &&
        Object.keys(lesson.revision).some(
          (k) => canonical(revision[k]) !== canonical(lesson.revision[k]),
        )
      )
        throw new Error("Stored revision does not match content hash");
      const notes = revision
        ? (
            await client.get(
              `course_lesson_facilitator_notes?select=*&revision_id=eq.${revision.id}`,
            )
          )[0]
        : null;
      if (
        notes &&
        Object.keys(lesson.notes).some(
          (k) => canonical(notes[k]) !== canonical(lesson.notes[k]),
        )
      )
        throw new Error("Stored private notes do not match content hash");
      entries.push({
        lesson,
        hash,
        existing: found,
        revision,
        notes,
        action: !found
          ? "create-lesson"
          : !revision
            ? "stage-revision"
            : !notes
              ? "repair-notes"
              : "unchanged",
      });
    }
    plan.push({ module_key: mod.module_key, moduleId, entries, promote });
  }
  return plan;
}
export function referenceReport(plan) {
  return plan.map((m) => ({
    module: m.module_key,
    promotion: m.promote ? "complete selected subchapter" : "none",
    lessons: m.entries.map((e) => ({
      key: e.lesson.manifest.lesson_key,
      action: e.action,
      hash: e.hash,
    })),
    legacy_progress:
      "unchanged; equivalence/backfill requires separate reviewed operation",
  }));
}
export async function applyReferenceLoad(
  client,
  plan,
  lock,
  authorUserId,
  saveLock = () => {},
) {
  for (const mod of plan) {
    const revisionIds = [];
    for (const e of mod.entries) {
      const lesson =
        e.existing ??
        (
          await client.insert("course_lessons", [
            { module_id: mod.moduleId, ...e.lesson.manifest },
          ])
        )[0];
      lock.lessons ??= {};
      lock.lessons[mod.module_key] ??= {};
      lock.lessons[mod.module_key][lesson.lesson_key] = lesson.id;
      await saveLock(lock);
      const revision =
        e.revision ??
        (
          await client.insert("course_lesson_revisions", [
            {
              lesson_id: lesson.id,
              revision_key: e.hash,
              content_hash: e.hash,
              ...e.lesson.revision,
              created_by: authorUserId,
            },
          ])
        )[0];
      if (!e.notes)
        await client.insert("course_lesson_facilitator_notes", [
          { revision_id: revision.id, ...e.lesson.notes },
        ]);
      revisionIds.push(revision.id);
    }
    if (
      mod.promote &&
      mod.entries.some(
        (e, i) => e.existing?.published_revision_id !== revisionIds[i],
      )
    )
      await client.rpc("rpc_course_lessons_publish", {
        p_module_id: mod.moduleId,
        p_revision_ids: revisionIds,
      });
  }
}

// Hierarchy staging is intentionally separate from publication of a program.
// New programs/chapters stay unavailable until a reviewed release enables them.
export async function stageReferenceHierarchy(
  client,
  manifest,
  lock,
  { orgUnitId, authorUserId, apply = false },
) {
  const allowed = ["content_key", "title_fil", "title_en", "chapters"];
  if (
    Object.keys(manifest).some((k) => !allowed.includes(k)) ||
    !/^[a-z0-9-]+$/.test(manifest.content_key) ||
    !manifest.title_fil?.trim() ||
    !manifest.title_en?.trim() ||
    !Array.isArray(manifest.chapters) ||
    manifest.chapters.length !== 3
  )
    throw new Error("Invalid program manifest");
  const seenKeys = new Set(),
    seenPositions = new Set();
  for (const c of manifest.chapters) {
    if (
      Object.keys(c).some(
        (k) =>
          ![
            "chapter_key",
            "position",
            "title_fil",
            "title_en",
            "delivery_course",
            "availability",
          ].includes(k),
      ) ||
      !/^[a-z0-9-]+$/.test(c.chapter_key) ||
      !Number.isInteger(c.position) ||
      c.position < 0 ||
      !c.title_fil?.trim() ||
      !c.title_en?.trim() ||
      c.availability !== "unavailable" ||
      seenKeys.has(c.chapter_key) ||
      seenPositions.has(c.position) ||
      (c.position === 0
        ? c.delivery_course !== "day1-basic-competencies"
        : c.delivery_course !== null)
    )
      throw new Error("Invalid chapter mapping");
    seenKeys.add(c.chapter_key);
    seenPositions.add(c.position);
  }
  if (!seenPositions.has(0) || !seenPositions.has(1) || !seenPositions.has(2))
    throw new Error("Expected Chapters I–III");
  requireId(lock.course, "delivery course");
  const [course] = await client.get(
    `courses?select=id,org_unit_id&id=eq.${lock.course}`,
  );
  if (!course || course.org_unit_id !== orgUnitId)
    throw new Error("Reconcile delivery course organization");
  const [program] = await client.get(
    `training_programs?select=*&org_unit_id=eq.${orgUnitId}&content_key=eq.${manifest.content_key}`,
  );
  if (lock.program && lock.program !== program?.id)
    throw new Error("Reconcile program lock");
  if (
    program &&
    ["title_fil", "title_en"].some((k) => program[k] !== manifest[k])
  )
    throw new Error("Reconcile existing program metadata");
  const chapters = program
    ? await all(
        client,
        "training_program_chapters",
        `program_id=eq.${program.id}`,
      )
    : [];
  const rows = manifest.chapters.map(({ delivery_course, ...c }) => ({
    ...c,
    course_id: delivery_course ? lock.course : null,
  }));
  for (const c of chapters) {
    const authored = rows.find((r) => r.chapter_key === c.chapter_key);
    if (
      !authored ||
      Object.keys(authored).some(
        (k) => k !== "availability" && authored[k] !== c[k],
      )
    )
      throw new Error("Reconcile chapter mapping");
  }
  const report = {
    program: program ? "unchanged" : "create-draft",
    chapters: rows
      .filter((r) => !chapters.some((c) => c.chapter_key === r.chapter_key))
      .map((r) => r.chapter_key),
    activation: "not performed",
  };
  if (!apply) return report;
  const p =
    program ??
    (
      await client.insert("training_programs", [
        {
          content_key: manifest.content_key,
          title_fil: manifest.title_fil,
          title_en: manifest.title_en,
          org_unit_id: orgUnitId,
          author_user_id: authorUserId,
        },
      ])
    )[0];
  lock.program = p.id;
  for (const row of rows)
    if (!chapters.some((c) => c.chapter_key === row.chapter_key))
      await client.insert("training_program_chapters", [
        { ...row, program_id: p.id },
      ]);
  return report;
}
