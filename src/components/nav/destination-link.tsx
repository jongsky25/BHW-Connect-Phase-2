import Link from "next/link";

/** Keep the concise link name, with its explanation available visually and to assistive technology. */
export function DestinationLink({ href, label, description, idPrefix, className, active, onClick }: {
  href: string; label: string; description?: string; idPrefix: string; className: string;
  active?: boolean; onClick?: () => void;
}) {
  return <Link prefetch={false} href={href} onClick={onClick} className={className}
    aria-current={active ? "page" : undefined}
    aria-labelledby={`${idPrefix}-label`} aria-describedby={description ? `${idPrefix}-description` : undefined}>
    <span id={`${idPrefix}-label`} className="block font-semibold">{label}</span>
    {description && <span id={`${idPrefix}-description`} className="mt-1 block text-sm font-normal leading-relaxed">{description}</span>}
  </Link>;
}
