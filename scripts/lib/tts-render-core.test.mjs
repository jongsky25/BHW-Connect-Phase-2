import { describe, expect, it, vi } from "vitest";
import {
  buildRenderPlan,
  computeContentHash,
  createProviderChain,
  estimateCharBudget,
  renderItem,
  summarizePlan,
  VOICES,
} from "./tts-render-core.mjs";

function fixtureModule(overrides = {}) {
  return {
    id: "01-tungkulin-ng-bhw",
    lesson: {
      sections: [
        {
          heading_fil: "Panimula",
          heading_en: "Introduction",
          body_fil: "Una. Pangalawa.",
          body_en: "First. Second.",
          takeaway_fil: "Tandaan.",
          takeaway_en: "Remember.",
        },
      ],
    },
    ...overrides,
  };
}

describe("buildRenderPlan", () => {
  it("plans a create for every language of a section with no existing audio", () => {
    const items = buildRenderPlan([fixtureModule()], new Map());
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.language).sort()).toEqual(["en", "fil"]);
    expect(items.every((i) => i.action === "create")).toBe(true);
  });

  it("plans a skip when the existing content_hash matches the current text", () => {
    const mod = fixtureModule();
    const zones = [
      { zone: "heading", index: 0, text: "Panimula" },
      { zone: "body", index: 0, text: "Una." },
      { zone: "body", index: 1, text: "Pangalawa." },
      { zone: "takeaway", index: 0, text: "Tandaan." },
    ];
    const hash = computeContentHash(zones, VOICES.fil);
    const existing = new Map([["01-tungkulin-ng-bhw:0:fil", { id: "audio-1", content_hash: hash }]]);

    const items = buildRenderPlan([mod], existing);
    const filItem = items.find((i) => i.language === "fil");
    const enItem = items.find((i) => i.language === "en");
    expect(filItem.action).toBe("skip");
    expect(enItem.action).toBe("create"); // different language, no existing row
  });

  it("plans an update when the existing hash no longer matches (text changed)", () => {
    const mod = fixtureModule();
    const existing = new Map([
      ["01-tungkulin-ng-bhw:0:fil", { id: "audio-1", content_hash: "stale-hash" }],
    ]);
    const items = buildRenderPlan([mod], existing);
    const filItem = items.find((i) => i.language === "fil");
    expect(filItem.action).toBe("update");
    expect(filItem.existingId).toBe("audio-1");
  });

  it("skips a section/language with nothing to narrate (all zones blank)", () => {
    const mod = fixtureModule({
      lesson: {
        sections: [
          { heading_fil: "", heading_en: "", body_fil: "  ", body_en: "  ", takeaway_fil: "", takeaway_en: "" },
        ],
      },
    });
    expect(buildRenderPlan([mod], new Map())).toEqual([]);
  });
});

describe("summarizePlan / estimateCharBudget", () => {
  it("counts actions and only charges create/update toward the char budget", () => {
    const items = [
      { action: "create", charCount: 10 },
      { action: "update", charCount: 5 },
      { action: "skip", charCount: 999 },
    ];
    expect(summarizePlan(items)).toEqual({ create: 1, update: 1, skip: 1 });
    expect(estimateCharBudget(items)).toBe(15);
  });
});

describe("createProviderChain", () => {
  it("uses Azure when configured and it succeeds", async () => {
    const synthesizeAzure = vi.fn().mockResolvedValue({ provider: "azure" });
    const synthesizeEdgeTts = vi.fn();
    const synthesize = createProviderChain({ synthesizeAzure, synthesizeEdgeTts, azureConfigured: true });

    const result = await synthesize([], "fil", "voice");
    expect(result).toEqual({ provider: "azure" });
    expect(synthesizeEdgeTts).not.toHaveBeenCalled();
  });

  it("falls back to edge-tts when Azure throws, and reports the failure", async () => {
    const azureError = new Error("Azure synthesis failed: 401");
    const synthesizeAzure = vi.fn().mockRejectedValue(azureError);
    const synthesizeEdgeTts = vi.fn().mockResolvedValue({ provider: "edge-tts" });
    const onFallback = vi.fn();
    const synthesize = createProviderChain({
      synthesizeAzure,
      synthesizeEdgeTts,
      azureConfigured: true,
      onFallback,
    });

    const result = await synthesize([], "fil", "voice");
    expect(result).toEqual({ provider: "edge-tts" });
    expect(onFallback).toHaveBeenCalledWith(azureError);
  });

  it("goes straight to edge-tts when Azure isn't configured at all", async () => {
    const synthesizeAzure = vi.fn();
    const synthesizeEdgeTts = vi.fn().mockResolvedValue({ provider: "edge-tts" });
    const synthesize = createProviderChain({
      synthesizeAzure,
      synthesizeEdgeTts,
      azureConfigured: false,
    });

    await synthesize([], "fil", "voice");
    expect(synthesizeAzure).not.toHaveBeenCalled();
  });
});

describe("renderItem", () => {
  const baseItem = {
    moduleContentId: "01-tungkulin-ng-bhw",
    sectionIndex: 0,
    language: "fil",
    zones: [{ zone: "heading", index: 0, text: "Panimula" }],
    voice: VOICES.fil,
    contentHash: "hash-1",
    existingId: null,
  };

  it("returns 'skipped' without touching any transport for a skip action", async () => {
    const deps = {
      synthesize: vi.fn(),
      uploadAudio: vi.fn(),
      upsertAudioRow: vi.fn(),
      resolveModuleRowId: vi.fn(),
    };
    const result = await renderItem({ ...baseItem, action: "skip" }, deps);
    expect(result.outcome).toBe("skipped");
    expect(deps.synthesize).not.toHaveBeenCalled();
    expect(deps.resolveModuleRowId).not.toHaveBeenCalled();
  });

  it("returns 'module-not-loaded' and never synthesizes when the module hasn't been loaded yet", async () => {
    const deps = {
      synthesize: vi.fn(),
      uploadAudio: vi.fn(),
      upsertAudioRow: vi.fn(),
      resolveModuleRowId: vi.fn().mockResolvedValue(null),
    };
    const result = await renderItem({ ...baseItem, action: "create" }, deps);
    expect(result.outcome).toBe("module-not-loaded");
    expect(deps.synthesize).not.toHaveBeenCalled();
  });

  it("synthesizes, uploads, and upserts for a create action, returning the provider used", async () => {
    const timings = [{ zone: "heading", index: 0, text: "Panimula", start_ms: 0, end_ms: 500 }];
    const deps = {
      synthesize: vi.fn().mockResolvedValue({
        audioBytes: Buffer.from([1, 2, 3]),
        format: "opus",
        durationSeconds: 0.5,
        timings,
        provider: "azure",
        charCount: 8,
      }),
      uploadAudio: vi.fn().mockResolvedValue("https://example.com/audio.webm"),
      upsertAudioRow: vi.fn().mockResolvedValue(undefined),
      resolveModuleRowId: vi.fn().mockResolvedValue("module-row-uuid"),
    };

    const result = await renderItem({ ...baseItem, action: "create" }, deps);

    expect(deps.uploadAudio).toHaveBeenCalledWith(
      "module-row-uuid/0-fil.webm",
      Buffer.from([1, 2, 3]),
      "opus",
    );
    expect(deps.upsertAudioRow).toHaveBeenCalledWith({
      moduleId: "module-row-uuid",
      sectionIndex: 0,
      language: "fil",
      audioUrl: "https://example.com/audio.webm",
      format: "opus",
      durationSeconds: 0.5,
      contentHash: "hash-1",
      timings,
      existingId: null,
    });
    expect(result.outcome).toBe("created");
    expect(result.provider).toBe("azure");
  });

  it("uses the .mp3 extension for an mp3-format synthesis result", async () => {
    const deps = {
      synthesize: vi.fn().mockResolvedValue({
        audioBytes: Buffer.from([1]),
        format: "mp3",
        durationSeconds: 1,
        timings: [],
        provider: "edge-tts",
      }),
      uploadAudio: vi.fn().mockResolvedValue("url"),
      upsertAudioRow: vi.fn(),
      resolveModuleRowId: vi.fn().mockResolvedValue("module-row-uuid"),
    };
    await renderItem({ ...baseItem, action: "update", existingId: "audio-1" }, deps);
    expect(deps.uploadAudio).toHaveBeenCalledWith(
      "module-row-uuid/0-fil.mp3",
      expect.any(Buffer),
      "mp3",
    );
  });
});
