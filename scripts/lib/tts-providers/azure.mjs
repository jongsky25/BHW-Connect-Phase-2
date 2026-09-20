// Azure Speech synthesis (docs/training-modules-plan.md's locked decision:
// fil-PH-BlessicaNeural primary voice, 500K chars/month free tier).
//
// Uses the official microsoft-cognitiveservices-speech-sdk rather than a
// hand-rolled REST call: Azure's plain batch-synthesis REST endpoint only
// returns audio bytes, with no timing metadata at all — getting
// `bookmarkReached` events (the SDK's real, documented API for this,
// `SpeechSynthesizer.bookmarkReached`) requires the SDK's synthesis
// session, not the REST endpoint. See scripts/lib/tts-providers/ssml.mjs
// for why bookmarks (not word/sentence boundaries) are the right event to
// key timings off — they land exactly at our own zone boundaries.
//
// NOT executed against a live Azure subscription in the session that wrote
// this: no AZURE_SPEECH_KEY was available. The bookmarkReached/SpeechConfig
// API used here matches the SDK's public documentation as of the installed
// 1.51.x version; verify against a real key and record the outcome (per
// this file's own "cost check" requirement in the plan) before relying on
// it for a real content load.

import sdk from "microsoft-cognitiveservices-speech-sdk";
import { buildSsml, timingsFromBookmarks } from "./ssml.mjs";

export const AZURE_VOICES = { fil: "fil-PH-BlessicaNeural", en: "en-US-JennyNeural" };

export async function synthesizeWithAzure(zones, language, { key, region }) {
  const voice = AZURE_VOICES[language];
  const ssml = buildSsml(zones, { voice, language });

  const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Webm24Khz16BitMonoOpus;

  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, undefined);
  const bookmarkOffsetsMs = [];

  synthesizer.bookmarkReached = (_sender, e) => {
    // e.audioOffset is in 100-nanosecond ticks.
    bookmarkOffsetsMs.push(e.audioOffset / 10_000);
  };

  try {
    const result = await new Promise((resolve, reject) => {
      synthesizer.speakSsmlAsync(
        ssml,
        (r) => resolve(r),
        (error) => reject(new Error(`Azure synthesis failed: ${error}`)),
      );
    });

    if (result.reason !== sdk.ResultReason.SynthesizingAudioCompleted) {
      throw new Error(`Azure synthesis did not complete: reason=${result.reason}`);
    }

    const audioBytes = Buffer.from(result.audioData);
    const durationMs = result.audioDuration / 10_000;

    return {
      provider: "azure",
      audioBytes,
      format: "opus",
      durationSeconds: durationMs / 1000,
      timings: timingsFromBookmarks(zones, bookmarkOffsetsMs, durationMs),
      charCount: zones.reduce((sum, zone) => sum + zone.text.length, 0),
    };
  } finally {
    synthesizer.close();
  }
}
