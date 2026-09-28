import Link from "next/link";
import { withCourseLayout, withoutCourseLayout } from "@/lib/elearning/course-layout";

export function CourseLayoutToggle({
  href,
  fullPage,
  locale,
}: {
  href: string;
  fullPage: boolean;
  locale: string;
}) {
  const en = locale === "en";
  return (
    <Link
      prefetch={false}
      scroll={false}
      href={fullPage ? withoutCourseLayout(href) : withCourseLayout(href, true)}
      className="inline-flex min-h-[44px] items-center rounded-md border border-ink/20 px-4 py-2 text-sm font-medium hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-primary"
    >
      {fullPage
        ? en ? "Standard view" : "Karaniwang ayos"
        : en ? "Full-page view" : "Tingnan sa buong pahina"}
    </Link>
  );
}
