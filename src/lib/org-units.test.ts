import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { ROLE_LEVELS, childLevel, loadOrgChain, pathIds } from "./org-units";

const units = {
  root: { id: "root", name: "Laguna", level: "provincial", path: "nat.reg.root." },
  city: { id: "city", name: "Los Baños", level: "city_municipal", path: "nat.reg.root.city." },
  brgy: { id: "brgy", name: "Anos", level: "barangay", path: "nat.reg.root.city.brgy." },
  other: { id: "other", name: "Cavite", level: "provincial", path: "nat.reg.other." },
} as const;

// Enough of the PostgREST builder for loadOrgChain: eq().maybeSingle() and in().returns().
function fakeClient() {
  const rows = Object.values(units);
  return {
    from: () => ({
      select: () => ({
        eq: (_col: string, id: string) => ({
          maybeSingle: async () => ({ data: rows.find((row) => row.id === id) ?? null }),
        }),
        in: (_col: string, ids: string[]) => ({
          returns: async () => ({ data: rows.filter((row) => ids.includes(row.id)).reverse() }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe("org unit helpers", () => {
  it("walks the PSGC levels", () => {
    expect(childLevel("regional")).toBe("provincial");
    expect(childLevel("city_municipal")).toBe("barangay");
    expect(childLevel("barangay")).toBeNull();
  });

  it("mirrors the database placement rules per role", () => {
    expect(ROLE_LEVELS.assessor).toEqual(["regional", "provincial", "city_municipal"]);
    expect(ROLE_LEVELS.bhw).toEqual(["city_municipal", "barangay"]);
    expect(ROLE_LEVELS.admin).toContain("national");
  });

  it("splits a path into ancestor ids", () => {
    expect(pathIds("a.b.c.")).toEqual(["a", "b", "c"]);
  });

  it("loads the chain from below the root down to the selection, in order", async () => {
    const chain = await loadOrgChain(fakeClient(), "root", "brgy");
    expect(chain.map((unit) => unit.id)).toEqual(["city", "brgy"]);
  });

  it("returns no chain for the root itself, nothing, or a unit outside the root", async () => {
    expect(await loadOrgChain(fakeClient(), "root", "root")).toEqual([]);
    expect(await loadOrgChain(fakeClient(), "root", null)).toEqual([]);
    expect(await loadOrgChain(fakeClient(), "root", "other")).toEqual([]);
  });
});
