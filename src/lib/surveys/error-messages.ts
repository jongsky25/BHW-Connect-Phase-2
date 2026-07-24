export type SurveyErrorKey =
  | "notAuthorizedError"
  | "titleRequiredError"
  | "questionRequiredError"
  | "invalidQuestionTypeError"
  | "orgUnitOutOfScopeError"
  | "invalidStatusError"
  | "surveyNotFoundError"
  | "answerRequiredError"
  | "invalidQuestionError"
  | "genericError";

// rpc_survey_* functions raise plain Postgres exceptions (same convention
// as src/lib/admin/error-messages.ts); match on the known message
// substrings so the console can show a localized, friendly message.
export function mapSurveyRpcError(message: string | undefined): SurveyErrorKey {
  if (!message) return "genericError";
  if (message.includes("not authorized")) return "notAuthorizedError";
  if (message.includes("title is required")) return "titleRequiredError";
  if (message.includes("at least one question is required")) return "questionRequiredError";
  if (message.includes("invalid question type")) return "invalidQuestionTypeError";
  if (message.includes("org unit out of scope")) return "orgUnitOutOfScopeError";
  if (message.includes("invalid status")) return "invalidStatusError";
  if (message.includes("survey not found")) return "surveyNotFoundError";
  if (message.includes("at least one answer is required")) return "answerRequiredError";
  if (message.includes("invalid question")) return "invalidQuestionError";
  return "genericError";
}
