import { describe, expect, it } from "vitest";
import { mapDashboardRpcError } from "./error-messages";

describe("mapDashboardRpcError", () => {
  it("maps not-authorized", () => {
    expect(mapDashboardRpcError("not authorized")).toBe("notAuthorizedError");
  });

  it("maps gap-not-found", () => {
    expect(mapDashboardRpcError("gap not found")).toBe("gapNotFoundError");
  });

  it("falls back to a generic error for unknown or missing messages", () => {
    expect(mapDashboardRpcError("something unexpected")).toBe("genericError");
    expect(mapDashboardRpcError(undefined)).toBe("genericError");
  });
});
