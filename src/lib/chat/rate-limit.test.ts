import { describe, expect, it } from "vitest";
import { chatRateLimitArgs } from "./rate-limit";

describe("chatRateLimitArgs", () => {
  it("passes nothing when unset, so the RPC default (20/min) applies", () => {
    expect(chatRateLimitArgs(undefined)).toBeUndefined();
    expect(chatRateLimitArgs("")).toBeUndefined();
  });

  it("passes a valid override", () => {
    expect(chatRateLimitArgs("60")).toEqual({ p_limit: 60 });
    expect(chatRateLimitArgs("500")).toEqual({ p_limit: 500 });
  });

  it("ignores anything that is not a sane integer rather than weakening the limit", () => {
    for (const bad of ["0", "-5", "abc", "1.5", "501", "1e9", "Infinity"]) {
      expect(chatRateLimitArgs(bad), bad).toBeUndefined();
    }
  });
});
