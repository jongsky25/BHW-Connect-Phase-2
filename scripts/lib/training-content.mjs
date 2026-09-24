// Reads and validates a content/training/<course>/ tree — course metadata,
// per-module objectives/lesson/visuals/facilitator-notes/competency, and
// qa-entries.json for the chatbot's dual-delivery half. Shared by
// scripts/training-load.mjs and its test suite.
//
// Mirrors scripts/lib/kb-content.mjs's shape deliberately: courses collect
// every problem into one array and throw once (not fail-fast on the first
// bad file), so an author sees every mistake in a single run.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseLessonMarkdown } from "./lesson-md.mjs";
import { validateSvgMarkup } from "./svg-allowlist.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const TRAINING_ROOT = path.resolve(here, "../../content/training");

export const DEFAULT_COURSE = "day1-basic-competencies";

/** Every course directory under content/training, sorted — mirrors
 * scripts/lib/kb-content.mjs's listCorpora(), used by kb-check-sources.mjs
 * to also check this content root's citations. */
export function listCourses() {
  return readdirSync(TRAINING_ROOT)
    .filter((name) => statSync(path.join(TRAINING_ROOT, name)).isDirectory())
    .sort();
}

const TIERS_IN_ORDER = ["core", "standard", "deep"];

// Style guide §1 — a verb describing a mental state rather than an
// observable action. Matched against the start of the objective text
// (Filipino objectives are written verb-first: "Maililista ng BHW...").
const BANNED_VERB_PATTERNS = [
  /^malalaman\b/i,
  /^maiintindihan\b/i,
  /^malaman ang kahalagahan\b/i,
  /^mauunawaan\b/i,
  /^understand\b/i,
  /^know about\b/i,
  /^knows about\b/i,
  /^know\b/i,
  /^knows\b/i,
  /^appreciate\b/i,
];

export function objectiveStartsWithBannedVerb(text) {
  const normalized = (text ?? "").trim();
  return BANNED_VERB_PATTERNS.some((re) => re.test(normalized));
}

const STOPWORDS = new Set([
  "ang",
  "ng",
  "sa",
  "at",
  "na",
  "mga",
  "para",
  "kung",
  "ito",
  "the",
  "and",
  "a",
  "an",
  "of",
  "to",
  "for",
  "their",
  "its",
  "is",
  "are",
  "be",
  "with",
  "that",
  "this",
]);

function significantWords(text) {
  return (text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

/**
 * Style guide §2's failure mode: a summary whose words are almost entirely
 * drawn from the objectives themselves, with little of its own vocabulary,
 * is "the objectives restated" rather than a synthesis. Heuristic by
 * necessity (the plan names no exact rule) — high overlap AND not much new
 * vocabulary is what a restatement looks like; a real synthesis reuses some
 * objective language but adds its own connecting sentence.
 */
export function summaryLooksLikeObjectivesRestated(summary, objectives) {
  const summaryWords = significantWords(summary);
  if (summaryWords.length === 0) return false;
  const objectiveWordSet = new Set(objectives.flatMap((o) => significantWords(o)));
  if (objectiveWordSet.size === 0) return false;
  const overlapping = summaryWords.filter((w) => objectiveWordSet.has(w));
  const overlapRatio = overlapping.length / summaryWords.length;
  const novelWordCount = new Set(summaryWords.filter((w) => !objectiveWordSet.has(w))).size;
  return overlapRatio >= 0.75 && novelWordCount < 6;
}

/** Non-fatal §A.6 heuristic: does any core-tier section's takeaway share
 * real vocabulary with this objective? Used only to populate reviewFlags. */
function takeawayCoversObjective(takeaway, objective) {
  const takeawayWords = new Set(significantWords(takeaway));
  const objectiveWords = significantWords(objective);
  const shared = objectiveWords.filter((w) => takeawayWords.has(w));
  return shared.length >= 1;
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function courseDir(course, root) {
  if (!/^[a-z0-9-]+$/.test(course)) throw new Error(`invalid course id: ${course}`);
  const dir = path.join(root, course);
  if (!existsSync(dir)) throw new Error(`unknown course "${course}" — expected ${dir}`);
  return dir;
}

function mergeSections(sectionsFil, sectionsEn, moduleId, file, problems) {
  const merged = [];
  const count = Math.min(sectionsFil.length, sectionsEn.length);
  for (let i = 0; i < count; i += 1) {
    const a = sectionsFil[i];
    const b = sectionsEn[i];
    const where = `modules/${moduleId}: lesson section ${i} ("${a.heading}")`;

    if (a.kind !== b.kind) problems.push(`${where}: kind differs between languages ("${a.kind}" vs "${b.kind}")`);
    if (a.tier !== b.tier) problems.push(`${where}: tier differs between languages ("${a.tier}" vs "${b.tier}")`);
    if (Boolean(a.check) !== Boolean(b.check)) {
      problems.push(`${where}: a retrieval check exists in one language's lesson file but not the other`);
    } else if (a.check && b.check) {
      if (a.check.options.length !== b.check.options.length) {
        problems.push(
          `${where}: check option count differs between languages (${a.check.options.length} vs ${b.check.options.length})`,
        );
      }
      if (a.check.correctOptionIndex !== b.check.correctOptionIndex) {
        problems.push(`${where}: check's correct option index differs between languages`);
      }
    }
    if (a.visualPosition !== b.visualPosition) {
      problems.push(`${where}: visual_position differs between languages (${a.visualPosition} vs ${b.visualPosition})`);
    }

    const idsFil = (a.conceptIds ?? []).join(",");
    const idsEn = (b.conceptIds ?? []).join(",");
    if (idsFil !== idsEn) {
      problems.push(`${where}: coverage markers differ between languages ("{${idsFil}}" vs "{${idsEn}}")`);
    }

    merged.push({
      kind: a.kind,
      tier: a.tier,
      concept_ids: a.conceptIds ?? [],
      heading_fil: a.heading,
      heading_en: b.heading,
      body_fil: a.body,
      body_en: b.body,
      visual_position: a.visualPosition,
      takeaway_fil: a.takeaway,
      takeaway_en: b.takeaway,
      check:
        a.check && b.check
          ? {
              prompt_fil: a.check.prompt,
              prompt_en: b.check.prompt,
              options: a.check.options.map((opt, idx) => ({ fil: opt.text, en: b.check.options[idx]?.text ?? "" })),
              correct_option_index: a.check.correctOptionIndex,
              feedback_fil: a.check.feedback,
              feedback_en: b.check.feedback,
            }
          : null,
    });
  }
  return merged;
}

function loadModule(moduleId, mDir, ctx, problems, reviewFlags) {
  const { categorySlugs, domains, sourceIds } = ctx;
  const where = (msg) => `modules/${moduleId}: ${msg}`;

  const moduleJson = readJson(path.join(mDir, "module.json"));
  if (moduleJson.id !== moduleId) {
    problems.push(where(`module.json id "${moduleJson.id}" does not match its folder name`));
  }

  const objectivesFil = moduleJson.objectives_fil ?? [];
  const objectivesEn = moduleJson.objectives_en ?? [];
  if (objectivesFil.length < 3) problems.push(where(`needs at least 3 objectives_fil, has ${objectivesFil.length}`));
  if (objectivesEn.length < 3) problems.push(where(`needs at least 3 objectives_en, has ${objectivesEn.length}`));
  if (objectivesFil.length !== objectivesEn.length) {
    problems.push(where(`objectives_fil (${objectivesFil.length}) and objectives_en (${objectivesEn.length}) counts differ`));
  }
  objectivesFil.forEach((text, i) => {
    if (objectiveStartsWithBannedVerb(text)) problems.push(where(`objectives_fil[${i}] starts with a banned verb: "${text}"`));
  });
  objectivesEn.forEach((text, i) => {
    if (objectiveStartsWithBannedVerb(text)) problems.push(where(`objectives_en[${i}] starts with a banned verb: "${text}"`));
  });

  if (!moduleJson.summary_fil?.trim()) problems.push(where("summary_fil is empty"));
  if (!moduleJson.summary_en?.trim()) problems.push(where("summary_en is empty"));
  if (moduleJson.summary_fil && summaryLooksLikeObjectivesRestated(moduleJson.summary_fil, objectivesFil)) {
    problems.push(where("summary_fil reads as the objectives restated rather than synthesized (style guide §2)"));
  }
  if (moduleJson.summary_en && summaryLooksLikeObjectivesRestated(moduleJson.summary_en, objectivesEn)) {
    problems.push(where("summary_en reads as the objectives restated rather than synthesized (style guide §2)"));
  }

  let sectionsFil = [];
  let sectionsEn = [];
  try {
    sectionsFil = parseLessonMarkdown(readFileSync(path.join(mDir, "lesson.fil.md"), "utf8"), `modules/${moduleId}/lesson.fil.md`);
  } catch (e) {
    problems.push(e.message);
  }
  try {
    sectionsEn = parseLessonMarkdown(readFileSync(path.join(mDir, "lesson.en.md"), "utf8"), `modules/${moduleId}/lesson.en.md`);
  } catch (e) {
    problems.push(e.message);
  }

  if (sectionsFil.length !== sectionsEn.length) {
    problems.push(
      where(`lesson.fil.md has ${sectionsFil.length} section(s) but lesson.en.md has ${sectionsEn.length} — must match`),
    );
  }
  const mergedSections = mergeSections(sectionsFil, sectionsEn, moduleId, mDir, problems);

  const coreSections = mergedSections.filter((s) => s.tier === "core");
  if (mergedSections.length > 0 && coreSections.length === 0) {
    problems.push(where("has zero core-tier sections — core sections alone must satisfy every objective (§A.6)"));
  }
  objectivesFil.forEach((obj, i) => {
    const covered = coreSections.some((s) => takeawayCoversObjective(s.takeaway_fil, obj));
    if (!covered) {
      reviewFlags.push(
        where(
          `objective ${i} ("${obj.slice(0, 70)}${obj.length > 70 ? "..." : ""}") may not be covered by any core-tier section's takeaway — human review needed (§A.6 heuristic, not a hard failure)`,
        ),
      );
    }
  });

  // §C.2 coverage — the module declares what its sources oblige it to teach,
  // and every concept must be delivered by a core/standard section or be
  // explicitly excused. `deep` deliberately does not count: a concept only
  // reachable at Detalyado density is not delivered to the BHW on Karaniwan.
  const coveragePath = path.join(mDir, "coverage.json");
  let coverage = [];
  if (existsSync(coveragePath)) {
    coverage = readJson(coveragePath).concepts ?? [];
    const declared = new Set();
    coverage.forEach((c, i) => {
      const cWhere = `modules/${moduleId}: coverage.json concepts[${i}]`;
      if (!c.id?.trim()) problems.push(`${cWhere}: missing id`);
      else if (declared.has(c.id)) problems.push(`${cWhere}: duplicate id "${c.id}"`);
      else declared.add(c.id);
      if (!c.statement_en?.trim()) problems.push(`${cWhere} ("${c.id}"): missing statement_en`);
      if (!c.source?.trim()) problems.push(`${cWhere} ("${c.id}"): missing source citation`);
    });

    const deliveredBy = new Map();
    for (const s of mergedSections) {
      for (const id of s.concept_ids ?? []) {
        if (!declared.has(id)) {
          problems.push(
            where(`lesson section "${s.heading_fil}" marks unknown concept id "${id}" — not declared in coverage.json`),
          );
          continue;
        }
        if (!deliveredBy.has(id)) deliveredBy.set(id, []);
        deliveredBy.get(id).push(s.tier);
      }
    }

    for (const c of coverage) {
      if (!c.id) continue;
      const tiers = deliveredBy.get(c.id) ?? [];
      const reachable = tiers.some((t) => t === "core" || t === "standard");
      if (reachable) continue;
      if (c.redundant_with?.trim()) continue;
      problems.push(
        where(
          tiers.length > 0
            ? `coverage concept "${c.id}" is only delivered by a deep-tier section, so a BHW at normal density never sees it — move it to core/standard or excuse it with "redundant_with"`
            : `coverage concept "${c.id}" is not delivered by any lesson section and has no "redundant_with" note (§C.2)`,
        ),
      );
    }
  } else {
    reviewFlags.push(
      where("has no coverage.json — breadth against the source documents is unverifiable for this module (§C.2)"),
    );
  }

  const visualsPath = path.join(mDir, "visuals", "visuals.json");
  const visualsJson = existsSync(visualsPath) ? readJson(visualsPath) : { visuals: [] };
  const seenPositions = new Set();
  const visuals = [];
  for (const v of visualsJson.visuals ?? []) {
    const vWhere = where(`visual at position ${v.position}`);
    if (seenPositions.has(v.position)) problems.push(`${vWhere}: duplicate position`);
    seenPositions.add(v.position);
    if (!v.alt_text_fil?.trim() || !v.alt_text_en?.trim()) problems.push(`${vWhere}: missing alt_text_fil/alt_text_en`);
    if (!v.caption_fil?.trim() || !v.caption_en?.trim()) problems.push(`${vWhere}: missing caption_fil/caption_en`);

    let svgMarkup = null;
    if (v.primitive !== "image") {
      if (!v.file) {
        problems.push(`${vWhere}: no file given for a non-image primitive`);
      } else {
        const svgPath = path.join(mDir, "visuals", v.file);
        if (!existsSync(svgPath)) {
          problems.push(`${vWhere}: references missing file "${v.file}"`);
        } else {
          svgMarkup = readFileSync(svgPath, "utf8");
          const result = validateSvgMarkup(svgMarkup);
          if (!result.ok) problems.push(`${vWhere} (${v.file}): ${result.problems.join("; ")}`);
        }
      }
    }
    visuals.push({ ...v, svg_markup: svgMarkup });
  }

  mergedSections.forEach((s, i) => {
    if (s.visual_position !== null && !seenPositions.has(s.visual_position)) {
      problems.push(where(`lesson section ${i} ("${s.heading_fil}") references visual position ${s.visual_position}, which is not in visuals.json`));
    }
  });

  const competencyPath = path.join(mDir, "competency.json");
  const competency = existsSync(competencyPath)
    ? readJson(competencyPath)
    : { competency_statement_fil: "", competency_statement_en: "", observation_indicators: [] };
  if (!existsSync(competencyPath)) problems.push(where("missing competency.json"));
  (competency.observation_indicators ?? []).forEach((ind, i) => {
    if (
      typeof ind.objective_index !== "number" ||
      ind.objective_index < 0 ||
      ind.objective_index >= objectivesFil.length
    ) {
      problems.push(where(`competency.json observation_indicators[${i}] has objective_index ${ind.objective_index}, with no matching objective`));
    }
  });

  const notesFilPath = path.join(mDir, "facilitator-notes.fil.md");
  const notesEnPath = path.join(mDir, "facilitator-notes.en.md");
  if (!existsSync(notesFilPath)) problems.push(where("missing facilitator-notes.fil.md"));
  if (!existsSync(notesEnPath)) problems.push(where("missing facilitator-notes.en.md"));
  const notesFil = existsSync(notesFilPath) ? readFileSync(notesFilPath, "utf8") : "";
  const notesEn = existsSync(notesEnPath) ? readFileSync(notesEnPath, "utf8") : "";

  const qaEntries = [];
  const qaPath = path.join(mDir, "qa-entries.json");
  if (existsSync(qaPath)) {
    const qa = readJson(qaPath);
    if (!categorySlugs.has(qa.category)) {
      problems.push(where(`qa-entries.json category "${qa.category}" is not declared in this course's categories.json`));
    }
    for (const entry of qa.entries ?? []) {
      const entryWhere = where(`qa-entries.json:${entry.id}`);
      if (!(entry.domain in domains)) problems.push(`${entryWhere}: unknown domain "${entry.domain}"`);
      if (entry.tier !== "cited" && entry.tier !== "pending") problems.push(`${entryWhere}: tier must be cited|pending`);
      for (const field of ["question_en", "question_fil", "answer_en", "answer_fil"]) {
        if (!entry[field]?.trim()) problems.push(`${entryWhere}: ${field} is empty`);
      }
      if (!Array.isArray(entry.keywords) || entry.keywords.length < 4) {
        problems.push(`${entryWhere}: needs at least 4 keywords (they are the matcher's main lever)`);
      }
      if (!Array.isArray(entry.sources) || entry.sources.length === 0) {
        problems.push(`${entryWhere}: every entry must cite at least one source`);
      }
      for (const id of entry.sources ?? []) {
        if (!sourceIds.has(id)) problems.push(`${entryWhere}: unknown source "${id}"`);
      }
      qaEntries.push({ ...entry, category: qa.category, moduleId });
    }
  }

  return {
    id: moduleId,
    position: moduleJson.position ?? 0,
    title_fil: moduleJson.title_fil,
    title_en: moduleJson.title_en,
    objectives_fil: objectivesFil,
    objectives_en: objectivesEn,
    summary_fil: moduleJson.summary_fil ?? "",
    summary_en: moduleJson.summary_en ?? "",
    lesson: mergedSections.length > 0 ? { sections: mergedSections } : null,
    visuals,
    facilitatorNotes: {
      notes_fil: notesFil,
      notes_en: notesEn,
      competency_statement_fil: competency.competency_statement_fil ?? "",
      competency_statement_en: competency.competency_statement_en ?? "",
      observation_indicators: competency.observation_indicators ?? [],
    },
    qaEntries,
  };
}

/**
 * @param {string} course - the course folder name under content/training/ (or `root`, if given)
 * @param {{root?: string}} [options] - override the search root, for tests. Defaults to content/training/.
 */
export function loadTrainingCourse(course = DEFAULT_COURSE, options = {}) {
  const dir = courseDir(course, options.root ?? TRAINING_ROOT);
  const problems = [];
  const reviewFlags = [];

  const courseMeta = readJson(path.join(dir, "course.json"));
  const sources = readJson(path.join(dir, "sources.json")).sources;
  const categoriesFile = readJson(path.join(dir, "categories.json"));
  const categories = categoriesFile.categories;
  const domains = categoriesFile.domains;
  const testQuestions = readJson(path.join(dir, "test-questions.json")).questions ?? [];

  const categorySlugs = new Set(categories.map((c) => c.slug));
  const sourceIds = new Set(Object.keys(sources));
  const ctx = { categorySlugs, domains, sourceIds };

  const modulesDir = path.join(dir, "modules");
  const moduleIds = existsSync(modulesDir)
    ? readdirSync(modulesDir)
        .filter((name) => statSync(path.join(modulesDir, name)).isDirectory())
        .sort()
    : [];

  if (moduleIds.length === 0) problems.push("no module folders found under modules/");

  const modules = moduleIds.map((moduleId) => loadModule(moduleId, path.join(modulesDir, moduleId), ctx, problems, reviewFlags));

  // A question's optional `module` names the module folder it tests. The bank
  // stores that module's position, and only questions on modules the course
  // contains are served and scored (versioned test bank migration).
  const modulePositions = new Map(modules.map((m) => [m.id, m.position]));
  testQuestions.forEach((q, i) => {
    if (q.module !== undefined && !modulePositions.has(q.module)) {
      problems.push(`test-questions.json[${i}]: module "${q.module}" is not a module folder`);
    }
    for (const field of ["prompt_fil", "prompt_en"]) {
      if (!q[field]?.trim()) problems.push(`test-questions.json[${i}]: ${field} is empty`);
    }
    if (!Array.isArray(q.options) || q.options.length < 2) problems.push(`test-questions.json[${i}]: needs at least 2 options`);
    if (typeof q.correct_option_index !== "number" || q.correct_option_index < 0 || q.correct_option_index >= (q.options?.length ?? 0)) {
      problems.push(`test-questions.json[${i}]: correct_option_index out of range`);
    }
  });

  if (problems.length > 0) {
    throw new Error(`training content validation failed (${course}):\n  ${problems.join("\n  ")}`);
  }

  const qaEntries = modules.flatMap((m) => m.qaEntries);

  return {
    dir,
    course: courseMeta,
    sources,
    categories,
    domains,
    testQuestions: testQuestions.map((q) => ({
      ...q,
      module_position: q.module === undefined ? null : modulePositions.get(q.module),
    })),
    modules,
    qaEntries,
    reviewFlags,
  };
}

export { TIERS_IN_ORDER };
