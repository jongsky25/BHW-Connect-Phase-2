#!/usr/bin/env node
// Usage: GEMINI_API_KEY=... node scripts/remotion-bhw-local-partners-narrate.mjs fil|en
// Each story scene is synthesized separately, then timed by PCM sample count.

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { synthesizeWithGemini, GEMINI_TTS_MODEL, GEMINI_VOICE, BHW_LOCAL_PARTNERS_STORY_STYLES } from "./lib/tts-providers/gemini.mjs";
import { mp3AudioFrames, spokenText } from "./lib/reference-narration.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "remotion", "public", "bhw-local-partners");
const styles = BHW_LOCAL_PARTNERS_STORY_STYLES;

async function main() {
  const language = process.argv[2];
  if (language !== "fil" && language !== "en") throw new Error("usage: remotion-bhw-local-partners-narrate.mjs <fil|en>");
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  const { BHW_LOCAL_PARTNERS_BEATS } = await import(pathToFileURL(path.join(root, "remotion", "src", "bhw-local-partners", "narration.ts")).href);
  const zones = BHW_LOCAL_PARTNERS_BEATS.map((beat, index) => ({ zone: beat.id, index, text: beat[language] }));
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
    speak: (zone) => spokenText(zone.text, language),
  });
  const frames = mp3AudioFrames(rendered.audioBytes);
  const durationSeconds = frames.reduce((sum, frame) => sum + frame.samples, 0) / frames[0].sampleRate;
  if (durationSeconds > 88) throw new Error(`Local partners narration exceeds the 90-second lesson limit: ${durationSeconds.toFixed(1)} s`);
  if (rendered.timings.length !== BHW_LOCAL_PARTNERS_BEATS.length ||
      rendered.timings.some((timing, index) => timing.zone !== BHW_LOCAL_PARTNERS_BEATS[index].id || timing.end_ms <= timing.start_ms))
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
