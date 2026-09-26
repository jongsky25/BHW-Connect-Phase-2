"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { localeCookieName, type Locale } from "@/i18n/locales";
import { mapSettingsRpcError } from "@/lib/settings/error-messages";
import { defaultA11ySettings, displayAttributes, fontScales, themes, type A11ySettings, type FontScale, type Theme } from "@/lib/settings/types";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialLanguage: Locale;
  initialA11y: A11ySettings;
};

// Increment 2.4 restructures this page into anchored sections. Display
// settings (theme/font size/contrast) apply instantly and save through a
// shared debounce; Language keeps its pre-2.4 explicit-Save flow, since a
// language change needs a full-page refresh to load the other message
// catalog. Colours (3.5) and reading aids (Phase 4) are placeholders here —
// nothing in this increment writes those keys yet.
const DISPLAY_SAVE_DEBOUNCE_MS = 600;

const CONTRAST_OPTIONS = [false, true] as const;

function writeLocaleCookie(next: Locale) {
  document.cookie = `${localeCookieName}=${next}; path=/; max-age=31536000; samesite=lax`;
}

function capitalize<T extends string>(value: T): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// This is the one screen where a user can select dark theme / high contrast,
// so it's also the one place its own controls get exercised against every
// combination. bg-ink/text-canvas is used instead of the usual
// bg-primary/text-on-primary or text-success accents because ink and canvas
// are always each other's inverse in every theme + contrast state,
// guaranteeing AA contrast; primary and success are fixed brand colors tuned
// against the default palette and don't hold up once canvas swings to the
// dark or high-contrast extremes.
function SegmentedRadioGroup<T>({
  legend,
  name,
  options,
  value,
  onChange,
  labelFor,
}: {
  legend: string;
  name: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  labelFor: (option: T) => string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-ink">{legend}</legend>
      <div className="inline-flex w-fit overflow-hidden rounded-full border border-ink/15">
        {options.map((option, index) => {
          const checked = value === option;
          return (
            <label
              key={index}
              className={`relative flex min-h-11 min-w-11 cursor-pointer items-center justify-center px-4 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${
                checked ? "bg-ink text-canvas" : "bg-transparent text-ink hover:bg-ink/5"
              }`}
            >
              {/* An `sr-only` input clips to 1x1px at a fixed offset, away
                  from the label's own rendered box — real browsers then
                  can't hit-test a click there (Playwright: "element is
                  outside of the viewport" / a sibling "intercepts pointer
                  events"), even though jsdom-based component tests never
                  notice since they don't do real hit-testing. An invisible
                  input stretched to cover the whole label keeps every click
                  on the label landing on the input itself. */}
              <input
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onChange(option)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              {labelFor(option)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Section({ id, heading, children }: { id: string; heading: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-ink/10 pt-6 first:border-t-0 first:pt-0">
      <h2 id={id} className="text-lg font-semibold text-ink">
        {heading}
      </h2>
      {children}
    </section>
  );
}

function DisplayStatusMessage({ status, errorKey }: { status: "idle" | "saving" | "saved" | "error"; errorKey: string | null }) {
  const t = useTranslations("settings");

  return (
    <div aria-live="polite">
      {status === "error" && errorKey ? (
        <p role="alert" className="text-sm text-danger">
          {t(errorKey)}
        </p>
      ) : null}
      {status === "saving" ? <p className="text-sm text-ink/70">{t("saving")}</p> : null}
      {status === "saved" ? (
        <p role="status" className="text-sm font-medium text-ink">
          {t("savedNotice")}
        </p>
      ) : null}
    </div>
  );
}

function PreviewCard() {
  const t = useTranslations("settings");

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-ink/15 p-4">
      <h3 className="text-sm font-semibold text-ink">{t("previewHeading")}</h3>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary">
          {t("previewButton")}
        </span>
        <a href="#" onClick={(event) => event.preventDefault()} className="text-sm font-medium text-secondary">
          {t("previewLink")}
        </a>
        <span className="rounded-full border border-ink/15 bg-ink/5 px-3 py-1 text-xs font-medium text-ink">
          {t("previewChip")}
        </span>
      </div>
      {/* Solid fill + text-canvas, not a tinted background with colored
          text: the four status hues' light/dark values are tuned so this
          fill/on-fill pairing clears 4.5:1 in both themes (same pairing as
          e.g. user-row.tsx's bg-danger/text-canvas actions) — the
          tinted-background pattern (bg-success/10 + text-success) measured
          as low as 4.06:1 here and failed axe. */}
      <div className="flex flex-wrap gap-2">
        <span className="rounded-md bg-success px-2.5 py-1 text-xs font-semibold text-canvas">
          {t("previewBadgeSuccess")}
        </span>
        <span className="rounded-md bg-warning px-2.5 py-1 text-xs font-semibold text-canvas">
          {t("previewBadgeWarning")}
        </span>
        <span className="rounded-md bg-danger px-2.5 py-1 text-xs font-semibold text-canvas">
          {t("previewBadgeDanger")}
        </span>
        <span className="rounded-md bg-info px-2.5 py-1 text-xs font-semibold text-canvas">
          {t("previewBadgeInfo")}
        </span>
      </div>
      <p className="text-sm text-ink/70">{t("previewBody")}</p>
    </div>
  );
}

export function SettingsForm({ initialLanguage, initialA11y }: Props) {
  const t = useTranslations("settings");
  const router = useRouter();

  const [language, setLanguage] = useState<Locale>(initialLanguage);
  const [a11y, setA11y] = useState<A11ySettings>(initialA11y);
  const [languageSaving, setLanguageSaving] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const [languageSaved, setLanguageSaved] = useState(false);

  const [displayStatus, setDisplayStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [displayErrorKey, setDisplayErrorKey] = useState<string | null>(null);

  // The last successfully-saved display settings, so a failed save can
  // revert both the UI state and the <html> attributes to it rather than to
  // whatever the page happened to load with.
  const lastSavedA11yRef = useRef(initialA11y);
  const pendingPatchRef = useRef<Partial<A11ySettings>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  function applyDisplayAttributes(next: A11ySettings) {
    const html = document.documentElement;
    for (const name of ["data-theme", "data-font-scale", "data-contrast"]) {
      html.removeAttribute(name);
    }
    for (const [name, value] of Object.entries(displayAttributes(next))) {
      if (name === "data-theme" || name === "data-font-scale" || name === "data-contrast") {
        html.setAttribute(name, value);
      }
    }
  }

  async function flushDisplaySave() {
    const patch = pendingPatchRef.current;
    pendingPatchRef.current = {};
    if (Object.keys(patch).length === 0) return;

    setDisplayStatus("saving");
    setDisplayErrorKey(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("rpc_update_display_settings", { p_settings: patch });

      if (error) {
        setDisplayErrorKey(mapSettingsRpcError(error.message));
        setA11y(lastSavedA11yRef.current);
        applyDisplayAttributes(lastSavedA11yRef.current);
        setDisplayStatus("error");
        return;
      }

      lastSavedA11yRef.current = { ...lastSavedA11yRef.current, ...patch };
      setDisplayStatus("saved");
    } catch {
      setDisplayErrorKey("genericError");
      setA11y(lastSavedA11yRef.current);
      applyDisplayAttributes(lastSavedA11yRef.current);
      setDisplayStatus("error");
    }
  }

  function updateDisplay<K extends "theme" | "font_scale" | "high_contrast">(key: K, value: A11ySettings[K]) {
    const next = { ...a11y, [key]: value };
    setA11y(next);
    applyDisplayAttributes(next);

    pendingPatchRef.current = { ...pendingPatchRef.current, [key]: value };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushDisplaySave, DISPLAY_SAVE_DEBOUNCE_MS);
  }

  async function handleReset() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    pendingPatchRef.current = {};
    setA11y(defaultA11ySettings);
    applyDisplayAttributes(defaultA11ySettings);
    setDisplayStatus("saving");
    setDisplayErrorKey(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("rpc_update_display_settings", { p_settings: defaultA11ySettings });

      if (error) {
        setDisplayErrorKey(mapSettingsRpcError(error.message));
        setA11y(lastSavedA11yRef.current);
        applyDisplayAttributes(lastSavedA11yRef.current);
        setDisplayStatus("error");
        return;
      }

      lastSavedA11yRef.current = defaultA11ySettings;
      setDisplayStatus("saved");
    } catch {
      setDisplayErrorKey("genericError");
      setA11y(lastSavedA11yRef.current);
      applyDisplayAttributes(lastSavedA11yRef.current);
      setDisplayStatus("error");
    }
  }

  async function handleLanguageSave() {
    setLanguageError(null);
    setLanguageSaved(false);
    setLanguageSaving(true);

    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_update_settings", {
        p_language: language,
        p_theme: a11y.theme,
        p_font_scale: a11y.font_scale,
        p_high_contrast: a11y.high_contrast,
      });

      if (rpcError) {
        setLanguageError(t(mapSettingsRpcError(rpcError.message)));
        return;
      }

      await supabase.rpc("rpc_onboarding_complete_step", { p_step: "language" });

      writeLocaleCookie(language);
      setLanguageSaved(true);
      router.refresh();
    } catch {
      setLanguageError(t("genericError"));
    } finally {
      setLanguageSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Section id="language" heading={t("languageLabel")}>
        <SegmentedRadioGroup
          legend={t("languageLabel")}
          name="language"
          options={["fil", "en"] as const}
          value={language}
          onChange={setLanguage}
          labelFor={(option) => t(option === "fil" ? "languageFil" : "languageEn")}
        />

        {languageError ? (
          <p role="alert" className="text-sm text-danger">
            {languageError}
          </p>
        ) : null}

        {languageSaved && !languageError ? (
          <p role="status" className="text-sm font-medium text-ink">
            {t("savedNotice")}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleLanguageSave}
          disabled={languageSaving}
          className="self-start rounded-md bg-ink px-6 py-3 font-medium text-canvas transition-opacity disabled:opacity-60"
        >
          {languageSaving ? t("saving") : t("saveAction")}
        </button>
      </Section>

      <Section id="display" heading={t("displayHeading")}>
        <SegmentedRadioGroup
          legend={t("themeLabel")}
          name="theme"
          options={themes}
          value={a11y.theme}
          onChange={(next: Theme) => updateDisplay("theme", next)}
          labelFor={(option) => t(`theme${capitalize(option)}`)}
        />

        <SegmentedRadioGroup
          legend={t("fontScaleLabel")}
          name="font-scale"
          options={fontScales}
          value={a11y.font_scale}
          onChange={(next: FontScale) => updateDisplay("font_scale", next)}
          labelFor={(option) => t(`fontScale${capitalize(option)}`)}
        />

        <SegmentedRadioGroup
          legend={t("contrastLabel")}
          name="contrast"
          options={CONTRAST_OPTIONS}
          value={a11y.high_contrast}
          onChange={(next: boolean) => updateDisplay("high_contrast", next)}
          labelFor={(option) => t(option ? "contrastHigh" : "contrastStandard")}
        />

        <DisplayStatusMessage status={displayStatus} errorKey={displayErrorKey} />

        <PreviewCard />
      </Section>

      <Section id="colours" heading={t("coloursHeading")}>
        <p className="text-sm text-ink/70">{t("coloursPlaceholder")}</p>
      </Section>

      <Section id="reading" heading={t("readingHeading")}>
        <p className="text-sm text-ink/70">{t("readingPlaceholder")}</p>
      </Section>

      <Section id="reset" heading={t("resetHeading")}>
        {/* Reset writes through the same rpc_update_display_settings flow as
            the Display controls above, and shares its one status/aria-live
            region — a second live region announcing the same text here
            would double-announce to screen readers. */}
        <p className="text-sm text-ink/70">{t("resetIntro")}</p>
        <button
          type="button"
          onClick={handleReset}
          className="self-start rounded-md border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
        >
          {t("resetAction")}
        </button>
      </Section>
    </div>
  );
}
