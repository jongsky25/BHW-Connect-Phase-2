import { describe, expect, it } from "vitest";
import { mapSurveyRpcError } from "./error-messages";

describe("mapSurveyRpcError", () => {
  it("maps not-authorized", () => {
    expect(mapSurveyRpcError("not authorized")).toBe("notAuthorizedError");
  });

  it("maps survey creation guards", () => {
    expect(mapSurveyRpcError("title is required")).toBe("titleRequiredError");
    expect(mapSurveyRpcError("at least one question is required")).toBe("questionRequiredError");
    expect(mapSurveyRpcError("invalid question type")).toBe("invalidQuestionTypeError");
    expect(mapSurveyRpcError("org unit out of scope")).toBe("orgUnitOutOfScopeError");
  });

  it("maps status-change guards", () => {
    expect(mapSurveyRpcError("invalid status")).toBe("invalidStatusError");
    expect(mapSurveyRpcError("survey not found")).toBe("surveyNotFoundError");
  });

  it("maps response guards", () => {
    expect(mapSurveyRpcError("at least one answer is required")).toBe("answerRequiredError");
    expect(mapSurveyRpcError("invalid question")).toBe("invalidQuestionError");
  });

  it("falls back to a generic error for unknown or missing messages", () => {
    expect(mapSurveyRpcError("something unexpected")).toBe("genericError");
    expect(mapSurveyRpcError(undefined)).toBe("genericError");
  });
});
