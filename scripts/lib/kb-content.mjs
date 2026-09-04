// Reads and validates a content/kb/<corpus>/ tree, and renders the citation line
// that kb_entries has no column for. Shared by scripts/kb-load.mjs,
// scripts/kb-unpublish.mjs and scripts/kb-check-sources.mjs.
//
// A corpus is one self-contained body of KB content: its own categories,
// entries, sources and matcher tuning. `hhp-ncd` was the first; `cesr` is the
// second. Corpora are loaded independently so one can be re-loaded, unpublished
// or rolled back without touching the other — but note they share a single
// kb_entries table and therefore a single matcher, so keywords still compete
// across corpora. See content/kb/README.md.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const KB_ROOT = path.resolve(here, "../../content/kb");

export const DEFAULT_CORPUS = "hhp-ncd";

/** Absolute path to one corpus directory. */
export function contentDir(corpus = DEFAULT_CORPUS) {
  if (!/^[a-z0-9-]+$/.test(corpus)) throw new Error(`invalid corpus name: ${corpus}`);
  const dir = path.join(KB_ROOT, corpus);
  if (!existsSync(dir)) {
    throw new Error(`unknown corpus "${corpus}" — expected ${dir}. Known: ${listCorpora().join(", ")}`);
  }
  return dir;
}

/** Every corpus directory under content/kb, sorted. */
export function listCorpora() {
  return readdirSync(KB_ROOT)
    .filter((name) => statSync(path.join(KB_ROOT, name)).isDirectory())
    .sort();
}

/** Back-compat alias for the original single-corpus export. */
export const CONTENT_DIR = path.join(KB_ROOT, DEFAULT_CORPUS);

const PENDING_NOTE_EN =
  "⚠ Pending BLHSD–WHO technical validation — not for field use until confirmed.";
const PENDING_NOTE_FIL =
  "⚠ Beripikahin sa BLHSD–WHO — huwag gamitin sa larangan hanggang makumpirma.";

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function loadContent(corpus = DEFAULT_CORPUS) {
  const dir = contentDir(corpus);

  // sources, categories and entries are the irreducible core of a corpus.
  // The matcher-tuning and long-form files are optional: a corpus that needs no
  // red-flag rules should not have to carry an empty stub to prove it.
  const readOptional = (file, key, fallback) =>
    existsSync(path.join(dir, file)) ? readJson(path.join(dir, file))[key] : fallback;

  const sources = readJson(path.join(dir, "sources.json")).sources;
  const categoriesFile = readJson(path.join(dir, "categories.json"));
  const categories = categoriesFile.categories;
  const domains = categoriesFile.domains;
  const synonyms = readOptional("synonyms.json", "synonyms", []);
  const redFlags = readOptional("red-flags.json", "red_flags", []);
  const clarifiers = readOptional("clarifiers.json", "clarifiers", []);
  const articlesIndex = readOptional("articles/index.json", "articles", []);

  const entriesDir = path.join(dir, "entries");
  const entries = [];
  for (const file of readdirSync(entriesDir).filter((f) => f.endsWith(".json")).sort()) {
    const parsed = readJson(path.join(entriesDir, file));
    for (const entry of parsed.entries) {
      entries.push({ ...entry, category: parsed.category, corpus, file });
    }
  }

  const articles = articlesIndex.map((article) => ({
    ...article,
    body_en: readFileSync(path.join(dir, "articles", article.file_en), "utf8"),
    body_fil: readFileSync(path.join(dir, "articles", article.file_fil), "utf8"),
  }));

  validate({ sources, categories, domains, entries, synonyms, articles, redFlags, clarifiers });
  return { corpus, dir, sources, categories, domains, entries, synonyms, articles, redFlags, clarifiers };
}

function validate({ sources, categories, domains, entries, synonyms, articles, redFlags, clarifiers }) {
  const problems = [];
  const categorySlugs = new Set(categories.map((c) => c.slug));
  const sourceIds = new Set(Object.keys(sources));
  const seenIds = new Set();

  for (const entry of entries) {
    const where = `${entry.file}:${entry.id}`;
    if (seenIds.has(entry.id)) problems.push(`${where}: duplicate content id`);
    seenIds.add(entry.id);
    if (!categorySlugs.has(entry.category)) problems.push(`${where}: unknown category ${entry.category}`);
    if (!(entry.domain in domains)) problems.push(`${where}: unknown domain ${entry.domain}`);
    if (entry.tier !== "cited" && entry.tier !== "pending") problems.push(`${where}: tier must be cited|pending`);
    for (const field of ["question_en", "question_fil", "answer_en", "answer_fil"]) {
      if (!entry[field] || !entry[field].trim()) problems.push(`${where}: ${field} is empty`);
    }
    if (!Array.isArray(entry.keywords) || entry.keywords.length < 4) {
      problems.push(`${where}: needs at least 4 keywords (they are the matcher's main lever)`);
    }
    if (!Array.isArray(entry.sources) || entry.sources.length === 0) {
      problems.push(`${where}: every entry must cite at least one source`);
    }
    for (const id of entry.sources ?? []) {
      if (!sourceIds.has(id)) problems.push(`${where}: unknown source ${id}`);
    }
  }

  for (const article of articles) {
    if (!categorySlugs.has(article.category)) problems.push(`article ${article.id}: unknown category`);
    for (const id of article.sources ?? []) {
      if (!sourceIds.has(id)) problems.push(`article ${article.id}: unknown source ${id}`);
    }
  }

  for (const row of synonyms) {
    if (!["fil", "en", "taglish"].includes(row.language)) {
      problems.push(`synonym ${row.term}: language must be fil|en|taglish (DB CHECK)`);
    }
    if (!row.term?.trim() || !row.maps_to?.trim()) problems.push(`synonym ${row.term}: empty term or maps_to`);
  }

  // Red flags and clarifiers may only ever point at a published entry. A rule
  // aimed at a `pending` entry would silently never fire — the matcher only
  // sees `status = 'published'` — which is the worst way for a safety rule to
  // fail, so it is a load-time error rather than a runtime shrug.
  const publishedIds = new Set(entries.filter((e) => e.tier === "cited").map((e) => e.id));
  const allIds = new Set(entries.map((e) => e.id));

  function checkTarget(where, entryId) {
    if (!allIds.has(entryId)) problems.push(`${where}: unknown entry ${entryId}`);
    else if (!publishedIds.has(entryId)) {
      problems.push(`${where}: ${entryId} is tier "pending", so it is never published and the rule can never fire`);
    }
  }

  const seenRuleIds = new Set();
  for (const rule of redFlags) {
    const where = `red-flags.json:${rule.id}`;
    if (seenRuleIds.has(rule.id)) problems.push(`${where}: duplicate rule id`);
    seenRuleIds.add(rule.id);
    if (!rule.rationale?.trim()) problems.push(`${where}: every rule needs a rationale a clinician can review`);
    if (!Array.isArray(rule.any_of) || rule.any_of.length === 0) problems.push(`${where}: any_of must not be empty`);
    for (const phrase of [...(rule.any_of ?? []), ...(rule.and_any_of ?? [])]) {
      if (phrase !== phrase.toLowerCase().trim()) {
        problems.push(`${where}: phrase "${phrase}" must be lowercase and trimmed to match normalized text`);
      }
    }
    checkTarget(where, rule.entry_id);
  }

  const seenClarifierIds = new Set();
  for (const clarifier of clarifiers) {
    const where = `clarifiers.json:${clarifier.id}`;
    if (seenClarifierIds.has(clarifier.id)) problems.push(`${where}: duplicate clarifier id`);
    seenClarifierIds.add(clarifier.id);
    for (const field of ["question_en", "question_fil"]) {
      if (!clarifier[field]?.trim()) problems.push(`${where}: ${field} is empty`);
    }
    for (const group of ["topic_any_of", "intent_any_of"]) {
      if (!Array.isArray(clarifier[group]) || clarifier[group].length === 0) {
        problems.push(`${where}: ${group} must not be empty`);
      }
    }
    const phrases = [
      ...(clarifier.topic_any_of ?? []),
      ...(clarifier.intent_any_of ?? []),
      ...(clarifier.and_any_of ?? []),
      ...(clarifier.skip_if_any_of ?? []),
    ];
    for (const phrase of phrases) {
      if (phrase !== phrase.toLowerCase().trim()) {
        problems.push(`${where}: phrase "${phrase}" must be lowercase and trimmed to match normalized text`);
      }
    }
    // Fewer than two options is not a question, it is an answer with extra steps.
    if (!Array.isArray(clarifier.options) || clarifier.options.length < 2) {
      problems.push(`${where}: needs at least 2 options`);
    }
    for (const option of clarifier.options ?? []) {
      for (const field of ["label_en", "label_fil"]) {
        if (!option[field]?.trim()) problems.push(`${where}: option for ${option.entry_id} has an empty ${field}`);
      }
      checkTarget(where, option.entry_id);
    }
  }

  if (problems.length > 0) {
    throw new Error(`content validation failed:\n  ${problems.join("\n  ")}`);
  }
}

function citationLine(ids, sources, locale) {
  const label = locale === "fil" ? "Sanggunian" : "Source";
  const rendered = ids
    .map((id) => {
      const source = sources[id];
      const name = locale === "fil" ? source.label_fil : source.label_en;
      return `${name} (${source.publisher}, ${source.year}) — ${source.url}`;
    })
    .join("\n");
  return `${label}:\n${rendered}`;
}

/**
 * kb_entries has no source column, so the citation (and the pending-validation
 * notice) are rendered into the answer text itself. Idempotent by construction:
 * the loader always builds the stored answer from the content file, never from
 * whatever is already in the database.
 */
export function renderAnswer(entry, sources, locale) {
  const body = locale === "fil" ? entry.answer_fil : entry.answer_en;
  const parts = [body.trim()];
  if (entry.tier === "pending") {
    parts.push(locale === "fil" ? PENDING_NOTE_FIL : PENDING_NOTE_EN);
  }
  parts.push(citationLine(entry.sources, sources, locale));
  return parts.join("\n\n");
}

export function reviewDueOn(entry, today = new Date()) {
  const due = new Date(today.getTime());
  // Anything still awaiting a protocol figure comes back in 60 days; settled
  // content follows the +6 months the admin form already defaults to.
  if (entry.tier === "pending") due.setDate(due.getDate() + 60);
  else due.setMonth(due.getMonth() + 6);
  return due.toISOString().slice(0, 10);
}
