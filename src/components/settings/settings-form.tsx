"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { localeCookieName, type Locale } from "@/i18n/locales";
import { mapSettingsRpcError } from "@/lib/settings/error-messages";
import { fontScales, themes, type A11ySettings, type FontScale, type Theme } from "@/lib/settings/types";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialLanguage: Locale;
  initialA11y: A11ySettings;
};

function writeLocaleCookie(next: Locale) {
  document.cookie = `${localeCookieName}=${next}; path=/; max-age=31536000; samesite=lax`;
}

export function SettingsForm({ initialLanguage, initialA11y }: Props) {
  const t = useTranslations("settings");
  const router = useRouter();

  const [language, setLanguage] = useState<Locale>(initialLanguage);
  const [theme, setTheme] = useState<Theme>(initialA11y.theme);
  const [fontScale, setFontScale] = useState<FontScale>(initialA11y.font_scale);
  const [highContrast, setHighContrast] = useState(initialA11y.high_contrast);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_update_settings", {
        p_language: language,
        p_theme: theme,
        p_font_scale: fontScale,
        p_high_contrast: highContrast,
      });

      if (rpcError) {
        setError(t(mapSettingsRpcError(rpcError.message)));
        return;
      }

      await supabase.rpc("rpc_onboarding_complete_step", { p_step: "language" });

      writeLocaleCookie(language);
      setSaved(true);
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    // This is the one screen where a user can select dark theme / high
    // contrast, so it's also the one place its own controls get exercised
    // against every combination. bg-ink/text-canvas is used instead of the
    // usual bg-primary/text-canvas or text-success accents because ink and
    // canvas are always each other's inverse in every theme + contrast
    // state, guaranteeing AA contrast; primary and success are fixed brand
    // colors tuned against the default palette and don't hold up once
    // canvas swings to the dark or high-contrast extremes.
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">{t("languageLabel")}</legend>
        <div className="inline-flex w-fit overflow-hidden rounded-full border border-ink/15">
          {(["fil", "en"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={language === option}
              onClick={() => setLanguage(option)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                language === option ? "bg-ink text-canvas" : "bg-transparent text-ink hover:bg-ink/5"
              }`}
            >
              {t(option === "fil" ? "languageFil" : "languageEn")}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">{t("themeLabel")}</legend>
        <div className="inline-flex w-fit overflow-hidden rounded-full border border-ink/15">
          {themes.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={theme === option}
              onClick={() => setTheme(option)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                theme === option ? "bg-ink text-canvas" : "bg-transparent text-ink hover:bg-ink/5"
              }`}
            >
              {t(`theme${capitalize(option)}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">{t("fontScaleLabel")}</legend>
        <div className="inline-flex w-fit overflow-hidden rounded-full border border-ink/15">
          {fontScales.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={fontScale === option}
              onClick={() => setFontScale(option)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                fontScale === option ? "bg-ink text-canvas" : "bg-transparent text-ink hover:bg-ink/5"
              }`}
            >
              {t(`fontScale${capitalize(option)}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex min-h-[44px] items-center gap-3 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={highContrast}
          onChange={(event) => setHighContrast(event.target.checked)}
          className="h-5 w-5 rounded border-ink/30"
        />
        {t("highContrastLabel")}
      </label>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {saved && !error ? (
        <p role="status" className="text-sm font-medium text-ink">
          {t("savedNotice")}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-md bg-ink px-6 py-3 font-medium text-canvas transition-opacity disabled:opacity-60"
      >
        {saving ? t("saving") : t("saveAction")}
      </button>
    </form>
  );
}

function capitalize<T extends string>(value: T): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
