import type { ProgressState, StepKey, StepState } from "@/lib/progress/manual-progress";

export type Locale = "fil" | "en";
export type Bilingual = { fil: string; en: string };

// Colour codes for the learner progress view (docs/bhw-progress-plan.md §4).
// Token classes only — hex values live in src/styles/tokens.css. Every state
// also carries an icon and a label so colour is never the only signal, and
// `danger` is deliberately unused: a retake is amber, not red. Chip labels
// stay in ink: the status hues on their own 10% tint fall just under 4.5:1
// at 12px, so the hue goes on the border, tint and icon instead.
export const STATE_STYLES: Record<
  ProgressState,
  { bar: string; ring: string; chip: string; iconClass: string; icon: string; label: Bilingual }
> = {
  unavailable: {
    bar: "bg-ink/30",
    ring: "stroke-ink/30",
    chip: "border border-dashed border-ink/40 text-ink/80",
    iconClass: "",
    icon: "🔒",
    label: { fil: "Hindi pa available", en: "Not yet available" },
  },
  coming_soon: {
    bar: "bg-ink/30",
    ring: "stroke-ink/30",
    chip: "border border-dashed border-ink/40 text-ink/80",
    iconClass: "",
    icon: "…",
    label: { fil: "Parating pa", en: "Coming soon" },
  },
  not_started: {
    bar: "bg-ink/40",
    ring: "stroke-ink/40",
    chip: "border border-ink/30 text-ink/80",
    iconClass: "",
    icon: "○",
    label: { fil: "Hindi pa nasisimulan", en: "Not started" },
  },
  in_progress: {
    bar: "bg-info",
    ring: "stroke-info",
    chip: "border border-info bg-info/10 text-ink",
    iconClass: "text-info",
    icon: "●",
    label: { fil: "Kasalukuyang ginagawa", en: "In progress" },
  },
  ready_for_assessment: {
    bar: "bg-primary",
    ring: "stroke-primary",
    chip: "bg-primary text-on-primary",
    iconClass: "",
    icon: "→",
    label: { fil: "Handa na sa pagtatasa", en: "Ready for assessment" },
  },
  retake_assessment: {
    bar: "bg-warning",
    ring: "stroke-warning",
    chip: "border border-warning bg-warning/10 text-ink",
    iconClass: "text-warning",
    icon: "↻",
    label: { fil: "Ulitin ang pagtatasa", en: "Retake assessment" },
  },
  completed: {
    bar: "bg-success",
    ring: "stroke-success",
    chip: "border border-success bg-success/10 text-ink",
    iconClass: "text-success",
    icon: "✓",
    label: { fil: "Tapos na", en: "Completed" },
  },
  certified: {
    bar: "bg-success",
    ring: "stroke-success",
    chip: "bg-celebration text-celebration-ink",
    iconClass: "",
    icon: "★",
    label: { fil: "Sertipikado", en: "Certified" },
  },
};

export const STEP_LABELS: Record<StepKey, Bilingual> = {
  pretest: { fil: "Pretest", en: "Pretest" },
  lessons: { fil: "Mga aralin", en: "Lessons" },
  posttest: { fil: "Post-test", en: "Post-test" },
  certificate: { fil: "Sertipiko", en: "Certificate" },
};

export const STEP_STYLES: Record<StepState, { dot: string; icon: string; label: Bilingual }> = {
  done: { dot: "bg-success text-canvas", icon: "✓", label: { fil: "Tapos na", en: "Done" } },
  current: { dot: "bg-info text-canvas", icon: "●", label: { fil: "Ngayon", en: "Up next" } },
  todo: { dot: "border-2 border-ink/30 text-ink/60", icon: "", label: { fil: "Hindi pa", en: "Not yet" } },
  skipped: { dot: "border-2 border-dashed border-ink/30 text-ink/60", icon: "–", label: { fil: "Hindi kailangan", en: "Not required" } },
  retake: { dot: "bg-warning text-canvas", icon: "↻", label: { fil: "Ulitin", en: "Retake" } },
};

export const say = (locale: Locale, text: Bilingual) => (locale === "en" ? text.en : text.fil);
