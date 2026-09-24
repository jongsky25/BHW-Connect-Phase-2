import fs from "node:fs";
import assert from "node:assert/strict";
const f = JSON.parse(
  fs.readFileSync(
    process.argv[2] ?? "test-results/local-reference-app/fixture.json",
    "utf8",
  ),
);
assert.equal(
  f.api,
  "http://127.0.0.1:55434",
  "Only the disposable loopback fixture is allowed",
);
const checks = [];
async function check(name, fn) {
  await fn();
  checks.push(name);
  console.log("PASS " + name);
}
async function request(actor, route, body) {
  const r = await fetch(f.api + "/rest/v1/" + route, {
    method: body ? "POST" : "GET",
    headers: {
      apikey: f.anon,
      Authorization: "Bearer " + (f.tokens[actor] ?? f.anon),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, data: text ? JSON.parse(text) : null };
}
const list = await request(
  "new",
  "course_lessons?select=*&module_id=eq." +
    f.fixture.module +
    "&order=position",
);
assert.equal(list.data.length, 6);
const lesson = list.data[0];
const revisions = await request(
  "new",
  "course_lesson_revisions?select=*&id=eq." + lesson.published_revision_id,
);
assert.equal(revisions.data.length, 1);
const revision = revisions.data[0];
await check(
  "published six-lesson hierarchy accessible to in-scope learner",
  async () => assert.equal(list.data.length, 6),
);
for (const actor of ["new", "outside", "anon"])
  await check(actor + " cannot read private facilitator notes", async () => {
    const r = await request(actor, "course_lesson_facilitator_notes?select=*");
    assert.ok(!r.ok || r.data.length === 0);
  });
for (const actor of ["outside", "anon"])
  await check(actor + " cannot read lesson revisions", async () => {
    const r = await request(actor, "course_lesson_revisions?select=*");
    assert.ok(!r.ok || r.data.length === 0);
  });
const resume = {
  p_lesson_id: lesson.id,
  p_revision_id: revision.id,
  p_modality: "slides",
  p_language: "fil",
  p_position_key: revision.slides[1].id,
  p_concept_id: revision.slides[1].concept_ids[0],
};
await check("resume persists through real REST and RLS", async () => {
  const r = await request("new", "rpc/rpc_course_lesson_resume", resume);
  assert.ok(r.ok, JSON.stringify(r));
  const rows = await request(
    "new",
    "course_lesson_resume?select=*&lesson_id=eq." + lesson.id,
  );
  assert.equal(rows.data[0].position_key, resume.p_position_key);
});
await check("another learner cannot read saved position", async () => {
  const r = await request(
    "racer",
    "course_lesson_resume?select=*&lesson_id=eq." + lesson.id,
  );
  assert.deepEqual(r.data, []);
});
for (const actor of ["outside", "anon", "inactive"])
  await check(actor + " cannot complete a lesson", async () => {
    const r = await request(actor, "rpc/rpc_course_lesson_complete", {
      p_lesson_id: lesson.id,
      p_revision_id: revision.id,
    });
    assert.equal(r.ok, false);
  });
await check(
  "completion rerun is idempotent and shared across modes",
  async () => {
    for (let i = 0; i < 2; i++) {
      const r = await request("new", "rpc/rpc_course_lesson_complete", {
        p_lesson_id: lesson.id,
        p_revision_id: revision.id,
      });
      assert.ok(r.ok, JSON.stringify(r));
    }
    const rows = await request(
      "new",
      "course_lesson_progress?select=*&lesson_id=eq." + lesson.id,
    );
    assert.equal(rows.data.length, 1);
    assert.equal(rows.data[0].completion_basis, "learner");
  },
);
await check(
  "unfinished required lessons prevent legacy module bypass",
  async () => {
    const r = await request("new", "rpc/rpc_course_module_complete", {
      p_course_id: f.fixture.course,
      p_module_id: f.fixture.module,
    });
    assert.equal(r.ok, false);
  },
);
console.log(JSON.stringify({ checks: checks.length, passed: checks }, null, 2));
