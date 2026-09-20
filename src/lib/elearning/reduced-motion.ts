// Shared prefers-reduced-motion check (INC-27 introduced the first copy of
// this, local to lesson-narration.tsx, purely to suppress auto-scroll; INC-28
// needs the same check to drive an animated scene's static fallback, so this
// is that helper promoted to a shared module rather than a second copy).
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
