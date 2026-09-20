"use client";

import { useEffect, type RefObject } from "react";

// INC-26: shared scroll-spy used by both LessonModule (vertical page
// scroll, IntersectionObserver root = viewport) and LessonSlides (horizontal
// scroll-snap, root = the slide track itself) to report "what's currently
// in view" as a LessonPosition the Basahin/Islide toggle can hand to the
// other renderer.
//
// Deliberately DOM-attribute-based (`data-lesson-position`) rather than an
// array of refs collected during render: this repo's lint config
// (react-hooks/refs) forbids reading a ref's `.current` while a component
// is rendering, since the value read then can be stale by the time React
// commits. Querying the DOM inside the effect below — which runs only
// after commit — sidesteps that entirely, and scoping the query to
// `scopeRef`'s subtree (not `document`) is what keeps two lesson modules
// rendered on the same course page from observing each other's slides.
//
// Runs once on mount — neither renderer adds/removes sections after it
// mounts (density is fixed for the life of the component instance), so
// there is nothing to re-observe later, and reconnecting on every render
// would just make the intersection callback fire redundantly.
export function useVisiblePosition(
  scopeRef: RefObject<Element | null>,
  onChange: ((position: number) => void) | undefined,
  options: {
    observeRoot?: "viewport" | "scope";
    rootMargin?: string;
    threshold?: number | number[];
  } = {},
) {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const scope = scopeRef.current;
    if (!scope) return;

    const elements = scope.querySelectorAll<HTMLElement>("[data-lesson-position]");
    if (elements.length === 0) return;

    const root = options.observeRoot === "scope" ? scope : null;
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { position: number; ratio: number } | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const raw = (entry.target as HTMLElement).dataset.lessonPosition;
          const position = raw === undefined ? NaN : Number(raw);
          if (Number.isNaN(position)) continue;
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { position, ratio: entry.intersectionRatio };
          }
        }
        if (best) onChange?.(best.position);
      },
      { root, rootMargin: options.rootMargin, threshold: options.threshold ?? 0.5 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
    // Mount-only by design — see the comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
