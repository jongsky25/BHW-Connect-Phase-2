"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { localeCookieName, type Locale } from "@/i18n/locales";
import { mapSettingsRpcError } from "@/lib/settings/error-messages";
import { accentColorHex, colorPresets, primaryColorHex } from "@/lib/settings/palette";
import {
  accentColors,
  densities,
  fontScales,
  lineSpacings,
  motionPreferences,
  primaryColors,
  readingFonts,
  themes,
  type A11ySettings,
  type AccentColor,
  type Density,
  type FontScale,
  type LineSpacing,
  type MotionPreference,
  type PrimaryColor,
  type ReadingFont,
  type Theme,
} from "@/lib/settings/types";
import { useDisplaySettings } from "@/lib/settings/use-display-settings";
import { createClient } from "@/lib/supabase/client";
import { ColourSwatchGroup } from "./colour-swatch-group";
import { SegmentedRadioGroup } from "./segmented-radio-group";

type Props = {
  initialLanguage: Locale;
  initialA11y: A11ySettings;
};

// Increment 2.4 restructures this page into anchored sections. Display
// settings (theme/font size/contrast/density/motion) and Colours (3.5)
// apply instantly and save through use-display-settings.ts's shared
// debounce; Language keeps its pre-2.4 explicit-Save flow, since a language
// change needs a full-page refresh to load the other message catalog.
// Reading & comfort (Phase 4) shares the same instant-apply/debounce flow;
// only colour-blind-safe status colours (4.4) still remain unbuilt.
const CONTRAST_OPTIONS = [false, true] as const;
const UNDERLINE_LINKS_OPTIONS = [false, true] as const;

function writeLocaleCookie(next: Locale) {
  document.cookie = `${localeCookieName}=${next}; path=/; max-age=31536000; samesite=lax`;
}

function capitalize<T extends string>(value: T): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
        {/* text-secondary (the accent colour, per docs/header-navigation-
            display-settings-plan.md's "links and secondary UI" role):
            increment 3.3 made --color-secondary theme-adjusted so this
            clears 4.5:1 on canvas in every theme, the same guarantee
            --color-primary-text already had. */}
        <a
          href="#"
          onClick={(event) => event.preventDefault()}
          className="text-sm font-medium text-secondary underline underline-offset-2"
        >
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

function ColoursFields({
  a11y,
  update,
}: {
  a11y: A11ySettings;
  update: (patch: Partial<A11ySettings>) => void;
}) {
  const t = useTranslations("settings");
  const activePreset = colorPresets.find((preset) => preset.primary === a11y.primary_color && preset.accent === a11y.accent_color);
  const sameColour: boolean = a11y.primary_color === a11y.accent_color;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-ink">{t("coloursPresetsLabel")}</h3>
          {!activePreset ? (
            <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs font-medium text-ink/70">
              {t("coloursCustomLabel")}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          {colorPresets.map((preset) => {
            const selected = activePreset?.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ primary_color: preset.primary, accent_color: preset.accent })}
                className={`flex min-h-11 flex-col items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-ink transition-colors ${
                  selected ? "border-ink bg-ink/5" : "border-ink/15 hover:bg-ink/5"
                }`}
              >
                <span aria-hidden="true" className="flex">
                  <span
                    className="h-5 w-5 rounded-full border-2 border-canvas"
                    style={{ backgroundColor: primaryColorHex[preset.primary] }}
                  />
                  <span
                    className="-ml-2 h-5 w-5 rounded-full border-2 border-canvas"
                    style={{ backgroundColor: accentColorHex[preset.accent] }}
                  />
                </span>
                {t(`coloursPreset.${preset.id}`)}
              </button>
            );
          })}
        </div>
      </div>

      <ColourSwatchGroup
        legend={t("coloursMainLabel")}
        name="primary-color"
        options={primaryColors}
        value={a11y.primary_color}
        onChange={(next: PrimaryColor) => update({ primary_color: next })}
        colourFor={(option) => primaryColorHex[option]}
        labelFor={(option) => t(`colourName.${option}`)}
      />

      <ColourSwatchGroup
        legend={t("coloursAccentLabel")}
        name="accent-color"
        options={accentColors}
        value={a11y.accent_color}
        onChange={(next: AccentColor) => update({ accent_color: next })}
        colourFor={(option) => accentColorHex[option]}
        labelFor={(option) => t(`colourName.${option}`)}
      />

      {sameColour ? (
        <p role="status" className="text-sm text-ink/70">
          {t("coloursSameHint")}
        </p>
      ) : null}
    </div>
  );
}

export function SettingsForm({ initialLanguage, initialA11y }: Props) {
  const t = useTranslations("settings");
  const router = useRouter();

  const [language, setLanguage] = useState<Locale>(initialLanguage);
  const [languageSaving, setLanguageSaving] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const [languageSaved, setLanguageSaved] = useState(false);

  // The settings page is only ever reached signed in (see settings/page.tsx's
  // redirect), so this always writes through the RPC, never the signed-out
  // cookie.
  const { a11y, status: displayStatus, errorKey: displayErrorKey, update: updateDisplay, reset: handleReset } =
    useDisplaySettings(initialA11y, true);

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
          onChange={(next: Theme) => updateDisplay({ theme: next })}
          labelFor={(option) => t(`theme${capitalize(option)}`)}
        />

        <SegmentedRadioGroup
          legend={t("fontScaleLabel")}
          name="font-scale"
          options={fontScales}
          value={a11y.font_scale}
          onChange={(next: FontScale) => updateDisplay({ font_scale: next })}
          labelFor={(option) => t(`fontScale${capitalize(option)}`)}
        />

        <SegmentedRadioGroup
          legend={t("contrastLabel")}
          name="contrast"
          options={CONTRAST_OPTIONS}
          value={a11y.high_contrast}
          onChange={(next: boolean) => updateDisplay({ high_contrast: next })}
          labelFor={(option) => t(option ? "contrastHigh" : "contrastStandard")}
        />

        <SegmentedRadioGroup
          legend={t("densityLabel")}
          name="density"
          options={densities}
          value={a11y.density}
          onChange={(next: Density) => updateDisplay({ density: next })}
          labelFor={(option) => t(`density${capitalize(option)}`)}
        />

        <SegmentedRadioGroup
          legend={t("motionLabel")}
          name="motion"
          options={motionPreferences}
          value={a11y.motion}
          onChange={(next: MotionPreference) => updateDisplay({ motion: next })}
          labelFor={(option) => t(`motion${capitalize(option)}`)}
        />

        <DisplayStatusMessage status={displayStatus} errorKey={displayErrorKey} />

        <PreviewCard />
      </Section>

      <Section id="colours" heading={t("coloursHeading")}>
        {/* Shares the Display section's one status/aria-live region above —
            both write through the same debounced save, so a second region
            here would double-announce the same "Saved" to screen readers. */}
        <ColoursFields a11y={a11y} update={updateDisplay} />
      </Section>

      <Section id="reading" heading={t("readingHeading")}>
        {/* Shares the Display section's one status/aria-live region above —
            both write through the same debounced save, so a second region
            here would double-announce the same "Saved" to screen readers.
            Colour-blind-safe status colours (4.4) still land in a later
            increment. */}
        <SegmentedRadioGroup
          legend={t("underlineLinksLabel")}
          name="underline-links"
          options={UNDERLINE_LINKS_OPTIONS}
          value={a11y.underline_links}
          onChange={(next: boolean) => updateDisplay({ underline_links: next })}
          labelFor={(option) => t(option ? "underlineLinksOn" : "underlineLinksOff")}
        />

        <SegmentedRadioGroup
          legend={t("lineSpacingLabel")}
          name="line-spacing"
          options={lineSpacings}
          value={a11y.line_spacing}
          onChange={(next: LineSpacing) => updateDisplay({ line_spacing: next })}
          labelFor={(option) => t(`lineSpacing${capitalize(option)}`)}
        />

        <SegmentedRadioGroup
          legend={t("readingFontLabel")}
          name="reading-font"
          options={readingFonts}
          value={a11y.reading_font}
          onChange={(next: ReadingFont) => updateDisplay({ reading_font: next })}
          labelFor={(option) => t(`readingFont${capitalize(option)}`)}
        />
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
