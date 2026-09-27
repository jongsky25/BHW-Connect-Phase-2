import { useTranslations } from "next-intl";

// Fixed pixel heights (not rem-based Tailwind steps like h-5/h-8/h-12):
// the mark is a logo, not body content, so it must not grow with the
// viewer's font-scale setting the way `html`'s root font-size does
// (src/app/globals.css). Width comes from the `.equity-mark` class's own
// `aspect-ratio` (see globals.css), matching the source PNG's 2048×672.
const SIZE_CLASSES = {
  sm: "h-[20px]",
  md: "h-[32px]",
  lg: "h-[48px]",
} as const;

export type EquityMarkSize = keyof typeof SIZE_CLASSES;

type Props = {
  size: EquityMarkSize;
  /**
   * True when adjacent visible text already carries the accessible name
   * (the header's "BHW Connect" link text) — the mark is then purely
   * decorative and hidden from assistive tech. False everywhere else, where
   * the mark is the only thing naming "Equity in Health" on the page.
   */
  decorative?: boolean;
  className?: string;
};

export function EquityMark({ size, decorative = false, className }: Props) {
  const t = useTranslations("common");

  return (
    <span
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : t("equityMarkLabel")}
      className={`equity-mark inline-block w-auto shrink-0 ${SIZE_CLASSES[size]}${className ? ` ${className}` : ""}`}
    />
  );
}
