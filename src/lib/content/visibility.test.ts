import { describe, expect, it, vi } from "vitest";
import { isVisible, withVisible } from "./visibility";

describe("withVisible", () => {
  it("chains .is('hidden_at', null) and .is('archived_at', null)", () => {
    const is = vi.fn().mockReturnThis();
    const query = { is };
    withVisible(query);
    expect(is).toHaveBeenNthCalledWith(1, "hidden_at", null);
    expect(is).toHaveBeenNthCalledWith(2, "archived_at", null);
  });

  it("returns the (possibly new) builder the chain produces", () => {
    const chained = { is: vi.fn().mockReturnThis() };
    const query = { is: vi.fn().mockReturnValue(chained) };
    expect(withVisible(query)).toBe(chained);
  });
});

describe("isVisible", () => {
  it("is true when neither hidden_at nor archived_at is set", () => {
    expect(isVisible({ hidden_at: null, archived_at: null })).toBe(true);
    expect(isVisible({})).toBe(true);
  });

  it("is false when hidden_at is set", () => {
    expect(isVisible({ hidden_at: "2026-01-01T00:00:00Z", archived_at: null })).toBe(false);
  });

  it("is false when archived_at is set", () => {
    expect(isVisible({ hidden_at: null, archived_at: "2026-01-01T00:00:00Z" })).toBe(false);
  });
});
