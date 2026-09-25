#!/usr/bin/env node
// Puts a BHW account in front of a training course at a chosen lesson density,
// so Module 1 can be reviewed at Detalyado (long) in the real app before
// INC-24's authoring is unblocked (docs/training-modules-plan.md, INC-21r DoD).
//
// This exists because §A.6 density is deliberately NOT a BHW-facing preference
// and INC-23's facilitator density selector has not shipped: the only way to
// render `deep`-tier sections today is an enrolled course_session whose
// lesson_density is 'long', plus the `course_sessions` flag being on. Doing
// that by hand is four RPCs under three different identities, which is exactly
// the kind of step that gets skipped.
//
//   npm run training:review-setup -- --project <ref> --bhw <username>
//   npm run training:review-setup -- --project <ref> --bhw <username> --apply
//   npm run training:review-setup -- --project <ref> --bhw <username> --density normal --apply
//
// Env: KB_LOADER_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY),
//      KB_LOADER_USERNAME / KB_LOADER_PASSWORD       — an admin on that project
//      REVIEW_FACILITATOR_USERNAME / _PASSWORD       — an assessor on that project,
//                                                      unless --create-facilitator
//
// --create-facilitator provisions a throwaway assessor through the real
// rpc_admin_create_user under the admin token already required above, so a
// project with no assessor on it needs exactly one password pasted rather than
// two. It is created in the reviewer's own org unit, which is the one place
// that satisfies both org-scope checks at once: rpc_course_session_create wants
// the course's org unit to be an ancestor of the facilitator's path, and
// rpc_course_session_enroll wants the BHW at or below the facilitator. The
// generated temp password is printed once — nothing stores it. An existing
// username is never taken over this way: rpc_admin_reset_password would lock
// out whoever holds that account, so the script stops and asks instead.
//
// Two identities are genuinely required and cannot be collapsed into one:
// rpc_flag_toggle and rpc_course_set_status demand role='admin', while
// rpc_course_session_create/_enroll/_set_density demand role='assessor'
// (supabase/migrations/20260807000000_inc19_training_sessions.sql). Every write
// goes through those RPCs rather than a direct table write, so the audit trail
// and the org-scope checks are the same ones a real facilitator's browser hits.
//
// Idempotent: re-running reuses the facilitator's existing session for the
// course (adjusting its density in place) and enrollment is ON CONFLICT DO
// NOTHING server-side, so a second --apply changes nothing it has already done.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_COURSE } from "./lib/training-content.mjs";
import { createClient, projectUrl, requireEnv, signIn } from "./lib/supabase-rest.mjs";

const DENSITIES = ["short", "normal", "long"];

function parseArgs(argv) {
  const args = {
    project: null,
    bhw: null,
    course: DEFAULT_COURSE,
    density: "long",
    createFacilitator: null,
    apply: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (arg === "--project") args.project = argv[++i];
    else if (arg === "--bhw") args.bhw = argv[++i];
    else if (arg === "--course") args.course = argv[++i];
    else if (arg === "--density") args.density = argv[++i];
    else if (arg === "--create-facilitator") {
      // Optional value: bare --create-facilitator takes the default username.
      const next = argv[i + 1];
      args.createFacilitator = next && !next.startsWith("--") ? argv[++i] : "review.facilitator";
    }
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.project) throw new Error("--project <supabase-project-ref> is required");
  if (!args.bhw) throw new Error("--bhw <username> is required — the account that will do the review");
  if (!DENSITIES.includes(args.density)) {
    throw new Error(`--density must be one of ${DENSITIES.join(", ")}`);
  }
  return args;
}

// The loader's own lock file is the authority on which course row this content
// tree became on this project — the same mapping training-load.mjs writes.
function courseIdFromLock(course, ref) {
  const lockPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "..",
    "content",
    "training",
    course,
    "locks",
    `${ref}.json`,
  );
  if (!existsSync(lockPath)) {
    throw new Error(
      `no lock file at ${lockPath} — run "npm run training:load -- --project ${ref} --org-unit \"<org unit>\" --apply" first`,
    );
  }
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  if (!lock.course) throw new Error(`${lockPath} has no course id`);
  return lock.course;
}

function plan(apply, description) {
  console.log(`${apply ? "  apply " : "  plan  "} ${description}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = projectUrl(args.project);
  const anonKey =
    process.env.KB_LOADER_ANON_KEY || requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "or KB_LOADER_ANON_KEY");

  const adminUser = requireEnv("KB_LOADER_USERNAME", "an admin on this project");
  const adminPassword = requireEnv("KB_LOADER_PASSWORD");

  // Either an assessor's own credentials, or permission to make one. Asking for
  // both would be asking for a password the project may not have yet.
  if (!args.createFacilitator && !process.env.REVIEW_FACILITATOR_USERNAME) {
    throw new Error(
      "REVIEW_FACILITATOR_USERNAME / REVIEW_FACILITATOR_PASSWORD are required — or pass --create-facilitator to provision a throwaway assessor under the admin token",
    );
  }
  const facilitatorUser = args.createFacilitator ?? process.env.REVIEW_FACILITATOR_USERNAME;
  const facilitatorPassword = args.createFacilitator
    ? null
    : requireEnv("REVIEW_FACILITATOR_PASSWORD");

  const courseId = courseIdFromLock(args.course, args.project);

  console.log(`project     ${args.project}`);
  console.log(`course      ${courseId} (${args.course})`);
  console.log(`density     ${args.density}`);
  console.log(`reviewer    ${args.bhw}`);
  console.log(`mode        ${args.apply ? "APPLY" : "dry run — nothing is written"}`);
  console.log("");

  const admin = createClient(url, anonKey, await signIn(url, anonKey, adminUser, adminPassword));

  // 1. Flags. The course page bails at !flags.elearning before it reads
  //    anything, and reads course_sessions only when that flag is on
  //    (src/app/courses/[id]/page.tsx) — so density stays 'normal' with either
  //    one off, no matter what the session row says.
  const flags = await admin.get("feature_flags?select=key,enabled&key=in.(elearning,course_sessions)");
  for (const key of ["elearning", "course_sessions"]) {
    const flag = flags.find((f) => f.key === key);
    if (!flag) {
      throw new Error(
        `feature flag "${key}" is missing on this project — its migration has not been applied there`,
      );
    }
    if (flag.enabled) {
      console.log(`  ok     flag ${key} already on`);
      continue;
    }
    plan(args.apply, `turn flag ${key} on`);
    if (args.apply) await admin.rpc("rpc_flag_toggle", { p_key: key, p_enabled: true });
  }

  // 2. The course must be published: rpc_course_session_create only accepts a
  //    course whose status is 'published', and the loader leaves it 'draft'
  //    unless it was run with --publish.
  const [course] = await admin.get(`courses?select=id,status,title_fil&id=eq.${courseId}`);
  if (!course) throw new Error(`course ${courseId} not found on ${args.project}`);
  if (course.status === "published") {
    console.log(`  ok     course already published`);
  } else {
    plan(args.apply, `publish course (currently "${course.status}")`);
    if (args.apply) {
      await admin.rpc("rpc_course_set_status", { p_course_id: courseId, p_status: "published" });
    }
  }

  const [reviewer] = await admin.get(
    `users?select=id,username,role,org_unit_id&username=eq.${args.bhw}`,
  );
  if (!reviewer) throw new Error(`no user "${args.bhw}" on this project`);
  if (reviewer.role !== "bhw") {
    throw new Error(
      `user "${args.bhw}" has role "${reviewer.role}" — rpc_course_session_enroll only enrolls a BHW, and only a BHW's own session drives the rendered density`,
    );
  }

  // 3. The facilitator. Provisioned here only when asked for, and only when the
  //    username is free — taking over an existing account would mean resetting
  //    a password someone else may be using.
  let password = facilitatorPassword;
  if (args.createFacilitator) {
    const [claimed] = await admin.get(`users?select=id,username,role&username=eq.${facilitatorUser}`);
    if (claimed) {
      throw new Error(
        `"${facilitatorUser}" already exists on this project (role "${claimed.role}") — pass REVIEW_FACILITATOR_USERNAME/_PASSWORD for it instead, or give --create-facilitator a free username`,
      );
    }
    plan(args.apply, `create assessor "${facilitatorUser}" in ${args.bhw}'s org unit`);
    if (!args.apply) {
      console.log("");
      console.log("Dry run stops here: the remaining steps run as an assessor that does not exist yet.");
      return;
    }
    const [created] = await admin.rpc("rpc_admin_create_user", {
      p_username: facilitatorUser,
      p_full_name: "Review Facilitator",
      p_role: "assessor",
      p_org_unit_id: reviewer.org_unit_id,
    });
    if (!created?.temp_password) {
      throw new Error(`rpc_admin_create_user returned no password: ${JSON.stringify(created)}`);
    }
    password = created.temp_password;
    console.log(`  note   temp password for ${facilitatorUser}: ${password}`);
    console.log("         printed once and stored nowhere — keep it or delete the account when done.");
  }

  // 4. Session + enrollment, as the facilitator. Both RPCs check the actor is
  //    an assessor and that the target is at-or-below their org unit, so a
  //    mis-scoped facilitator fails here rather than silently doing nothing.
  const facilitatorToken = await signIn(url, anonKey, facilitatorUser, password);
  const facilitator = createClient(url, anonKey, facilitatorToken);
  const [me] = await facilitator.get("users?select=id,username,role&username=eq." + facilitatorUser);
  if (!me || me.role !== "assessor") {
    throw new Error(`"${facilitatorUser}" is not an assessor on this project — it cannot run a session`);
  }

  const existing = await facilitator.get(
    `course_sessions?select=id,lesson_density,status&course_id=eq.${courseId}&facilitator_user_id=eq.${me.id}&order=created_at.desc&limit=1`,
  );
  let sessionId = existing[0]?.id ?? null;

  if (!sessionId) {
    plan(args.apply, `create a ${args.density}-density session for this course`);
    if (args.apply) {
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const created = await facilitator.rpc("rpc_course_session_create", {
        p_course_id: courseId,
        p_scheduled_at: scheduledAt,
        p_location_note: "Content review",
        p_lesson_density: args.density,
      });
      sessionId = created?.[0]?.session_id ?? created?.session_id;
      if (!sessionId) throw new Error(`rpc_course_session_create returned no id: ${JSON.stringify(created)}`);
    }
  } else if (existing[0].lesson_density === args.density) {
    console.log(`  ok     session ${sessionId} already at ${args.density}`);
  } else {
    plan(args.apply, `set session ${sessionId} density ${existing[0].lesson_density} -> ${args.density}`);
    if (args.apply) {
      await facilitator.rpc("rpc_course_session_set_density", {
        p_session_id: sessionId,
        p_lesson_density: args.density,
      });
    }
  }

  if (sessionId) {
    const enrolled = await facilitator.get(
      `course_session_enrollments?select=bhw_user_id&session_id=eq.${sessionId}&bhw_user_id=eq.${reviewer.id}`,
    );
    if (enrolled.length > 0) {
      console.log(`  ok     ${args.bhw} already enrolled`);
    } else {
      plan(args.apply, `enroll ${args.bhw} in session ${sessionId}`);
      if (args.apply) {
        await facilitator.rpc("rpc_course_session_enroll", {
          p_session_id: sessionId,
          p_bhw_user_id: reviewer.id,
        });
      }
    }
  }

  console.log("");
  if (!args.apply) {
    console.log("Dry run. Re-run with --apply to write.");
    return;
  }
  console.log(`Done. Sign in as ${args.bhw} and open /courses — Module 1 renders at ${args.density}.`);
  if (args.density === "long") {
    console.log('At Detalyado you should now also see "Ang BHW sa pagpaplano ng barangay"');
    console.log('and "Mali at tama: \\"Hindi ko naman trabaho \'yan\\"" — the two deep-tier sections.');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
