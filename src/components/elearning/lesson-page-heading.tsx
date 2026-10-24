import Link from "next/link";

export type LessonHeadingContext = {
  chapterNumber: number;
  chapterTitle: string;
  chapterHref: string;
  subchapterTitle: string;
  subchapterHref: string;
};

/** Route-owned context; titles and numbering come from the published chapter/module. */
export function LessonPageHeading({ title, context, locale, eyebrow, intro }: {
  title: string; context: LessonHeadingContext; locale: string; eyebrow?: string; intro?: string;
}) {
  const en = locale === "en";
  return <header className="min-w-0 space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-6" data-lesson-heading>
    {eyebrow && <p className="text-sm font-semibold text-ink">{eyebrow}</p>}
    <div className="min-w-0 space-y-2 break-words [overflow-wrap:anywhere]">
      <p className="text-sm font-medium">
        <Link prefetch={false} href={context.chapterHref} className="block min-h-11 py-2 underline">
          <span className="font-bold">{en ? "Chapter" : "Kabanata"} {context.chapterNumber}</span>
          {" "}<span>· {context.chapterTitle}</span>
        </Link>
      </p>
      <p className="text-sm">
        <Link prefetch={false} href={context.subchapterHref} className="block min-h-11 py-2 underline">
          {en ? "Subchapter" : "Bahagi ng kabanata"}: {context.subchapterTitle}
        </Link>
      </p>
      <h1 className="text-2xl font-bold leading-tight text-ink sm:text-3xl">{title}</h1>
    </div>
    {intro && <p className="text-ink/80">{intro}</p>}
  </header>;
}
