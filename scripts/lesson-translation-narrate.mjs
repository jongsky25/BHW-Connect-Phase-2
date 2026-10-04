// Scoped, resumable Gemini narration for the selected lesson language pilot.
// Dry run by default. No database access and no cleanup of existing audio.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildLessonPilot, lessonDirectory, lessonConfig, translationLanguage, pilotLanguages } from "./lesson-translation-build.mjs";
import { buildNarrationZones } from "./lib/narration-zones.mjs";
import { spokenText, mp3AudioFrames } from "./lib/reference-narration.mjs";
import { synthesizeWithGemini, geminiVoiceId, GEMINI_TTS_MODEL, GEMINI_VOICE, ROLES_HEPO_STORY_STYLES, HEALTH_EDUCATOR_STORY_STYLES, COMMUNITY_ORGANIZER_STORY_STYLES, SERVICE_PROVIDER_STORY_STYLES, RECORDS_STORY_STYLES, ROLES_APPLICATION_STORY_STYLES, UHC_COVERAGE_STORY_STYLES, PRIMARY_CARE_STORY_STYLES, LOCAL_SYSTEM_STORY_STYLES, UHC_IMPROVEMENT_STORY_STYLES } from "./lib/tts-providers/gemini.mjs";

const root = path.resolve(import.meta.dirname, "..");
const language = translationLanguage();
const cache = path.join(root, ".preview", `${pilotLanguages[language].preview}-tts-cache`);
const hash = value => createHash("sha256").update(value).digest("hex");
const pilot = buildLessonPilot(language);
const groups = pilot.read_sections.map(section => ({ id: section.id, zones: buildNarrationZones(section) }));
const includeRead = !process.argv.includes("--story-only");
const includeStory = !process.argv.includes("--read-only");
if (!process.argv.includes("--apply")) {
  console.log(`Dry run: ${includeRead ? groups.length : 0} reading tracks (${groups.reduce((sum, group) => sum + group.zones.length, 0)} utterances), ${includeStory ? pilot.story_beats.length : 0} story beats. Use --apply to generate.`);
} else {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  mkdirSync(cache, { recursive: true });
  // Cache individual successful API responses so interrupted batches reuse
  // completed utterances. Cache keys include the model, voice, and full body.
  const cachedFetch = async (url, options) => {
    const filename = path.join(cache, hash(options.body) + ".json");
    if (existsSync(filename)) return new Response(readFileSync(filename), { status: 200 });
    const response = await fetch(url, options);
    if (response.ok) writeFileSync(filename, await response.clone().text());
    return response;
  };
  const mediaFile = path.join(lessonDirectory, `media.${language}.json`);
  const media = existsSync(mediaFile) ? JSON.parse(readFileSync(mediaFile, "utf8")) : {};
  const narration = media.narration ?? {};
  const uhcStyles = { "uhc-purpose": UHC_COVERAGE_STORY_STYLES, "uhc-primary-care": PRIMARY_CARE_STORY_STYLES, "uhc-local-system": LOCAL_SYSTEM_STORY_STYLES, "uhc-improvement": UHC_IMPROVEMENT_STORY_STYLES }[lessonConfig.story];
  const options = { style: uhcStyles?.[language], apiKey: process.env.GEMINI_API_KEY, kbps: 32, fetchImpl: cachedFetch, speak: zone => spokenText(zone.text, language) };
  if (includeRead) for (const group of groups) {
    const rendered = await synthesizeWithGemini(group.zones, language, options);
    const identity = hash(JSON.stringify([geminiVoiceId(), language, options.style ?? null, group.zones, hash(rendered.audioBytes)]));
    const relative = `training/audio/${lessonConfig.module}/${lessonConfig.key}/${group.id}.${language}.${identity.slice(0, 12)}.mp3`;
    mkdirSync(path.dirname(path.join(root, "public", relative)), { recursive: true });
    writeFileSync(path.join(root, "public", relative), rendered.audioBytes);
    const frames = mp3AudioFrames(rendered.audioBytes);
    narration[group.id] = { src: "/" + relative, voice: geminiVoiceId(), content_hash: identity,
      sha256: hash(rendered.audioBytes), delivery_style: options.style ?? null, duration_seconds: frames.reduce((sum, f) => sum + f.samples, 0) / frames[0].sampleRate,
      timings: rendered.timings };
    media.narration = narration;
    writeFileSync(mediaFile, JSON.stringify(media, null, 2) + "\n");
    console.log(`Read ${group.id}: ${narration[group.id].duration_seconds.toFixed(1)} s, ${rendered.timings.length} utterances`);
  }
  if (includeStory) {
    const zones = pilot.story_beats.map((beat, index) => ({ zone: beat.id, index, text: beat.text }));
    const styles = { "roles-hepo": ROLES_HEPO_STORY_STYLES, "health-educator": HEALTH_EDUCATOR_STORY_STYLES,
      "community-organizer": COMMUNITY_ORGANIZER_STORY_STYLES, "service-provider": SERVICE_PROVIDER_STORY_STYLES, "records": RECORDS_STORY_STYLES, "roles-application": ROLES_APPLICATION_STORY_STYLES, "uhc-purpose": UHC_COVERAGE_STORY_STYLES, "uhc-primary-care": PRIMARY_CARE_STORY_STYLES, "uhc-local-system": LOCAL_SYSTEM_STORY_STYLES, "uhc-improvement": UHC_IMPROVEMENT_STORY_STYLES }[lessonConfig.story];
    const rendered = await synthesizeWithGemini(zones, language, { ...options, style: styles[language] });
    const out = path.join(root, "remotion", "public", lessonConfig.story);
    const frames = mp3AudioFrames(rendered.audioBytes);
    const durationSeconds = frames.reduce((sum, f) => sum + f.samples, 0) / frames[0].sampleRate;
    if (durationSeconds > 125) throw new Error(`${pilot.label} story exceeds 125 seconds: ${durationSeconds}`);
    mkdirSync(out, { recursive: true });
    writeFileSync(path.join(out, `narration-${language}.mp3`), rendered.audioBytes);
    writeFileSync(path.join(out, `narration-${language}.json`), JSON.stringify({ language, provider: "gemini", model: GEMINI_TTS_MODEL, voice: GEMINI_VOICE,
      script_hash: hash(JSON.stringify(zones)), durationSeconds: Number(durationSeconds.toFixed(3)), beats: rendered.timings }, null, 2) + "\n");
    console.log(`Story ${language}: ${durationSeconds.toFixed(1)} s, ${rendered.timings.length} beats`);
  }
  buildLessonPilot(language);
}
