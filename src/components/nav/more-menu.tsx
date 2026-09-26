"use client";

import Link from "next/link";
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
};

// A disclosure dropdown (button + conditionally-rendered panel), per WAI-ARIA
// guidance for site menus — not role="menu"/role="menuitem", which expects
// arrow-key navigation this component doesn't implement.
export function MoreMenu({ items, labels, triggerLabel }: Props) {
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
          className="absolute right-0 top-full z-50 mt-2 min-w-48 rounded-md border border-ink/10 bg-canvas py-1 shadow-lg"
        >
          {items.map((item) => {
            const active = isNavItemActive(pathname, item);
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2 text-sm ${
                  active ? "font-medium text-primary-text" : "text-ink/80 hover:bg-ink/5"
                }`}
              >
                {labels[item.id]}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
