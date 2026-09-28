import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { getNavItems } from "@/lib/nav/nav-items";
import { searchContent } from "@/lib/search/content";
import { getRequestFeatureFlags } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await getViewer();
  if (!viewer.appUser || !viewer.role) redirect("/login");
  const [flags, locale, t, tNav, params] = await Promise.all([
    getRequestFeatureFlags(), getLocale(), getTranslations("search"), getTranslations("authHome"), searchParams,
  ]);
  const q = (params.q ?? "").slice(0, 80).trim();
  const nav = getNavItems({ role: viewer.role, flags }).filter((item) =>
    q.length >= 2 && tNav(item.labelKey).toLocaleLowerCase().includes(q.toLocaleLowerCase()),
  );
  const results = q.length >= 2 ? await searchContent(await createClient(), flags, locale, q, 12) : [];

  return <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
    <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t("heading")}</h1>
    <form action="/search" role="search" className="flex gap-2">
      <label htmlFor="search-page-query" className="sr-only">{t("label")}</label>
      <input id="search-page-query" name="q" type="search" defaultValue={q} maxLength={80}
        placeholder={t("placeholder")} className="min-w-0 flex-1 rounded-md border border-ink/20 bg-canvas px-4 py-3 text-ink" />
      <button type="submit" className="rounded-md bg-primary px-5 py-3 font-medium text-on-primary">{t("button")}</button>
    </form>
    {q.length < 2 ? <p className="text-ink/70">{t("hint")}</p> : null}
    {q.length >= 2 && nav.length === 0 && results.length === 0 ? <p className="text-ink/70">{t("empty")}</p> : null}
    {nav.length > 0 ? <section><h2 className="mb-3 text-lg font-semibold">{t("pages")}</h2>
      <ul className="divide-y divide-ink/10 rounded-md border border-ink/10">{nav.map((item) =>
        <li key={item.id}><Link prefetch={false} href={item.href} className="block px-4 py-3 hover:bg-ink/5">{tNav(item.labelKey)}</Link></li>)}</ul>
    </section> : null}
    {results.length > 0 ? <section><h2 className="mb-3 text-lg font-semibold">{t("content")}</h2>
      <ul className="divide-y divide-ink/10 rounded-md border border-ink/10">{results.map((result) =>
        <li key={result.id}><Link prefetch={false} href={result.href} className="block px-4 py-3 hover:bg-ink/5">
          <span className="block text-xs font-medium uppercase tracking-wide text-ink/60">{t(`kind.${result.kind}`)}</span>
          <span className="block font-medium text-ink">{result.title}</span>
          {result.excerpt ? <span className="mt-1 block text-sm text-ink/70">{result.excerpt}</span> : null}
        </Link></li>)}</ul>
    </section> : null}
  </div>;
}
