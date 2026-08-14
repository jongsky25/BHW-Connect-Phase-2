#!/usr/bin/env node
// Every published entry carries a citation the reader can follow, so a dead
// link is a defect — run this before any demo. Sites marked wafBlocked in
// sources.json (doh.gov.ph, foi.gov.ph) answer 403 to datacenter traffic; those
// are reported as needing a manual look rather than failed.
//
//   npm run kb:check-sources

import { loadContent } from "./lib/kb-content.mjs";

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
  const { sources, entries, articles } = loadContent();

  const used = new Set();
  for (const entry of entries) for (const id of entry.sources) used.add(id);
  for (const article of articles) for (const id of article.sources ?? []) used.add(id);

  const results = await Promise.all(
    Object.entries(sources).map(async ([id, source]) => ({
      id,
      source,
      status: await check(source.url),
    })),
  );

  const failures = [];
  const manual = [];
  for (const { id, source, status } of results.sort((a, b) => a.id.localeCompare(b.id))) {
    const ok = status === 200;
    const blocked = source.wafBlocked && status === 403;
    const mark = ok ? "ok  " : blocked ? "waf " : "FAIL";
    console.log(`  ${mark} ${String(status).padEnd(7)} ${id}  ${source.url}`);
    if (blocked) manual.push(id);
    else if (!ok) failures.push(`${id} -> ${status}`);
  }

  const unused = Object.keys(sources).filter((id) => !used.has(id));
  if (unused.length > 0) console.log(`\n  unused source entries: ${unused.join(", ")}`);
  if (manual.length > 0) {
    console.log(`\n  ${manual.length} source(s) blocked to datacenter IPs — open in a browser: ${manual.join(", ")}`);
  }

  if (failures.length > 0) {
    console.error(`\n  ${failures.length} broken source URL(s):\n    ${failures.join("\n    ")}\n`);
    process.exit(1);
  }
  console.log(`\n  ${results.length} sources checked, ${used.size} of them cited by content\n`);
}

main().catch((error) => {
  console.error(`\nkb:check-sources failed — ${error.message}\n`);
  process.exit(1);
});
