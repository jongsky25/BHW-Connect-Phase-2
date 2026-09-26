import { describe, expect, it } from "vitest";
import { mapSettingsRpcError } from "./error-messages";

describe("mapSettingsRpcError", () => {
  it("maps invalid-input guards", () => {
    expect(mapSettingsRpcError("invalid language")).toBe("invalidInputError");
    expect(mapSettingsRpcError("invalid theme")).toBe("invalidInputError");
    expect(mapSettingsRpcError("invalid font scale")).toBe("invalidInputError");
  });

  it("maps rpc_update_display_settings' per-key and payload guards", () => {
    expect(mapSettingsRpcError("invalid display setting: theme")).toBe("invalidInputError");
    expect(mapSettingsRpcError("invalid display setting: primary_color")).toBe("invalidInputError");
    expect(mapSettingsRpcError("invalid display settings")).toBe("invalidInputError");
  });

  it("falls back to a generic error for unknown or missing messages", () => {
    expect(mapSettingsRpcError("something unexpected")).toBe("genericError");
    expect(mapSettingsRpcError("not authorized")).toBe("genericError");
    expect(mapSettingsRpcError(undefined)).toBe("genericError");
  });
});
