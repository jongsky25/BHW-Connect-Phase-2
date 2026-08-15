import { describe, expect, it } from "vitest";
import { callProvider } from "./adapter";
import {
  DataClassificationError,
  type AdapterDeps,
  type DataClassification,
  type ProviderTransport,
} from "./types";

// Hand-rolled stub with a call counter, in the style of stubClient() in
// src/lib/flags/get-flags.test.ts. The counter is the point: for a rejected
// classification we assert it stayed at 0, which proves no request was
// *attempted*. That is the actual DPA guarantee — a thrown error alone would
// not rule out a request having already gone out.
function stubTransport(reply = "drafted text") {
  const calls: { prompt: string }[] = [];
  const transport: ProviderTransport = async ({ prompt }) => {
    calls.push({ prompt });
    return reply;
  };
  return { transport, calls };
}

function deps(overrides: Partial<AdapterDeps> = {}): AdapterDeps {
  return {
    transport: stubTransport().transport,
    apiKey: "test-key",
    externalAiEnabled: true,
    ...overrides,
  };
}

describe("the data-classification gate", () => {
  // One case per classification in free-ai-leverage-plan.md's allowlist table,
  // in the exhaustive per-branch style of the error-messages tests.
  const permitted: DataClassification[] = ["public_content", "admin_authored", "admin_cleared"];
  const rejected: DataClassification[] = ["user_generated", "personal"];

  for (const classification of permitted) {
    it(`permits ${classification} and calls the provider`, async () => {
      const { transport, calls } = stubTransport();
      const result = await callProvider(
        { classification, prompt: "hello" },
        "gap_draft",
        deps({ transport }),
      );

      expect(result).toEqual({ ok: true, text: "drafted text", provider: "gemini" });
      expect(calls).toHaveLength(1);
    });
  }

  for (const classification of rejected) {
    it(`rejects ${classification} without attempting a request`, async () => {
      const { transport, calls } = stubTransport();

      await expect(
        callProvider({ classification, prompt: "patient details" }, "gap_draft", deps({ transport })),
      ).rejects.toBeInstanceOf(DataClassificationError);

      // The load-bearing assertion.
      expect(calls).toHaveLength(0);
    });
  }

  it("rejects forbidden data even when the feature is off and no key is set", async () => {
    // The gate runs before the flag and the key checks, so the guarantee holds
    // in every state of the system rather than only when AI is switched on.
    const { transport, calls } = stubTransport();

    await expect(
      callProvider(
        { classification: "user_generated", prompt: "patient details" },
        "gap_draft",
        deps({ transport, externalAiEnabled: false, apiKey: null }),
      ),
    ).rejects.toBeInstanceOf(DataClassificationError);

    expect(calls).toHaveLength(0);
  });
});

describe("degrading to the baseline", () => {
  // free-ai-leverage-plan.md rule 2: if every provider vanished tomorrow the
  // app still functions fully. None of these may throw.
  it("reports flag_disabled without calling the provider", async () => {
    const { transport, calls } = stubTransport();
    const result = await callProvider(
      { classification: "admin_cleared", prompt: "q" },
      "gap_draft",
      deps({ transport, externalAiEnabled: false }),
    );

    expect(result).toEqual({ ok: false, reason: "flag_disabled" });
    expect(calls).toHaveLength(0);
  });

  it("reports no_api_key when the provider is unconfigured", async () => {
    const { transport, calls } = stubTransport();
    const result = await callProvider(
      { classification: "admin_cleared", prompt: "q" },
      "gap_draft",
      deps({ transport, apiKey: null }),
    );

    expect(result).toEqual({ ok: false, reason: "no_api_key" });
    expect(calls).toHaveLength(0);
  });

  it("reports over_ceiling when the budget guard refuses", async () => {
    const { transport, calls } = stubTransport();
    const result = await callProvider(
      { classification: "admin_cleared", prompt: "q" },
      "gap_draft",
      deps({ transport, checkBudget: async () => ({ allowed: false }) }),
    );

    expect(result).toEqual({ ok: false, reason: "over_ceiling" });
    expect(calls).toHaveLength(0);
  });

  it("converts a transport failure into a value rather than throwing", async () => {
    const failing: ProviderTransport = async () => {
      throw new Error("connection reset");
    };
    const result = await callProvider(
      { classification: "admin_cleared", prompt: "q" },
      "gap_draft",
      deps({ transport: failing }),
    );

    expect(result).toEqual({ ok: false, reason: "provider_error" });
  });

  it("distinguishes a timeout from a generic provider error", async () => {
    const aborting: ProviderTransport = async () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    };
    const result = await callProvider(
      { classification: "admin_cleared", prompt: "q" },
      "gap_draft",
      deps({ transport: aborting }),
    );

    expect(result).toEqual({ ok: false, reason: "timeout" });
  });
});

describe("the accountability trail", () => {
  it("records provider, feature, classification and a hash — never the content", async () => {
    const records: unknown[] = [];
    const result = await callProvider(
      { classification: "admin_cleared", prompt: "tumawag kay Maria sa 09171234567" },
      "gap_draft",
      deps({ recordCall: async (record) => void records.push(record) }),
    );

    expect(result.ok).toBe(true);
    expect(records).toHaveLength(1);

    const record = records[0] as Record<string, string>;
    expect(record.provider).toBe("gemini");
    expect(record.feature).toBe("gap_draft");
    expect(record.classification).toBe("admin_cleared");
    expect(record.contentHash).toMatch(/^[0-9a-f]{8}$/);

    // The whole point: nothing in the record carries the payload.
    expect(JSON.stringify(record)).not.toContain("Maria");
    expect(JSON.stringify(record)).not.toContain("09171234567");
  });

  it("redacts before the transport sees the text", async () => {
    const { transport, calls } = stubTransport();
    await callProvider(
      { classification: "admin_cleared", prompt: "text si Maria Santos sa 09171234567" },
      "gap_draft",
      deps({ transport, redactNames: ["Maria Santos"] }),
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].prompt).not.toContain("Maria Santos");
    expect(calls[0].prompt).not.toContain("09171234567");
  });

  it("does not record a call that never happened", async () => {
    const records: unknown[] = [];
    await callProvider(
      { classification: "admin_cleared", prompt: "q" },
      "gap_draft",
      deps({ apiKey: null, recordCall: async (record) => void records.push(record) }),
    );

    expect(records).toHaveLength(0);
  });
});
