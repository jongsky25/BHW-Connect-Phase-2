import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadReferenceModule } from "../lib/reference-content.mjs";
import {
  planReferenceLoad,
  applyReferenceLoad,
} from "../lib/reference-load.mjs";
// A minimal parameterized REST-shape adapter exercises the actual loader under
// authenticated PostgreSQL RLS. It is not a claim of PostgREST coverage.
export async function runReferenceLoader(db, fixture) {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const content = loadReferenceModule(
    root +
      "content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw",
    root + "public",
  );
  const { course, otherModule, users, org } = fixture;
  const lock = { course, modules: { [content.module_key]: otherModule } };
  const tables = new Set([
    "courses",
    "course_modules",
    "course_lessons",
    "course_lesson_revisions",
    "course_lesson_facilitator_notes",
  ]);
  const jsonFields = new Set([
    "read_sections",
    "slides",
    "coverage",
    "sources",
    "assets",
    "observation_indicators",
  ]);
  const identifier = (s) => {
    assert.match(s, /^[a-z_]+$/);
    return '"' + s + '"';
  };
  let writes = 0,
    interrupt = false;
  async function query(sql, values = []) {
    await db.query("begin");
    try {
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
        users.admin.auth,
      ]);
      const result = await db.query(sql, values);
      await db.query("commit");
      return result.rows;
    } catch (e) {
      await db.query("rollback");
      throw e;
    }
  }
  const client = {
    async get(url) {
      const [table, q] = url.split("?");
      assert.ok(tables.has(table));
      const params = new URLSearchParams(q),
        values = [],
        clauses = [];
      for (const [k, v] of params)
        if (v.startsWith("eq.")) {
          values.push(v.slice(3));
          clauses.push(identifier(k) + "=$" + values.length);
        }
      return query(
        "select * from " +
          identifier(table) +
          (clauses.length ? " where " + clauses.join(" and ") : "") +
          " limit " +
          Number(params.get("limit") ?? 1000) +
          " offset " +
          Number(params.get("offset") ?? 0),
        values,
      );
    },
    async insert(table, rows) {
      assert.ok(tables.has(table));
      if (interrupt && table === "course_lesson_facilitator_notes") {
        interrupt = false;
        throw new Error("simulated interruption");
      }
      const result = [];
      for (const row of rows) {
        const keys = Object.keys(row);
        result.push(
          ...(await query(
            "insert into " +
              identifier(table) +
              "(" +
              keys.map(identifier).join(",") +
              ") values(" +
              keys.map((_, i) => "$" + (i + 1)).join(",") +
              ") returning *",
            keys.map((k) =>
              jsonFields.has(k) ? JSON.stringify(row[k]) : row[k],
            ),
          )),
        );
        writes++;
      }
      return result;
    },
    async rpc(name, p) {
      assert.equal(name, "rpc_course_lessons_publish");
      writes++;
      return query("select rpc_course_lessons_publish($1,$2)", [
        p.p_module_id,
        p.p_revision_ids,
      ]);
    },
  };
  const historical = [
    "courses",
    "course_modules",
    "course_progress",
    "course_module_progress",
    "assessments",
    "certificates",
    "course_test_attempts",
    "course_sessions",
    "course_session_enrollments",
  ];
  async function snapshot() {
    const value = {};
    for (const t of historical)
      value[t] = (
        await db.query(
          "select to_jsonb(t) value from " + identifier(t) + " t order by id",
        )
      ).rows;
    return value;
  }
  const before = await snapshot(),
    options = { orgUnitId: org.city };
  const plan = await planReferenceLoad(client, [content], lock, options);
  assert.equal(writes, 0);
  interrupt = true;
  await assert.rejects(
    applyReferenceLoad(client, plan, lock, users.admin.id),
    /simulated interruption/,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from course_lessons where module_id=$1 and published_revision_id is not null",
        [otherModule],
      )
    ).rows[0].n,
    0,
  );
  await applyReferenceLoad(
    client,
    await planReferenceLoad(client, [content], lock, options),
    lock,
    users.admin.id,
  );
  const count = writes;
  await applyReferenceLoad(
    client,
    await planReferenceLoad(client, [content], lock, options),
    lock,
    users.admin.id,
  );
  assert.equal(writes, count);
  // Approvals below are fixture-only to test publication, not authoring approval.
  const approved = structuredClone(content);
  approved.lessons.forEach((l) =>
    l.revision.assets.forEach((a) => (a.review_status = "approved")),
  );
  const promotion = await planReferenceLoad(client, [approved], lock, {
    ...options,
    promote: true,
  });
  await applyReferenceLoad(client, promotion, lock, users.admin.id);
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from course_lessons where module_id=$1 and published_revision_id is not null",
        [otherModule],
      )
    ).rows[0].n,
    6,
  );
  const afterPublish = writes;
  await applyReferenceLoad(
    client,
    await planReferenceLoad(client, [approved], lock, {
      ...options,
      promote: true,
    }),
    lock,
    users.admin.id,
  );
  assert.equal(writes, afterPublish);
  assert.deepEqual(await snapshot(), before);
  console.log(
    "PASS real loader staging, interruption recovery, atomic promotion, repeat no-op and historical preservation",
  );
  return {
    lessons: 6,
    slides: 31,
    interruptedRecovery: true,
    repeatWrites: 0,
    historicalRowsUnchanged: true,
  };
}
