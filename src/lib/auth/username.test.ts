import { describe, expect, it } from "vitest";
import { isValidUsername, normalizeUsername, toAuthEmail } from "./username";

describe("normalizeUsername", () => {
  it("trims and lowercases", () => {
    expect(normalizeUsername("  Juan.DelaCruz ")).toBe("juan.delacruz");
  });
});

describe("isValidUsername", () => {
  it("accepts lowercase letters, digits, dots, underscores, and hyphens", () => {
    expect(isValidUsername("juan.delacruz-01")).toBe(true);
  });

  it("accepts mixed-case input by normalizing first", () => {
    expect(isValidUsername("Juan_DelaCruz")).toBe(true);
  });

  it("rejects usernames shorter than 3 characters", () => {
    expect(isValidUsername("ab")).toBe(false);
  });

  it("rejects usernames with spaces or symbols", () => {
    expect(isValidUsername("juan dela cruz@")).toBe(false);
  });
});

describe("toAuthEmail", () => {
  it("synthesizes a bhw.local address from a username", () => {
    expect(toAuthEmail("Juan.DelaCruz")).toBe("juan.delacruz@bhw.local");
  });
});
