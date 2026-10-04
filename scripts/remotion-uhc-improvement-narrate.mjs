#!/usr/bin/env node
// One Gemini request per beat; decoded sample counts drive scenes and captions.
import {mkdirSync, writeFileSync} from "node:fs";
import path from "node:path";
import {synthesizeWithGemini, GEMINI_TTS_MODEL, GEMINI_VOICE, UHC_IMPROVEMENT_STORY_STYLES} from "./lib/tts-providers/gemini.mjs";
import {mp3AudioFrames, spokenText} from "./lib/reference-narration.mjs";
import {UHC_IMPROVEMENT_BEATS} from "../remotion/src/uhc-improvement/narration.ts";
const outDir = path.resolve(import.meta.dirname,"../remotion/public/uhc-improvement");
async function main() {
  const language=process.argv[2];
  if (!['fil','en'].includes(language)) throw new Error('usage: remotion-uhc-improvement-narrate.mjs fil|en');
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
  const zones=UHC_IMPROVEMENT_BEATS.map((b,index)=>({zone:b.id,index,text:b[language]}));
  const style=UHC_IMPROVEMENT_STORY_STYLES[language]+(language==='en' ? ' Perform an expressive miniature story for fellow BHWs: an animated curious opening question, a hopeful proposal, a deliberate fact-check pause, a bright concrete plan, and a warm invitation to reflect. Smile in the voice. Use audible pitch rises and falls and varied phrase speed, avoiding a uniform instructional cadence. Keep the exact authored wording.' : '');
  const rendered=await synthesizeWithGemini(zones,language,{apiKey:process.env.GEMINI_API_KEY,kbps:32,style,speak:z=>spokenText(z.text,language)});
  const frames=mp3AudioFrames(rendered.audioBytes);
  const durationSeconds=frames.reduce((n,f)=>n+f.samples,0)/frames[0].sampleRate;
  if (durationSeconds>88) throw new Error(`Improvement story exceeds the 90-second budget: ${durationSeconds.toFixed(3)}s; revise and regenerate rather than trim speech`);
  if (rendered.timings.length!==zones.length || rendered.timings.some((b,i)=>b.zone!==zones[i].zone||b.end_ms<=b.start_ms) || rendered.timings.at(-1).end_ms>durationSeconds*1000+1) throw new Error('Measured narration does not match the six beats');
  mkdirSync(outDir,{recursive:true});
  writeFileSync(path.join(outDir,`narration-${language}.mp3`),rendered.audioBytes);
  writeFileSync(path.join(outDir,`narration-${language}.json`),JSON.stringify({language,provider:'gemini',model:GEMINI_TTS_MODEL,voice:GEMINI_VOICE,style,durationSeconds:Number(durationSeconds.toFixed(3)),beats:rendered.timings},null,2)+'\n');
  console.log(`${language}: ${durationSeconds.toFixed(3)}s, ${rendered.audioBytes.length} bytes, six measured scenes`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
