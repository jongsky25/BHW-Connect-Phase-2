import { readFileSync, realpathSync, readdirSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export const canonical = (value) => JSON.stringify(sort(value));
function sort(v) {
  return Array.isArray(v)
    ? v.map(sort)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, sort(v[k])]),
        )
      : v;
}
export const contentHash = (value) =>
  createHash("sha256").update(canonical(value)).digest("hex");
const key = /^[a-z0-9][a-z0-9-]*$/;
// Every lesson's private facilitator notes follow one fixed outline, in this
// order and with these stable IDs in both languages, so each subchapter is
// facilitated the same way and the app can place sections by ID. Mirrored in
// src/lib/elearning/facilitator-guide.ts (a test keeps the two in step).
export const FACILITATOR_SECTION_IDS = [
  "purpose",
  "time-materials",
  "prepare",
  "opening",
  "steps",
  "expected-answers",
  "misconception",
  "practice",
  "answer-key",
  "observe",
  "support",
  "sources-review",
];
const layouts = new Set([
  "scene",
  "annotated-illustration",
  "comparison",
  "process",
  "relationship-map",
  "decision",
  "takeaway",
]);
function assert(ok, message) {
  if (!ok) throw new Error(message);
}
function text(v, label) {
  assert(
    typeof v === "string" && v.trim().length > 0,
    `${label}: nonempty text required`,
  );
}
function array(v, label, min = 0) {
  assert(
    Array.isArray(v) && v.length >= min,
    `${label}: array required (minimum ${min})`,
  );
  return v;
}
function unique(items, field, label) {
  const ids = items.map((x) => x[field]);
  assert(new Set(ids).size === ids.length, `${label}: duplicate ${field}`);
  return new Set(ids);
}
function fields(v, allowed, label) {
  assert(
    v && typeof v === "object" && !Array.isArray(v),
    `${label}: object required`,
  );
  for (const k of Object.keys(v))
    assert(allowed.includes(k), `${label}: unknown field ${k}`);
}
function bilingual(v, names) {
  for (const name of names)
    for (const lang of ["fil", "en"])
      text(v[`${name}_${lang}`], `${name}_${lang}`);
}
function refs(values, known, label, min = 0) {
  array(values, label, min);
  assert(
    new Set(values).size === values.length,
    `${label}: duplicate reference`,
  );
  values.forEach((v) =>
    assert(known.has(v), `${label}: unknown reference ${v}`),
  );
}
function check(c) {
  if (c === null) return;
  fields(
    c,
    [
      "prompt_fil",
      "prompt_en",
      "options",
      "correct_option_index",
      "feedback_fil",
      "feedback_en",
    ],
    "check",
  );
  bilingual(c, ["prompt", "feedback"]);
  array(c.options, "check options", 2).forEach((o) => {
    fields(o, ["fil", "en"], "option");
    text(o.fil, "option fil");
    text(o.en, "option en");
  });
  assert(
    Number.isInteger(c.correct_option_index) &&
      c.correct_option_index >= 0 &&
      c.correct_option_index < c.options.length,
    "check: invalid answer index",
  );
}
// Files cannot escape the authoring root, including through symlinks.
function file(root, relative, encoding = "utf8") {
  text(relative, "file path");
  assert(
    !path.isAbsolute(relative) && !relative.includes("\\"),
    "relative forward-slash path required",
  );
  const resolved = realpathSync(path.resolve(root, relative));
  assert(
    resolved.startsWith(realpathSync(root) + path.sep),
    `file escapes authoring root: ${relative}`,
  );
  return readFileSync(resolved, encoding);
}
const json = (root, name) => JSON.parse(file(root, name));
export function parseReferenceRead(markdown) {
  const sections = [];
  let current;
  for (const line of markdown.replaceAll("\r", "").split("\n")) {
    const match = /^## \[([a-z0-9][a-z0-9-]*)\] (.+)$/.exec(line);
    if (match) {
      current = { id: match[1], heading: match[2], body: "" };
      sections.push(current);
    } else {
      assert(
        !line.startsWith("## "),
        "Read heading requires ## [stable-id] Heading",
      );
      if (current) current.body += line + "\n";
      else assert(!line.trim(), "Read content before first heading");
    }
  }
  unique(sections, "id", "Read");
  return sections.map((s) => ({ ...s, body: s.body.trim() }));
}

export function validateReferenceLesson(
  lesson,
  { assetExists = () => true } = {},
) {
  fields(lesson, ["manifest", "revision", "notes"], "lesson");
  const { manifest: m, revision: r, notes: n } = lesson;
  fields(
    m,
    [
      "lesson_key",
      "position",
      "title_fil",
      "title_en",
      "objectives_fil",
      "objectives_en",
      "required",
    ],
    "manifest",
  );
  assert(
    typeof m.lesson_key === "string" && key.test(m.lesson_key),
    "invalid lesson key",
  );
  assert(
    Number.isInteger(m.position) && m.position >= 0,
    "invalid lesson position",
  );
  assert(typeof m.required === "boolean", "required must be explicit");
  bilingual(m, ["title"]);
  for (const lang of ["fil", "en"]) {
    array(m[`objectives_${lang}`], "objectives", 1).forEach((o) =>
      text(o, "objective"),
    );
    assert(m[`objectives_${lang}`].length <= 2, "maximum two objectives");
  }
  assert(
    m.objectives_fil.length === m.objectives_en.length,
    "objective language parity",
  );
  fields(
    r,
    ["read_sections", "slides", "coverage", "sources", "assets"],
    "revision",
  );
  array(r.read_sections, "Read", 1);
  array(r.slides, "Slides", 1);
  array(r.coverage, "coverage", 1);
  array(r.sources, "sources", 1);
  array(r.assets, "assets");
  const sources = unique(r.sources, "id", "sources"),
    assets = unique(r.assets, "id", "assets"),
    concepts = unique(r.coverage, "id", "coverage");
  r.sources.forEach((s) => {
    fields(s, ["id", "title", "pdf_pages", "url"], "source");
    text(s.id, "source id");
    text(s.title, "source title");
    array(s.pdf_pages, "PDF pages", 1).forEach((p) =>
      assert(Number.isInteger(p) && p > 0, "positive PDF page required"),
    );
    if (s.url) assert(/^https:\/\//.test(s.url), "source URL requires HTTPS");
  });
  r.assets.forEach((a) => {
    fields(
      a,
      [
        "id",
        "path",
        "content_hash",
        "alt_fil",
        "alt_en",
        "caption_fil",
        "caption_en",
        "provenance",
        "review_status",
      ],
      "asset",
    );
    text(a.id, "asset id");
    assert(
      /^[0-9a-f]{64}$/.test(a.content_hash) &&
        a.path.includes(a.content_hash.slice(0, 12)),
      "asset path must include its content hash",
    );
    bilingual(a, ["alt", "caption"]);
    text(a.provenance, "asset provenance");
    assert(
      ["draft", "approved"].includes(a.review_status),
      "asset review status",
    );
    assert(
      typeof a.path === "string" &&
        /^\/training\/[a-zA-Z0-9_./-]+$/.test(a.path) &&
        !a.path.includes(".."),
      "asset must use /training/ public path",
    );
    assert(assetExists(a.path), `missing asset ${a.path}`);
  });
  for (const [mode, items] of [
    ["read", r.read_sections],
    ["slides", r.slides],
  ]) {
    unique(items, "id", mode);
    items.forEach((s) => {
      fields(
        s,
        mode === "read"
          ? [
              "id",
              "concept_ids",
              "heading_fil",
              "heading_en",
              "body_fil",
              "body_en",
              "asset_ids",
              "takeaway_fil",
              "takeaway_en",
              "check",
            ]
          : [
              "id",
              "concept_ids",
              "layout",
              "heading_fil",
              "heading_en",
              "display_fil",
              "display_en",
              "asset_ids",
              "check",
              "narration_fil",
              "narration_en",
            ],
        mode,
      );
      assert(
        typeof s.id === "string" && key.test(s.id),
        `${mode}: invalid stable id`,
      );
      bilingual(s, ["heading", mode === "read" ? "body" : "display"]);
      refs(s.concept_ids, concepts, `${mode} concepts`, 1);
      refs(s.asset_ids, assets, `${mode} assets`);
      check(s.check);
      if (mode === "read") bilingual(s, ["takeaway"]);
      else {
        assert(layouts.has(s.layout), "unknown slide layout");
        for (const lang of ["fil", "en"]) {
          assert(
            s[`display_${lang}`].length <= 600,
            "slide display exceeds 600 characters",
          );
          assert(
            !r.read_sections.some(
              (b) => b[`body_${lang}`] === s[`display_${lang}`],
            ),
            "Slides must be authored separately from Read",
          );
        }
        assert(
          Boolean(s.narration_fil) === Boolean(s.narration_en),
          "narration language parity",
        );
      }
    });
    assert(
      items.some((s) => s.check),
      `${mode}: at least one explanatory check required`,
    );
  }
  for (const c of r.coverage) {
    fields(c, ["id", "read_ids", "slide_ids", "source_ids"], "coverage");
    text(c.id, "concept id");
    refs(c.source_ids, sources, "coverage sources", 1);
    for (const [items, ids] of [
      [r.read_sections, c.read_ids],
      [r.slides, c.slide_ids],
    ]) {
      refs(ids, new Set(items.map((s) => s.id)), "coverage positions", 1);
      assert(
        canonical([...ids].sort()) ===
          canonical(
            items
              .filter((s) => s.concept_ids.includes(c.id))
              .map((s) => s.id)
              .sort(),
          ),
        `coverage mismatch for ${c.id}`,
      );
    }
  }
  fields(
    n,
    ["notes_fil", "notes_en", "observation_indicators"],
    "private notes",
  );
  bilingual(n, ["notes"]);
  for (const lang of ["fil", "en"]) {
    const sections = parseReferenceRead(n[`notes_${lang}`]);
    assert(
      canonical(sections.map((s) => s.id)) ===
        canonical(FACILITATOR_SECTION_IDS),
      `facilitator notes (${lang}) must use the template sections in order: ${FACILITATOR_SECTION_IDS.join(", ")}`,
    );
    sections.forEach((s) => text(s.body, `facilitator notes (${lang}) ${s.id}`));
  }
  array(
    n.observation_indicators,
    "observation indicators",
    m.objectives_fil.length,
  );
  unique(n.observation_indicators, "objective_index", "indicators");
  n.observation_indicators.forEach((i) => {
    fields(
      i,
      [
        "objective_index",
        "observable_fil",
        "observable_en",
        "not_yet_fil",
        "not_yet_en",
        "levels",
      ],
      "indicator",
    );
    assert(
      Number.isInteger(i.objective_index) &&
        i.objective_index >= 0 &&
        i.objective_index < m.objectives_fil.length,
      "indicator objective mismatch",
    );
    bilingual(i, ["observable", "not_yet"]);
    fields(
      i.levels,
      [
        "kaya_na_fil",
        "kaya_na_en",
        "kailangan_practice_fil",
        "kailangan_practice_en",
        "hindi_pa_fil",
        "hindi_pa_en",
      ],
      "levels",
    );
    bilingual(i.levels, ["kaya_na", "kailangan_practice", "hindi_pa"]);
  });
  return lesson;
}

export function loadReferenceModule(moduleRoot, publicRoot) {
  const moduleDefinition = json(moduleRoot, "module.json");
  const obligations = json(moduleRoot, "coverage.json")
    .concepts.filter((c) => c.redundant_with == null)
    .map((c) => c.id);
  const lessons = readdirSync(path.join(moduleRoot, "lessons"), {
    withFileTypes: true,
  })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const root = path.join(moduleRoot, "lessons", d.name),
        authored = json(root, "lesson.json");
      fields(
        authored,
        ["manifest", "sections", "coverage", "sources", "assets"],
        "lesson.json",
      );
      const fil = parseReferenceRead(file(root, "read.fil.md")),
        en = parseReferenceRead(file(root, "read.en.md"));
      assert(
        canonical(fil.map((s) => s.id)) === canonical(en.map((s) => s.id)),
        `${d.name}: bilingual Read position parity`,
      );
      assert(
        canonical(authored.sections.map((s) => s.id)) ===
          canonical(fil.map((s) => s.id)),
        `${d.name}: section manifest parity`,
      );
      const read_sections = authored.sections.map((s, i) => ({
        ...s,
        heading_fil: fil[i].heading,
        heading_en: en[i].heading,
        body_fil: fil[i].body,
        body_en: en[i].body,
      }));
      const notes = {
        ...json(root, "competency.json"),
        notes_fil: file(root, "facilitator.fil.md"),
        notes_en: file(root, "facilitator.en.md"),
      };
      assert(
        authored.manifest.lesson_key === d.name,
        "folder must match lesson key",
      );
      return validateReferenceLesson(
        {
          manifest: authored.manifest,
          revision: {
            read_sections,
            slides: json(root, "slides.json"),
            coverage: authored.coverage,
            sources: authored.sources,
            assets: authored.assets,
          },
          notes,
        },
        {
          assetExists: (p) => {
            try {
              const bytes = file(publicRoot, p.slice(1), null);
              const a = authored.assets.find((a) => a.path === p);
              return (
                createHash("sha256").update(bytes).digest("hex") ===
                a.content_hash
              );
            } catch {
              return false;
            }
          },
        },
      );
    })
    .sort((a, b) => a.manifest.position - b.manifest.position);
  assert(
    lessons.length && lessons.some((l) => l.manifest.required),
    "subchapter requires required lessons",
  );
  unique(
    lessons.map((l) => l.manifest),
    "position",
    "lessons",
  );
  unique(
    lessons.map((l) => l.manifest),
    "lesson_key",
    "lessons",
  );
  const covered = new Set(
    lessons.flatMap((l) => l.revision.coverage.map((c) => c.id)),
  );
  assert(
    canonical([...covered].sort()) ===
      canonical([...new Set(obligations)].sort()),
    "subchapter must cover exactly all non-excluded legacy concepts",
  );
  return { module_key: moduleDefinition.id, lessons };
}
