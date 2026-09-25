import { describe, expect, it } from "vitest";
import { mapSuperAdminRpcError, parsePersonaSnapshot } from "./types";

describe("parsePersonaSnapshot", () => {
  it("returns null for missing or malformed cookies", () => {
    expect(parsePersonaSnapshot(undefined)).toBeNull();
    expect(parsePersonaSnapshot("not json")).toBeNull();
    expect(parsePersonaSnapshot(JSON.stringify({ personas: [] }))).toBeNull();
  });

  it("drops entries with an unknown role", () => {
    const raw = JSON.stringify({
      owner: "rcventura",
      personas: [
        { id: "1", username: "rcventura.bhw", role: "bhw" },
        { id: "2", username: "x", role: "owner" },
      ],
    });
    expect(parsePersonaSnapshot(raw)).toEqual({
      owner: "rcventura",
      personas: [{ id: "1", username: "rcventura.bhw", role: "bhw" }],
    });
  });
});

describe("mapSuperAdminRpcError", () => {
  it("maps known RPC exceptions", () => {
    expect(mapSuperAdminRpcError("not authorized")).toBe("notAuthorizedError");
    expect(mapSuperAdminRpcError("persona not found")).toBe("personaNotFoundError");
    expect(mapSuperAdminRpcError("persona is not active")).toBe("personaInactiveError");
    expect(mapSuperAdminRpcError("org unit out of scope")).toBe("outOfScopeError");
    expect(mapSuperAdminRpcError("something else")).toBe("genericError");
  });
});
