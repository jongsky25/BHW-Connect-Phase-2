import { describe, expect, it } from "vitest";
import { pageOffset, parsePageParam, parseSearchParam, totalPages } from "./pagination";

describe("parsePageParam", () => {
  it("accepts positive integers", () => {
    expect(parsePageParam("1")).toBe(1);
    expect(parsePageParam("42")).toBe(42);
  });

  it("defaults to 1 for missing, non-numeric, zero, or negative values", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-3")).toBe(1);
  });

  it("truncates a fractional value rather than rejecting it", () => {
    expect(parsePageParam("2.9")).toBe(2);
  });
});

describe("parseSearchParam", () => {
  it("trims and passes through a non-empty query", () => {
    expect(parseSearchParam("  juana  ")).toBe("juana");
  });

  it("returns null for missing or whitespace-only values", () => {
    expect(parseSearchParam(undefined)).toBeNull();
    expect(parseSearchParam("")).toBeNull();
    expect(parseSearchParam("   ")).toBeNull();
  });
});

describe("pageOffset", () => {
  it("computes a zero-based offset from a 1-indexed page", () => {
    expect(pageOffset(1, 25)).toBe(0);
    expect(pageOffset(2, 25)).toBe(25);
    expect(pageOffset(3, 10)).toBe(20);
  });
});

describe("totalPages", () => {
  it("rounds up and never returns fewer than 1 page", () => {
    expect(totalPages(0, 25)).toBe(1);
    expect(totalPages(25, 25)).toBe(1);
    expect(totalPages(26, 25)).toBe(2);
    expect(totalPages(56, 20)).toBe(3);
  });
});
