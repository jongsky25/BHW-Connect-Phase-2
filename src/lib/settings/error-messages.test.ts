import { describe, expect, it } from "vitest";
import { mapSettingsRpcError } from "./error-messages";

describe("mapSettingsRpcError", () => {
  it("maps invalid-input guards", () => {
    expect(mapSettingsRpcError("invalid language")).toBe("invalidInputError");
    expect(mapSettingsRpcError("invalid theme")).toBe("invalidInputError");
    expect(mapSettingsRpcError("invalid font scale")).toBe("invalidInputError");
  });

  it("falls back to a generic error for unknown or missing messages", () => {
    expect(mapSettingsRpcError("something unexpected")).toBe("genericError");
    expect(mapSettingsRpcError(undefined)).toBe("genericError");
  });
});
