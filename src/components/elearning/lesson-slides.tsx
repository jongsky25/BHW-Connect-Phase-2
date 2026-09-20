"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  ClosingSummary,
  LessonCompleteControl,
  LessonObjectives,
  LessonSectionBlock,
  type LessonPosition,
} from "@/components/elearning/lesson-module";
import {
  TIERS_FOR_DENSITY,
  type CourseModule,
  type CourseModuleVisual,
  type LessonDensity,
} from "@/lib/elearning/types";
import { useVisiblePosition } from "./use-visible-position";

type Props = {
  module: CourseModule;
  visuals: CourseModuleVisual[];
  density: LessonDensity;
  locale: string;
  isDone: boolean;
  pending: boolean;
  onComplete: () => void;
  completedLabel: string;
  markCompleteLabel: string;
  initialPosition?: LessonPosition;
  onPositionChange?: (position: LessonPosition) => void;
};

type Slide = {
  key: string;
  position: LessonPosition;
  label: string;
  content: ReactNode;
};

// INC-26: same-props sibling of LessonModule. One LessonSection is one
// slide (heading -> body -> visual -> takeaway -> optional check), reusing
// LessonSectionBlock/LessonVisual/RetrievalCheck/ClosingSummary exactly as
// LessonModule does — nothing about how a section, a check, or the closing
// summary renders is reimplemented here. Native CSS scroll-snap drives
// paging (no carousel dependency: this repo has none today and the plan
// asks that this feature not add one; native snap plus IntersectionObserver
// is more than adequate for a horizontal list of ~10 flex children, and
// nothing about the low-end-Android/Fast-3G constraint in §5.2 is about
// scroll-snap reliability — it's a payload-weight budget, which a
// dependency-free implementation only helps).
export function LessonSlides({
  module,
  visuals,
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
  const t = useTranslations("training");
  const tiers = TIERS_FOR_DENSITY[density];
  const objectives =
    locale === "en" ? module.objectives_en : module.objectives_fil;
  const sections = (module.lesson?.sections ?? []).filter((section) =>
    tiers.includes(section.tier),
  );

  const slides: Slide[] = [];
  if (objectives.length > 0) {
    slides.push({
      key: "objectives",
      position: -1,
      label: t("objectivesHeading"),
      content: <LessonObjectives objectives={objectives} />,
    });
  }
  sections.forEach((section, index) => {
    const heading =
      locale === "en" ? section.heading_en : section.heading_fil;
    slides.push({
      key: `section-${index}`,
      position: index,
      label: heading,
      content: (
        <LessonSectionBlock
          section={section}
          visual={
            visuals.find(
              (v) =>
                v.position === section.visual_position &&
                tiers.includes(v.tier),
            ) ?? null
          }
          locale={locale}
        />
      ),
    });
  });
  slides.push({
    key: "summary",
    position: sections.length,
    label: t("summaryPromptHeading"),
    content: (
      <div className="flex flex-col gap-5">
        <ClosingSummary sections={sections} locale={locale} />
        <LessonCompleteControl
          isDone={isDone}
          pending={pending}
          onComplete={onComplete}
          completedLabel={completedLabel}
          markCompleteLabel={markCompleteLabel}
        />
      </div>
    ),
  });

  function indexForPosition(position: LessonPosition | undefined): number {
    if (position === undefined) return 0;
    const exact = slides.findIndex((slide) => slide.position === position);
    if (exact >= 0) return exact;
    return position < 0 ? 0 : slides.length - 1;
  }

  const [currentIndex, setCurrentIndex] = useState(() =>
    indexForPosition(initialPosition),
  );

  const trackRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);

  useVisiblePosition(
    trackRef,
    (position) => {
      const index = slides.findIndex((slide) => slide.position === position);
      if (index >= 0) setCurrentIndex(index);
      onPositionChange?.(position);
    },
    { observeRoot: "scope", rootMargin: "0px", threshold: 0.6 },
  );

  const didRestorePosition = useRef(false);
  useEffect(() => {
    if (didRestorePosition.current) return;
    didRestorePosition.current = true;
    const container = trackRef.current;
    const target = slideRefs.current[currentIndex];
    if (container && target) {
      // Instant, not scroll-into-view: on mount this is "restore where the
      // BHW was", not a navigation the CSS scroll-smooth transition (used
      // for goToIndex below) should animate.
      container.scrollLeft = target.offsetLeft;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToIndex(index: number) {
    const clamped = Math.max(0, Math.min(index, slides.length - 1));
    slideRefs.current[clamped]?.scrollIntoView({
      inline: "start",
      block: "nearest",
    });
    setCurrentIndex(clamped);
    onPositionChange?.(slides[clamped]?.position ?? clamped);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      goToIndex(currentIndex + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      goToIndex(currentIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goToIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goToIndex(slides.length - 1);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={trackRef}
        role="region"
        aria-label={t("islideRegionLabel")}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="flex snap-x snap-mandatory scroll-smooth motion-reduce:scroll-auto overflow-x-auto overflow-y-hidden rounded-md border border-ink/10 outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.key}
            ref={(el) => {
              slideRefs.current[index] = el;
            }}
            data-lesson-position={slide.position}
            role="group"
            aria-label={t("islideSlidePositionLabel", {
              label: slide.label,
              current: index + 1,
              total: slides.length,
            })}
            className="w-full shrink-0 snap-start p-4"
          >
            {slide.content}
          </div>
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        {t("islideProgressLabel", {
          current: currentIndex + 1,
          total: slides.length,
        })}
      </p>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goToIndex(currentIndex - 1)}
          disabled={currentIndex === 0}
          aria-label={t("islidePreviousAction")}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-ink/10 text-ink disabled:opacity-40"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <div className="flex items-center gap-1">
          {slides.map((slide, index) => (
            <button
              key={slide.key}
              type="button"
              onClick={() => goToIndex(index)}
              aria-label={t("islideGoToAction", { number: index + 1 })}
              aria-current={index === currentIndex ? "true" : undefined}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center"
            >
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full ${
                  index === currentIndex ? "bg-primary" : "bg-ink/20"
                }`}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => goToIndex(currentIndex + 1)}
          disabled={currentIndex === slides.length - 1}
          aria-label={t("islideNextAction")}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-ink/10 text-ink disabled:opacity-40"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </div>
  );
}
