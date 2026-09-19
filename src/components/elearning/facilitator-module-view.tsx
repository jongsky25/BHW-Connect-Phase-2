"use client";

import { useTranslations } from "next-intl";
import { sanitizeSvgMarkup } from "@/lib/elearning/svg-allowlist";
import {
  TIERS_FOR_DENSITY,
  type CourseModule,
  type CourseModuleFacilitatorNotes,
  type CourseModuleVisual,
  type LessonDensity,
} from "@/lib/elearning/types";

type Props = {
  module: CourseModule;
  visuals: CourseModuleVisual[];
  notes: CourseModuleFacilitatorNotes | null;
  density: LessonDensity;
  locale: string;
};

// §A.2/§A.4/INC-23 per-module facilitator view: the BHW-facing content
// (objectives/sections/visuals, filtered to the session's own density —
// exactly what this cohort will see) alongside course_module_facilitator_notes
// (script, competency statement, read-only observation checklist). Sized for
// presentation, not phone width — the facilitator reads this while standing
// in front of the room and presenting the visual (§A.2), so type is larger
// here than the BHW renderer (lesson-module.tsx) uses.
export function FacilitatorModuleView({ module, visuals, notes, density, locale }: Props) {
  const t = useTranslations("trainingSessions");
  const tiers = TIERS_FOR_DENSITY[density];
  const title = locale === "en" ? module.title_en : module.title_fil;
  const objectives = locale === "en" ? module.objectives_en : module.objectives_fil;
  const sections = (module.lesson?.sections ?? []).filter((section) => tiers.includes(section.tier));

  return (
    <div className="flex flex-col gap-6 rounded-md border border-ink/10 p-4 sm:p-6">
      <h3 className="text-xl font-semibold text-ink sm:text-2xl">{title}</h3>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            {t("bhwContentHeading")}
          </h4>

          {objectives.length > 0 ? (
            <div className="rounded-md border border-primary-text/30 bg-primary/5 p-4">
              <p className="text-base font-medium text-ink sm:text-lg">{t("objectivesHeading")}</p>
              <ul className="mt-2 list-disc pl-5 text-base text-ink/80 sm:text-lg">
                {objectives.map((objective, index) => (
                  <li key={index}>{objective}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {sections.map((section, index) => {
            const heading = locale === "en" ? section.heading_en : section.heading_fil;
            const body = locale === "en" ? section.body_en : section.body_fil;
            const takeaway = locale === "en" ? section.takeaway_en : section.takeaway_fil;
            const visual =
              visuals.find((v) => v.position === section.visual_position && tiers.includes(v.tier)) ?? null;

            return (
              <div key={index} className="flex flex-col gap-3">
                <h5 className="text-lg font-medium text-ink sm:text-xl">{heading}</h5>
                <p className="whitespace-pre-wrap text-base text-ink/80 sm:text-lg">{body}</p>
                {visual ? <FacilitatorVisual visual={visual} locale={locale} /> : null}
                {takeaway ? (
                  <p className="border-l-2 border-secondary pl-3 text-base font-medium text-ink sm:text-lg">
                    {takeaway}
                  </p>
                ) : null}
              </div>
            );
          })}

          {sections.length === 0 && objectives.length === 0 ? (
            <p className="text-sm text-ink/60">{t("noBhwContent")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-5 lg:border-l lg:border-ink/10 lg:pl-6">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            {t("facilitatorNotesHeading")}
          </h4>

          {notes ? (
            <>
              {notes.competency_statement_fil || notes.competency_statement_en ? (
                <div className="rounded-md border border-secondary/30 bg-secondary/5 p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
                    {t("competencyStatementHeading")}
                  </p>
                  <p className="mt-1 text-base text-ink sm:text-lg">
                    {locale === "en" ? notes.competency_statement_en : notes.competency_statement_fil}
                  </p>
                </div>
              ) : null}

              {notes.notes_fil || notes.notes_en ? (
                <div className="flex flex-col gap-2">
                  <p className="text-base font-medium text-ink sm:text-lg">{t("scriptHeading")}</p>
                  <p className="whitespace-pre-wrap text-base text-ink/80 sm:text-lg">
                    {locale === "en" ? notes.notes_en : notes.notes_fil}
                  </p>
                </div>
              ) : null}

              {notes.observation_indicators.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <p className="text-base font-medium text-ink sm:text-lg">{t("observationChecklistHeading")}</p>
                  <p className="text-sm text-ink/60">{t("observationChecklistReadOnlyNote")}</p>
                  <ul className="flex flex-col gap-4">
                    {notes.observation_indicators.map((indicator, index) => (
                      <li key={index} className="rounded-md border border-ink/10 p-3">
                        <p className="text-sm font-semibold text-success">
                          {t("observableLabel")}{" "}
                          {locale === "en" ? indicator.observable_en : indicator.observable_fil}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-danger">
                          {t("notYetLabel")}{" "}
                          {locale === "en" ? indicator.not_yet_en : indicator.not_yet_fil}
                        </p>
                        <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <div className="rounded-md bg-success/10 p-2">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-success">
                              {t("levelKayaNaLabel")}
                            </dt>
                            <dd className="mt-1 text-sm text-ink/80">
                              {locale === "en" ? indicator.levels.kaya_na_en : indicator.levels.kaya_na_fil}
                            </dd>
                          </div>
                          <div className="rounded-md bg-celebration/40 p-2">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-ink/70">
                              {t("levelKailanganPracticeLabel")}
                            </dt>
                            <dd className="mt-1 text-sm text-ink/80">
                              {locale === "en"
                                ? indicator.levels.kailangan_practice_en
                                : indicator.levels.kailangan_practice_fil}
                            </dd>
                          </div>
                          <div className="rounded-md bg-danger/10 p-2">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-danger">
                              {t("levelHindiPaLabel")}
                            </dt>
                            <dd className="mt-1 text-sm text-ink/80">
                              {locale === "en" ? indicator.levels.hindi_pa_en : indicator.levels.hindi_pa_fil}
                            </dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-ink/60">{t("noFacilitatorNotes")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FacilitatorVisual({ visual, locale }: { visual: CourseModuleVisual; locale: string }) {
  const caption = locale === "en" ? visual.caption_en : visual.caption_fil;
  const altText = locale === "en" ? visual.alt_text_en : visual.alt_text_fil;
  const sanitized = visual.svg_markup ? sanitizeSvgMarkup(visual.svg_markup) : null;

  if (!sanitized && !visual.image_url) {
    return null;
  }

  return (
    <figure className="flex flex-col gap-2 rounded-md border border-ink/10 p-3">
      {sanitized ? (
        <div role="img" aria-label={altText} className="text-ink" dangerouslySetInnerHTML={{ __html: sanitized }} />
      ) : visual.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={visual.image_url} alt={altText} className="w-full rounded-md" />
      ) : null}
      <figcaption className="text-sm text-ink/70">{caption}</figcaption>
    </figure>
  );
}
