import { describe, expect, it } from "vitest";
import { aiErrorKey } from "./gap-queue-list";

// Written after a live incident: the first version of this component collapsed
// every 503 into one string, "External AI is unavailable right now." When the
// pinned Gemini model was retired the pilot showed exactly that, which reads
// as "the key is missing" and sent the operator to check the API key. The key
// was fine. Each reason needs a different action, so each gets its own message.
describe("aiErrorKey", () => {
  const cases: [string | undefined, string][] = [
    ["no_api_key", "aiNoKey"],
    ["flag_disabled", "aiFlagOff"],
    ["over_ceiling", "aiOverCeiling"],
    ["timeout", "aiTimeout"],
    ["provider_error", "aiProviderError"],
  ];

  for (const [reason, key] of cases) {
    it(`maps ${reason} to ${key}`, () => {
      expect(aiErrorKey(503, reason)).toBe(key);
    });
  }

  it("falls back to the provider-error message for an unrecognised reason", () => {
    // A reason added to AiUnavailableReason later must not render a raw key at
    // an admin. Defaulting to "the provider rejected it, tell a developer" is
    // the honest reading of an unknown 503.
    expect(aiErrorKey(503, "something_new")).toBe("aiProviderError");
    expect(aiErrorKey(503, undefined)).toBe("aiProviderError");
  });

  it("treats a non-503 as a draft failure rather than an availability problem", () => {
    // 502 is an unusable draft — the provider answered, the answer was junk.
    // Telling the admin "AI is unavailable" there would be wrong.
    expect(aiErrorKey(502, undefined)).toBe("aiDraftFailed");
    expect(aiErrorKey(500, "no_api_key")).toBe("aiDraftFailed");
  });
});
