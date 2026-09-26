type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

// Every admin page rebuilt the same h1 (+ optional intro paragraph, +
// optional action button pinned to the right) by hand, each with slightly
// different spacing/wrapping. One component so page title styling can't
// drift between pages and each page only states its own title/description/
// actions.
export function AdminPageHeader({ title, description, actions }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink/70">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
