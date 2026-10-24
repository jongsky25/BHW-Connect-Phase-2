"use client";

import { DestinationLink } from "./destination-link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import type { NavItem } from "@/lib/nav/nav-items";
import { isNavItemActive } from "./nav-link";
import { useDisclosure } from "./use-disclosure";

type Props = {
  items: NavItem[];
  /** Translated label for each item, keyed by NavItem.id. */
  labels: Record<string, string>;
  triggerLabel: string;
  descriptions?: Record<string, string>;
};

// A disclosure dropdown (button + conditionally-rendered panel), per WAI-ARIA
// guidance for site menus — not role="menu"/role="menuitem", which expects
// arrow-key navigation this component doesn't implement.
export function MoreMenu({ items, labels, triggerLabel, descriptions }: Props) {
  const { open, setOpen, containerRef, triggerRef } = useDisclosure<HTMLDivElement, HTMLButtonElement>();
  const pathname = usePathname();
  const panelId = useId();

  if (items.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="rounded-md px-2 py-1.5 text-sm font-medium text-ink/70 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {triggerLabel} <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div
          id={panelId}
          className="absolute right-0 top-full z-50 mt-2 max-h-[70dvh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border border-ink/10 bg-canvas py-1 shadow-lg"
        >
          {items.map((item) => {
            const active = isNavItemActive(pathname, item);
            return (
              <DestinationLink key={item.id} href={item.href} label={labels[item.id]} description={descriptions?.[item.id]}
                idPrefix={`${panelId}-${item.id}`} active={active} onClick={() => setOpen(false)}
                className={`block min-h-11 break-words px-4 py-3 text-sm ${active ? "text-primary-text" : "text-ink hover:bg-ink/5"}`} />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
