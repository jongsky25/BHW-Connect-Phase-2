// Microsoft Edge "Read Aloud" voice service, one plain-text utterance per
// request, returned as 24 kHz / 48 kbps mono MP3. Used by
// scripts/training-narrate.mjs for Reference Manual lesson narration.
//
// Differs from the older edge-tts.mjs (legacy module audio) in three ways
// the live service now requires or rewards:
// - the rotating Sec-MS-GEC token (a SHA-256 of the 5-minute Windows
//   file-time bucket and the public client token), without which the
//   handshake is rejected;
// - an HTTPS proxy when HTTPS_PROXY is set (Node's global WebSocket ignores
//   proxy variables, so this uses `ws` with an explicit agent);
// - no custom SSML beyond voice/prosody. Bookmarks are no longer reported, so
//   callers synthesize one sentence per request and derive timings from the
//   exact MP3 frame count instead (see reference-narration.mjs).
//
// This is an undocumented consumer endpoint. It can change without notice;
// narration is pre-rendered and committed so learners never depend on it.

import { createHash, randomUUID } from "node:crypto";
import WebSocket from "ws";
import { HttpsProxyAgent } from "https-proxy-agent";

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const CHROMIUM_VERSION = "143.0.3650.75";
const WIN_EPOCH_SECONDS = 11_644_473_600;
export const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";

export function secMsGec(nowMs) {
  let seconds = Math.floor(nowMs / 1000) + WIN_EPOCH_SECONDS;
  seconds -= seconds % 300;
  const ticks = BigInt(seconds) * 10_000_000n;
  return createHash("sha256").update(`${ticks}${TRUSTED_CLIENT_TOKEN}`).digest("hex").toUpperCase();
}

const escapeXml = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function buildUtteranceSsml(text, voice) {
  const lang = voice.split("-").slice(0, 2).join("-");
  return (
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>` +
    `<voice name='${voice}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>${escapeXml(text)}</prosody></voice></speak>`
  );
}

// Binary frames: big-endian uint16 header length, header text, payload.
export function audioPayload(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const headerLength = buffer.readUInt16BE(0);
  const headers = buffer.toString("utf8", 2, 2 + headerLength);
  return /(^|\r\n)Path:audio(\r\n|$)/.test(headers) ? buffer.subarray(2 + headerLength) : null;
}

function defaultOpenConnection(url, headers) {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  return new WebSocket(url, { headers, ...(proxy ? { agent: new HttpsProxyAgent(proxy) } : {}) });
}

let clockSkewMs = 0;

function once(text, voice, openConnection, timeoutMs) {
  const id = () => randomUUID().replaceAll("-", "");
  const url =
    "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1" +
    `?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec(Date.now() + clockSkewMs)}` +
    `&Sec-MS-GEC-Version=1-${CHROMIUM_VERSION}&ConnectionId=${id()}`;
  const major = CHROMIUM_VERSION.split(".")[0];
  const socket = openConnection(url, {
    Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
    "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36 Edg/${major}.0.0.0`,
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
  });
  return new Promise((resolve, reject) => {
    const chunks = [];
    const timer = setTimeout(() => {
      socket.terminate?.();
      reject(new Error("read-aloud timed out"));
    }, timeoutMs);
    const fail = (error) => {
      clearTimeout(timer);
      reject(error);
    };
    socket.on("unexpected-response", (_request, response) => {
      const serverDate = Date.parse(response.headers?.date ?? "");
      if (response.statusCode === 403 && Number.isFinite(serverDate)) clockSkewMs = serverDate - Date.now();
      fail(new Error(`read-aloud handshake rejected (${response.statusCode})`));
    });
    socket.on("error", fail);
    socket.on("open", () => {
      const timestamp = new Date().toString();
      socket.send(
        `X-Timestamp:${timestamp}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "false" },
                  outputFormat: OUTPUT_FORMAT,
                },
              },
            },
          }),
      );
      socket.send(
        `X-RequestId:${id()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp}Z\r\nPath:ssml\r\n\r\n` +
          buildUtteranceSsml(text, voice),
      );
    });
    socket.on("message", (data) => {
      // ws 7 delivers text frames as strings and binary frames as Buffers.
      if (typeof data !== "string") {
        const payload = audioPayload(data);
        if (payload) chunks.push(payload);
        return;
      }
      if (/(^|\r\n)Path:turn\.end(\r\n|$)/.test(data)) {
        clearTimeout(timer);
        socket.close();
        const bytes = Buffer.concat(chunks);
        if (bytes.length === 0) reject(new Error("read-aloud returned no audio"));
        else resolve(bytes);
      }
    });
  });
}

export async function synthesizeUtterance(
  text,
  voice,
  { openConnection = defaultOpenConnection, attempts = 4, timeoutMs = 30_000, wait = (ms) => new Promise((r) => setTimeout(r, ms)) } = {},
) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await once(text, voice, openConnection, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await wait(1000 * 2 ** attempt);
    }
  }
  throw lastError;
}
