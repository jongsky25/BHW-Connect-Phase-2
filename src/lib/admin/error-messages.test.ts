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

  it("maps flag-not-found", () => {
    expect(mapAdminRpcError("flag not found")).toBe("flagNotFoundError");
  });

  it("maps invalid-role-for-flag", () => {
    expect(mapAdminRpcError("invalid role for flag")).toBe("invalidRoleForFlagError");
  });

  it("maps the role placement trigger messages", () => {
    expect(mapAdminRpcError("assessor catchment must be a region, province or city/municipality")).toBe(
      "assessorLevelError",
    );
    expect(mapAdminRpcError("bhw must belong to a barangay")).toBe("bhwLevelError");
  });

  // RFT C1 (docs/role-feature-toggles-plan.md §4.5): content hide/show/
  // archive/restore errors, raised by rpc_content_set_visibility and the
  // archived-row guard added to the existing edit/set-status RPCs.
  it("maps content visibility errors", () => {
    expect(mapAdminRpcError("content archived")).toBe("contentArchivedError");
    expect(mapAdminRpcError("content not found")).toBe("contentNotFoundError");
    expect(mapAdminRpcError("invalid content type")).toBe("invalidContentTypeError");
    expect(mapAdminRpcError("invalid action")).toBe("invalidActionError");
    expect(mapAdminRpcError("already hidden")).toBe("alreadyHiddenError");
    expect(mapAdminRpcError("not hidden")).toBe("notHiddenError");
    expect(mapAdminRpcError("already archived")).toBe("alreadyArchivedError");
    expect(mapAdminRpcError("not archived")).toBe("notArchivedError");
    expect(mapAdminRpcError("use archive action")).toBe("useArchiveActionError");
  });

  it("falls back to a generic error for unknown or missing messages", () => {
    expect(mapAdminRpcError("something unexpected")).toBe("genericError");
    expect(mapAdminRpcError(undefined)).toBe("genericError");
  });
});
