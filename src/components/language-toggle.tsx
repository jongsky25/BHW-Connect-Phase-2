"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { locales, localeCookieName, type Locale } from "@/i18n/locales";

function writeLocaleCookie(next: Locale) {
  document.cookie = `${localeCookieName}=${next}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageToggle() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    writeLocaleCookie(next);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-ink/70">{t("languageToggleLabel")}</span>
      <div className="inline-flex overflow-hidden rounded-full border border-ink/15">
        {locales.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={locale === option}
            disabled={isPending}
            onClick={() => setLocale(option)}
            className={`px-3 py-1 font-medium transition-colors disabled:opacity-60 ${
              locale === option
                ? "bg-primary text-on-primary"
                : "bg-transparent text-ink hover:bg-ink/5"
            }`}
          >
            {option === "fil" ? "Filipino" : "English"}
          </button>
        ))}
      </div>
    </div>
  );
}
