// Where Read-mode narration comes from. Each entry is a folder of reference
// subchapters; a subchapter is narrated once it has a lessons/ folder. The
// prefix keeps audio paths and manifest module keys distinct per chapter
// (public/training/audio/<prefix><subchapter>/...). All chapters share one
// manifest, because the lesson page looks audio up by lesson key.

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export const NARRATION_MANIFEST = "content/training/day1-basic-competencies/narration.json";

export const NARRATION_SOURCES = [
  { prefix: "", dir: "content/training/day1-basic-competencies/modules" },
  { prefix: "chapter2/", dir: "content/training/chapter2-common-competencies/drafts" },
];

// [{ key, dir }] for every narrated subchapter, relative to the repo root.
export function narratedModules(root) {
  return NARRATION_SOURCES.flatMap(({ prefix, dir }) =>
    readdirSync(path.join(root, dir))
      .filter((name) => existsSync(path.join(root, dir, name, "lessons")))
      .sort()
      .map((name) => ({ key: `${prefix}${name}`, dir: path.join(dir, name) })),
  );
}
