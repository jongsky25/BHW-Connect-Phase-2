"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {persistLanguage} from '@/app/actions/set-language';
import { locales, localeCookieName, type Locale } from "@/i18n/locales";

function writeLocaleCookie(next: Locale) {
  document.cookie = `${localeCookieName}=${next}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageToggle({signedIn=false}:{signedIn?:boolean}) {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error,setError]=useState(false);

  function setLocale(next: Locale) {
    setError(false);
    startTransition(async () => {
      try {
        if(signedIn && !await persistLanguage(next)){setError(true);return;}
        writeLocaleCookie(next);
        router.refresh();
      } catch {setError(true);}
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
      {error && <span role="alert">{locale==='en'?'Language could not be saved. Try again.':'Hindi nai-save ang wika. Subukang muli.'}</span>}
    </div>
  );
}
