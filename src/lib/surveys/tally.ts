import type { AnswerValue, QuestionResultSummary, SurveyQuestion } from "./types";

// Pure summarizer: turns a question + its raw answer values (already
// fetched from survey_answers.value) into counts the results view can
// render as bars, without re-touching the database.
export function summarizeAnswers(question: SurveyQuestion, values: AnswerValue[]): QuestionResultSummary {
  const tally: Record<number, number> = {};
  const textAnswers: string[] = [];

  for (const value of values) {
    if (question.type === "text") {
      if (typeof value === "string" && value.trim() !== "") {
        textAnswers.push(value);
      }
      continue;
    }

    if (question.type === "multi_choice" && Array.isArray(value)) {
      for (const index of value) {
        tally[index] = (tally[index] ?? 0) + 1;
      }
      continue;
    }

    if (typeof value === "number") {
      tally[value] = (tally[value] ?? 0) + 1;
    }
  }

  return { question, tally, textAnswers, responseCount: values.length };
}
