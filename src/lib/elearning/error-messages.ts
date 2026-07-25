export type ElearningErrorKey =
  | "notAuthorizedError"
  | "titleRequiredError"
  | "moduleRequiredError"
  | "invalidModuleTypeError"
  | "quizQuestionRequiredError"
  | "orgUnitOutOfScopeError"
  | "invalidStatusError"
  | "courseNotFoundError"
  | "courseHasProgressError"
  | "moduleNotFoundError"
  | "quizModuleNotFoundError"
  | "useQuizSubmitError"
  | "quizAlreadyPassedError"
  | "noAttemptsRemainingError"
  | "quizHasNoQuestionsError"
  | "invalidQuestionError"
  | "assessmentNotFoundError"
  | "assessmentAlreadyClaimedError"
  | "genericError";

// rpc_course_*/rpc_assessment_* raise plain Postgres exceptions (same
// convention as src/lib/admin/error-messages.ts and src/lib/surveys/error-messages.ts);
// match on the known message substrings so the console can show a
// localized, friendly message.
export function mapElearningRpcError(message: string | undefined): ElearningErrorKey {
  if (!message) return "genericError";
  if (message.includes("not authorized")) return "notAuthorizedError";
  if (message.includes("title is required")) return "titleRequiredError";
  if (message.includes("at least one module is required")) return "moduleRequiredError";
  if (message.includes("invalid module type")) return "invalidModuleTypeError";
  if (message.includes("a quiz module needs at least one question")) return "quizQuestionRequiredError";
  if (message.includes("org unit out of scope")) return "orgUnitOutOfScopeError";
  if (message.includes("invalid status")) return "invalidStatusError";
  if (message.includes("course has learner progress")) return "courseHasProgressError";
  if (message.includes("course not found")) return "courseNotFoundError";
  if (message.includes("use rpc_course_quiz_submit for quiz modules")) return "useQuizSubmitError";
  if (message.includes("quiz module not found")) return "quizModuleNotFoundError";
  if (message.includes("module not found")) return "moduleNotFoundError";
  if (message.includes("quiz already passed")) return "quizAlreadyPassedError";
  if (message.includes("no attempts remaining")) return "noAttemptsRemainingError";
  if (message.includes("quiz has no questions")) return "quizHasNoQuestionsError";
  if (message.includes("invalid question")) return "invalidQuestionError";
  if (message.includes("assessment already claimed")) return "assessmentAlreadyClaimedError";
  if (message.includes("assessment not found")) return "assessmentNotFoundError";
  return "genericError";
}
