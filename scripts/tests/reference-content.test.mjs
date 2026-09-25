// @vitest-environment node
import { test } from "vitest";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  loadReferenceModule,
  validateReferenceLesson,
  parseReferenceRead,
  canonical,
  contentHash,
} from "../lib/reference-content.mjs";
import {
  planReferenceLoad,
  applyReferenceLoad,
  referenceReport,
  stageReferenceHierarchy,
} from "../lib/reference-load.mjs";
import { readFileSync } from "node:fs";
const referenceModule = loadReferenceModule(
  "content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw",
  "public",
);
test("six bilingual lessons, 31 distinct slides, every legacy concept covered", () => {
  assert.equal(referenceModule.lessons.length, 6);
  assert.equal(
    referenceModule.lessons.reduce((n, l) => n + l.revision.slides.length, 0),
    31,
  );
});
const corruptions = [
  ["missing translation", (l) => (l.revision.slides[0].display_en = "")],
  ["duplicate positions", (l) => l.revision.slides.push(l.revision.slides[0])],
  ["unknown concept", (l) => l.revision.slides[0].concept_ids.push("unknown")],
  ["unknown source", (l) => (l.revision.coverage[0].source_ids = ["missing"])],
  [
    "coverage direction mismatch",
    (l) => (l.revision.coverage[0].read_ids = []),
  ],
  ["unknown asset", (l) => (l.revision.slides[0].asset_ids = ["missing"])],
  [
    "offline source without PDF pages",
    (l) => {
      delete l.revision.sources[0].pdf_pages;
      delete l.revision.sources[0].url;
    },
  ],
  ["empty PDF pages", (l) => (l.revision.sources[0].pdf_pages = [])],
  ["missing alt", (l) => (l.revision.assets[0].alt_en = "")],
  [
    "unsafe path",
    (l) => (l.revision.assets[0].path = "/training/../../secret"),
  ],
  ["private notes in revision", (l) => (l.revision.notes_fil = "private")],
  [
    "answer outside options",
    (l) => (l.revision.slides.at(-1).check.correct_option_index = 999),
  ],
  [
    "Read copied into Slides",
    (l) =>
      (l.revision.slides[0].display_en = l.revision.read_sections[0].body_en),
  ],
  ["missing observation", (l) => (l.notes.observation_indicators = [])],
  [
    "unknown objective",
    (l) => (l.notes.observation_indicators[0].objective_index = 8),
  ],
  ["narration parity", (l) => (l.revision.slides[0].narration_fil = "script")],
  [
    "facilitator notes off-template",
    (l) => (l.notes.notes_en = "Free-form notes without the template."),
  ],
  [
    "facilitator notes missing a section",
    (l) =>
      (l.notes.notes_fil = l.notes.notes_fil.replace(
        /## \[misconception\][\s\S]*?(?=## \[)/,
        "",
      )),
  ],
  [
    "facilitator notes empty section",
    (l) =>
      (l.notes.notes_en = l.notes.notes_en.replace(
        /(## \[practice\][^\n]*\n)[\s\S]*?(?=## \[)/,
        "$1\n",
      )),
  ],
];
for (const [name, mutate] of corruptions)
  test(name, () => {
    const l = structuredClone(referenceModule.lessons[0]);
    mutate(l);
    assert.throws(() => validateReferenceLesson(l));
  });
test("a web source may omit PDF pages", () => {
  const l = structuredClone(referenceModule.lessons[0]);
  l.revision.sources.push({
    id: "web-source",
    title: "A statute page",
    url: "https://lawphil.net/statutes/repacts/ra1995/ra_7883_1995.html",
  });
  validateReferenceLesson(l);
});
test("missing physical assets rejected", () =>
  assert.throws(() =>
    validateReferenceLesson(referenceModule.lessons[0], { assetExists: () => false }),
  ));
test("stable Read syntax rejects malformed headings and duplicate IDs", () => {
  assert.throws(() => parseReferenceRead("## plain"));
  assert.throws(() =>
    parseReferenceRead("## [one] One\nbody\n## [one] Two\nbody"),
  );
});
test("canonical hashing ignores property order, includes private revisions", () => {
  assert.equal(contentHash({ b: 1, a: 2 }), contentHash({ a: 2, b: 1 }));
  const changed = structuredClone(referenceModule.lessons[0]);
  changed.notes.notes_en += " changed";
  assert.notEqual(contentHash(changed), contentHash(referenceModule.lessons[0]));
});

function fake() {
  const course = randomUUID(),
    mod = randomUUID(),
    org = randomUUID(),
    lock = { course, modules: { [referenceModule.module_key]: mod }, unrelated: "keep" };
  const tables = {
    courses: [{ id: course, org_unit_id: org }],
    course_modules: [{ id: mod, course_id: course }],
    course_lessons: [],
    course_lesson_revisions: [],
    course_lesson_facilitator_notes: [],
  };
  const writes = [];
  let interrupt = false;
  const client = {
    async get(query) {
      const [table, q] = query.split("?"),
        params = new URLSearchParams(q);
      let rows = tables[table] ?? [];
      for (const [k, v] of params)
        if (v.startsWith("eq."))
          rows = rows.filter((r) => String(r[k]) === v.slice(3));
      return structuredClone(
        rows.slice(
          Number(params.get("offset") ?? 0),
          Number(params.get("offset") ?? 0) +
            Number(params.get("limit") ?? 1000),
        ),
      );
    },
    async insert(table, rows) {
      if (interrupt && table === "course_lesson_facilitator_notes") {
        interrupt = false;
        throw new Error("interrupted");
      }
      writes.push(table);
      const inserted = rows.map((r) => ({ id: randomUUID(), ...r }));
      tables[table].push(...inserted);
      return structuredClone(inserted);
    },
    async rpc(name, args) {
      assert.equal(name, "rpc_course_lessons_publish");
      assert.equal(args.p_revision_ids.length, 6);
      writes.push(name);
      for (const id of args.p_revision_ids) {
        const rev = tables.course_lesson_revisions.find((r) => r.id === id);
        tables.course_lessons.find(
          (l) => l.id === rev.lesson_id,
        ).published_revision_id = id;
      }
    },
  };
  return {
    client,
    tables,
    writes,
    lock,
    org,
    interrupt: () => {
      interrupt = true;
    },
  };
}
test("dry run writes nothing, stage + rerun preserve identities and unrelated locks", async () => {
  const f = fake(),
    options = { orgUnitId: f.org };
  const p = await planReferenceLoad(f.client, [referenceModule], f.lock, options);
  assert.equal(f.writes.length, 0);
  assert.equal(referenceReport(p)[0].lessons.length, 6);
  await applyReferenceLoad(f.client, p, f.lock, randomUUID());
  const before = canonical(f.tables),
    count = f.writes.length;
  const second = await planReferenceLoad(f.client, [referenceModule], f.lock, options);
  assert.ok(second[0].entries.every((e) => e.action === "unchanged"));
  await applyReferenceLoad(f.client, second, f.lock, randomUUID());
  assert.equal(f.writes.length, count);
  assert.equal(canonical(f.tables), before);
  assert.equal(f.lock.unrelated, "keep");
});
test("interrupted private notes recover without duplicate revisions", async () => {
  const f = fake(),
    options = { orgUnitId: f.org };
  const p = await planReferenceLoad(f.client, [referenceModule], f.lock, options);
  f.interrupt();
  await assert.rejects(
    applyReferenceLoad(f.client, p, f.lock, randomUUID()),
    /interrupted/,
  );
  assert.ok(f.tables.course_lessons.every((l) => !l.published_revision_id));
  await applyReferenceLoad(
    f.client,
    await planReferenceLoad(f.client, [referenceModule], f.lock, options),
    f.lock,
    randomUUID(),
  );
  assert.equal(f.tables.course_lessons.length, 6);
  assert.equal(f.tables.course_lesson_revisions.length, 6);
  assert.equal(f.tables.course_lesson_facilitator_notes.length, 6);
});
test("publication rejects draft assets before writes, then promotes once", async () => {
  const f = fake(),
    options = { orgUnitId: f.org, promote: true };
  const draft = structuredClone(referenceModule);
  draft.lessons[0].revision.assets[0].review_status = "draft";
  await assert.rejects(
    planReferenceLoad(f.client, [draft], f.lock, options),
    /approved assets/,
  );
  assert.equal(f.writes.length, 0);
  const approved = structuredClone(referenceModule);
  approved.lessons.forEach((l) =>
    l.revision.assets.forEach((a) => (a.review_status = "approved")),
  );
  await applyReferenceLoad(
    f.client,
    await planReferenceLoad(f.client, [approved], f.lock, options),
    f.lock,
    randomUUID(),
  );
  const count = f.writes.length;
  await applyReferenceLoad(
    f.client,
    await planReferenceLoad(f.client, [approved], f.lock, options),
    f.lock,
    randomUUID(),
  );
  assert.equal(f.writes.length, count);
});
test("stale locks fail closed and never create replacement history", async () => {
  const f = fake();
  f.lock.modules[referenceModule.module_key] = randomUUID();
  await assert.rejects(
    planReferenceLoad(f.client, [referenceModule], f.lock, { orgUnitId: f.org }),
    /Reconcile/,
  );
  assert.equal(f.writes.length, 0);
});
test("hierarchy stages once, keeps chapters unavailable and preserves course UUID", async () => {
  const f = fake();
  f.tables.training_programs = [];
  f.tables.training_program_chapters = [];
  const manifest = JSON.parse(
    readFileSync("content/training/day1-basic-competencies/program.json"),
  );
  const options = { orgUnitId: f.org, authorUserId: randomUUID() };
  await stageReferenceHierarchy(f.client, manifest, f.lock, options);
  assert.equal(f.writes.length, 0);
  await stageReferenceHierarchy(f.client, manifest, f.lock, {
    ...options,
    apply: true,
  });
  assert.equal(f.tables.training_program_chapters.length, 3);
  assert.equal(f.tables.training_program_chapters[0].course_id, f.lock.course);
  assert.ok(
    f.tables.training_program_chapters.every(
      (c) => c.availability === "unavailable",
    ),
  );
  const count = f.writes.length;
  await stageReferenceHierarchy(f.client, manifest, f.lock, {
    ...options,
    apply: true,
  });
  assert.equal(f.writes.length, count);
});
test("hierarchy refuses an invented available Chapter II before writes", async () => {
  const f = fake();
  const manifest = JSON.parse(
    readFileSync("content/training/day1-basic-competencies/program.json"),
  );
  manifest.chapters[1].availability = "available";
  await assert.rejects(
    stageReferenceHierarchy(f.client, manifest, f.lock, {
      orgUnitId: f.org,
      authorUserId: randomUUID(),
      apply: true,
    }),
    /Invalid chapter/,
  );
  assert.equal(f.writes.length, 0);
});
// INC-28 tier 2: an asset may carry a rendered clip; its `path` is the poster.
const withVideo = () => {
  const l = structuredClone(referenceModule.lessons[0]);
  const hash = (c) => c.repeat(64);
  l.revision.assets[0] = {
    ...l.revision.assets[0],
    path: `/training/clip-${hash("a").slice(0, 12)}-poster.jpg`,
    content_hash: hash("a"),
    video: {
      path: `/training/clip-${hash("b").slice(0, 12)}.mp4`,
      content_hash: hash("b"),
      duration_s: 27,
    },
  };
  return l;
};
test("an asset may carry a hashed .mp4 clip with a raster poster", () =>
  validateReferenceLesson(withVideo()));
for (const [name, mutate] of [
  ["clip path without its hash", (v) => (v.path = "/training/clip.mp4")],
  ["clip outside /training/", (v) => (v.path = `/elsewhere/clip-${"b".repeat(12)}.mp4`)],
  ["clip that is not .mp4", (v) => (v.path = `/training/clip-${"b".repeat(12)}.webm`)],
  ["clip with a zero duration", (v) => (v.duration_s = 0)],
  ["clip longer than 90 s", (v) => (v.duration_s = 91)],
  ["clip with an unknown field", (v) => (v.autoplay = true)],
])
  test(`rejects ${name}`, () => {
    const l = withVideo();
    mutate(l.revision.assets[0].video);
    assert.throws(() => validateReferenceLesson(l));
  });
test("rejects a clip whose poster is not a raster image", () => {
  const l = withVideo();
  l.revision.assets[0].path = `/training/clip-${"a".repeat(12)}.svg`;
  assert.throws(() => validateReferenceLesson(l), /poster/);
});
test("rejects a clip whose file is missing or does not match its hash", () =>
  assert.throws(
    () =>
      validateReferenceLesson(withVideo(), {
        assetExists: (p) => !p.endsWith(".mp4"),
      }),
    /missing asset .*\.mp4/,
  ));
