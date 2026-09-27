import { useTranslations } from "next-intl";
import Link from "next/link";
import { SegmentedRadioGroup } from "@/components/settings/segmented-radio-group";
import { accentColorHex, colorPresets, primaryColorHex } from "@/lib/settings/palette";
import { themes, type A11ySettings, type FontScale, type Theme } from "@/lib/settings/types";

// A reduced 3-step version of the full Settings → Display font-size group
// (sm/md/lg, no "xl") — the plan's own compact "A−/A/A+" spec for this quick
// control, not a fourth option that got lost.
const QUICK_FONT_SCALES = ["sm", "md", "lg"] as const satisfies readonly FontScale[];

function capitalize<T extends string>(value: T): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type Props = {
  a11y: A11ySettings;
  update: (patch: Partial<A11ySettings>) => void;
  /** Closes the popover/drawer this is rendered inside, when the "More
      display settings" link is followed. */
  onNavigate?: () => void;
};

// The shared content of the header's quick-display popover (desktop) and
// the mobile drawer's inline "Display" section (increment 3.5) — same
// controls, just a different wrapper (a popover panel vs. rendered directly
// in the drawer, per the plan's "Mobile" bullet).
export function QuickDisplayControls({ a11y, update, onNavigate }: Props) {
  const t = useTranslations("settings");
  const activePreset = colorPresets.find(
    (preset) => preset.primary === a11y.primary_color && preset.accent === a11y.accent_color,
  );

  return (
    <div className="flex flex-col gap-4">
      <SegmentedRadioGroup
        legend={t("themeLabel")}
        name="quick-theme"
        options={themes}
        value={a11y.theme}
        onChange={(next: Theme) => update({ theme: next })}
        labelFor={(option) => t(`theme${capitalize(option)}`)}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">{t("coloursPresetsLabel")}</legend>
        <div className="flex flex-wrap gap-2">
          {colorPresets.map((preset) => {
            const selected = activePreset?.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ primary_color: preset.primary, accent_color: preset.accent })}
                className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium text-ink transition-colors ${
                  selected ? "border-ink bg-ink/5" : "border-ink/15 hover:bg-ink/5"
                }`}
              >
                <span aria-hidden="true" className="flex">
                  <span
                    className="h-3 w-3 rounded-full border border-canvas"
                    style={{ backgroundColor: primaryColorHex[preset.primary] }}
                  />
                  <span
                    className="-ml-1 h-3 w-3 rounded-full border border-canvas"
                    style={{ backgroundColor: accentColorHex[preset.accent] }}
                  />
                </span>
                {t(`coloursPreset.${preset.id}`)}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* value can be "xl" (only selectable on the full Settings page) — this
          group simply shows none of its three options as checked then,
          rather than misrepresenting "xl" as "lg". */}
      <SegmentedRadioGroup
        legend={t("fontScaleLabel")}
        name="quick-font-scale"
        options={QUICK_FONT_SCALES}
        value={a11y.font_scale}
        onChange={(next) => update({ font_scale: next })}
        labelFor={(option) => (option === "sm" ? t("textSizeDown") : option === "lg" ? t("textSizeUp") : t("textSizeDefault"))}
        ariaLabelFor={(option) => t(`fontScale${capitalize(option)}`)}
      />

      <Link
        href="/settings#display"
        onClick={onNavigate}
        className="text-sm font-medium text-secondary underline underline-offset-2"
      >
        {t("moreDisplaySettingsCta")} <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
