import Link from "next/link";

type Crumb = {
  label: string;
  href?: string;
};

type Props = {
  items: Crumb[];
};

// Every crumb but the last is a link; the parent crumb (the one right
// before the current page) also carries a leading "←" so the trail doubles
// as a back affordance on a phone, where there's no browser chrome to fall
// back on once offline_pwa has the app running standalone.
export function Breadcrumbs({ items }: Props) {
  const lastIndex = items.length - 1;
  const parentIndex = lastIndex - 1;

  return (
    <nav aria-label="Breadcrumb" className="overflow-x-auto">
      <ol className="flex items-center gap-1 whitespace-nowrap text-sm">
        {items.map((item, index) => {
          const isLast = index === lastIndex;
          const label = index === parentIndex ? `← ${item.label}` : item.label;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? (
                <span aria-hidden="true" className="text-ink/40">
                  /
                </span>
              ) : null}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="inline-flex min-h-[44px] items-center font-medium text-ink/70"
                >
                  {label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="inline-flex min-h-[44px] items-center font-medium text-ink underline hover:text-secondary"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
