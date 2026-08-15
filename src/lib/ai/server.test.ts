import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runAiCall } from "./server";
import { DataClassificationError } from "./types";

// The composition root is the one module that cannot take its transport by
// injection — wiring the transport is what it exists to do. So these tests stub
// fetch instead, which has the useful side effect of exercising the real
// gemini transport as well: request shape, schema mapping, and response
// unwrapping are all covered by the same assertions.

type Calls = { rpc: { name: string; args: unknown }[]; fetches: RequestInit[] };

function stubClient(
  overrides: { flags?: Record<string, boolean>; budgetAllowed?: boolean; budgetError?: boolean } = {},
) {
  const calls: Calls = { rpc: [], fetches: [] };

  const client = {
    from: (table: string) => ({
      select: () => {
        if (table === "feature_flags") {
          const rows = Object.entries(overrides.flags ?? { ai_external: true }).map(
            ([key, enabled]) => ({ key, enabled }),
          );
          return Promise.resolve({ data: rows, error: null });
        }
        // users, for the redaction dictionary.
        return {
          limit: () => Promise.resolve({ data: [{ full_name: "Maria Santos" }], error: null }),
        };
      },
    }),
    rpc: (name: string, args: unknown) => {
      calls.rpc.push({ name, args });

      if (name === "rpc_ai_check_budget") {
        return {
          single: () =>
            overrides.budgetError
              ? Promise.resolve({ data: null, error: { message: "not authorized" } })
              : Promise.resolve({
                  data: { allowed: overrides.budgetAllowed ?? true },
                  error: null,
                }),
        };
      }

      return Promise.resolve({ data: null, error: null });
    },
  } as unknown as SupabaseClient;

  return { client, calls };
}

function stubFetch(calls: Calls, text = '{"ok":true}') {
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    calls.fetches.push(init);
    return {
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
    } as Response;
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("runAiCall", () => {
  it("wires the whole chain: budget, redaction, transport, and the usage record", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { client, calls } = stubClient();
    stubFetch(calls, "drafted");

    const result = await runAiCall(
      client,
      { classification: "admin_cleared", prompt: "tanong ni Maria Santos", jsonSchema: { type: "object" } },
      "gap_draft",
    );

    expect(result).toEqual({ ok: true, text: "drafted", provider: "gemini" });

    const rpcNames = calls.rpc.map((call) => call.name);
    expect(rpcNames).toEqual(["rpc_ai_check_budget", "rpc_ai_record_call"]);

    // The budget guard is consulted with the ceilings from config.ts, not with
    // numbers stored in the database — so the guard and the admin panel cannot
    // disagree about what the limit is.
    expect(calls.rpc[0].args).toMatchObject({ p_provider: "gemini", p_feature: "gap_draft" });

    // The users-table sweep reached the transport, and the schema was mapped.
    const body = JSON.parse(calls.fetches[0].body as string);
    expect(JSON.stringify(body)).not.toContain("Maria Santos");
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });

  it("refuses the call when the budget guard cannot be consulted", async () => {
    // Fail closed. If the guard is unreachable the ceiling cannot be honoured,
    // and overrunning a free tier is the one failure the plan treats as
    // unacceptable — silently degrading to the rule-based baseline is not.
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { client, calls } = stubClient({ budgetError: true });
    stubFetch(calls);

    const result = await runAiCall(client, { classification: "admin_cleared", prompt: "q" }, "gap_draft");

    expect(result).toEqual({ ok: false, reason: "over_ceiling" });
    expect(calls.fetches).toHaveLength(0);
  });

  it("spends no counter and reads no dictionary when the flag is off", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { client, calls } = stubClient({ flags: { ai_external: false } });
    stubFetch(calls);

    const result = await runAiCall(client, { classification: "admin_cleared", prompt: "q" }, "gap_draft");

    expect(result).toEqual({ ok: false, reason: "flag_disabled" });
    expect(calls.rpc).toHaveLength(0);
    expect(calls.fetches).toHaveLength(0);
  });

  it("reports no_api_key rather than throwing when the provider is unconfigured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { client, calls } = stubClient();
    stubFetch(calls);

    const result = await runAiCall(client, { classification: "admin_cleared", prompt: "q" }, "gap_draft");

    expect(result).toEqual({ ok: false, reason: "no_api_key" });
    expect(calls.rpc).toHaveLength(0);
  });

  it("throws on a forbidden classification before touching the provider", async () => {
    // The adapter tests prove the gate; this proves the composition root does
    // not accidentally route around it.
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { client, calls } = stubClient();
    stubFetch(calls);

    await expect(
      runAiCall(client, { classification: "user_generated", prompt: "a BHW's own words" }, "gap_draft"),
    ).rejects.toBeInstanceOf(DataClassificationError);

    expect(calls.fetches).toHaveLength(0);
  });
});
