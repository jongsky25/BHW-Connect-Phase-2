import type { PublishedLesson } from "./reference-navigation";
import type { LessonNarration } from "./reference-narration";
import type { LessonAssetVideo, LessonCheck } from "./types";

export type LessonText = (fil: string, en: string) => string;
export type LessonTranslationLanguage = "ceb" | "hil";
type TranslatedCheck = { prompt: string; options: string[]; feedback: string };
export type LessonTranslation = {
  language: LessonTranslationLanguage;
  label: string;
  lesson_key: string;
  review_status: "draft" | "approved";
  source_text: string;
  title: string;
  objectives: string[];
  read_sections: { id: string; heading: string; body: string; takeaway: string; check: TranslatedCheck | null }[];
  slides: { id: string; heading: string; display: string; check: TranslatedCheck | null }[];
  assets: { id: string; alt: string; caption: string; text_steps?: { id: string; title: string; text: string }[] }[];
  story_art: { alt: string; caption: string };
  ui: Record<string, string>;
  narration?: LessonNarration;
  video?: LessonAssetVideo;
  poster?: string;
};

// Compare the complete learner text and stable IDs, rather than a database
// revision ID: authored and published revisions live in different stores.
// A content edit hides its translation until the translation is updated.
export function lessonTranslationSource(lesson: PublishedLesson) {
  const check = (value: LessonCheck | null) => value && [value.prompt_fil, value.prompt_en,
    value.options.map(option => [option.fil, option.en]), value.correct_option_index, value.feedback_fil, value.feedback_en];
  return JSON.stringify([
    lesson.lesson_key, lesson.title_fil, lesson.title_en, lesson.objectives_fil, lesson.objectives_en,
    lesson.revision.read_sections.map(s => [s.id, s.concept_ids, s.heading_fil, s.heading_en, s.body_fil, s.body_en, s.takeaway_fil, s.takeaway_en, check(s.check)]),
    lesson.revision.slides.map(s => [s.id, s.concept_ids, s.heading_fil, s.heading_en, s.display_fil, s.display_en, check(s.check)]),
  ]);
}

export function translationMatchesLesson(lesson: PublishedLesson, translation: LessonTranslation) {
  const positionsMatch = <T extends { id: string; check: unknown }>(source: T[], localized: { id: string; check: TranslatedCheck | null }[]) =>
    source.length === localized.length && source.every((item, index) => item.id === localized[index].id &&
      Boolean(item.check) === Boolean(localized[index].check) && (!item.check ||
        (item.check as LessonCheck).options.length === localized[index].check?.options.length));
  return translation.lesson_key === lesson.lesson_key && translation.source_text === lessonTranslationSource(lesson) &&
    positionsMatch(lesson.revision.read_sections, translation.read_sections) && positionsMatch(lesson.revision.slides, translation.slides) &&
    translation.objectives.length === lesson.objectives_fil.length;
}

export function translateLesson(lesson: PublishedLesson, translation: LessonTranslation): PublishedLesson {
  const check = (source: LessonCheck | null, localized: TranslatedCheck | null): LessonCheck | null => {
    if (!source || !localized) return source;
    return { ...source, prompt_fil: localized.prompt, prompt_en: localized.prompt,
      feedback_fil: localized.feedback, feedback_en: localized.feedback,
      options: source.options.map((option, index) => ({ ...option, fil: localized.options[index], en: localized.options[index] })) };
  };
  return { ...lesson, title_fil: translation.title, title_en: translation.title,
    objectives_fil: translation.objectives, objectives_en: translation.objectives,
    revision: { ...lesson.revision,
      read_sections: lesson.revision.read_sections.map((section, index) => {
        const translated = translation.read_sections[index];
        return { ...section, heading_fil: translated.heading, heading_en: translated.heading,
          body_fil: translated.body, body_en: translated.body, takeaway_fil: translated.takeaway, takeaway_en: translated.takeaway,
          check: check(section.check, translated.check) };
      }),
      slides: lesson.revision.slides.map((slide, index) => {
        const translated = translation.slides[index];
        return { ...slide, heading_fil: translated.heading, heading_en: translated.heading,
          display_fil: translated.display, display_en: translated.display, check: check(slide.check, translated.check) };
      }),
      assets: lesson.revision.assets.map(asset => {
        const translated = translation.assets.find(value => value.id === asset.id);
        return { ...asset, ...(translated ? { alt_fil: translated.alt, alt_en: translated.alt, caption_fil: translated.caption, caption_en: translated.caption, text_steps: translated.text_steps } : {}),
          ...(asset.id === lesson.revision.featured_asset_id ? {
            path: translation.poster ?? asset.path, video: undefined,
            // Do not fall back to a different spoken language when missing.
            videos: translation.video ? { fil: translation.video, en: translation.video } : undefined,
          } : {}) };
      }),
    },
  };
}
