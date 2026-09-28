// Shared prefers-reduced-motion check (INC-27 introduced the first copy of
// this, local to lesson-narration.tsx, purely to suppress auto-scroll; INC-28
// needs the same check to drive an animated scene's static fallback, so this
// is that helper promoted to a shared module rather than a second copy).
//
// Phase 4.2 (docs/header-navigation-display-settings-plan.md §6) added an
// explicit "Reduce motion" display setting, applied as `data-motion="reduce"`
// on <html> the same way `tokens.css`'s CSS-only motion rule reads it. This
// check honours that choice first, so a learner who turns it on here gets
// the narration auto-scroll and animated-scene fallback suppressed even on
// a device whose OS-level motion preference is not reduced.
export function prefersReducedMotion(): boolean {
  if (typeof document !== "undefined" && document.documentElement.getAttribute("data-motion") === "reduce") {
    return true;
  }
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
