import { describe, expect, it } from "vitest";
import { isValidUsername, usernameToSynthesizedEmail } from "./username";

describe("usernameToSynthesizedEmail", () => {
  it("lowercases and appends the internal auth domain", () => {
    expect(usernameToSynthesizedEmail("MariaDLC")).toBe("mariadlc@bhw.local");
  });

  it("trims surrounding whitespace", () => {
    expect(usernameToSynthesizedEmail("  juan.delacruz  ")).toBe("juan.delacruz@bhw.local");
  });
});

describe("isValidUsername", () => {
  it("accepts letters, digits, dots, underscores, and hyphens within length bounds", () => {
    expect(isValidUsername("juan.delacruz")).toBe(true);
    expect(isValidUsername("bhw_pilot-01")).toBe(true);
  });

  it("rejects usernames that are too short", () => {
    expect(isValidUsername("ab")).toBe(false);
  });

  it("rejects usernames with disallowed characters", () => {
    expect(isValidUsername("juan@delacruz")).toBe(false);
    expect(isValidUsername("juan delacruz")).toBe(false);
  });
});
