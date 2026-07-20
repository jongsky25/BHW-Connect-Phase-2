import { getTranslations } from "next-intl/server";
import Link from "next/link";

export async function KbNav() {
  const t = await getTranslations("kb");

  const links = [
    { href: "/admin/kb/categories", label: t("categoriesHeading") },
    { href: "/admin/kb/entries", label: t("entriesHeading") },
    { href: "/admin/kb/articles", label: t("articlesHeading") },
    { href: "/admin/kb/synonyms", label: t("synonymsHeading") },
  ];

  return (
    <nav className="flex flex-wrap gap-4 border-b border-ink/10 pb-4 text-sm">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="text-secondary hover:underline">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
