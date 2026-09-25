#!/usr/bin/env node
// Loads a content/training/<course>/ tree into a Supabase project: courses,
// course_modules (incl. objectives_*/summary_*/lesson), course_module_facilitator_notes,
// course_module_visuals, course_test_questions, and the qa-entries.json rows
// into kb_categories/kb_entries — the dual-delivery §B promise
// (docs/training-modules-plan.md). See content/training/README.md for the
// full CLI/validation contract.
//
//   npm run training:load -- --project <ref> --org-unit "<org unit name>"
//   npm run training:load -- --project <ref> --org-unit "<org unit name>" --apply
//   npm run training:load -- --project <ref> --org-unit "<org unit name>" --apply --publish --owner <admin-username>
//   npm run training:load -- --project <ref> --org-unit "<org unit name>" --modules 01-tungkulin-ng-bhw --apply
//
// Env: KB_LOADER_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY),
//      KB_LOADER_USERNAME, KB_LOADER_PASSWORD — an admin account on that project
//      (same credentials scripts/kb-load.mjs uses).
//
// courses/course_modules/course_module_facilitator_notes/course_module_visuals/
// course_test_questions have no RPC that covers the INC-20/INC-21 columns
// (rpc_course_create's p_modules jsonb predates objectives_*/summary_*/lesson,
// and no RPC exists for the two new child tables or course_test_questions), so
// this loader writes those five tables directly through PostgREST under the
// admin token's own "_admin_write"/"for all" RLS policies — the same
// direct-write path scripts/kb-load.mjs already uses for kb_entries.content_id
// (see its own header comment). This means course creation does not go
// through rpc_course_create and so does not write a `course.created` audit
// event; noted here as a known gap in the audit trail for loader-created
// courses, not something either loader hides.

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadReferenceModule } from "./lib/reference-content.mjs";
import { planReferenceLoad, applyReferenceLoad, referenceReport, stageReferenceHierarchy } from "./lib/reference-load.mjs";
import { renderAnswer, reviewDueOn } from "./lib/kb-content.mjs";
import { DEFAULT_COURSE, loadTrainingCourse } from "./lib/training-content.mjs";
import { syncActivities } from "./lib/training-activities.mjs";
import { planTestBankSync } from "./lib/test-bank.mjs";
import { createClient, projectUrl, requireEnv, selectAll, signIn } from "./lib/supabase-rest.mjs";

function parseArgs(argv) {
  const args = {
    project: null,
    orgUnit: null,
    apply: false,
    publish: false,
    owner: null,
    course: DEFAULT_COURSE,
    modules: null,
    mode: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (arg === "--publish") args.publish = true;
    else if (arg === "--owner") args.owner = argv[++i];
    else if (arg === "--project") args.project = argv[++i];
    else if (arg === "--org-unit") args.orgUnit = argv[++i];
    else if (arg === "--course") args.course = argv[++i];
    else if (arg === "--mode") args.mode = argv[++i];
    else if (arg === "--modules") args.modules = argv[++i].split(",").map((m) => m.trim());
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.project) throw new Error("--project <supabase-project-ref> is required");
  if (!['hierarchy','course','content','lessons','activities','assessments','kb'].includes(args.mode)) throw new Error('--mode hierarchy|course|content|lessons|activities|assessments|kb is required');
  if (!/^[a-z0-9-]+$/.test(args.course) || !/^[a-z0-9-]+$/.test(args.project)) throw new Error('invalid course/project key');
  if (args.modules?.some(m => !/^[a-z0-9-]+$/.test(m))) throw new Error('invalid module key');
  if (args.modules && new Set(args.modules).size!==args.modules.length)throw new Error('duplicate selected module');
  if (['content','lessons','activities'].includes(args.mode) && !args.modules?.length) throw new Error('selected content requires --modules');
  if (args.publish && !['course','lessons','kb'].includes(args.mode)) throw new Error('publication is not supported for this mode');
  if (!args.orgUnit) throw new Error('--org-unit "<org unit name>" is required — see content/training/README.md');
  if (args.publish && args.mode === 'kb' && !args.owner) {
    throw new Error("--publish requires --owner <username>: kb_entries_publish_requires_owner");
  }
  return args;
}

function contentDir(course) {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "content", "training", course);
}

function lockPath(course, ref) {
  return path.join(contentDir(course), "locks", `${ref}.json`);
}

function readLock(course, ref) {
  const file = lockPath(course, ref);
  if (!existsSync(file)) return { course: null, modules: {} };
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeLock(course, ref, lock) {
  const file = lockPath(course, ref);
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.tmp-' + process.pid;
  writeFileSync(temporary, `${JSON.stringify(lock, null, 2)}\n`);
  renameSync(temporary,file);
}

async function resolveUserId(client, username, { requireAdmin = false } = {}) {
  const rows = await client.get(`users?select=id,role,status&username=eq.${encodeURIComponent(username)}`);
  if (rows.length === 0) throw new Error(`no user named ${username} on this project`);
  if (requireAdmin && rows[0].role !== "admin") throw new Error(`${username} is ${rows[0].role}, not admin`);
  return rows[0].id;
}

async function resolveOrgUnit(client, name) {
  const rows = await client.get(`org_units?select=id,name,level&name=eq.${encodeURIComponent(name)}`);
  if (rows.length === 0) throw new Error(`no org unit named "${name}" on this project`);
  if (rows.length > 1) throw new Error(`more than one org unit named "${name}" — org unit names are not guaranteed unique, pass a more specific one`);
  return rows[0].id;
}

async function syncCourse(client, course, ctx, plan) {
  const { orgUnitId, authorUserId, lock, apply } = ctx;
  let courseId = lock.course;
  if (courseId) {
    const [existing] = await client.get(`courses?select=id&id=eq.${courseId}`);
    if (!existing) throw new Error("Reconcile stale course lock; refusing replacement");
  }

  const payload = {
    org_unit_id: orgUnitId,
    title_fil: course.title_fil,
    title_en: course.title_en,
    description_fil: course.description_fil ?? "",
    description_en: course.description_en ?? "",
    quiz_passing_percent: course.quiz_passing_percent ?? 80,
    quiz_max_attempts: course.quiz_max_attempts ?? 3,
  };

  if (courseId) {
    plan.course.update += 1;
    if (apply) await client.patch(`courses?id=eq.${courseId}`, payload);
  } else {
    plan.course.create += 1;
    if (apply) {
      const [row] = await client.insert("courses", [{ ...payload, author_user_id: authorUserId }]);
      courseId = row.id;
    }
  }
  if (courseId) lock.course = courseId;
  return courseId;
}

async function syncModule(client, courseId, mod, ctx, plan) {
  const { lock, apply } = ctx;
  let moduleId = lock.modules[mod.id];
  if (moduleId) {
    const [existing] = await client.get(`course_modules?select=id,course_id&id=eq.${moduleId}`);
    if (!existing || existing.course_id !== courseId) throw new Error("Reconcile stale/wrong-course module lock");
  }

  const payload = {
    course_id: courseId,
    position: mod.position,
    type: "text",
    title_fil: mod.title_fil,
    title_en: mod.title_en,
    body_fil: "", // lesson (below) supersedes the INC-12 body_* path
    body_en: "",
    video_url: null,
    objectives_fil: mod.objectives_fil,
    objectives_en: mod.objectives_en,
    summary_fil: mod.summary_fil,
    summary_en: mod.summary_en,
    lesson: mod.lesson,
  };

  if (moduleId) {
    plan.modules.update += 1;
    if (apply) await client.patch(`course_modules?id=eq.${moduleId}`, payload);
  } else {
    plan.modules.create += 1;
    if (apply) {
      const [row] = await client.insert("course_modules", [payload]);
      moduleId = row.id;
    }
  }
  if (moduleId) lock.modules[mod.id] = moduleId;
  return moduleId;
}

async function syncFacilitatorNotes(client, moduleId, notes, plan, apply) {
  if (!moduleId) {
    // dry run, first-ever load: the module doesn't exist yet, so there is
    // nothing to look up — this can only be a create.
    plan.facilitatorNotes.create += 1;
    return;
  }
  const [existing] = await client.get(`course_module_facilitator_notes?select=id&module_id=eq.${moduleId}`);
  const payload = {
    notes_fil: notes.notes_fil,
    notes_en: notes.notes_en,
    competency_statement_fil: notes.competency_statement_fil,
    competency_statement_en: notes.competency_statement_en,
    observation_indicators: notes.observation_indicators,
    activities: notes.activities,
  };
  if (existing) {
    plan.facilitatorNotes.update += 1;
    if (apply) await client.patch(`course_module_facilitator_notes?id=eq.${existing.id}`, payload);
  } else {
    plan.facilitatorNotes.create += 1;
    if (apply) await client.insert("course_module_facilitator_notes", [{ ...payload, module_id: moduleId }]);
  }
}

async function syncVisuals(client, moduleId, visuals, plan, apply) {
  if (!moduleId) {
    plan.visuals.create += visuals.length;
    return;
  }
  const existingForModule = await client.get(`course_module_visuals?select=id,position&module_id=eq.${moduleId}`);
  const byPosition = new Map(existingForModule.map((r) => [r.position, r.id]));

  for (const v of visuals) {
    const payload = {
      position: v.position,
      primitive: v.primitive,
      svg_markup: v.primitive === "image" ? null : v.svg_markup,
      image_url: v.primitive === "image" ? v.image_url ?? null : null,
      caption_fil: v.caption_fil,
      caption_en: v.caption_en,
      alt_text_fil: v.alt_text_fil,
      alt_text_en: v.alt_text_en,
      tier: v.tier,
    };
    const existingId = byPosition.get(v.position);
    if (existingId) {
      plan.visuals.update += 1;
      if (apply) await client.patch(`course_module_visuals?id=eq.${existingId}`, payload);
    } else {
      plan.visuals.create += 1;
      if (apply) await client.insert("course_module_visuals", [{ ...payload, module_id: moduleId }]);
    }
  }
}

async function syncTestQuestions(client, courseId, questions, plan, apply) {
  // Versioned: a changed question is retired and replaced, never edited in
  // place, because past attempts point at question ids. See scripts/lib/test-bank.mjs.
  const existing = await client.get(`course_test_questions?select=*&course_id=eq.${courseId}`);
  const sync = planTestBankSync(existing, questions);
  plan.testQuestions.create += sync.insert.length;
  plan.testQuestions.retire += sync.retire.length;
  plan.testQuestions.tag += sync.tag.length;
  plan.testQuestions.keep += sync.keep;
  for (const r of sync.retire) console.log(`  test question ${r.position + 1}: retire ${r.id}`);
  for (const t of sync.tag) console.log(`  test question ${t.position + 1}: tag module position ${t.module_position}`);
  if (!apply) return;
  const retiredAt = new Date().toISOString();
  for (const r of sync.retire) await client.patch(`course_test_questions?id=eq.${r.id}&retired_at=is.null`, { retired_at: retiredAt });
  for (const t of sync.tag) await client.patch(`course_test_questions?id=eq.${t.id}`, { module_position: t.module_position });
  if (sync.insert.length) await client.insert("course_test_questions", sync.insert.map((p) => ({ ...p, course_id: courseId })));
}

async function syncCategories(client, categories, lock, plan, apply) {
  const existing = await selectAll(client, "kb_categories", "id,slug");
  const bySlug = new Map(existing.map((row) => [row.slug, row.id]));
  const categoryIds = {};

  for (const category of categories) {
    const found = bySlug.get(category.slug);
    if (found) {
      categoryIds[category.slug] = found;
      plan.categories.skip += 1;
      continue;
    }
    plan.categories.create += 1;
    if (!apply) continue;
    const [row] = await client.insert("kb_categories", [
      {
        slug: category.slug,
        name_en: category.name_en,
        name_fil: category.name_fil,
        sort_order: category.sort_order,
      },
    ]);
    categoryIds[category.slug] = row.id;
    bySlug.set(category.slug, row.id);
  }
  return categoryIds;
}

async function syncQaEntries(client, content, categoryIds, ctx, plan) {
  const { sources } = content;
  const { publish, ownerId, modules } = ctx;

  const existing = await selectAll(client, "kb_entries", "id,question_en,content_id");
  const byContentId = new Map(existing.filter((row) => row.content_id).map((row) => [row.content_id, row.id]));
  const byQuestion = new Map(existing.map((row) => [row.question_en, row.id]));
  const knownIds = new Set(existing.map((row) => row.id));
  const contentIdAlreadySet = new Set(byContentId.values());

  for (const entry of content.qaEntries) {
    if (modules && !modules.includes(entry.moduleId)) continue;

    const answerEn = renderAnswer(entry, sources, "en");
    const answerFil = renderAnswer(entry, sources, "fil");
    const status = publish && entry.tier === "cited" ? "published" : "draft";
    if (status === "draft" && entry.tier === "pending") plan.qaEntries.pendingDrafts += 1;

    let entryId = byContentId.get(entry.id);
    if (!entryId) entryId = byQuestion.get(entry.question_en);
    if (entryId && !knownIds.has(entryId)) entryId = undefined;

    if (entryId) {
      plan.qaEntries.update += 1;
      if (ctx.apply) {
        await client.rpc("rpc_kb_entry_update", {
          p_id: entryId,
          p_category_id: categoryIds[entry.category],
          p_question_fil: entry.question_fil,
          p_question_en: entry.question_en,
          p_answer_fil: answerFil,
          p_answer_en: answerEn,
          p_keywords: entry.keywords,
          p_image_url: null,
          p_owner_user_id: ownerId,
          p_review_due_on: reviewDueOn(entry),
          p_status: status,
        });
      }
    } else {
      plan.qaEntries.create += 1;
      if (ctx.apply) {
        const [row] = await client.rpc("rpc_kb_entry_create", {
          p_category_id: categoryIds[entry.category],
          p_question_fil: entry.question_fil,
          p_question_en: entry.question_en,
          p_answer_fil: answerFil,
          p_answer_en: answerEn,
          p_keywords: entry.keywords,
          p_image_url: null,
          p_owner_user_id: ownerId,
          p_review_due_on: reviewDueOn(entry),
          p_status: status,
        });
        entryId = row.entry_id;
      }
    }

    if (entryId && ctx.apply && !contentIdAlreadySet.has(entryId)) {
      await client.patch(`kb_entries?id=eq.${entryId}`, { content_id: entry.id });
      plan.qaEntries.contentIdStamped += 1;
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const referenceModules = args.mode === 'lessons' ? args.modules.map(id =>
    loadReferenceModule(path.join(contentDir(args.course),'modules',id),path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public'))) : null;
  const content = referenceModules || args.mode === 'hierarchy' ? {reviewFlags:[]} : loadTrainingCourse(args.course);
  const hierarchy = args.mode === 'hierarchy' ? JSON.parse(readFileSync(path.join(contentDir(args.course),'program.json'),'utf8')) : null;
  if (!referenceModules && !hierarchy && args.modules?.some(id => !content.modules.some(m => m.id === id))) throw new Error('unknown selected module');

  if (content.reviewFlags.length > 0) {
    console.log(`\n${content.reviewFlags.length} review flag(s) — not blocking, but read these before publishing:`);
    for (const flag of content.reviewFlags) console.log(`  - ${flag}`);
  }

  const url = projectUrl(args.project);
  const anonKey = process.env.KB_LOADER_ANON_KEY ?? requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const token = await signIn(
    url,
    anonKey,
    requireEnv("KB_LOADER_USERNAME", "an admin account on the target project"),
    requireEnv("KB_LOADER_PASSWORD"),
  );
  const client = createClient(url, anonKey, token);

  const orgUnitId = await resolveOrgUnit(client, args.orgUnit);
  const authorUserId = await resolveUserId(client, requireEnv("KB_LOADER_USERNAME"), { requireAdmin: true });
  const ownerId = args.owner ? await resolveUserId(client, args.owner, { requireAdmin: true }) : null;
  const lock = readLock(args.course, args.project);
  if(hierarchy) {
    console.log(JSON.stringify(await stageReferenceHierarchy(client,hierarchy,lock,{orgUnitId,authorUserId,apply:args.apply}),null,2));
    if(args.apply)writeLock(args.course,args.project,lock);
    return;
  }
  if (referenceModules) {
    const referencePlan = await planReferenceLoad(client,referenceModules,lock,{orgUnitId,promote:args.publish});
    console.log(JSON.stringify(referenceReport(referencePlan),null,2));
    if(args.apply) await applyReferenceLoad(client,referencePlan,lock,authorUserId,()=>writeLock(args.course,args.project,lock));
    return;
  }
  if(args.mode !== 'course') {
    if(!lock.course) throw new Error('Reconcile lock: existing course required for scoped operations');
    const [existing] = await client.get(`courses?select=id,org_unit_id&id=eq.${lock.course}`);
    if(!existing || existing.org_unit_id !== orgUnitId) throw new Error('Reconcile course identity/org scope');
    if(args.mode === 'content') for(const id of args.modules) {
      const authored = content.modules.find(m => m.id === id);
      if(lock.modules[id]) {
        const [mod] = await client.get(`course_modules?select=id,course_id&id=eq.${lock.modules[id]}`);
        if(!mod || mod.course_id!==lock.course)throw new Error('Reconcile module identity');
        const converted=await client.get(`course_lessons?select=id&module_id=eq.${mod.id}&limit=1`);
        if(converted.length)throw new Error('Use lessons mode for converted subchapters');
      } else {
        // A new module is created from its complete authored source. Never
        // attach content to an untracked row or overwrite another position.
        const occupied = await client.get(`course_modules?select=id&course_id=eq.${lock.course}&position=eq.${authored.position}`);
        if(occupied.length)throw new Error(`Reconcile module position ${authored.position}: existing row has no lock`);
      }
    }
  }

  if (args.mode === 'activities') {
    console.log(JSON.stringify(await syncActivities(client, content.modules.filter(m => args.modules.includes(m.id)), lock, args.apply), null, 2));
    if (!args.apply) console.log('Dry run: no writes. Use --apply after reviewing the selection.');
    return;
  }
  const plan = {
    course: { create: 0, update: 0 },
    modules: { create: 0, update: 0 },
    facilitatorNotes: { create: 0, update: 0 },
    visuals: { create: 0, update: 0 },
    testQuestions: { create: 0, retire: 0, tag: 0, keep: 0 },
    categories: { create: 0, skip: 0 },
    qaEntries: { create: 0, update: 0, pendingDrafts: 0, contentIdStamped: 0 },
  };

  const ctx = { orgUnitId, authorUserId, lock, apply: args.apply, publish: args.publish, ownerId, modules: args.modules };

  const courseId = args.mode === 'course' ? await syncCourse(client, content.course, ctx, plan) : lock.course;

  if (args.mode === 'course' && args.apply && args.publish && courseId) {
    // rpc_course_set_status is the only path that writes courses.status —
    // going around it (a direct PATCH) would skip the course.status_changed
    // audit event and its own org-scope check.
    await client.rpc("rpc_course_set_status", { p_course_id: courseId, p_status: "published" });
  }

  const modulesToLoad = args.modules ? content.modules.filter((m) => args.modules.includes(m.id)) : content.modules;
  for (const mod of args.mode === 'content' ? modulesToLoad : []) {
    const moduleId = await syncModule(client, courseId, mod, ctx, plan);
    // Keep the identity if a later notes/visuals write fails. The workflow
    // uploads this lock as an artifact even on failure for safe reconciliation.
    if (args.apply) writeLock(args.course,args.project,lock);
    await syncFacilitatorNotes(client, moduleId, mod.facilitatorNotes, plan, args.apply);
    await syncVisuals(client, moduleId, mod.visuals, plan, args.apply);
  }

  if (args.mode === 'assessments' && courseId) {
    await syncTestQuestions(client, courseId, content.testQuestions, plan, args.apply);
  } else if (args.mode === 'assessments') {
    plan.testQuestions.create += content.testQuestions.length; // dry run, course not yet created
  }

  if (args.mode === 'kb') {
    const categoryIds = await syncCategories(client, content.categories, lock, plan, args.apply);
    await syncQaEntries(client, content, categoryIds, ctx, plan);
  }

  if (args.apply) writeLock(args.course, args.project, lock);

  const mode = args.apply ? (args.publish ? "APPLY + PUBLISH" : "APPLY (drafts)") : "DRY RUN";
  console.log(`\n${mode} — project ${args.project}, course ${args.course}, org unit "${args.orgUnit}"`);
  if (args.publish) console.log("  course status       set to published (rpc_course_set_status)");
  console.log(`  course              create ${plan.course.create}  update ${plan.course.update}`);
  console.log(`  modules             create ${plan.modules.create}  update ${plan.modules.update}`);
  console.log(`  facilitator notes   create ${plan.facilitatorNotes.create}  update ${plan.facilitatorNotes.update}`);
  console.log(`  visuals             create ${plan.visuals.create}  update ${plan.visuals.update}`);
  console.log(`  test questions      create ${plan.testQuestions.create}  retire ${plan.testQuestions.retire}  tag ${plan.testQuestions.tag}  unchanged ${plan.testQuestions.keep}`);
  console.log(`  kb categories       create ${plan.categories.create}  existing ${plan.categories.skip}`);
  console.log(
    `  kb entries          create ${plan.qaEntries.create}  update ${plan.qaEntries.update}  content_id stamped ${plan.qaEntries.contentIdStamped}`,
  );
  if (args.publish) {
    console.log(`  ${plan.qaEntries.pendingDrafts} kb entries held as drafts pending review`);
  }
  if (!args.apply) console.log("\n  nothing was written — re-run with --apply\n");
}

main().catch((error) => {
  console.error(`\ntraining:load failed — ${error.message}\n`);
  process.exit(1);
});
