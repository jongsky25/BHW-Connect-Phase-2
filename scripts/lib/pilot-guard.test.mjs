import { describe, expect, it } from "vitest";
import { PILOT_PROJECT_REF, assertPilotAllowed, isPilot } from "./pilot-guard.mjs";

const pilotUrl = `https://${PILOT_PROJECT_REF}.supabase.co`;

describe("pilot guard", () => {
  it("recognises the pilot by ref or URL", () => {
    expect(isPilot(PILOT_PROJECT_REF)).toBe(true);
    expect(isPilot(pilotUrl)).toBe(true);
    expect(isPilot("http://127.0.0.1:54321")).toBe(false);
    expect(isPilot(undefined)).toBe(false);
  });

  it("refuses the pilot outside Vercel without ALLOW_PILOT=1", () => {
    expect(() => assertPilotAllowed(pilotUrl, "test", {})).toThrow(/ALLOW_PILOT=1/);
    expect(() => assertPilotAllowed(PILOT_PROJECT_REF, "test", { ALLOW_PILOT: "0" })).toThrow();
  });

  it("allows the pilot on Vercel or with an explicit opt-in", () => {
    expect(() => assertPilotAllowed(pilotUrl, "test", { VERCEL: "1" })).not.toThrow();
    expect(() => assertPilotAllowed(pilotUrl, "test", { ALLOW_PILOT: "1" })).not.toThrow();
  });

  it("never blocks other projects or an unset URL", () => {
    expect(() => assertPilotAllowed("http://127.0.0.1:54321", "test", {})).not.toThrow();
    expect(() => assertPilotAllowed("ekehmwzyhlagtfuvquho", "test", {})).not.toThrow();
    expect(() => assertPilotAllowed(undefined, "test", {})).not.toThrow();
  });
});
