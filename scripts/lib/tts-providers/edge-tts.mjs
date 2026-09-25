// edge-tts fallback (docs/training-modules-plan.md's locked decision: the
// zero-cost fallback on the same voice catalog Azure uses, so the timing
// JSON shape is identical regardless of which provider actually ran).
//
// This talks to Microsoft's unofficial "Read Aloud" voice service directly
// over WebSocket (the same backend edge-tts/msedge-tts and similar
// community projects reverse-engineered — there is no public SDK or
// documented contract for it, unlike Azure's REST/SDK surface). That
// protocol is known to change without notice (Microsoft has broken it more
// than once with anti-abuse changes), and it was NOT exercised against the
// live endpoint in the session that wrote this file — no network path to
// Microsoft's speech.platform.bing.com was confirmed available, so treat
// `synthesizeWithEdgeTts` as unverified until it's actually run once
// end-to-end. What IS unit-tested (edge-tts.test.mjs) is the message
// framing/parsing, against constructed fixtures matching this protocol's
// publicly documented shape — the part that doesn't need a live socket.
//
// The WebSocket connection itself is injected (`openConnection`) rather
// than hardwired to a real `WebSocket`, the same dependency-injection
// reason INC-18a's ProviderTransport is injected: it's what lets a test
// exercise the framing/orchestration logic with zero real network calls.

import { randomUUID } from "node:crypto";
import { buildSsml, timingsFromBookmarks } from "./ssml.mjs";

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const EDGE_VOICES = { fil: "fil-PH-BlessicaNeural", en: "en-US-JennyNeural" };

function wsConnectionId() {
  return randomUUID().replaceAll("-", "");
}

function isoTimestamp() {
  // edge-tts's own timestamp format (not standard ISO 8601): the fixed
  // "%a %b %d %Y %H:%M:%S GMT+0000 (Coordinated Universal Time)" shape.
  // The exact string has never been observed to be validated server-side
  // by any known reimplementation, so a plain ISO string is used here
  // instead of reproducing that exact format.
  return new Date().toISOString();
}

function speechConfigMessage() {
  return (
    `X-Timestamp:${isoTimestamp()}\r\n` +
    `Content-Type:application/json; charset=utf-8\r\n` +
    `Path:speech.config\r\n\r\n` +
    JSON.stringify({
      context: {
        synthesis: {
          audio: {
            metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "false" },
            outputFormat: "webm-24khz-16bit-mono-opus",
          },
        },
      },
    })
  );
}

function ssmlMessage(ssml, requestId) {
  return (
    `X-RequestId:${requestId}\r\n` +
    `Content-Type:application/ssml+xml\r\n` +
    `X-Timestamp:${isoTimestamp()}\r\n` +
    `Path:ssml\r\n\r\n${ssml}`
  );
}

// Splits one WebSocket message (text or binary) into { headers, body }.
// Text messages separate headers from a text body with "\r\n\r\n"; binary
// audio messages are framed as a big-endian uint16 header-length prefix,
// the header text, then the raw audio bytes.
export function parseMessage(data) {
  if (typeof data === "string") {
    const separator = data.indexOf("\r\n\r\n");
    if (separator === -1) return { headers: parseHeaders(data), body: null };
    return {
      headers: parseHeaders(data.slice(0, separator)),
      body: data.slice(separator + 4),
    };
  }

  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const headerLength = buffer.readUInt16BE(0);
  const headerText = buffer.toString("utf8", 2, 2 + headerLength);
  return {
    headers: parseHeaders(headerText),
    body: buffer.subarray(2 + headerLength),
  };
}

function parseHeaders(text) {
  const headers = {};
  for (const line of text.split("\r\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return headers;
}

// Extracts { markName, offsetMs } bookmark events from an "audio.metadata"
// message body (JSON). Defensive about the exact field name for a
// bookmark's mark (`Bookmark` vs a nested `text.Text`, mirroring the two
// shapes different edge-tts reimplementations have documented for
// WordBoundary vs BookmarkEvent) since this has not been observed against
// a live response in this session.
export function parseBookmarkEvents(metadataJsonBody) {
  const parsed = JSON.parse(metadataJsonBody);
  const events = [];
  for (const entry of parsed.Metadata ?? []) {
    if (entry.Type !== "BookmarkEvent") continue;
    const markName = entry.Data?.Bookmark ?? entry.Data?.text?.Text ?? entry.Data?.Text;
    const offsetTicks = entry.Data?.Offset ?? 0;
    if (markName) events.push({ markName, offsetMs: offsetTicks / 10_000 });
  }
  return events;
}

export async function synthesizeWithEdgeTts(
  zones,
  language,
  { openConnection = defaultOpenConnection } = {},
) {
  const voice = EDGE_VOICES[language];
  const ssml = buildSsml(zones, { voice, language });
  const requestId = randomUUID().replaceAll("-", "");

  const audioChunks = [];
  const bookmarkOffsetsMs = [];

  const socket = await openConnection(
    `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1` +
      `?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${wsConnectionId()}`,
  );

  const done = new Promise((resolve, reject) => {
    socket.onmessage = (event) => {
      const { headers, body } = parseMessage(event.data);
      if (headers.Path === "audio" && body) {
        audioChunks.push(body);
      } else if (headers.Path === "audio.metadata" && typeof body === "string") {
        for (const { markName, offsetMs } of parseBookmarkEvents(body)) {
          bookmarkOffsetsMs.push({ markName, offsetMs });
        }
      } else if (headers.Path === "turn.end") {
        resolve();
      }
    };
    socket.onerror = (error) => reject(new Error(`edge-tts connection error: ${error}`));
  });

  socket.send(speechConfigMessage());
  socket.send(ssmlMessage(ssml, requestId));
  await done;
  socket.close();

  const audioBytes = Buffer.concat(audioChunks);
  // Bookmarks are expected in zone order (matching how they were placed in
  // the SSML); sort by mark index defensively rather than trusting arrival
  // order over the wire.
  const orderedOffsets = bookmarkOffsetsMs
    .sort((a, b) => Number(a.markName.split("-")[1]) - Number(b.markName.split("-")[1]))
    .map((e) => e.offsetMs);

  // edge-tts's metadata stream carries no total-duration figure the way
  // Azure's result object does; the last bookmark plus a small pad stands
  // in unless a real run shows a better number.
  const durationMs = (orderedOffsets.at(-1) ?? 0) + 500;

  return {
    provider: "edge-tts",
    audioBytes,
    format: "opus",
    durationSeconds: durationMs / 1000,
    timings: timingsFromBookmarks(zones, orderedOffsets, durationMs),
    charCount: 0, // free/unmetered — never counted against the Azure budget
  };
}

function defaultOpenConnection(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.onopen = () => resolve(socket);
    socket.onerror = (error) => reject(error);
  });
}
