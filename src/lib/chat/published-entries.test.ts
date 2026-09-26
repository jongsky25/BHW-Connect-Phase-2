import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { loadPublishedEntries } from "./published-entries";

// A kb_entries table behind a PostgREST that returns at most `cap` rows per
// request, as max_rows does, regardless of the range asked for.
function fakeClient(total: number, cap: number, failOnRequest?: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: String(i).padStart(5, "0") }));
  const requests: Array<[number, number]> = [];
  const client = {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            range: async (from: number, to: number) => {
              requests.push([from, to]);
              if (failOnRequest === requests.length) return { data: null, error: { message: "boom" }, count: null };
              const end = Math.min(to + 1, from + cap);
              return { data: rows.slice(from, end), error: null, count: total };
            },
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
  return { client, requests, rows };
}

describe("loadPublishedEntries", () => {
  it("loads a small knowledge base in one request", async () => {
    const { client, requests, rows } = fakeClient(131, 1000);
    const result = await loadPublishedEntries(client, "id");
    expect(result).toEqual({ data: rows, error: null });
    expect(requests).toHaveLength(1);
  });

  it("returns every entry past the 1,000-row response cap", async () => {
    const { client, requests, rows } = fakeClient(1057, 1000);
    const result = await loadPublishedEntries(client, "id");
    expect(result.data).toEqual(rows);
    expect(requests).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("stays complete when the cap is lower than the page size", async () => {
    const { client, rows } = fakeClient(1057, 250);
    expect((await loadPublishedEntries(client, "id")).data).toEqual(rows);
  });

  it("returns the error when a later page fails", async () => {
    const { client } = fakeClient(1057, 1000, 2);
    expect(await loadPublishedEntries(client, "id")).toEqual({ data: null, error: { message: "boom" } });
  });
});
