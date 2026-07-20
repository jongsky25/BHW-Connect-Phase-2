import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, validatePassword } from "./password-policy";

describe("validatePassword", () => {
  it("rejects passwords shorter than the minimum length", () => {
    expect(validatePassword("a".repeat(MIN_PASSWORD_LENGTH - 1))).toBe("too_short");
  });

  it("rejects passwords from the common-password blocklist, case-insensitively", () => {
    expect(validatePassword("password1")).toBe("too_common");
    expect(validatePassword("PASSWORD1")).toBe("too_common");
  });

  it("accepts a long, uncommon passphrase with no composition rules", () => {
    // No forced symbols/uppercase/digits (NIST 800-63B) — plain lowercase
    // words should be accepted as long as they clear length + blocklist.
    expect(validatePassword("correcthorsebatterystaple")).toBeNull();
  });

  it("accepts a password exactly at the minimum length", () => {
    expect(validatePassword("kalabaws")).toBeNull();
  });
});
