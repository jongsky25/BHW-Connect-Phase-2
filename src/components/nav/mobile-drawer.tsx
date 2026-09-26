"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import type { NavItem } from "@/lib/nav/nav-items";
import { useSignOut } from "@/lib/nav/use-sign-out";
import type { AppUser } from "@/lib/supabase/app-user";
import { isNavItemActive } from "./nav-link";

type Props = {
  account: { username: string; role: AppUser["role"] };
  items: NavItem[];
  /** Translated label for each item, keyed by NavItem.id. */
  labels: Record<string, string>;
};

const ITEM_CLASS =
  "flex min-h-12 items-center rounded-md px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

// The below-`md` counterpart of the desktop links, "More" menu and user menu.
// A native <dialog> opened with showModal() gives the focus trap, Escape
// handling and inert background for free, and returns focus to the ☰ button
// when it closes.
export function MobileDrawer({ account, items, labels }: Props) {
  const t = useTranslations("common");
  const tNav = useTranslations("authHome");
  const tFooter = useTranslations("footer");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { signOut, pending } = useSignOut();

  function show() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // jsdom has no showModal(); real browsers always do.
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    setOpen(true);
  }

  function close() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    setOpen(false);
  }

  // Any navigation — a drawer link, or back/forward while it's open —
  // closes it, so a BHW never lands on a new page with the drawer covering it.
  useEffect(() => {
    close();
  }, [pathname]);

  // A modal <dialog> makes the page inert but doesn't stop it scrolling
  // behind the drawer on touch devices.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  const settingsItem = items.find((item) => item.id === "settings");
  const primaryItems = items.filter((item) => item.group === "primary");
  // Settings gets its own fixed slot below, next to Display and Language.
  const moreItems = items.filter((item) => item.group === "more" && item.id !== "settings");
  const adminItems = items.filter((item) => item.group === "admin");

  function navLink(item: NavItem) {
    const active = isNavItemActive(pathname, item);
    return (
      <li key={item.id}>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={close}
          className={`${ITEM_CLASS} ${active ? "bg-ink/5 font-semibold text-primary-text" : "text-ink hover:bg-ink/5"}`}
        >
          {labels[item.id]}
        </Link>
      </li>
    );
  }

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={t("openMenuLabel")}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={show}
        className="flex h-11 w-11 items-center justify-center rounded-md text-ink hover:bg-ink/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <dialog
        ref={dialogRef}
        aria-label={t("mainMenuLabel")}
        onClose={() => setOpen(false)}
        // A click on the ::backdrop targets the <dialog> itself; clicks on the
        // drawer's content land on its children.
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="mobile-drawer fixed inset-y-0 left-0 m-0 h-full max-h-none w-[85vw] max-w-80 bg-canvas p-0 text-ink shadow-xl backdrop:bg-ink/50"
      >
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="flex items-start justify-between gap-2 border-b border-ink/10 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-semibold" title={account.username}>
                {account.username}
              </p>
              <p className="text-sm text-ink/70">{t(`role.${account.role}`)}</p>
            </div>
            <button
              type="button"
              aria-label={t("closeMenuLabel")}
              onClick={close}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-ink/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav aria-label={t("primaryNavLabel")} className="flex-1 px-2 py-2">
            <ul className="flex flex-col gap-1">{primaryItems.map(navLink)}</ul>
            {moreItems.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1 border-t border-ink/10 pt-2">{moreItems.map(navLink)}</ul>
            ) : null}
            {adminItems.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1 border-t border-ink/10 pt-2">{adminItems.map(navLink)}</ul>
            ) : null}
            <ul className="mt-2 flex flex-col gap-1 border-t border-ink/10 pt-2">
              {settingsItem ? navLink(settingsItem) : null}
              <li>
                <Link href="/settings#display" onClick={close} className={`${ITEM_CLASS} text-ink hover:bg-ink/5`}>
                  {t("displayLabel")}
                </Link>
              </li>
              <li className="flex min-h-12 items-center px-3">
                <LanguageToggle signedIn />
              </li>
              <li>
                <Link
                  href="/privacy"
                  aria-current={pathname === "/privacy" ? "page" : undefined}
                  onClick={close}
                  className={`${ITEM_CLASS} text-ink hover:bg-ink/5`}
                >
                  {tFooter("privacyNotice")}
                </Link>
              </li>
            </ul>
          </nav>

          <div className="border-t border-ink/10 px-2 py-2">
            <button
              type="button"
              onClick={signOut}
              disabled={pending}
              className={`${ITEM_CLASS} w-full text-left text-ink hover:bg-ink/5 disabled:opacity-60`}
            >
              {tNav("signOut")}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
