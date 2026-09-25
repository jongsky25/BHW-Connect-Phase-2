#!/usr/bin/env node
// Every published entry carries a citation the reader can follow, so a dead
// link is a defect — run this before any demo. Sites marked wafBlocked in
// sources.json (doh.gov.ph, foi.gov.ph) answer 403 to datacenter traffic; those
// are reported as needing a manual look rather than failed.
//
//   npm run kb:check-sources

import { listCorpora, loadContent } from "./lib/kb-content.mjs";
import { listCourses, loadTrainingCourse } from "./lib/training-content.mjs";

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const TIMEOUT_MS = 30000;

async function check(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    return response.status;
  } catch (error) {
    return error.name === "AbortError" ? "timeout" : `error: ${error.message}`;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  // Every corpus is checked. A dead citation in one is a defect regardless of
  // which body of content it belongs to, and a per-corpus flag would just mean
  // the unchecked one rots quietly.
  const pending = [];
  const used = new Set();
  const declared = [];
  for (const corpus of listCorpora()) {
    const { sources, entries, articles } = loadContent(corpus);
    for (const entry of entries) for (const id of entry.sources) used.add(`${corpus}/${id}`);
    for (const article of articles) for (const id of article.sources ?? []) used.add(`${corpus}/${id}`);
    for (const [id, source] of Object.entries(sources)) {
      declared.push(`${corpus}/${id}`);
      pending.push({ corpus, id, source });
    }
  }

  // content/training/<course>/sources.json is a separate content root from
  // content/kb/ (see content/training/README.md) but the same "a dead
  // citation is a defect" rule applies — checked here rather than skipped.
  for (const course of listCourses()) {
    const corpus = `training:${course}`;
    const { sources, qaEntries } = loadTrainingCourse(course);
    for (const entry of qaEntries) for (const id of entry.sources) used.add(`${corpus}/${id}`);
    for (const [id, source] of Object.entries(sources)) {
      declared.push(`${corpus}/${id}`);
      pending.push({ corpus, id, source });
    }
  }

  // The same URL cited by two corpora is fetched once.
  const statusByUrl = new Map();
  await Promise.all(
    [...new Set(pending.map((p) => p.source.url))].map(async (url) => {
      statusByUrl.set(url, await check(url));
    }),
  );
  const results = pending.map((p) => ({ ...p, status: statusByUrl.get(p.source.url) }));

  const failures = [];
  const manual = [];
  for (const { corpus, id, source, status } of results.sort(
    (a, b) => a.corpus.localeCompare(b.corpus) || a.id.localeCompare(b.id),
  )) {
    const ok = status === 200;
    const blocked = source.wafBlocked && status === 403;
    const mark = ok ? "ok  " : blocked ? "waf " : "FAIL";
    console.log(`  ${mark} ${String(status).padEnd(7)} ${corpus}/${id}  ${source.url}`);
    if (blocked) manual.push(`${corpus}/${id}`);
    else if (!ok) failures.push(`${corpus}/${id} -> ${status}`);
  }

  const unused = declared.filter((key) => !used.has(key));
  if (unused.length > 0) console.log(`\n  unused source entries: ${unused.join(", ")}`);
  if (manual.length > 0) {
    console.log(`\n  ${manual.length} source(s) blocked to datacenter IPs — open in a browser: ${manual.join(", ")}`);
  }

  if (failures.length > 0) {
    console.error(`\n  ${failures.length} broken source URL(s):\n    ${failures.join("\n    ")}\n`);
    process.exit(1);
  }
  console.log(
    `\n  ${results.length} sources across ${listCorpora().length} kb corpora and ${listCourses().length} training course(s) checked, ` +
      `${used.size} of them cited by content\n`,
  );
}

main().catch((error) => {
  console.error(`\nkb:check-sources failed — ${error.message}\n`);
  process.exit(1);
});
