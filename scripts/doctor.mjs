#!/usr/bin/env node
// Credential preflight. Answers, in one screen, the question that otherwise
// costs a session an hour of discovery: which credentials does this project
// use, which of them are present *here*, and where does each one permanently
// live so it never has to be pasted into a session again.
//
//   npm run doctor            # full register
//   npm run doctor -- --brief # one line per missing item (SessionStart hook)
//
// It never prints a secret's value — only whether it is set, and its length,
// which is enough to catch a truncated paste without leaking anything.
//
// The register below is the source of truth for docs/credentials.md. When a
// new secret enters the project, add it here first: a secret this file does
// not know about is a secret the next session will rediscover the hard way.

const STORES = {
  claudeEnv: {
    label: "Claude Code environment variables",
    where:
      "claude.ai/code -> Settings -> Environments -> (this environment) -> Environment variables",
    why: "Injected into every web session, so the agent has it without being asked.",
  },
  githubSecrets: {
    label: "GitHub Actions secrets",
    where: "github.com/jongsky25/BHW-Connect-Phase-2 -> Settings -> Secrets and variables -> Actions",
    why: "Read by workflows in .github/workflows/. Never available to the running app.",
  },
  vercel: {
    label: "Vercel project environment variables",
    where: "vercel.com -> (project) -> Settings -> Environment Variables",
    why: "Read at request time by the deployed app.",
  },
  localOnly: {
    label: "Local .env.local only",
    where: "cp .env.example .env.local",
    why: "Developer-machine convenience; not needed in web sessions or CI.",
  },
};

// consumers: what actually breaks when this is missing.
const REGISTER = [
  {
    name: "KB_LOADER_USERNAME",
    store: "claudeEnv",
    secret: false,
    value: "training.loader",
    consumers: ["training:load", "training:review-setup", "kb:load", "kb:unpublish"],
    blocks: "Every content load to the pilot, dry runs included.",
  },
  {
    name: "KB_LOADER_PASSWORD",
    store: "claudeEnv",
    secret: true,
    alsoIn: ["githubSecrets"],
    consumers: ["training:load", "training:review-setup", "kb:load", "kb:unpublish"],
    blocks:
      "Every content load to the pilot, dry runs included — the loader signs in before it plans.",
  },
  {
    name: "KB_LOADER_ANON_KEY",
    store: "claudeEnv",
    secret: false,
    fallback: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    consumers: ["training:load", "training:review-setup", "kb:load", "kb:unpublish"],
    blocks: "The loaders, if NEXT_PUBLIC_SUPABASE_ANON_KEY is not set either.",
    note: "Public by design — it ships in the browser bundle. Safe to paste anywhere.",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    store: "claudeEnv",
    secret: false,
    alsoIn: ["githubSecrets", "vercel"],
    consumers: ["the app", "retention-purge.yml", "backup.yml"],
    blocks: "Running the app locally.",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    store: "claudeEnv",
    secret: false,
    alsoIn: ["vercel"],
    consumers: ["the app", "the loaders (as KB_LOADER_ANON_KEY's fallback)"],
    blocks: "Running the app locally.",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    store: "githubSecrets",
    secret: true,
    sessionRefuses: true,
    consumers: ["retention-purge.yml", "backup.yml"],
    blocks: "The scheduled purge and backup jobs.",
    note: "Refused inside a session by the sandbox. Do not put it in the Claude environment — it belongs only in GitHub Actions.",
  },
  {
    name: "SUPABASE_DB_URL",
    store: "githubSecrets",
    secret: true,
    consumers: ["backup.yml"],
    blocks: "The weekly backup job.",
  },
  {
    name: "GEMINI_API_KEY",
    store: "vercel",
    secret: true,
    optional: true,
    consumers: ["the deployed app's AI features"],
    blocks: "Nothing — every AI feature falls back to its rule-based baseline.",
  },
  {
    name: "GEMINI_MODEL",
    store: "vercel",
    secret: false,
    optional: true,
    consumers: ["the deployed app's AI features"],
    blocks: "Nothing — defaults to gemini-3.6-flash.",
  },
  {
    name: "E2E_STABLE_BHW_PASSWORD",
    store: "githubSecrets",
    secret: true,
    alsoIn: ["localOnly"],
    consumers: ["ci.yml", "e2e/auth.spec.ts"],
    blocks: "Running the E2E suite locally. CI has its own copy.",
  },
  {
    name: "E2E_STABLE_ADMIN_PASSWORD",
    store: "githubSecrets",
    secret: true,
    alsoIn: ["localOnly"],
    consumers: ["ci.yml", "e2e/auth.spec.ts"],
    blocks: "Running the E2E suite locally. CI has its own copy.",
  },
  {
    name: "E2E_OTHER_BARANGAY_BHW_PASSWORD",
    store: "githubSecrets",
    secret: true,
    alsoIn: ["localOnly"],
    consumers: ["ci.yml", "e2e/auth.spec.ts"],
    blocks: "Running the E2E suite locally. CI has its own copy.",
  },
  {
    name: "E2E_STABLE_CITY_ADMIN_PASSWORD",
    store: "githubSecrets",
    secret: true,
    alsoIn: ["localOnly"],
    consumers: ["ci.yml", "e2e/dashboard.spec.ts"],
    blocks: "Running the E2E suite locally. CI has its own copy.",
  },
  {
    name: "SENTRY_AUTH_TOKEN",
    store: "githubSecrets",
    secret: true,
    optional: true,
    consumers: ["ci.yml source-map upload"],
    blocks: "Nothing — source maps just are not uploaded.",
  },
];

// Only these matter for a session to be able to do pilot work unattended.
const SESSION_CRITICAL = new Set([
  "KB_LOADER_USERNAME",
  "KB_LOADER_PASSWORD",
  "KB_LOADER_ANON_KEY",
]);

function resolve(entry) {
  const direct = process.env[entry.name];
  if (direct) return { set: true, via: entry.name, length: direct.length };
  if (entry.fallback && process.env[entry.fallback]) {
    return { set: true, via: entry.fallback, length: process.env[entry.fallback].length };
  }
  return { set: false };
}

function brief() {
  const missing = REGISTER.filter(
    (e) => SESSION_CRITICAL.has(e.name) && !resolve(e).set,
  );
  if (missing.length === 0) {
    console.log("credentials: pilot loader credentials present — training:load can run here.");
    return 0;
  }
  console.log(
    `credentials: ${missing.length} of ${SESSION_CRITICAL.size} pilot loader credentials missing (${missing
      .map((e) => e.name)
      .join(", ")}).`,
  );
  console.log(
    "  Content loads to the pilot cannot run from this session. Two ways out, in order of preference:",
  );
  console.log(
    "    1. Run the 'Training content load' workflow in GitHub Actions — it holds the password as a repo secret.",
  );
  console.log(
    "    2. Set them permanently: claude.ai/code -> Settings -> Environments -> Environment variables.",
  );
  console.log("  See docs/credentials.md. Do not ask for a password to paste into the session.");
  return 0;
}

function full() {
  const width = Math.max(...REGISTER.map((e) => e.name.length));
  let missingCritical = 0;

  console.log("\n  BHW Connect — credential register\n");
  console.log("  Every value below has exactly one permanent home. If you are being");
  console.log("  asked for one in a session, it is missing from its home.\n");

  for (const [key, store] of Object.entries(STORES)) {
    const entries = REGISTER.filter((e) => e.store === key);
    if (entries.length === 0) continue;

    console.log(`  ${store.label}`);
    console.log(`    ${store.where}`);
    console.log(`    ${store.why}\n`);

    for (const entry of entries) {
      const state = resolve(entry);
      const critical = SESSION_CRITICAL.has(entry.name);
      if (critical && !state.set) missingCritical += 1;

      let mark;
      if (state.set) mark = "set ";
      else if (critical) mark = "MISS";
      else if (entry.optional) mark = "opt ";
      else mark = "--  ";

      let detail;
      if (state.set) {
        detail =
          state.via === entry.name
            ? `present (${state.length} chars)`
            : `present via ${state.via} (${state.length} chars)`;
      } else {
        detail = "not set here";
      }

      console.log(`    [${mark}] ${entry.name.padEnd(width)}  ${detail}`);
      if (entry.value) console.log(`           ${" ".repeat(width)}  value: ${entry.value}`);
      console.log(`           ${" ".repeat(width)}  used by: ${entry.consumers.join(", ")}`);
      console.log(`           ${" ".repeat(width)}  missing blocks: ${entry.blocks}`);
      if (entry.alsoIn) {
        console.log(
          `           ${" ".repeat(width)}  also needed in: ${entry.alsoIn
            .map((s) => STORES[s].label)
            .join(", ")}`,
        );
      }
      if (entry.note) console.log(`           ${" ".repeat(width)}  note: ${entry.note}`);
      console.log("");
    }
  }

  if (missingCritical > 0) {
    console.log("  ---\n");
    console.log(`  ${missingCritical} pilot loader credential(s) missing from this session.`);
    console.log("  Content loads cannot run here. Prefer the GitHub Actions route:\n");
    console.log("    Actions -> Training content load -> Run workflow\n");
    console.log("  To make sessions self-sufficient instead, set the three KB_LOADER_* values");
    console.log("  as Claude Code environment variables — see docs/credentials.md.\n");
  } else {
    console.log("  ---\n  All pilot loader credentials present. training:load can run here.\n");
  }
  return 0;
}

const isBrief = process.argv.includes("--brief");
process.exit(isBrief ? brief() : full());
