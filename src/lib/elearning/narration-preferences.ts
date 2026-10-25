"use client";

import { useSyncExternalStore } from "react";

export const NARRATION_SPEEDS = [0.75, 1, 1.25, 1.5] as const;
export type NarrationSpeed = (typeof NARRATION_SPEEDS)[number];
export const NARRATION_SPEED_KEY = "bhw:narration-speed:v1";
const CHANGE = "bhw:narration-preferences";
let fallbackSpeed: NarrationSpeed = 1;
let storageWriteFailed = false;
// Listening intent lives only in this tab's current lesson, never in storage.
let continuation = { scope: "", enabled: false, armed: false };

function notify() { window.dispatchEvent(new Event(CHANGE)); }
function subscribe(notify: () => void) {
  window.addEventListener(CHANGE, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(CHANGE, notify);
    window.removeEventListener("storage", notify);
  };
}
function validSpeed(value: number): value is NarrationSpeed {
  return NARRATION_SPEEDS.some(speed => speed === value);
}
function readSpeed(): NarrationSpeed {
  if (storageWriteFailed) return fallbackSpeed;
  try {
    const stored = window.localStorage.getItem(NARRATION_SPEED_KEY);
    return stored !== null && validSpeed(Number(stored)) ? Number(stored) as NarrationSpeed : 1;
  } catch { /* Restricted storage still allows preferences during this visit. */ }
  return fallbackSpeed;
}
export function setNarrationSpeed(speed: number) {
  if (!validSpeed(speed)) return;
  fallbackSpeed = speed;
  try {
    window.localStorage.setItem(NARRATION_SPEED_KEY, String(speed));
    storageWriteFailed = false;
  } catch { storageWriteFailed = true; }
  notify();
}
export function useNarrationSpeed() {
  return useSyncExternalStore(subscribe, readSpeed, () => 1 as NarrationSpeed);
}
export function enterNarrationScope(scope?: string) {
  if (continuation.scope !== (scope ?? "")) {
    continuation = { scope: scope ?? "", enabled: false, armed: false };
    notify();
  }
}
export function useNarrationContinuation(scope?: string) {
  return useSyncExternalStore(subscribe, () => !!scope && continuation.scope === scope && continuation.enabled, () => false);
}
export function setNarrationContinuation(scope: string, enabled: boolean, playing: boolean) {
  continuation = { scope, enabled, armed: enabled && playing };
  notify();
}
export function armNarrationContinuation(scope?: string) {
  if (scope && continuation.scope === scope && continuation.enabled) continuation.armed = true;
}
export function pauseNarrationContinuation() { continuation.armed = false; }
export function shouldContinueNarration(scope?: string) {
  return !!scope && continuation.scope === scope && continuation.enabled && continuation.armed;
}
