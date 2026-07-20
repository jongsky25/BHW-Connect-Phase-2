import { describe, expect, it } from "vitest";
import { validatePassword } from "./password-policy";

describe("validatePassword", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(validatePassword("short1")).toBe("tooShort");
  });

  it("rejects common passwords even if long enough", () => {
    expect(validatePassword("password1")).toBe("tooCommon");
  });

  it("is case-insensitive against the common-password list", () => {
    expect(validatePassword("PASSWORD1")).toBe("tooCommon");
  });

  it("accepts a long, uncommon password with no symbol/number requirement", () => {
    expect(validatePassword("correcthorsebattery")).toBeNull();
  });
});
