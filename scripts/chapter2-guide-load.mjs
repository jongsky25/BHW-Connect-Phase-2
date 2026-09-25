#!/usr/bin/env node
// Loads the Chapter 2 subchapter-level facilitator guide (one
// course_module_facilitator_notes row per subchapter: whole-subchapter script,
// competency statement, indicators, activity cards). Nothing else is written —
// no lesson revisions, progress, tests or KB. Module identities come from the
// release manifest, and each row must belong to the manifest's course.
//
//   node scripts/chapter2-guide-load.mjs --check                      # local validation only
//   node scripts/chapter2-guide-load.mjs --materialize                # write lesson-derived indicators into competency.json
//   node scripts/chapter2-guide-load.mjs --project <ref>              # dry run against the project
//   node scripts/chapter2-guide-load.mjs --project <ref> --apply      # write
//   ... --modules 01-difficult-situations,04-first-aid                # subset
//
// Env for --project: KB_LOADER_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY),
// KB_LOADER_USERNAME, KB_LOADER_PASSWORD — an admin on that project, the same
// credentials training:load uses.

import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { CHAPTER2_MODULES, loadChapter2ModuleGuide, materializeCompetency, releaseManifestPath } from './lib/chapter2-module-guide.mjs';
import { createClient, projectUrl, requireEnv, signIn } from './lib/supabase-rest.mjs';

function parseArgs(argv) {
  const args = { project: null, apply: false, check: false, materialize: false, modules: CHAPTER2_MODULES };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--check') args.check = true;
    else if (arg === '--materialize') args.materialize = true;
    else if (arg === '--project') args.project = argv[++i];
    else if (arg === '--modules') args.modules = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else throw new Error(`unknown argument ${arg}`);
  }
  const unknown = args.modules.filter((m) => !CHAPTER2_MODULES.includes(m));
  if (unknown.length) throw new Error(`unknown Chapter 2 module(s): ${unknown.join(', ')}`);
  if (args.apply && !args.project) throw new Error('--apply requires --project');
  if (!args.project && !args.check && !args.materialize) throw new Error('use --check, --materialize or --project <ref>');
  return args;
}

// Existing activity cards are snapshotted into session records, so a changed
// card must carry a higher version (same rule as training:load --mode activities).
export function planGuideRow(existing, guide) {
  const payload = {
    notes_fil: guide.notes_fil,
    notes_en: guide.notes_en,
    competency_statement_fil: guide.competency_statement_fil,
    competency_statement_en: guide.competency_statement_en,
    observation_indicators: guide.observation_indicators,
    activities: guide.activities,
  };
  if (!existing) return { action: 'create', payload };
  for (const card of guide.activities) {
    const old = (existing.activities ?? []).find((a) => a.id === card.id);
    if (old && !isDeepStrictEqual(old, card) && card.version <= old.version) {
      throw new Error(`${guide.module_key}: increase activity version before changing ${card.id}`);
    }
  }
  const changed = Object.keys(payload).some((k) => !isDeepStrictEqual(existing[k] ?? null, payload[k]));
  return { action: changed ? 'update' : 'unchanged', payload, id: existing.id };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.materialize) {
    for (const key of args.modules) {
      const { file, content, changed } = materializeCompetency(key);
      if (changed) writeFileSync(file, content);
      console.log(`${key}: competency.json ${changed ? 'updated' : 'unchanged'}`);
    }
  }
  const guides = args.modules.map((key) => loadChapter2ModuleGuide(key));
  for (const g of guides) {
    console.log(`${g.module_key}: ${g.observation_indicators.length} indicators, ${g.activities.length} activity cards, notes ${g.notes_en.split(/\s+/).length}/${g.notes_fil.split(/\s+/).length} words (en/fil)`);
  }
  if (!args.project) return;

  const manifest = JSON.parse(readFileSync(releaseManifestPath, 'utf8'));
  const url = projectUrl(args.project);
  if (manifest.project_id !== args.project) throw new Error(`release manifest is for ${manifest.project_id}, not ${args.project}`);
  const anonKey = process.env.KB_LOADER_ANON_KEY ?? requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const token = await signIn(url, anonKey, requireEnv('KB_LOADER_USERNAME', 'an admin account on the target project'), requireEnv('KB_LOADER_PASSWORD'));
  const client = createClient(url, anonKey, token);

  // Preflight every selected module before any write.
  const plan = [];
  for (const guide of guides) {
    const moduleId = manifest.module_ids[guide.module_key];
    if (!moduleId) throw new Error(`${guide.module_key}: not in the release manifest`);
    const [mod] = await client.get(`course_modules?select=id,course_id&id=eq.${moduleId}`);
    if (!mod || mod.course_id !== manifest.course_id) throw new Error(`${guide.module_key}: reconcile module identity`);
    const [existing] = await client.get(`course_module_facilitator_notes?select=*&module_id=eq.${moduleId}`);
    plan.push({ moduleId, key: guide.module_key, ...planGuideRow(existing, guide) });
  }
  for (const p of plan) console.log(`${p.key}: ${p.action}`);
  if (!args.apply) {
    console.log('Dry run: no writes. Use --apply after reviewing the selection.');
    return;
  }
  for (const p of plan) {
    if (p.action === 'create') await client.insert('course_module_facilitator_notes', [{ ...p.payload, module_id: p.moduleId }]);
    else if (p.action === 'update') await client.patch(`course_module_facilitator_notes?id=eq.${p.id}`, p.payload);
  }
  console.log(`Applied: ${plan.filter((p) => p.action !== 'unchanged').length} row(s) written.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
