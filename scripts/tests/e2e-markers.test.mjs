// @vitest-environment node
// Guard for e2e/global-teardown.ts: rpc_e2e_purge_test_kb only deletes
// content carrying a marker public.e2e_marker_pattern() recognizes. A spec
// that mints a new kind of per-run marker would silently start leaking junk
// onto the shared pilot project again, so every `${Date.now()...}` marker in
// e2e/ must match the pattern the latest migration defines (used by
// rpc_e2e_purge_test_kb, 20261004000200_e2e_purge_test_kb.sql).
import { test } from "vitest";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");

function latestMarkerPattern() {
  const dir = path.join(root, "supabase/migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().reverse();
  for (const file of files) {
    const sql = readFileSync(path.join(dir, file), "utf8");
    const match = sql.match(/function public\.e2e_marker_pattern\(\)[\s\S]*?select '([^']+)'/);
    if (match) {
      // Postgres ARE word-start/end escapes -> JS word boundary; matched with ~* (case-insensitive).
      return new RegExp(match[1].replaceAll("\\m", "\\b").replaceAll("\\M", "\\b"), "i");
    }
  }
  throw new Error("no migration defines public.e2e_marker_pattern()");
}

function specFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return specFiles(full);
    return entry.name.endsWith(".ts") ? [full] : [];
  });
}

// A marker is the literal text a template string puts directly in front of
// `${Date.now()`, e.g. `e2e.forum.${Date.now()}...` -> "e2e.forum.".
function markerPrefixes() {
  const prefixes = [];
  for (const file of specFiles(path.join(root, "e2e"))) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/([A-Za-z0-9_.-]*)\$\{Date\.now\(\)(\.toString\(36\))?\}/g)) {
      prefixes.push({ file: path.relative(root, file), prefix: match[1], base36: Boolean(match[2]) });
    }
  }
  return prefixes;
}

test("the purge pattern matches every per-run marker the e2e specs mint", () => {
  const pattern = latestMarkerPattern();
  const markers = markerPrefixes();
  assert.ok(markers.length > 10, "expected to find the e2e specs' per-run markers");
  for (const { file, prefix, base36 } of markers) {
    // Rebuild a representative marker the same way the spec does.
    const stamp = base36 ? Date.now().toString(36) : String(Date.now());
    const sample = `${prefix}${stamp}${base36 ? "ab12" : ".ab12cd"}`;
    assert.match(
      `Some text ${sample} more text`,
      pattern,
      `${file}: marker "${prefix}\${Date.now()}" isn't matched by public.e2e_marker_pattern(), ` +
        "so the content it labels would never be purged. Use an `e2e.<tag>.` prefix, " +
        "or extend the pattern in a new migration.",
    );
  }
});

test("the purge pattern leaves ordinary content alone", () => {
  const pattern = latestMarkerPattern();
  for (const text of [
    "What should I do if a client's blood pressure is high?",
    "Paano sukatin ang blood pressure?",
    "Open the dashboard to see weekly trends",
    "Fly screens keep mosquitoes out",
    "e2e testing notes",
  ]) {
    assert.doesNotMatch(text, pattern, text);
  }
});
