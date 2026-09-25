// Provider-agnostic orchestration for scripts/tts-render.mjs, factored out
// so it's testable with fake transports (tts-render-core.test.mjs) — the
// same reason INC-18a's ProviderTransport is dependency-injected rather
// than hardwired. Nothing here makes a network call or touches Supabase
// directly; every I/O boundary is a parameter.

import { createHash } from "node:crypto";
import { buildNarrationZones } from "./narration-zones.mjs";

export const VOICES = { fil: "fil-PH-BlessicaNeural", en: "en-US-JennyNeural" };

// sha256 of the exact narrated text (in order) + the voice name, so a
// re-run skips a section whose authored text hasn't changed since it was
// last rendered — "does not re-bill for unchanged text" (INC-27 DoD).
// Changing the voice is deliberately also a cache-buster: a different
// voice is a different audio file even over identical text.
export function computeContentHash(zones, voice) {
  return createHash("sha256")
    .update(JSON.stringify(zones))
    .update("\u0000")
    .update(voice)
    .digest("hex");
}

/**
 * @param {Array} modules - loadTrainingCourse(...).modules (or a filtered subset)
 * @param {Map<string, {id: string, content_hash: string}>} existingAudioByKey
 *   keyed by `${moduleContentId}:${sectionIndex}:${language}`
 */
export function buildRenderPlan(modules, existingAudioByKey, voices = VOICES) {
  const items = [];
  for (const mod of modules) {
    const sections = mod.lesson?.sections ?? [];
    sections.forEach((section, sectionIndex) => {
      for (const language of /** @type {const} */ (["fil", "en"])) {
        const heading = language === "en" ? section.heading_en : section.heading_fil;
        const body = language === "en" ? section.body_en : section.body_fil;
        const takeaway = language === "en" ? section.takeaway_en : section.takeaway_fil;
        const zones = buildNarrationZones({ heading, body, takeaway });
        if (zones.length === 0) continue; // nothing to narrate for this section/language

        const voice = voices[language];
        const contentHash = computeContentHash(zones, voice);
        const key = `${mod.id}:${sectionIndex}:${language}`;
        const existing = existingAudioByKey.get(key);
        const action = !existing ? "create" : existing.content_hash === contentHash ? "skip" : "update";
        const charCount = zones.reduce((sum, zone) => sum + zone.text.length, 0);

        items.push({
          moduleContentId: mod.id,
          sectionIndex,
          language,
          zones,
          voice,
          contentHash,
          action,
          existingId: existing?.id ?? null,
          charCount,
        });
      }
    });
  }
  return items;
}

export function summarizePlan(items) {
  const summary = { create: 0, update: 0, skip: 0 };
  for (const item of items) summary[item.action] += 1;
  return summary;
}

// Only create/update items would actually call a provider; skipped ones
// cost nothing. This is what "confirm against the real authored text
// rather than this estimate, and record the actual figure" (the plan's own
// cost-check requirement) is checked against before a real --apply run.
export function estimateCharBudget(items) {
  return items
    .filter((item) => item.action !== "skip")
    .reduce((sum, item) => sum + item.charCount, 0);
}

// Tries Azure first (when configured), falls back to edge-tts on any
// failure — logging which happened via onFallback, since INC-18b's own
// postmortem is exactly about a provider failure that degraded silently.
// Only Azure's charCount counts against the paid-adjacent free tier;
// edge-tts is unmetered, so the caller can tell which happened from the
// returned `provider` field.
export function createProviderChain({ synthesizeAzure, synthesizeEdgeTts, azureConfigured, onFallback }) {
  return async function synthesize(zones, language, voice) {
    if (azureConfigured) {
      try {
        return await synthesizeAzure(zones, language, voice);
      } catch (error) {
        onFallback?.(error);
      }
    }
    return synthesizeEdgeTts(zones, language, voice);
  };
}

/**
 * Renders (or skips) one plan item.
 * @param {object} deps
 * @param {(zones, language, voice) => Promise<{audioBytes, format, durationSeconds, timings, provider, charCount}>} deps.synthesize
 * @param {(path: string, bytes: Buffer, format: string) => Promise<string>} deps.uploadAudio - returns the public URL
 * @param {(row: object) => Promise<void>} deps.upsertAudioRow
 * @param {(moduleContentId: string) => Promise<string | null>} deps.resolveModuleRowId
 */
export async function renderItem(item, { synthesize, uploadAudio, upsertAudioRow, resolveModuleRowId }) {
  if (item.action === "skip") {
    return { ...item, outcome: "skipped" };
  }

  const moduleId = await resolveModuleRowId(item.moduleContentId);
  if (!moduleId) {
    // Dry run before the module has ever been loaded, or training:load
    // hasn't run yet for this module — nothing to attach audio to.
    return { ...item, outcome: "module-not-loaded" };
  }

  const synthesis = await synthesize(item.zones, item.language, item.voice);
  const extension = synthesis.format === "opus" ? "webm" : "mp3";
  const objectPath = `${moduleId}/${item.sectionIndex}-${item.language}.${extension}`;
  const audioUrl = await uploadAudio(objectPath, synthesis.audioBytes, synthesis.format);

  await upsertAudioRow({
    moduleId,
    sectionIndex: item.sectionIndex,
    language: item.language,
    audioUrl,
    format: synthesis.format,
    durationSeconds: synthesis.durationSeconds,
    contentHash: item.contentHash,
    timings: synthesis.timings,
    existingId: item.existingId,
  });

  return {
    ...item,
    outcome: item.action === "create" ? "created" : "updated",
    provider: synthesis.provider,
    charCount: synthesis.charCount ?? item.charCount,
  };
}
