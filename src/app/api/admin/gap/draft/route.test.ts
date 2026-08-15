import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiPayload, AiResult } from "@/lib/ai/types";

// Route handlers reach for `createClient()` and `runAiCall()` as module
// imports, so this is the one place in the repo where vi.mock beats a
// hand-rolled stub — the same escape language-toggle.test.tsx takes for
// next/navigation.
//
// What is being protected here is narrow and load-bearing: the route must send
// the admin's cleared text under the admin_cleared classification, and must
// never send the gap row's stored text. Both are one careless edit apart from
// each other, and getting it wrong makes the DPA guarantee false while every
// other test in the repo still passes.

const STORED_GAP_TEXT = "si Aling Nena po sa purok 3, mataas ang BP niya, ano po gagawin?";

const aiCalls: { payload: AiPayload; feature: string }[] = [];
const rpcCalls: { name: string; args: unknown }[] = [];

let aiResult: AiResult = {
  ok: true,
  provider: "gemini",
  text: JSON.stringify({
    question_fil: "Ano ang gagawin kung mataas ang BP?",
    question_en: "What should I do if the blood pressure is high?",
    answer_fil: "Ulitin ang pagsukat pagkatapos magpahinga, itala, at i-refer sa RHU kung mataas pa rin.",
    answer_en: "Repeat the reading after rest, record it, and refer to the RHU if it is still high.",
    keywords: ["altapresyon", "blood pressure", "mataas", "referral"],
  }),
};

let flags: Record<string, boolean> = { ai_external: true, ai_gap_draft: true };
let role = "admin";

vi.mock("@/lib/ai/server", () => ({
  runAiCall: async (_supabase: unknown, payload: AiPayload, feature: string) => {
    aiCalls.push({ payload, feature });
    return aiResult;
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "auth-1" } } }) },
    from: (table: string) => {
      if (table === "feature_flags") {
        return {
          select: async () => ({
            data: Object.entries(flags).map(([key, enabled]) => ({ key, enabled })),
          }),
        };
      }
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { id: "u1", role }, error: null }) }),
          }),
        };
      }
      if (table === "unmatched_questions") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { id: "gap-1", text: STORED_GAP_TEXT } }) }),
          }),
        };
      }
      if (table === "kb_categories") {
        return {
          select: () => ({ order: () => ({ limit: async () => ({ data: [{ id: "cat-1" }] }) }) }),
        };
      }
      // kb_entries, for prompt context.
      return { select: () => ({ eq: () => ({ limit: async () => ({ data: [] }) }) }) };
    },
    rpc: (name: string, args: unknown) => {
      rpcCalls.push({ name, args });
      if (name === "rpc_kb_entry_create") {
        return { single: async () => ({ data: { entry_id: "entry-1" }, error: null }) };
      }
      return Promise.resolve({ data: null, error: null });
    },
  }),
}));

const { POST } = await import("./route");

function post(body: unknown) {
  return POST({ json: async () => body } as unknown as NextRequest);
}

beforeEach(() => {
  aiCalls.length = 0;
  rpcCalls.length = 0;
  flags = { ai_external: true, ai_gap_draft: true };
  role = "admin";
});

describe("POST /api/admin/gap/draft", () => {
  it("sends the admin's cleared text as admin_cleared, and never the stored question", async () => {
    const response = await post({
      unmatched_question_id: "gap-1",
      cleared_text: "Mataas ang BP ng isang kliyente, ano ang dapat gawin?",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ entry_id: "entry-1" });

    expect(aiCalls).toHaveLength(1);
    expect(aiCalls[0].feature).toBe("gap_draft");
    expect(aiCalls[0].payload.classification).toBe("admin_cleared");
    expect(aiCalls[0].payload.prompt).toContain("Mataas ang BP ng isang kliyente");

    // The assertion the whole clearance step exists for. Reading row.text here
    // instead of the admin's edit would send a named resident's details to a
    // third party, and nothing else in the suite would notice.
    expect(aiCalls[0].payload.prompt).not.toContain("Aling Nena");
    expect(aiCalls[0].payload.prompt).not.toContain(STORED_GAP_TEXT);
  });

  it("creates a draft entry linked to the gap, and stamps its AI provenance", async () => {
    await post({ unmatched_question_id: "gap-1", cleared_text: "Mataas ang BP, ano ang gagawin?" });

    const create = rpcCalls.find((call) => call.name === "rpc_kb_entry_create");
    expect(create?.args).toMatchObject({
      p_status: "draft",
      p_source_unmatched_question_id: "gap-1",
    });

    // Without this the publish gate does not recognise the entry as needing
    // review, which is the one outcome this increment must not produce.
    expect(rpcCalls.find((call) => call.name === "rpc_kb_entry_mark_ai_drafted")?.args).toEqual({
      p_id: "entry-1",
    });
  });

  it("404s when either flag is off, so a disabled feature looks like no route", async () => {
    flags = { ai_external: false, ai_gap_draft: true };
    expect((await post({ unmatched_question_id: "gap-1", cleared_text: "q" })).status).toBe(404);

    flags = { ai_external: true, ai_gap_draft: false };
    expect((await post({ unmatched_question_id: "gap-1", cleared_text: "q" })).status).toBe(404);

    expect(aiCalls).toHaveLength(0);
  });

  it("403s a non-admin", async () => {
    role = "bhw";
    expect((await post({ unmatched_question_id: "gap-1", cleared_text: "q" })).status).toBe(403);
    expect(aiCalls).toHaveLength(0);
  });

  it("rejects a request with no cleared text rather than falling back to the stored text", async () => {
    const response = await post({ unmatched_question_id: "gap-1" });

    expect(response.status).toBe(400);
    expect(aiCalls).toHaveLength(0);
  });

  it("reports 503 when AI is unavailable, leaving the manual path as the answer", async () => {
    const previous = aiResult;
    aiResult = { ok: false, reason: "over_ceiling" };

    const response = await post({ unmatched_question_id: "gap-1", cleared_text: "q" });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "ai unavailable", reason: "over_ceiling" });
    expect(rpcCalls).toHaveLength(0);

    aiResult = previous;
  });

  it("creates nothing when the draft fails validation", async () => {
    const previous = aiResult;
    // Three keywords: below the bar, and deliberately not padded up to it.
    aiResult = {
      ok: true,
      provider: "gemini",
      text: JSON.stringify({
        question_fil: "Ano?",
        question_en: "What?",
        answer_fil: "Ulitin ang pagsukat pagkatapos magpahinga at i-refer sa RHU kung kailangan.",
        answer_en: "Repeat the reading after rest and refer to the RHU if needed.",
        keywords: ["a", "b", "c"],
      }),
    };

    const response = await post({ unmatched_question_id: "gap-1", cleared_text: "q" });

    expect(response.status).toBe(502);
    expect(rpcCalls).toHaveLength(0);

    aiResult = previous;
  });
});
