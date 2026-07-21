import Link from "next/link";

type Props = {
  message: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({ message, actionLabel, actionHref }: Props) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-ink/20 px-4 py-6">
      <p className="text-ink/70">{message}</p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="text-sm font-medium text-ink underline hover:text-secondary">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
