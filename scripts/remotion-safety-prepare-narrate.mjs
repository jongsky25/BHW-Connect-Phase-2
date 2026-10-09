// Usage: GEMINI_API_KEY=... node scripts/remotion-safety-prepare-narrate.mjs fil|en
// Each story scene is synthesized separately, then timed by PCM sample count.

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { synthesizeWithGemini, GEMINI_TTS_MODEL, GEMINI_VOICE } from "./lib/tts-providers/gemini.mjs";
import { mp3AudioFrames } from "./lib/reference-narration.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "remotion", "public", "safety-prepare");
const styles = {fil: "Natural Filipino educational narration, stable adult female narrator Kore. Warm clear conversational pacing, preserve all negation and qualifications. Apple is the character's name; no invented dialogue.", en: "Natural Philippine English educational narration, stable adult female narrator Kore. Warm clear conversational pacing, preserve all negation and qualifications. Apple is the character's name; no invented dialogue."};

async function main() {
  const language = process.argv[2];
  if (language !== "fil" && language !== "en") throw new Error("usage: remotion-safety-prepare-narrate.mjs <fil|en>");
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  const { SAFETY_PREPARE_BEATS } = await import(pathToFileURL(path.join(root, "remotion", "src", "safety-prepare", "narration.ts")).href);
  const zones = SAFETY_PREPARE_BEATS.map((beat, index) => ({ zone: beat.id, index, text: beat[language] }));
  const timingPath=path.join(outDir, `narration-${language}.json`),audioPath=path.join(outDir, `narration-${language}.mp3`);
  const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
  if(existsSync(timingPath)&&existsSync(audioPath)){
    const saved=JSON.parse(readFileSync(timingPath,'utf8')),bytes=readFileSync(audioPath);
    const frames=mp3AudioFrames(bytes),seconds=frames.reduce((sum,f)=>sum+f.samples/f.sampleRate,0);
    const validTiming=Array.isArray(saved.beats)&&saved.beats.length===zones.length&&saved.beats.every((b,i)=>b.end_ms>b.start_ms&&b.start_ms>=0&&(i===0||b.start_ms>=saved.beats[i-1].end_ms))&&saved.beats.at(-1).end_ms<=seconds*1000+50&&Math.abs(saved.durationSeconds-seconds)<0.001&&seconds<=88;
    if(validTiming&&saved.provider==='gemini'&&saved.language===language&&saved.model===GEMINI_TTS_MODEL&&saved.voice===GEMINI_VOICE&&saved.speech_style===styles[language]&&saved.audio_sha256===sha(bytes)&&JSON.stringify(saved.beats.map(({zone,index,text})=>({zone,index,text})))===JSON.stringify(zones)){
      console.log(`${language}: exact authored story/style/MP3 hash cache hit`);return;
    }
  }
  const rendered = await synthesizeWithGemini(zones, language, {
    apiKey: process.env.GEMINI_API_KEY,
    kbps: 32,
    style: styles[language],
  });
  const frames = mp3AudioFrames(rendered.audioBytes);
  const durationSeconds = frames.reduce((sum, frame) => sum + frame.samples, 0) / frames[0].sampleRate;
  if (durationSeconds > 88) throw new Error(`Listening narration exceeds the 90-second lesson limit: ${durationSeconds.toFixed(1)} s`);
  if (rendered.timings.length !== SAFETY_PREPARE_BEATS.length ||
      rendered.timings.some((timing, index) => timing.zone !== SAFETY_PREPARE_BEATS[index].id || timing.end_ms <= timing.start_ms))
    throw new Error("Gemini scene timings do not match the authored sequence");
  if (rendered.timings.at(-1).end_ms > durationSeconds * 1000 + 50)
    throw new Error("Gemini scene timings exceed the encoded MP3 duration");

  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `narration-${language}.mp3`), rendered.audioBytes);
  writeFileSync(path.join(outDir, `narration-${language}.json`), JSON.stringify({
    language, provider: "gemini", model: GEMINI_TTS_MODEL, voice: GEMINI_VOICE,
    speech_style: styles[language], durationSeconds: Number(durationSeconds.toFixed(3)), beats: rendered.timings,
    audio_sha256: sha(rendered.audioBytes),
  }, null, 2) + "\n");
  console.log(`${language}: ${durationSeconds.toFixed(1)} s; ${rendered.audioBytes.length} bytes; ${rendered.timings.length} scenes`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
