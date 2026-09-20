import { describe, expect, it, vi } from "vitest";
import {
  parseBookmarkEvents,
  parseMessage,
  synthesizeWithEdgeTts,
} from "./edge-tts.mjs";

describe("parseMessage", () => {
  it("splits a text message into headers and a text body", () => {
    const raw = "Path:turn.end\r\nX-RequestId:abc\r\n\r\n";
    const { headers, body } = parseMessage(raw);
    expect(headers).toEqual({ Path: "turn.end", "X-RequestId": "abc" });
    expect(body).toBe("");
  });

  it("splits a binary audio message using the 2-byte header-length prefix", () => {
    const header = "Path:audio\r\nContent-Type:audio/webm\r\n\r\n";
    const headerBytes = Buffer.from(header, "utf8");
    const audioBytes = Buffer.from([1, 2, 3, 4]);
    const lengthPrefix = Buffer.alloc(2);
    lengthPrefix.writeUInt16BE(headerBytes.length, 0);
    const message = Buffer.concat([lengthPrefix, headerBytes, audioBytes]);

    const { headers, body } = parseMessage(message);
    expect(headers.Path).toBe("audio");
    expect(Buffer.compare(body, audioBytes)).toBe(0);
  });
});

describe("parseBookmarkEvents", () => {
  it("extracts markName and offsetMs (ticks -> ms) for BookmarkEvent entries", () => {
    const body = JSON.stringify({
      Metadata: [
        { Type: "WordBoundary", Data: { Offset: 10000, text: { Text: "hi" } } },
        { Type: "BookmarkEvent", Data: { Bookmark: "zone-0", Offset: 5_000_000 } },
        { Type: "BookmarkEvent", Data: { Bookmark: "zone-1", Offset: 12_000_000 } },
      ],
    });
    expect(parseBookmarkEvents(body)).toEqual([
      { markName: "zone-0", offsetMs: 500 },
      { markName: "zone-1", offsetMs: 1200 },
    ]);
  });

  it("returns an empty array when there are no bookmark events", () => {
    expect(parseBookmarkEvents(JSON.stringify({ Metadata: [] }))).toEqual([]);
  });
});

describe("synthesizeWithEdgeTts (fake socket — no real network)", () => {
  function fakeSocket() {
    const socket = {
      sent: [],
      send: vi.fn((data) => socket.sent.push(data)),
      close: vi.fn(),
      onmessage: null,
      onerror: null,
    };
    return socket;
  }

  function textFrame(headers, body) {
    const headerText = Object.entries(headers)
      .map(([k, v]) => `${k}:${v}`)
      .join("\r\n");
    return `${headerText}\r\n\r\n${body}`;
  }

  function audioFrame(bytes) {
    const header = "Path:audio\r\n\r\n";
    const headerBytes = Buffer.from(header, "utf8");
    const prefix = Buffer.alloc(2);
    prefix.writeUInt16BE(headerBytes.length, 0);
    return Buffer.concat([prefix, headerBytes, Buffer.from(bytes)]);
  }

  it("assembles audio bytes and per-zone timings from the metadata + turn.end sequence", async () => {
    const socket = fakeSocket();
    const openConnection = vi.fn(async () => {
      // Deliver the whole exchange on the next macrotask tick, once the
      // caller's `await openConnection(...)` continuation has actually run
      // and attached onmessage/onerror — a microtask would race that
      // continuation and can fire first.
      setTimeout(() => {
        socket.onmessage({ data: audioFrame([1, 2, 3]) });
        socket.onmessage({
          data: textFrame(
            { Path: "audio.metadata" },
            JSON.stringify({
              Metadata: [
                { Type: "BookmarkEvent", Data: { Bookmark: "zone-0", Offset: 5_000_000 } },
              ],
            }),
          ),
        });
        socket.onmessage({ data: textFrame({ Path: "turn.end" }, "") });
      }, 0);
      return socket;
    });

    const zones = [
      { zone: "heading", index: 0, text: "Panimula" },
      { zone: "body", index: 0, text: "Isang pangungusap." },
    ];

    const result = await synthesizeWithEdgeTts(zones, "fil", { openConnection });

    expect(result.provider).toBe("edge-tts");
    expect(Buffer.compare(result.audioBytes, Buffer.from([1, 2, 3]))).toBe(0);
    expect(result.timings).toEqual([
      { zone: "heading", index: 0, text: "Panimula", start_ms: 0, end_ms: 500 },
      { zone: "body", index: 0, text: "Isang pangungusap.", start_ms: 500, end_ms: 1000 },
    ]);
    expect(socket.close).toHaveBeenCalledTimes(1);
    // Two writes: the speech.config message, then the SSML request.
    expect(socket.sent).toHaveLength(2);
    expect(socket.sent[1]).toContain("Panimula");
  });
});
