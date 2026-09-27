"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { displayCookieName } from "./display-cookie";
import { mapSettingsRpcError } from "./error-messages";
import { defaultA11ySettings, displayAttributes, type A11ySettings } from "./types";

// Shared by the full Settings → Display/Colours form (2.4/3.5) and the
// header's quick-display popover + mobile drawer "Display" section (3.5):
// all three apply a change instantly to <html>, then save it through the
// same debounced partial write. Factored out here so that debounce/error/
// revert behaviour — and the signed-out cookie fallback — has exactly one
// implementation instead of three.
const DISPLAY_SAVE_DEBOUNCE_MS = 600;

export type DisplaySaveStatus = "idle" | "saving" | "saved" | "error";

// Every attribute displayAttributes() can produce. Cleared in full before
// re-applying, so a value that goes back to its default (no attribute)
// doesn't leave a stale attribute behind from before the change.
const DISPLAY_ATTRS = [
  "data-theme",
  "data-font-scale",
  "data-contrast",
  "data-primary",
  "data-accent",
  "data-density",
  "data-motion",
  "data-underline-links",
  "data-line-spacing",
  "data-reading-font",
  "data-colorblind-status",
] as const;

function applyDisplayAttributes(next: A11ySettings) {
  const html = document.documentElement;
  for (const name of DISPLAY_ATTRS) html.removeAttribute(name);
  for (const [name, value] of Object.entries(displayAttributes(next))) {
    html.setAttribute(name, value);
  }
}

function writeDisplayCookie(next: A11ySettings) {
  document.cookie = `${displayCookieName}=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=31536000; samesite=lax`;
}

export function useDisplaySettings(initial: A11ySettings, signedIn: boolean) {
  const [a11y, setA11y] = useState<A11ySettings>(initial);
  const [status, setStatus] = useState<DisplaySaveStatus>("idle");
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // The last successfully-saved settings, so a failed save can revert both
  // the UI state and the <html> attributes to it rather than to whatever
  // this component happened to load with.
  const lastSavedRef = useRef(initial);
  const pendingPatchRef = useRef<Partial<A11ySettings>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  async function flush() {
    const patch = pendingPatchRef.current;
    pendingPatchRef.current = {};
    if (Object.keys(patch).length === 0) return;

    if (!signedIn) {
      // No profile row to persist to yet — mirrors the signed-out language
      // cookie (src/i18n/request.ts), with the profile always winning once
      // one exists (increment 2.3's layout.tsx read order).
      lastSavedRef.current = { ...lastSavedRef.current, ...patch };
      writeDisplayCookie(lastSavedRef.current);
      setStatus("saved");
      return;
    }

    setStatus("saving");
    setErrorKey(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("rpc_update_display_settings", { p_settings: patch });

      if (error) {
        setErrorKey(mapSettingsRpcError(error.message));
        setA11y(lastSavedRef.current);
        applyDisplayAttributes(lastSavedRef.current);
        setStatus("error");
        return;
      }

      lastSavedRef.current = { ...lastSavedRef.current, ...patch };
      setStatus("saved");
    } catch {
      setErrorKey("genericError");
      setA11y(lastSavedRef.current);
      applyDisplayAttributes(lastSavedRef.current);
      setStatus("error");
    }
  }

  function update(patch: Partial<A11ySettings>) {
    const next = { ...a11y, ...patch };
    setA11y(next);
    applyDisplayAttributes(next);

    pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flush, DISPLAY_SAVE_DEBOUNCE_MS);
  }

  async function reset() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    pendingPatchRef.current = {};
    setA11y(defaultA11ySettings);
    applyDisplayAttributes(defaultA11ySettings);

    if (!signedIn) {
      lastSavedRef.current = defaultA11ySettings;
      writeDisplayCookie(defaultA11ySettings);
      setStatus("saved");
      return;
    }

    setStatus("saving");
    setErrorKey(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("rpc_update_display_settings", { p_settings: defaultA11ySettings });

      if (error) {
        setErrorKey(mapSettingsRpcError(error.message));
        setA11y(lastSavedRef.current);
        applyDisplayAttributes(lastSavedRef.current);
        setStatus("error");
        return;
      }

      lastSavedRef.current = defaultA11ySettings;
      setStatus("saved");
    } catch {
      setErrorKey("genericError");
      setA11y(lastSavedRef.current);
      applyDisplayAttributes(lastSavedRef.current);
      setStatus("error");
    }
  }

  return { a11y, status, errorKey, update, reset };
}
