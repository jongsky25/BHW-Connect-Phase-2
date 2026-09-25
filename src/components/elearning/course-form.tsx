"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Field, inputClass } from "@/components/admin/form-field";
import { mapElearningRpcError } from "@/lib/elearning/error-messages";
import type { Course, DraftModule, ModuleType } from "@/lib/elearning/types";
import { createClient } from "@/lib/supabase/client";
import { OrgUnitPicker } from "@/components/org-unit-picker";
import type { OrgUnitNode } from "@/lib/org-units";

type Props = {
  /** The admin's own org unit: content can be deployed there or anywhere below it. */
  rootOrgUnit: OrgUnitNode;
  onCreated: (course: Course) => void;
};

const MODULE_TYPES: ModuleType[] = ["text", "video", "quiz"];

function emptyModule(): DraftModule {
  return { type: "text", title_fil: "", title_en: "", body_fil: "", body_en: "", video_url: "", questions: [] };
}

function emptyQuestion() {
  return { prompt_fil: "", prompt_en: "", options: [{ fil: "", en: "" }, { fil: "", en: "" }], correct_option_index: 0 };
}

export function CourseForm({ rootOrgUnit, onCreated }: Props) {
  const t = useTranslations("admin.courses");
  const [orgUnit, setOrgUnit] = useState<OrgUnitNode>(rootOrgUnit);
  const orgUnitId = orgUnit.id;
  const [titleFil, setTitleFil] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descriptionFil, setDescriptionFil] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [passingPercent, setPassingPercent] = useState(80);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [modules, setModules] = useState<DraftModule[]>([emptyModule()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateModule(index: number, patch: Partial<DraftModule>) {
    setModules((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  function updateQuestion(mIndex: number, qIndex: number, patch: Partial<DraftModule["questions"][number]>) {
    setModules((prev) =>
      prev.map((m, i) =>
        i === mIndex ? { ...m, questions: m.questions.map((q, j) => (j === qIndex ? { ...q, ...patch } : q)) } : m,
      ),
    );
  }

  function updateOption(mIndex: number, qIndex: number, oIndex: number, patch: Partial<{ fil: string; en: string }>) {
    setModules((prev) =>
      prev.map((m, i) =>
        i === mIndex
          ? {
              ...m,
              questions: m.questions.map((q, j) =>
                j === qIndex ? { ...q, options: q.options.map((o, k) => (k === oIndex ? { ...o, ...patch } : o)) } : q,
              ),
            }
          : m,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const payload = modules.map((m) => ({
        type: m.type,
        title_fil: m.title_fil.trim(),
        title_en: m.title_en.trim(),
        body_fil: m.type === "text" ? m.body_fil.trim() : "",
        body_en: m.type === "text" ? m.body_en.trim() : "",
        video_url: m.type === "video" ? m.video_url.trim() : null,
        questions:
          m.type === "quiz"
            ? m.questions.map((q) => ({
                prompt_fil: q.prompt_fil.trim(),
                prompt_en: q.prompt_en.trim(),
                options: q.options.map((o) => ({ fil: o.fil.trim(), en: o.en.trim() })),
                correct_option_index: q.correct_option_index,
              }))
            : [],
      }));

      const { data, error: rpcError } = await supabase.rpc("rpc_course_create", {
        p_org_unit_id: orgUnitId,
        p_title_fil: titleFil.trim(),
        p_title_en: titleEn.trim(),
        p_description_fil: descriptionFil.trim(),
        p_description_en: descriptionEn.trim(),
        p_quiz_passing_percent: passingPercent,
        p_quiz_max_attempts: maxAttempts,
        p_modules: payload,
      });

      if (rpcError) {
        setError(t(mapElearningRpcError(rpcError.message)));
        return;
      }

      const row = (data as Array<{ course_id: string }> | null)?.[0];
      if (!row) {
        setError(t("genericError"));
        return;
      }
      onCreated({
        id: row.course_id,
        org_unit_id: orgUnitId,
        author_user_id: "",
        title_fil: titleFil.trim(),
        title_en: titleEn.trim(),
        description_fil: descriptionFil.trim(),
        description_en: descriptionEn.trim(),
        status: "draft",
        quiz_passing_percent: passingPercent,
        quiz_max_attempts: maxAttempts,
        created_at: new Date().toISOString(),
        org_units: { name: orgUnit.name },
      });

      setTitleFil("");
      setTitleEn("");
      setDescriptionFil("");
      setDescriptionEn("");
      setPassingPercent(80);
      setMaxAttempts(3);
      setModules([emptyModule()]);
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border border-ink/10 p-4" noValidate>
      <h2 className="text-lg font-semibold text-ink">{t("createHeading")}</h2>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink">{t("orgUnitLabel")}</span>
        <OrgUnitPicker root={rootOrgUnit} onChange={setOrgUnit} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("titleFilLabel")} htmlFor="course-title-fil">
          <input
            id="course-title-fil"
            required
            value={titleFil}
            onChange={(event) => setTitleFil(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("titleEnLabel")} htmlFor="course-title-en">
          <input
            id="course-title-en"
            required
            value={titleEn}
            onChange={(event) => setTitleEn(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("descriptionFilLabel")} htmlFor="course-description-fil">
          <textarea
            id="course-description-fil"
            rows={2}
            value={descriptionFil}
            onChange={(event) => setDescriptionFil(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("descriptionEnLabel")} htmlFor="course-description-en">
          <textarea
            id="course-description-en"
            rows={2}
            value={descriptionEn}
            onChange={(event) => setDescriptionEn(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("passingPercentLabel")} htmlFor="course-passing-percent">
          <input
            id="course-passing-percent"
            type="number"
            min={1}
            max={100}
            required
            value={passingPercent}
            onChange={(event) => setPassingPercent(Number(event.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label={t("maxAttemptsLabel")} htmlFor="course-max-attempts">
          <input
            id="course-max-attempts"
            type="number"
            min={1}
            required
            value={maxAttempts}
            onChange={(event) => setMaxAttempts(Number(event.target.value))}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-ink">{t("modulesHeading")}</h3>
        {modules.map((module, mIndex) => (
          <div key={mIndex} className="flex flex-col gap-3 rounded-md border border-ink/10 p-3">
            <Field label={t("moduleTypeLabel")} htmlFor={`module-type-${mIndex}`}>
              <select
                id={`module-type-${mIndex}`}
                value={module.type}
                onChange={(event) => updateModule(mIndex, { type: event.target.value as ModuleType })}
                className={inputClass}
              >
                {MODULE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`moduleType.${type}`)}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("moduleTitleFilLabel")} htmlFor={`module-title-fil-${mIndex}`}>
                <input
                  id={`module-title-fil-${mIndex}`}
                  required
                  value={module.title_fil}
                  onChange={(event) => updateModule(mIndex, { title_fil: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label={t("moduleTitleEnLabel")} htmlFor={`module-title-en-${mIndex}`}>
                <input
                  id={`module-title-en-${mIndex}`}
                  required
                  value={module.title_en}
                  onChange={(event) => updateModule(mIndex, { title_en: event.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>

            {module.type === "text" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t("moduleBodyFilLabel")} htmlFor={`module-body-fil-${mIndex}`}>
                  <textarea
                    id={`module-body-fil-${mIndex}`}
                    rows={3}
                    required
                    value={module.body_fil}
                    onChange={(event) => updateModule(mIndex, { body_fil: event.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label={t("moduleBodyEnLabel")} htmlFor={`module-body-en-${mIndex}`}>
                  <textarea
                    id={`module-body-en-${mIndex}`}
                    rows={3}
                    required
                    value={module.body_en}
                    onChange={(event) => updateModule(mIndex, { body_en: event.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>
            ) : null}

            {module.type === "video" ? (
              <Field label={t("moduleVideoUrlLabel")} htmlFor={`module-video-url-${mIndex}`}>
                <input
                  id={`module-video-url-${mIndex}`}
                  required
                  placeholder="https://…"
                  value={module.video_url}
                  onChange={(event) => updateModule(mIndex, { video_url: event.target.value })}
                  className={inputClass}
                />
              </Field>
            ) : null}

            {module.type === "quiz" ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-ink">{t("quizQuestionsLabel")}</p>
                {module.questions.map((question, qIndex) => (
                  <div key={qIndex} className="flex flex-col gap-2 rounded-md border border-ink/10 p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        aria-label={t("questionPromptFilLabel")}
                        placeholder={t("questionPromptFilLabel")}
                        required
                        value={question.prompt_fil}
                        onChange={(event) => updateQuestion(mIndex, qIndex, { prompt_fil: event.target.value })}
                        className={inputClass}
                      />
                      <input
                        aria-label={t("questionPromptEnLabel")}
                        placeholder={t("questionPromptEnLabel")}
                        required
                        value={question.prompt_en}
                        onChange={(event) => updateQuestion(mIndex, qIndex, { prompt_en: event.target.value })}
                        className={inputClass}
                      />
                    </div>
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
                        <label className="flex items-center gap-1 text-xs text-ink/70">
                          <input
                            type="radio"
                            name={`correct-${mIndex}-${qIndex}`}
                            checked={question.correct_option_index === oIndex}
                            onChange={() => updateQuestion(mIndex, qIndex, { correct_option_index: oIndex })}
                          />
                          {t("correctAnswerLabel")}
                        </label>
                        <input
                          aria-label={t("optionFilLabel", { number: oIndex + 1 })}
                          placeholder={t("optionFilLabel", { number: oIndex + 1 })}
                          required
                          value={option.fil}
                          onChange={(event) => updateOption(mIndex, qIndex, oIndex, { fil: event.target.value })}
                          className={inputClass}
                        />
                        <input
                          aria-label={t("optionEnLabel", { number: oIndex + 1 })}
                          placeholder={t("optionEnLabel", { number: oIndex + 1 })}
                          required
                          value={option.en}
                          onChange={(event) => updateOption(mIndex, qIndex, oIndex, { en: event.target.value })}
                          className={inputClass}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateModule(mIndex, {
                          questions: module.questions.map((q, i) =>
                            i === qIndex ? { ...q, options: [...q.options, { fil: "", en: "" }] } : q,
                          ),
                        })
                      }
                      className="self-start text-sm font-medium text-secondary underline"
                    >
                      {t("addOptionAction")}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => updateModule(mIndex, { questions: [...module.questions, emptyQuestion()] })}
                  className="self-start rounded-md border border-ink/20 px-3 py-2 text-sm font-medium text-ink hover:bg-ink/5"
                >
                  {t("addQuestionAction")}
                </button>
              </div>
            ) : null}

            {modules.length > 1 ? (
              <button
                type="button"
                onClick={() => setModules((prev) => prev.filter((_, i) => i !== mIndex))}
                className="self-start text-sm font-medium text-danger underline"
              >
                {t("removeModuleAction")}
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setModules((prev) => [...prev, emptyModule()])}
          className="self-start rounded-md border border-ink/20 px-3 py-2 text-sm font-medium text-ink hover:bg-ink/5"
        >
          {t("addModuleAction")}
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-md bg-primary px-6 py-3 font-medium text-on-primary disabled:opacity-60"
      >
        {loading ? t("creating") : t("createAction")}
      </button>
    </form>
  );
}
