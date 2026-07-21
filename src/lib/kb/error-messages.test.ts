import { describe, expect, it } from "vitest";
import { mapKbRpcError } from "./error-messages";

describe("mapKbRpcError", () => {
  it("maps not-authorized", () => {
    expect(mapKbRpcError("not authorized")).toBe("notAuthorizedError");
  });

  it("maps the publish-without-owner guard", () => {
    expect(mapKbRpcError("an owner is required to publish")).toBe("ownerRequiredError");
  });

  it("maps not-found messages for entries and articles", () => {
    expect(mapKbRpcError("entry not found")).toBe("entryNotFoundError");
    expect(mapKbRpcError("article not found")).toBe("articleNotFoundError");
  });

  it("falls back to a generic error for unknown or missing messages", () => {
    expect(mapKbRpcError("something unexpected")).toBe("genericError");
    expect(mapKbRpcError(undefined)).toBe("genericError");
  });
});
