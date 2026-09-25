"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/elearning/reduced-motion";
import { sanitizeSvgMarkup } from "@/lib/elearning/svg-allowlist";
import {
  TIERS_FOR_DENSITY,
  type CourseModule,
  type CourseModuleAudio,
  type CourseModuleVisual,
  type LessonCheck,
  type LessonDensity,
  type LessonSection,
} from "@/lib/elearning/types";
import { LessonNarration, type NarrationVisualProgress } from "./lesson-narration";
import { useVisiblePosition } from "./use-visible-position";

// INC-26: shared position semantics between LessonModule (this file) and
// LessonSlides (lesson-slides.tsx), so the Basahin/Islide toggle in
// course-detail.tsx can hand the "current section" from one renderer to the
// other. -1 = the objectives bookend, 0..sections.length-1 = that section,
// sections.length = the closing summary / mark-complete block.
export type LessonPosition = number;

type Props = {
  module: CourseModule;
  visuals: CourseModuleVisual[];
  // INC-27, optional: narration for this module's sections, keyed by the
  // section's index in the module's FULL authored lesson.sections array
  // (§A.6 — independent of which tiers the current density renders) and by
  // language. Omitted entirely by callers that haven't wired audio in yet.
  audios?: CourseModuleAudio[];
  density: LessonDensity;
  locale: string;
  isDone: boolean;
  pending: boolean;
  onComplete: () => void;
  completedLabel: string;
  markCompleteLabel: string;
  // INC-26 position preservation. Omit either to opt out (e.g. a first
  // render with nothing to restore).
  initialPosition?: LessonPosition;
  onPositionChange?: (position: LessonPosition) => void;
};

// Exported so lesson-slides.tsx (a same-props sibling renderer, per INC-26)
// looks audio up the same way rather than duplicating this predicate.
export function findAudioForSection(
  audios: CourseModuleAudio[] | undefined,
  sectionIndex: number,
  locale: string,
): CourseModuleAudio | null {
  if (!audios) return null;
  const language = locale === "en" ? "en" : "fil";
  return (
    audios.find(
      (a) => a.section_index === sectionIndex && a.language === language,
    ) ?? null
  );
}

// §A.1/§A.2/§A.5/§A.6 BHW lesson renderer: objectives bookend -> tiered
// sections (each with its own visual + inline retrieval check) ->
// retrieval-first summary assembled from the *rendered* sections' takeaways
// only, so a short-density BHW never sees a summary line that references a
// standard/deep section they didn't get.
export function LessonModule({
  module,
  visuals,
  audios,
  density,
  locale,
  isDone,
  pending,
  onComplete,
  completedLabel,
  markCompleteLabel,
  initialPosition,
  onPositionChange,
}: Props) {
  const tiers = TIERS_FOR_DENSITY[density];
  const objectives =
    locale === "en" ? module.objectives_en : module.objectives_fil;
  // originalIndex survives the tier filter below — it's what
  // course_module_audio.section_index refers to (§A.6: authored order,
  // not the density-filtered position), so it's the only correct key for
  // looking up this section's narration.
  const sections = (module.lesson?.sections ?? [])
    .map((section, originalIndex) => ({ section, originalIndex }))
    .filter(({ section }) => tiers.includes(section.tier));

  const rootRef = useRef<HTMLDivElement | null>(null);
  const objectivesRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  useVisiblePosition(
    rootRef,
    onPositionChange,
    // A thin band near the vertical middle of the viewport, rather than
    // "any overlap", so the reported position is "what's actually being
    // read" and not just "what scrolled into the bottom edge".
    { observeRoot: "viewport", rootMargin: "-40% 0px -40% 0px", threshold: 0 },
  );

  const didRestorePosition = useRef(false);
  useEffect(() => {
    if (didRestorePosition.current) return;
    didRestorePosition.current = true;
    if (initialPosition === undefined) return;
    const target =
      initialPosition === -1
        ? objectivesRef.current
        : initialPosition >= sections.length
          ? summaryRef.current
          : (sectionRefs.current[initialPosition] ?? null);
    target?.scrollIntoView({ block: "start" });
    // Restore once, on mount — a later prop change (e.g. the other renderer
    // moved on) shouldn't yank the BHW's own scroll position out from under
    // them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="flex flex-col gap-5">
      {objectives.length > 0 ? (
        <div ref={objectivesRef} data-lesson-position={-1}>
          <LessonObjectives objectives={objectives} />
        </div>
      ) : null}

      {sections.map(({ section, originalIndex }, index) => (
        <div
          key={index}
          ref={(el) => {
            sectionRefs.current[index] = el;
          }}
          data-lesson-position={index}
        >
          <LessonSectionBlock
            section={section}
            visual={
              visuals.find(
                (v) =>
                  v.position === section.visual_position &&
                  tiers.includes(v.tier),
              ) ?? null
            }
            audio={findAudioForSection(audios, originalIndex, locale)}
            locale={locale}
          />
        </div>
      ))}

      <div
        ref={summaryRef}
        data-lesson-position={sections.length}
        className="flex flex-col gap-5"
      >
        <ClosingSummary
          sections={sections.map(({ section }) => section)}
          locale={locale}
        />

        <LessonCompleteControl
          isDone={isDone}
          pending={pending}
          onComplete={onComplete}
          completedLabel={completedLabel}
          markCompleteLabel={markCompleteLabel}
        />
      </div>
    </div>
  );
}

export function LessonObjectives({ objectives }: { objectives: string[] }) {
  const t = useTranslations("training");

  return (
    <div className="flex flex-col gap-2 rounded-md border border-primary-text/30 bg-primary/5 p-4">
      <h3 className="font-medium text-ink">{t("objectivesHeading")}</h3>
      <ul className="list-disc pl-5 text-sm text-ink/80">
        {objectives.map((objective, index) => (
          <li key={index}>{objective}</li>
        ))}
      </ul>
    </div>
  );
}

export function LessonSectionBlock({
  section,
  visual,
  audio = null,
  locale,
}: {
  section: LessonSection;
  visual: CourseModuleVisual | null;
  audio?: CourseModuleAudio | null;
  locale: string;
}) {
  const heading = locale === "en" ? section.heading_en : section.heading_fil;
  const body = locale === "en" ? section.body_en : section.body_fil;
  const takeaway = locale === "en" ? section.takeaway_en : section.takeaway_fil;

  return (
    <div className="flex flex-col gap-3">
      {audio ? (
        <LessonNarration
          audio={audio}
          heading={heading}
          body={body}
          takeaway={takeaway}
          visual={
            visual
              ? (progress: NarrationVisualProgress) => (
                  <LessonVisual visual={visual} locale={locale} narrationProgress={progress} />
                )
              : undefined
          }
        />
      ) : (
        <>
          <h3 className="font-medium text-ink">{heading}</h3>
          <p className="whitespace-pre-wrap text-sm text-ink/80">{body}</p>

          {visual ? <LessonVisual visual={visual} locale={locale} /> : null}

          {takeaway ? (
            <p className="border-l-2 border-secondary pl-3 text-sm font-medium text-ink">
              {takeaway}
            </p>
          ) : null}
        </>
      )}

      {section.check ? (
        <RetrievalCheck check={section.check} locale={locale} />
      ) : null}
    </div>
  );
}

// INC-28: whether a `data-scene-step="N"` element should be shown yet.
// Exported for direct unit testing rather than only through the DOM effect
// that calls it. Reduced motion, no narration progress at all (the no-audio
// lesson path), and "not currently playing" (before the BHW presses play,
// or after narration ends) all mean the same thing here — show the finished
// picture, never an animation the DoD requires a static equivalent for.
export function isSceneStepRevealed(
  step: number,
  progress: NarrationVisualProgress | undefined,
  reducedMotion: boolean,
): boolean {
  if (!progress || reducedMotion || !progress.playing) return true;
  return progress.bodyIndex >= step;
}

export function LessonVisual({
  visual,
  locale,
  narrationProgress,
}: {
  visual: CourseModuleVisual;
  locale: string;
  // INC-28, optional: only passed by the narrated lesson path (see
  // LessonSectionBlock), so a scene with data-scene-step markers can build
  // up as the narration reaches each part. Absent elsewhere, which
  // isSceneStepRevealed treats as "show everything".
  narrationProgress?: NarrationVisualProgress;
}) {
  const caption = locale === "en" ? visual.caption_en : visual.caption_fil;
  const altText = locale === "en" ? visual.alt_text_en : visual.alt_text_fil;
  const sanitized = useMemo(
    () => (visual.svg_markup ? sanitizeSvgMarkup(visual.svg_markup) : null),
    [visual.svg_markup],
  );
  // React 19 re-assigns innerHTML whenever this object's identity changes,
  // which would wipe the data-revealed attributes the effect below sets.
  const innerHtml = useMemo(() => (sanitized ? { __html: sanitized } : undefined), [sanitized]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reducedMotion = prefersReducedMotion();
    container.querySelectorAll<HTMLElement>("[data-scene-step]").forEach((el) => {
      const step = Number(el.getAttribute("data-scene-step"));
      const revealed = isSceneStepRevealed(step, narrationProgress, reducedMotion);
      el.setAttribute("data-revealed", revealed ? "true" : "false");
    });
    // Deliberately depends on the primitives, not `narrationProgress` itself
    // — LessonNarration builds that object fresh every render (once per
    // requestAnimationFrame tick while playing), so depending on the object
    // would re-run this DOM walk 60 times a second instead of only when the
    // reveal state actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sanitized, narrationProgress?.bodyIndex, narrationProgress?.playing]);

  if (!sanitized && !visual.image_url) {
    return null;
  }

  return (
    <figure className="flex flex-col gap-2 rounded-md border border-ink/10 p-3">
      {sanitized ? (
        <div
          ref={containerRef}
          role="img"
          aria-label={altText}
          className="text-ink"
          dangerouslySetInnerHTML={innerHtml}
        />
      ) : visual.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={visual.image_url}
          alt={altText}
          className="w-full rounded-md"
        />
      ) : null}
      <figcaption className="text-sm text-ink/70">{caption}</figcaption>
    </figure>
  );
}

// §A.5 retrieval practice: local-only. `selected`/`submitted` are plain
// useState with no backend call anywhere in this component — nothing is
// persisted, scored, or gated on this check, in either lesson renderer.
export function RetrievalCheck({
  check,
  locale,
}: {
  check: LessonCheck;
  locale: string;
}) {
  const t = useTranslations("training");
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const groupName = useId();

  const prompt = locale === "en" ? check.prompt_en : check.prompt_fil;
  const feedback = locale === "en" ? check.feedback_en : check.feedback_fil;
  const isCorrect = selected === check.correct_option_index;

  return (
    <fieldset className="flex flex-col gap-2 rounded-md border border-ink/10 bg-ink/5 p-3">
      <legend className="px-1 text-sm font-medium text-ink">{prompt}</legend>
      <div className="flex flex-col gap-1">
        {check.options.map((option, index) => (
          <label
            key={index}
            className="flex min-h-[44px] items-center gap-2 text-sm text-ink"
          >
            <input
              type="radio"
              name={groupName}
              disabled={submitted}
              checked={selected === index}
              onChange={() => setSelected(index)}
            />
            {locale === "en" ? option.en : option.fil}
          </label>
        ))}
      </div>

      {submitted ? (
        <p
          className={isCorrect ? "text-sm text-success" : "text-sm text-danger"}
        >
          {isCorrect ? t("checkCorrectLabel") : t("checkIncorrectLabel")}{" "}
          {feedback}
        </p>
      ) : (
        <button
          type="button"
          disabled={selected === null}
          onClick={() => setSubmitted(true)}
          className="self-start rounded-md border border-primary-text/40 px-3 py-1.5 text-xs font-medium text-primary-text disabled:opacity-60"
        >
          {t("checkSubmitAction")}
        </button>
      )}
    </fieldset>
  );
}

export function ClosingSummary({
  sections,
  locale,
}: {
  sections: LessonSection[];
  locale: string;
}) {
  const t = useTranslations("training");
  const [revealed, setRevealed] = useState(false);
  const takeaways = sections
    .map((section) =>
      locale === "en" ? section.takeaway_en : section.takeaway_fil,
    )
    .filter(Boolean);

  if (takeaways.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-ink/10 bg-ink/5 p-4">
      <h3 className="font-medium text-ink">{t("summaryPromptHeading")}</h3>
      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary"
        >
          {t("summaryRevealAction")}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium text-ink">
            {t("summaryHeading")}
          </h4>
          <ul className="list-disc pl-5 text-sm text-ink/80">
            {takeaways.map((takeaway, index) => (
              <li key={index}>{takeaway}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function LessonCompleteControl({
  isDone,
  pending,
  onComplete,
  completedLabel,
  markCompleteLabel,
}: {
  isDone: boolean;
  pending: boolean;
  onComplete: () => void;
  completedLabel: string;
  markCompleteLabel: string;
}) {
  return isDone ? (
    <span className="self-start rounded-md bg-success/10 px-3 py-1 text-xs font-medium text-success">
      {completedLabel}
    </span>
  ) : (
    <button
      type="button"
      disabled={pending}
      onClick={onComplete}
      className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-60"
    >
      {markCompleteLabel}
    </button>
  );
}
