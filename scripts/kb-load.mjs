#!/usr/bin/env node
// Loads the HHP+ / PhilPEN community NCD screening corpus into a Supabase
// project through the same RPCs the admin console calls, so audit events and
// the kb.entry_* trail are written exactly as if a human had authored it.
//
//   npm run kb:load -- --project <ref>                       # dry run (default)
//   npm run kb:load -- --project <ref> --apply               # write as drafts
//   npm run kb:load -- --project <ref> --apply --publish --owner <username>
//   npm run kb:load -- --project <ref> --modules 3,4 --apply
//
// Env: KB_LOADER_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY),
//      KB_LOADER_USERNAME, KB_LOADER_PASSWORD — an admin account on that project.
//
// There is no default --project. Publishing makes entries visible to every BHW
// app-wide (kb_entries has no org scoping and no feature flag), so the target
// is always named explicitly. `npm run kb:unpublish` is the way back.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CONTENT_DIR, loadContent, renderAnswer, reviewDueOn } from "./lib/kb-content.mjs";
import { markdownToTiptap } from "./lib/md-to-tiptap.mjs";
import { createClient, projectUrl, requireEnv, selectAll, signIn } from "./lib/supabase-rest.mjs";

function parseArgs(argv) {
  const args = { modules: null, apply: false, publish: false, owner: null, project: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (arg === "--publish") args.publish = true;
    else if (arg === "--owner") args.owner = argv[++i];
    else if (arg === "--project") args.project = argv[++i];
    else if (arg === "--modules") args.modules = argv[++i].split(",").map((m) => Number(m.trim()));
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.project) throw new Error("--project <supabase-project-ref> is required");
  if (args.publish && !args.owner) {
    throw new Error("--publish requires --owner <username>: kb_entries_publish_requires_owner");
  }
  return args;
}

function lockPath(ref) {
  return path.join(CONTENT_DIR, "locks", `${ref}.json`);
}

function readLock(ref) {
  const file = lockPath(ref);
  if (!existsSync(file)) return { categories: {}, entries: {}, articles: {} };
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeLock(ref, lock) {
  const file = lockPath(ref);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(lock, null, 2)}\n`);
}

async function resolveOwner(client, username) {
  const rows = await client.get(
    `users?select=id,role,status&username=eq.${encodeURIComponent(username)}`,
  );
  if (rows.length === 0) throw new Error(`no user named ${username} on this project`);
  if (rows[0].role !== "admin") throw new Error(`${username} is ${rows[0].role}, not admin`);
  return rows[0].id;
}

async function syncCategories(client, categories, lock, plan, apply) {
  const existing = await selectAll(client, "kb_categories", "id,slug");
  const bySlug = new Map(existing.map((row) => [row.slug, row.id]));

  for (const category of categories) {
    const found = bySlug.get(category.slug);
    if (found) {
      lock.categories[category.slug] = found;
      plan.categories.skip += 1;
      continue;
    }
    plan.categories.create += 1;
    if (!apply) continue;
    const [row] = await client.insert("kb_categories", [
      {
        slug: category.slug,
        name_en: category.name_en,
        name_fil: category.name_fil,
        sort_order: category.sort_order,
      },
    ]);
    lock.categories[category.slug] = row.id;
    bySlug.set(category.slug, row.id);
  }
  return lock.categories;
}

async function syncSynonyms(client, synonyms, plan, apply) {
  const existing = await selectAll(client, "synonyms", "id,term,maps_to,language");
  const seen = new Set(existing.map((row) => `${row.term}|${row.maps_to}|${row.language}`));
  const missing = synonyms.filter(
    (row) => !seen.has(`${row.term}|${row.maps_to}|${row.language}`),
  );
  plan.synonyms.create = missing.length;
  plan.synonyms.skip = synonyms.length - missing.length;
  if (apply && missing.length > 0) {
    // synonyms has no unique constraint, so this is a plain insert of the diff.
    await client.insert("synonyms", missing);
  }
}

async function syncEntries(client, content, ctx, plan) {
  const { sources } = content;
  const { categoryIds, lock, apply, publish, ownerId, modules } = ctx;

  // Fallback key for a lost lockfile: kb_entries has no natural unique column.
  const existing = await selectAll(client, "kb_entries", "id,question_en");
  const byQuestion = new Map(existing.map((row) => [row.question_en, row.id]));
  const knownIds = new Set(existing.map((row) => row.id));

  for (const entry of content.entries) {
    const moduleNumber = Number(entry.file.match(/module-(\d+)/)[1]);
    if (modules && !modules.includes(moduleNumber)) continue;

    const answerEn = renderAnswer(entry, sources, "en");
    const answerFil = renderAnswer(entry, sources, "fil");
    const status = publish && entry.tier === "cited" ? "published" : "draft";
    const owner = ownerId ?? null;
    if (status === "draft" && entry.tier === "pending") plan.entries.pendingDrafts += 1;

    let entryId = lock.entries[entry.id];
    if (entryId && !knownIds.has(entryId)) entryId = undefined; // lock is stale
    if (!entryId) entryId = byQuestion.get(entry.question_en);

    if (entryId) {
      plan.entries.update += 1;
      if (!apply) continue;
      await client.rpc("rpc_kb_entry_update", {
        p_id: entryId,
        p_category_id: categoryIds[entry.category],
        p_question_fil: entry.question_fil,
        p_question_en: entry.question_en,
        p_answer_fil: answerFil,
        p_answer_en: answerEn,
        p_keywords: entry.keywords,
        p_image_url: null,
        p_owner_user_id: owner,
        p_review_due_on: reviewDueOn(entry),
        p_status: status,
      });
    } else {
      plan.entries.create += 1;
      if (!apply) continue;
      const [row] = await client.rpc("rpc_kb_entry_create", {
        p_category_id: categoryIds[entry.category],
        p_question_fil: entry.question_fil,
        p_question_en: entry.question_en,
        p_answer_fil: answerFil,
        p_answer_en: answerEn,
        p_keywords: entry.keywords,
        p_image_url: null,
        p_owner_user_id: owner,
        p_review_due_on: reviewDueOn(entry),
        p_status: status,
      });
      entryId = row.entry_id;
    }
    if (entryId) lock.entries[entry.id] = entryId;
  }
}

async function syncArticles(client, content, ctx, plan) {
  const { categoryIds, lock, apply, publish, ownerId, modules } = ctx;
  const existing = await selectAll(client, "kb_articles", "id,title_en");
  const byTitle = new Map(existing.map((row) => [row.title_en, row.id]));
  const knownIds = new Set(existing.map((row) => row.id));

  for (const article of content.articles) {
    const moduleNumber = Number(article.file_en.match(/module-(\d+)/)[1]);
    if (modules && !modules.includes(moduleNumber)) continue;

    const bodyEn = markdownToTiptap(article.body_en, article.file_en);
    const bodyFil = markdownToTiptap(article.body_fil, article.file_fil);
    const status = publish ? "published" : "draft";

    let articleId = lock.articles[article.id];
    if (articleId && !knownIds.has(articleId)) articleId = undefined;
    if (!articleId) articleId = byTitle.get(article.title_en);

    if (articleId) {
      plan.articles.update += 1;
      if (!apply) continue;
      await client.rpc("rpc_kb_article_update", {
        p_id: articleId,
        p_category_id: categoryIds[article.category],
        p_title_fil: article.title_fil,
        p_title_en: article.title_en,
        p_body_fil: bodyFil,
        p_body_en: bodyEn,
        p_owner_user_id: ownerId ?? null,
        p_review_due_on: reviewDueOn(article),
        p_status: status,
      });
    } else {
      plan.articles.create += 1;
      if (!apply) continue;
      const [row] = await client.rpc("rpc_kb_article_create", {
        p_category_id: categoryIds[article.category],
        p_title_fil: article.title_fil,
        p_title_en: article.title_en,
        p_body_fil: bodyFil,
        p_body_en: bodyEn,
        p_owner_user_id: ownerId ?? null,
        p_review_due_on: reviewDueOn(article),
        p_status: status,
      });
      articleId = row.article_id;
    }
    if (articleId) lock.articles[article.id] = articleId;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const content = loadContent();

  const url = projectUrl(args.project);
  const anonKey = process.env.KB_LOADER_ANON_KEY ?? requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const token = await signIn(
    url,
    anonKey,
    requireEnv("KB_LOADER_USERNAME", "an admin account on the target project"),
    requireEnv("KB_LOADER_PASSWORD"),
  );
  const client = createClient(url, anonKey, token);

  const ownerId = args.owner ? await resolveOwner(client, args.owner) : null;
  const lock = readLock(args.project);
  const plan = {
    categories: { create: 0, skip: 0 },
    synonyms: { create: 0, skip: 0 },
    entries: { create: 0, update: 0, pendingDrafts: 0 },
    articles: { create: 0, update: 0 },
  };

  const categoryIds = await syncCategories(client, content.categories, lock, plan, args.apply);
  await syncSynonyms(client, content.synonyms, plan, args.apply);
  const ctx = {
    categoryIds,
    lock,
    apply: args.apply,
    publish: args.publish,
    ownerId,
    modules: args.modules,
  };
  await syncEntries(client, content, ctx, plan);
  await syncArticles(client, content, ctx, plan);

  if (args.apply) writeLock(args.project, lock);

  const mode = args.apply ? (args.publish ? "APPLY + PUBLISH" : "APPLY (drafts)") : "DRY RUN";
  console.log(`\n${mode} — project ${args.project}`);
  console.log(`  categories  create ${plan.categories.create}  existing ${plan.categories.skip}`);
  console.log(`  synonyms    create ${plan.synonyms.create}  existing ${plan.synonyms.skip}`);
  console.log(`  entries     create ${plan.entries.create}  update ${plan.entries.update}`);
  console.log(`  articles    create ${plan.articles.create}  update ${plan.articles.update}`);
  if (args.publish) {
    console.log(
      `  ${plan.entries.pendingDrafts} entries held as drafts pending BLHSD–WHO validation`,
    );
  }
  if (!args.apply) console.log("\n  nothing was written — re-run with --apply\n");
}

main().catch((error) => {
  console.error(`\nkb:load failed — ${error.message}\n`);
  process.exit(1);
});
