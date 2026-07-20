import { describe, expect, it } from "vitest";
import { mapAdminRpcError } from "./error-messages";

describe("mapAdminRpcError", () => {
  it("maps the last-admin guard message", () => {
    expect(mapAdminRpcError("cannot deactivate the last active admin for this org unit")).toBe(
      "lastAdminError",
    );
  });

  it("maps not-authorized", () => {
    expect(mapAdminRpcError("not authorized")).toBe("notAuthorizedError");
  });

  it("maps out-of-scope messages for both users and org units", () => {
    expect(mapAdminRpcError("user out of scope")).toBe("outOfScopeError");
    expect(mapAdminRpcError("destination org unit out of scope")).toBe("outOfScopeError");
  });

  it("falls back to a generic error for unknown or missing messages", () => {
    expect(mapAdminRpcError("something unexpected")).toBe("genericError");
    expect(mapAdminRpcError(undefined)).toBe("genericError");
  });
});
