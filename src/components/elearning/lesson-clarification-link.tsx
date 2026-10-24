"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const lessonTopics: Record<string, string> = {
  "f1f527f1-aec9-48a8-933b-79fecf63bfb4": "bhw-role",
  "84abb8a8-9d6b-4e09-8936-998738d3ff37": "benefits",
  "e3abb325-3ccc-47e4-95de-94be7d9735ac": "network-referral",
  "9d468901-a2be-4805-afbd-be798136918b": "problem-analysis",
  "9b959b18-f9e4-4b2f-a7ef-569d5992963d": "problem-analysis",
};

export function LessonClarificationLink({ locale }: { locale: string }) {
  const pathname = usePathname();
  const lessonId = pathname?.split("/").filter(Boolean).at(-1);
  const topic = lessonId && lessonTopics[lessonId];
  if (!pathname?.startsWith("/training/") || !topic) return null;
  return <aside className="mx-auto mt-4 w-full max-w-4xl px-4 print:hidden sm:px-6">
    <Link prefetch={false} href={`/content-clarifications#${topic}`} className="flex min-h-[44px] items-center rounded-lg border border-secondary/30 bg-secondary/5 px-4 py-3 text-sm font-medium underline">
      {locale === "en" ? "Review a clearer explanation and practice case for this lesson" : "Tingnan ang mas malinaw na paliwanag at practice case para sa araling ito"}
    </Link>
  </aside>;
}
