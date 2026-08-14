// Reads and validates content/kb/hhp-ncd/*, and renders the citation line that
// kb_entries has no column for. Shared by scripts/kb-load.mjs,
// scripts/kb-unpublish.mjs and scripts/kb-check-sources.mjs.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const CONTENT_DIR = path.resolve(here, "../../content/kb/hhp-ncd");

const PENDING_NOTE_EN =
  "⚠ Pending BLHSD–WHO technical validation — not for field use until confirmed.";
const PENDING_NOTE_FIL =
  "⚠ Beripikahin sa BLHSD–WHO — huwag gamitin sa larangan hanggang makumpirma.";

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function loadContent() {
  const sources = readJson(path.join(CONTENT_DIR, "sources.json")).sources;
  const categoriesFile = readJson(path.join(CONTENT_DIR, "categories.json"));
  const categories = categoriesFile.categories;
  const domains = categoriesFile.domains;
  const synonyms = readJson(path.join(CONTENT_DIR, "synonyms.json")).synonyms;
  const articlesIndex = readJson(path.join(CONTENT_DIR, "articles/index.json")).articles;

  const entriesDir = path.join(CONTENT_DIR, "entries");
  const entries = [];
  for (const file of readdirSync(entriesDir).filter((f) => f.endsWith(".json")).sort()) {
    const parsed = readJson(path.join(entriesDir, file));
    for (const entry of parsed.entries) {
      entries.push({ ...entry, category: parsed.category, file });
    }
  }

  const articles = articlesIndex.map((article) => ({
    ...article,
    body_en: readFileSync(path.join(CONTENT_DIR, "articles", article.file_en), "utf8"),
    body_fil: readFileSync(path.join(CONTENT_DIR, "articles", article.file_fil), "utf8"),
  }));

  validate({ sources, categories, domains, entries, synonyms, articles });
  return { sources, categories, domains, entries, synonyms, articles };
}

function validate({ sources, categories, domains, entries, synonyms, articles }) {
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
