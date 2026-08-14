#!/usr/bin/env node
// The kill switch for loaded KB content. kb_entries is neither hierarchy-scoped
// nor behind a feature flag, so setting status back to 'draft' is the only way
// to pull published content out of every BHW's view. Entries are not deleted —
// they stay in the admin console, and `npm run kb:load ... --publish` puts them
// back.
//
//   npm run kb:unpublish -- --project <ref> --category "hhp-*"        # dry run
//   npm run kb:unpublish -- --project <ref> --category "hhp-*" --apply

import { createClient, projectUrl, requireEnv, selectAll, signIn } from "./lib/supabase-rest.mjs";

function parseArgs(argv) {
  const args = { project: null, category: null, apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (arg === "--project") args.project = argv[++i];
    else if (arg === "--category") args.category = argv[++i];
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.project) throw new Error("--project <supabase-project-ref> is required");
  if (!args.category) throw new Error('--category <slug or glob, e.g. "hhp-*"> is required');
  return args;
}

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = projectUrl(args.project);
  const anonKey = process.env.KB_LOADER_ANON_KEY ?? requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const token = await signIn(
    url,
    anonKey,
    requireEnv("KB_LOADER_USERNAME", "an admin account on the target project"),
    requireEnv("KB_LOADER_PASSWORD"),
  );
  const client = createClient(url, anonKey, token);

  const pattern = globToRegExp(args.category);
  const categories = (await selectAll(client, "kb_categories", "id,slug")).filter((row) =>
    pattern.test(row.slug),
  );
  if (categories.length === 0) throw new Error(`no categories matched ${args.category}`);
  const categoryIds = new Set(categories.map((row) => row.id));

  const entries = (
    await selectAll(
      client,
      "kb_entries",
      "id,category_id,question_fil,question_en,answer_fil,answer_en,keywords,image_url,owner_user_id,review_due_on,status",
    )
  ).filter((row) => categoryIds.has(row.category_id) && row.status === "published");

  const articles = (
    await selectAll(
      client,
      "kb_articles",
      "id,category_id,title_fil,title_en,body_fil,body_en,owner_user_id,review_due_on,status",
    )
  ).filter((row) => categoryIds.has(row.category_id) && row.status === "published");

  console.log(
    `\n${args.apply ? "APPLY" : "DRY RUN"} — unpublishing ${entries.length} entries and ${articles.length} articles`,
  );
  console.log(`  categories: ${categories.map((c) => c.slug).join(", ")}`);

  if (!args.apply) {
    console.log("\n  nothing was written — re-run with --apply\n");
    return;
  }

  // rpc_kb_entry_update is a full replace, so every current value is passed
  // back unchanged except status.
  for (const row of entries) {
    await client.rpc("rpc_kb_entry_update", {
      p_id: row.id,
      p_category_id: row.category_id,
      p_question_fil: row.question_fil,
      p_question_en: row.question_en,
      p_answer_fil: row.answer_fil,
      p_answer_en: row.answer_en,
      p_keywords: row.keywords,
      p_image_url: row.image_url,
      p_owner_user_id: row.owner_user_id,
      p_review_due_on: row.review_due_on,
      p_status: "draft",
    });
  }
  for (const row of articles) {
    await client.rpc("rpc_kb_article_update", {
      p_id: row.id,
      p_category_id: row.category_id,
      p_title_fil: row.title_fil,
      p_title_en: row.title_en,
      p_body_fil: row.body_fil,
      p_body_en: row.body_en,
      p_owner_user_id: row.owner_user_id,
      p_review_due_on: row.review_due_on,
      p_status: "draft",
    });
  }
  console.log("\n  done — content is back to draft and invisible to BHWs\n");
}

main().catch((error) => {
  console.error(`\nkb:unpublish failed — ${error.message}\n`);
  process.exit(1);
});
