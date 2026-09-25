// Disposable loopback app/REST rehearsal. Auth endpoints are a signed fixture
// adapter, not Supabase Auth; PostgREST, PostgreSQL RLS and app code are real.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const source = fileURLToPath(new URL("../../", import.meta.url));
const pgPath = createRequire(import.meta.url).resolve(
  process.env.PG_TEST_MODULE || "pg",
);
const binary = process.env.POSTGREST_TEST_BINARY;
if (!binary)
  throw new Error("Set POSTGREST_TEST_BINARY to a local PostgREST executable");
const { default: pg } = await import(pathToFileURL(pgPath));
const config = { host: "127.0.0.1", port: 55432, user: "postgres" };
const database = "bhw_reference_app_" + Date.now(),
  secret = crypto.randomBytes(48).toString("hex"),
  out = path.join(source, "test-results/local-reference-app");
fs.mkdirSync(out, { recursive: true });
const admin = new pg.Client({ ...config, database: "postgres" });
await admin.connect();
await admin.query("create database " + database);
await admin.end();
const db = new pg.Client({ ...config, database });
await db.connect();
let platform = fs.readFileSync(
  path.join(source, "scripts/tests/training-foundation-platform.sql"),
  "utf8",
);
for (const role of ["anon", "authenticated", "service_role"])
  if (
    (await db.query("select 1 from pg_roles where rolname=$1", [role])).rowCount
  )
    platform = platform.replace(
      new RegExp("create role " + role + "[^;]*;"),
      "",
    );
await db.query(platform);
if (
  !(
    await db.query(
      "select 1 from pg_roles where rolname='bhw_local_authenticator'",
    )
  ).rowCount
)
  await db.query("create role bhw_local_authenticator login noinherit");
await db.query("grant anon,authenticated to bhw_local_authenticator");
for (const file of fs
  .readdirSync(path.join(source, "supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort())
  await db.query(
    fs.readFileSync(path.join(source, "supabase/migrations", file), "utf8"),
  );
await db.query(`create or replace function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role') $$;`);
const { seedLegacy } = await import(
  pathToFileURL(
    path.join(source, "scripts/tests/training-foundation-scenarios.mjs"),
  )
);
const fixture = await seedLegacy(db);
await db.query(
  "update users set must_change_password=false,consented_at=now(),onboarding_completed_at=now()",
);
await db.query(
  "update feature_flags set enabled=key in ('elearning','course_sessions')",
);
await db.query(
  "update course_modules set lesson=null,body_fil='Orihinal na aralin para sa Kabanata I.',body_en='Original Chapter I lesson.' where id=$1",
  [fixture.otherModule],
);
const generic = crypto.randomUUID();
await db.query(
  "insert into courses(id,org_unit_id,author_user_id,title_fil,title_en,status) values($1,$2,$3,'Karaniwang kurso','Generic course','published')",
  [generic, fixture.org.city, fixture.users.admin.id],
);
await db.query(
  "insert into course_modules(course_id,position,type,title_fil,title_en,body_fil,body_en) values($1,0,'text','Karaniwang aralin','Generic lesson','Orihinal na reader.','Original reader.')",
  [generic],
);
const sign = (payload) => {
  const data =
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ) +
    "." +
    Buffer.from(
      JSON.stringify({
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 28800,
      }),
    ).toString("base64url");
  return (
    data +
    "." +
    crypto.createHmac("sha256", secret).update(data).digest("base64url")
  );
};
const userFor = (name) => ({
  id: fixture.users[name].auth,
  aud: "authenticated",
  role: "authenticated",
  email: name + "@bhw.local",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: new Date().toISOString(),
});
const tokens = Object.fromEntries(
  Object.keys(fixture.users).map((name) => [
    name,
    sign({
      sub: fixture.users[name].auth,
      role: "authenticated",
      aud: "authenticated",
    }),
  ]),
);
const anon = sign({ role: "anon" }),
  api = "http://127.0.0.1:55434";
fs.writeFileSync(
  path.join(out, "postgrest.conf"),
  `db-uri = "postgres://bhw_local_authenticator@127.0.0.1:55432/${database}"\ndb-schemas = "public"\ndb-anon-role = "anon"\njwt-secret = "${secret}"\nserver-host = "127.0.0.1"\nserver-port = 55433\n`,
);
const dll = process.env.POSTGREST_TEST_DLL_PATH;
const postgrest = spawn(binary, [path.join(out, "postgrest.conf")], {
  windowsHide: true,
  env: {
    ...process.env,
    PATH: dll ? dll + path.delimiter + process.env.PATH : process.env.PATH,
  },
  stdio: [
    "ignore",
    fs.openSync(path.join(out, "rest.log"), "w"),
    fs.openSync(path.join(out, "rest-errors.log"), "w"),
  ],
});
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:4175");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization,apikey,content-type,x-client-info,prefer,accept-profile,content-profile",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS",
  );
  res.setHeader("Access-Control-Expose-Headers", "content-range");
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }
  const url = new URL(req.url, api);
  try {
    if (url.pathname.startsWith("/rest/v1/")) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks);
      const headers = { ...req.headers };
      delete headers.host;
      delete headers["content-length"];
      const upstream = await fetch(
        "http://127.0.0.1:55433" +
          url.pathname.slice("/rest/v1".length) +
          url.search,
        { method: req.method, headers, body: body.length ? body : undefined },
      );
      for (const [k, v] of upstream.headers)
        if (
          ![
            "content-length",
            "content-encoding",
            "transfer-encoding",
            "connection",
          ].includes(k)
        )
          res.setHeader(k, v);
      res
        .writeHead(upstream.status)
        .end(Buffer.from(await upstream.arrayBuffer()));
      return;
    }
    const name = Object.keys(tokens).find(
      (k) => "Bearer " + tokens[k] === req.headers.authorization,
    );
    if (url.pathname === "/auth/v1/user" && name) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(userFor(name)));
      return;
    }
    if (url.pathname === "/auth/v1/logout") {
      res.writeHead(204).end();
      return;
    }
    res
      .writeHead(401, { "Content-Type": "application/json" })
      .end(JSON.stringify({ message: "Local fixture token required" }));
  } catch (e) {
    res.writeHead(500).end(e.message);
  }
});
await new Promise((resolve) => server.listen(55434, "127.0.0.1", resolve));
for (let i = 0; i < 40; i++) {
  try {
    const r = await fetch(api + "/rest/v1/courses?select=id", {
      headers: { Authorization: "Bearer " + tokens.admin },
    });
    if (r.ok) break;
    if (i === 39) throw new Error(await r.text());
  } catch (e) {
    if (i === 39) throw e;
  }
  await new Promise((r) => setTimeout(r, 250));
}
const { createClient } = await import(
  pathToFileURL(path.join(source, "scripts/lib/supabase-rest.mjs"))
);
const { loadReferenceModule } = await import(
  pathToFileURL(path.join(source, "scripts/lib/reference-content.mjs"))
);
const { stageReferenceHierarchy, planReferenceLoad, applyReferenceLoad } =
  await import(
    pathToFileURL(path.join(source, "scripts/lib/reference-load.mjs"))
  );
const client = createClient(api, anon, tokens.admin),
  lock = {
    course: fixture.course,
    modules: { "01-tungkulin-ng-bhw": fixture.module },
  };
const program = JSON.parse(
  fs.readFileSync(
    path.join(source, "content/training/day1-basic-competencies/program.json"),
  ),
);
await stageReferenceHierarchy(client, program, lock, {
  orgUnitId: fixture.org.city,
  authorUserId: fixture.users.admin.id,
  apply: true,
});
const content = loadReferenceModule(
  path.join(
    source,
    "content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw",
  ),
  path.join(source, "public"),
);
// Review override exists in this disposable fixture only; source assets stay draft.
content.lessons.forEach((l) =>
  l.revision.assets.forEach((a) => (a.review_status = "approved")),
);
await applyReferenceLoad(
  client,
  await planReferenceLoad(client, [content], lock, {
    orgUnitId: fixture.org.city,
    promote: true,
  }),
  lock,
  fixture.users.admin.id,
);
await client.patch("training_program_chapters?course_id=eq." + fixture.course, {
  availability: "available",
});
await client.patch("training_programs?id=eq." + lock.program, {
  status: "published",
});
const before = await client.get(
  "course_lessons?select=id,published_revision_id&module_id=eq." +
    fixture.module,
);
await applyReferenceLoad(
  client,
  await planReferenceLoad(client, [content], lock, {
    orgUnitId: fixture.org.city,
    promote: true,
  }),
  lock,
  fixture.users.admin.id,
);
const after = await client.get(
  "course_lessons?select=id,published_revision_id&module_id=eq." +
    fixture.module,
);
if (JSON.stringify(before) !== JSON.stringify(after))
  throw new Error("REST rerun changed identities");
const session = (name) => ({
  access_token: tokens[name],
  refresh_token: "local-fixture-" + name,
  token_type: "bearer",
  expires_in: 28800,
  expires_at: Math.floor(Date.now() / 1000) + 28800,
  user: userFor(name),
});
fs.writeFileSync(
  path.join(out, "fixture.json"),
  JSON.stringify(
    {
      database,
      api,
      anon,
      fixture,
      generic,
      lock,
      tokens,
      sessions: Object.fromEntries(
        Object.keys(tokens).map((n) => [n, session(n)]),
      ),
    },
    null,
    2,
  ),
);
fs.writeFileSync(
  path.join(out, "next.env"),
  `NEXT_PUBLIC_SUPABASE_URL=${api}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}\nNEXT_TELEMETRY_DISABLED=1\n`,
);
await db.end();
console.log(
  "Ready: disposable PostgreSQL + PostgREST + fixture Auth at " +
    api +
    "; database " +
    database,
);
const close = () => {
  server.close();
  postgrest.kill();
};
process.on("SIGINT", () => {
  close();
  process.exit();
});
process.on("SIGTERM", () => {
  close();
  process.exit();
});
