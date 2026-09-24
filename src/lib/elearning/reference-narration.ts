// Read-mode narration for converted Reference Manual lessons, rendered ahead
// of time by scripts/training-narrate.mjs into static files plus
// content/training/day1-basic-competencies/narration.json. Kept outside the
// immutable lesson revision, keyed by lesson key + stable section ID +
// language. The renderer plays an entry only when its recorded sentence text
// still matches the published revision's text (timingsMatchSection), so an
// edited revision never plays stale audio against different words.

import type { LessonAudioTiming, NarrationLanguage } from "./types";

export type ReferenceNarrationEntry = {
  src: string;
  duration_seconds: number;
  timings: LessonAudioTiming[];
};

// section ID -> narration in the page's current language.
export type LessonNarration = Record<string, ReferenceNarrationEntry>;

type ManifestEntry = ReferenceNarrationEntry & { voice?: string; content_hash?: string; sha256?: string };
export type ReferenceNarrationManifest = {
  lessons: Record<string, { module: string; sections: Record<string, Partial<Record<NarrationLanguage, ManifestEntry>>> }>;
};

// Only what one lesson page needs, in one language: keeps the client payload
// to a few kilobytes instead of shipping the whole manifest.
export function narrationForLesson(
  manifest: ReferenceNarrationManifest,
  lessonKey: string,
  language: NarrationLanguage,
): LessonNarration {
  const sections = manifest.lessons[lessonKey]?.sections ?? {};
  const out: LessonNarration = {};
  for (const [sectionId, languages] of Object.entries(sections)) {
    const entry = languages[language];
    if (entry) out[sectionId] = { src: entry.src, duration_seconds: entry.duration_seconds, timings: entry.timings };
  }
  return out;
}

