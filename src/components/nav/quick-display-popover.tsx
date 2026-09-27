"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import type { A11ySettings } from "@/lib/settings/types";
import { useDisplaySettings } from "@/lib/settings/use-display-settings";
import { QuickDisplayControls } from "./quick-display-controls";
import { useDisclosure } from "./use-disclosure";

type Props = {
  initialA11y: A11ySettings;
  signedIn: boolean;
};

// The header's quick-display popover (increment 3.5): a palette/sun icon
// button next to the avatar (signed in) or the language toggle (signed
// out — writes the BHW_DISPLAY cookie via useDisplaySettings' signedIn=false
// branch, same as the mobile drawer's inline "Display" section for a
// signed-in visitor).
export function QuickDisplayPopover({ initialA11y, signedIn }: Props) {
  const t = useTranslations("common");
  const { open, setOpen, containerRef, triggerRef } = useDisclosure<HTMLDivElement, HTMLButtonElement>();
  const { a11y, update } = useDisplaySettings(initialA11y, signedIn);
  const panelId = useId();

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={panelId}
        aria-label={t("displayLabel")}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center rounded-md text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2.5v2M12 19.5v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2.5 12h2M19.5 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          />
        </svg>
      </button>
      {open ? (
        <div
          id={panelId}
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-md border border-ink/10 bg-canvas p-4 shadow-lg"
        >
          <QuickDisplayControls a11y={a11y} update={update} onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
