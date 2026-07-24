"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Field, inputClass } from "@/components/admin/form-field";
import { mapSurveyRpcError } from "@/lib/surveys/error-messages";
import type { DraftQuestion, QuestionType, Survey } from "@/lib/surveys/types";
import { createClient } from "@/lib/supabase/client";

type OrgUnitOption = { id: string; name: string; level: string };

type Props = {
  orgUnits: OrgUnitOption[];
  defaultOrgUnitId: string;
  onCreated: (survey: Survey) => void;
};

const QUESTION_TYPES: QuestionType[] = ["single_choice", "multi_choice", "rating", "text"];

function emptyQuestion(): DraftQuestion {
  return { type: "single_choice", prompt_fil: "", prompt_en: "", options: [{ fil: "", en: "" }] };
}

export function SurveyForm({ orgUnits, defaultOrgUnitId, onCreated }: Props) {
  const t = useTranslations("admin.surveys");
  const [orgUnitId, setOrgUnitId] = useState(defaultOrgUnitId);
  const [titleFil, setTitleFil] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descriptionFil, setDescriptionFil] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateOption(qIndex: number, oIndex: number, patch: Partial<{ fil: string; en: string }>) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? { ...o, ...patch } : o)) } : q,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const payload = questions.map((q) => ({
        type: q.type,
        prompt_fil: q.prompt_fil.trim(),
        prompt_en: q.prompt_en.trim(),
        options:
          q.type === "single_choice" || q.type === "multi_choice"
            ? q.options.filter((o) => o.fil.trim() || o.en.trim()).map((o) => ({ fil: o.fil.trim(), en: o.en.trim() }))
            : [],
      }));

      const { data, error: rpcError } = await supabase.rpc("rpc_survey_create", {
        p_org_unit_id: orgUnitId,
        p_title_fil: titleFil.trim(),
        p_title_en: titleEn.trim(),
        p_description_fil: descriptionFil.trim(),
        p_description_en: descriptionEn.trim(),
        p_is_anonymous: isAnonymous,
        p_questions: payload,
      });

      if (rpcError) {
        setError(t(mapSurveyRpcError(rpcError.message)));
        return;
      }

      const row = (data as Array<{ survey_id: string }> | null)?.[0];
      if (!row) {
        setError(t("genericError"));
        return;
      }

      const orgUnit = orgUnits.find((unit) => unit.id === orgUnitId) ?? null;
      onCreated({
        id: row.survey_id,
        org_unit_id: orgUnitId,
        author_user_id: "",
        title_fil: titleFil.trim(),
        title_en: titleEn.trim(),
        description_fil: descriptionFil.trim(),
        description_en: descriptionEn.trim(),
        is_anonymous: isAnonymous,
        status: "draft",
        created_at: new Date().toISOString(),
        org_units: orgUnit ? { name: orgUnit.name } : null,
      });

      setTitleFil("");
      setTitleEn("");
      setDescriptionFil("");
      setDescriptionEn("");
      setIsAnonymous(false);
      setQuestions([emptyQuestion()]);
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-md border border-ink/10 p-4"
      noValidate
    >
      <h2 className="text-lg font-semibold text-ink">{t("createHeading")}</h2>

      <Field label={t("orgUnitLabel")} htmlFor="survey-org-unit">
        <select
          id="survey-org-unit"
          required
          value={orgUnitId}
          onChange={(event) => setOrgUnitId(event.target.value)}
          className={inputClass}
        >
          {orgUnits.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("titleFilLabel")} htmlFor="survey-title-fil">
          <input
            id="survey-title-fil"
            required
            value={titleFil}
            onChange={(event) => setTitleFil(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("titleEnLabel")} htmlFor="survey-title-en">
          <input
            id="survey-title-en"
            required
            value={titleEn}
            onChange={(event) => setTitleEn(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("descriptionFilLabel")} htmlFor="survey-description-fil">
          <textarea
            id="survey-description-fil"
            rows={2}
            value={descriptionFil}
            onChange={(event) => setDescriptionFil(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("descriptionEnLabel")} htmlFor="survey-description-en">
          <textarea
            id="survey-description-en"
            rows={2}
            value={descriptionEn}
            onChange={(event) => setDescriptionEn(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={(event) => setIsAnonymous(event.target.checked)}
        />
        {t("anonymousLabel")}
      </label>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-ink">{t("questionsHeading")}</h3>
        {questions.map((question, qIndex) => (
          <div key={qIndex} className="flex flex-col gap-3 rounded-md border border-ink/10 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("questionTypeLabel")} htmlFor={`question-type-${qIndex}`}>
                <select
                  id={`question-type-${qIndex}`}
                  value={question.type}
                  onChange={(event) => updateQuestion(qIndex, { type: event.target.value as QuestionType })}
                  className={inputClass}
                >
                  {QUESTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`questionType.${type}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("promptFilLabel")} htmlFor={`prompt-fil-${qIndex}`}>
                <input
                  id={`prompt-fil-${qIndex}`}
                  required
                  value={question.prompt_fil}
                  onChange={(event) => updateQuestion(qIndex, { prompt_fil: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label={t("promptEnLabel")} htmlFor={`prompt-en-${qIndex}`}>
                <input
                  id={`prompt-en-${qIndex}`}
                  required
                  value={question.prompt_en}
                  onChange={(event) => updateQuestion(qIndex, { prompt_en: event.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>

            {question.type === "single_choice" || question.type === "multi_choice" ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-ink">{t("optionsLabel")}</p>
                {question.options.map((option, oIndex) => (
                  <div key={oIndex} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      aria-label={t("optionFilLabel", { number: oIndex + 1 })}
                      placeholder={t("optionFilLabel", { number: oIndex + 1 })}
                      value={option.fil}
                      onChange={(event) => updateOption(qIndex, oIndex, { fil: event.target.value })}
                      className={inputClass}
                    />
                    <input
                      aria-label={t("optionEnLabel", { number: oIndex + 1 })}
                      placeholder={t("optionEnLabel", { number: oIndex + 1 })}
                      value={option.en}
                      onChange={(event) => updateOption(qIndex, oIndex, { en: event.target.value })}
                      className={inputClass}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    updateQuestion(qIndex, { options: [...question.options, { fil: "", en: "" }] })
                  }
                  className="self-start text-sm font-medium text-secondary underline"
                >
                  {t("addOptionAction")}
                </button>
              </div>
            ) : null}

            {questions.length > 1 ? (
              <button
                type="button"
                onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qIndex))}
                className="self-start text-sm font-medium text-danger underline"
              >
                {t("removeQuestionAction")}
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
          className="self-start rounded-md border border-ink/20 px-3 py-2 text-sm font-medium text-ink hover:bg-ink/5"
        >
          {t("addQuestionAction")}
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
        className="self-start rounded-md bg-primary px-6 py-3 font-medium text-canvas disabled:opacity-60"
      >
        {loading ? t("creating") : t("createAction")}
      </button>
    </form>
  );
}
