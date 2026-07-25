import Link from "next/link";
import { getTranslations } from "next-intl/server";

// Deliberately a server component with a plain link, not a client
// component with an onClick handler: this page is served from the
// service worker's cache when a BHW has no connection at all, and its
// own hydration JS chunk isn't guaranteed to be cached (see
// public/sw.js). <Link>'s server-rendered output is a real <a href>, so
// the retry action still works with zero client JS.
export default async function OfflinePage() {
  const t = await getTranslations("offline");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start gap-4 px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("heading")}</h1>
      <p className="max-w-xl text-lg text-ink/70">{t("body")}</p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 font-medium text-white hover:opacity-90"
      >
        {t("retry")}
      </Link>
    </div>
  );
}
