import { describe, expect, it } from "vitest";
import { validatePassword } from "./password-policy";

describe("validatePassword", () => {
  it("rejects passwords shorter than 8 characters", () => {
    const result = validatePassword("Sh0rt!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("too_short");
  });

  it("rejects passwords on the common-password blocklist", () => {
    const result = validatePassword("password");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("too_common");
  });

  it("is case-insensitive when matching the blocklist", () => {
    const result = validatePassword("PaSSWoRD");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("too_common");
  });

  it("accepts a long, uncommon passphrase with no composition rules", () => {
    const result = validatePassword("barangay health worker connect");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("does not require symbols or digits", () => {
    const result = validatePassword("simplebuteffective");
    expect(result.valid).toBe(true);
  });
});
