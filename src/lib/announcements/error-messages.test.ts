import { describe, expect, it } from "vitest";
import { mapAnnouncementRpcError } from "./error-messages";

describe("mapAnnouncementRpcError", () => {
  it("maps not-authorized", () => {
    expect(mapAnnouncementRpcError("not authorized")).toBe("notAuthorizedError");
  });

  it("maps the required-body guard", () => {
    expect(mapAnnouncementRpcError("body is required")).toBe("bodyRequiredError");
  });

  it("maps the org-unit-scope guard", () => {
    expect(mapAnnouncementRpcError("org unit out of scope")).toBe("orgUnitOutOfScopeError");
  });

  it("maps not-found messages", () => {
    expect(mapAnnouncementRpcError("announcement not found")).toBe("announcementNotFoundError");
  });

  it("falls back to a generic error for unknown or missing messages", () => {
    expect(mapAnnouncementRpcError("something unexpected")).toBe("genericError");
    expect(mapAnnouncementRpcError(undefined)).toBe("genericError");
  });
});
