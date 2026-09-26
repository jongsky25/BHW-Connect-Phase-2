"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAdminNavItemActive } from "@/lib/admin/nav";

export type AdminNavLink = {
  key: string;
  href: string;
  label: string;
};

export type AdminNavGroupView = {
  id: string;
  label: string;
  items: AdminNavLink[];
};

type Props = {
  groups: AdminNavGroupView[];
  preferencesItem: AdminNavLink;
  menuLabel: string;
};

export function AdminNav({ groups, preferencesItem, menuLabel }: Props) {
  const pathname = usePathname();
  const allItems = groups.flatMap((group) => group.items).concat(preferencesItem);
  const currentItem = allItems.find((item) => isAdminNavItemActive(item.href, pathname));

  return (
    // Rendered once and shown responsively (rather than two separate
    // components) so the active-page logic below only has to live in one
    // place. <details> gives the phone disclosure open/close behavior and
    // focus handling for free, no JS state needed.
    <>
      <details className="group rounded-md border border-ink/15 lg:hidden">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 text-sm font-medium text-ink">
          <span>
            {menuLabel}
            {currentItem ? <span className="text-ink/60"> · {currentItem.label}</span> : null}
          </span>
          <span aria-hidden="true" className="text-ink/40 transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <AdminNavList groups={groups} preferencesItem={preferencesItem} pathname={pathname} />
      </details>

      <aside className="hidden shrink-0 lg:block lg:w-60">
        <AdminNavList groups={groups} preferencesItem={preferencesItem} pathname={pathname} />
      </aside>
    </>
  );
}

function AdminNavList({
  groups,
  preferencesItem,
  pathname,
}: {
  groups: AdminNavGroupView[];
  preferencesItem: AdminNavLink;
  pathname: string;
}) {
  return (
    <nav aria-label="Admin" className="flex flex-col gap-5 border-t border-ink/10 px-4 py-3 lg:border-t-0 lg:px-0 lg:py-0">
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-1">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-ink/50">{group.label}</p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <AdminNavRow key={item.key} item={item} active={isAdminNavItemActive(item.href, pathname)} />
            ))}
          </ul>
        </div>
      ))}

      <div className="flex flex-col gap-0.5 border-t border-ink/10 pt-3">
        <ul>
          <AdminNavRow item={preferencesItem} active={isAdminNavItemActive(preferencesItem.href, pathname)} />
        </ul>
      </div>
    </nav>
  );
}

function AdminNavRow({ item, active }: { item: AdminNavLink; active: boolean }) {
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-[44px] items-center rounded-md px-2 py-2 text-sm font-medium transition-colors ${
          active ? "bg-ink text-canvas" : "text-secondary hover:bg-ink/5"
        }`}
      >
        {item.label}
      </Link>
    </li>
  );
}
